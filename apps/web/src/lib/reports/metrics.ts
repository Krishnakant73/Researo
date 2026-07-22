/**
 * Pure, typed derivations for the Research Report experience.
 *
 * Everything here is computed from the real `Report` payload returned by the
 * backend — no fabricated values. Cost is an *estimate* derived from real
 * token counts and clearly labelled as such in the UI.
 */
import type { Report, AgentStepView, Finding } from "@/lib/types";
import { parseDate } from "@/lib/utils";

/** Rough blended $/1M tokens by model family (input+output blended). */
function ratePerMillion(model: string | undefined): number {
  const m = (model || "").toLowerCase();
  if (m.includes("gpt-4o-mini")) return 0.45;
  if (m.includes("gpt-4o")) return 6.25;
  if (m.includes("claude") && m.includes("haiku")) return 1.6;
  if (m.includes("claude")) return 9.0;
  if (m.includes("gemini") && m.includes("flash")) return 0.4;
  if (m.includes("gemini")) return 3.5;
  if (m.includes("mistral")) return 1.0;
  if (m.includes("llama")) return 0.7;
  // Local / non-LLM stages (hybrid retrieval, heuristic reranker) cost nothing.
  if (!m || m.includes("hybrid") || m.includes("heuristic") || m.includes("local")) return 0;
  return 1.5;
}

export function agentCostUsd(step: AgentStepView): number {
  const tokens = step.tokens ?? 0;
  if (!tokens) return 0;
  return (tokens / 1_000_000) * ratePerMillion(step.model);
}

export interface ReportMetrics {
  sources: number;
  documents: number;
  chunksRetrieved: number;
  citations: number;
  findings: number;
  contradictions: number;
  researchTimeMs: number;
  tokens: number;
  estCostUsd: number;
  confidence: number;
  models: string[];
  avgCitationConfidence: number;
  avgEvidenceScore: number;
}

export function computeMetrics(report: Report): ReportMetrics {
  const docIds = new Set<string>();
  for (const c of report.citations) docIds.add(c.document_id);
  for (const e of report.evidence) docIds.add(e.document_id);

  const tokens = report.agents.reduce((sum, a) => sum + (a.tokens ?? 0), 0);
  const estCostUsd = report.agents.reduce((sum, a) => sum + agentCostUsd(a), 0);

  // Wall-clock research time: last completion minus first start (falls back to
  // summed durations when timestamps are missing).
  const researchTimeMs = wallClockMs(report.agents);

  const models = Array.from(
    new Set(
      report.agents
        .map((a) => a.model)
        .filter((m): m is string => !!m && !isNonLlm(m))
    )
  );

  const avgCitationConfidence = mean(report.citations.map((c) => c.confidence));
  const avgEvidenceScore = mean(report.evidence.map((e) => e.score));

  return {
    sources: docIds.size,
    documents: docIds.size,
    chunksRetrieved: report.evidence.length,
    citations: report.citations.length,
    findings: report.key_findings.length,
    contradictions: report.contradictions.length,
    researchTimeMs,
    tokens,
    estCostUsd,
    confidence: report.confidence,
    models,
    avgCitationConfidence,
    avgEvidenceScore,
  };
}

function isNonLlm(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes("hybrid") || m.includes("heuristic") || m.includes("local");
}

export function wallClockMs(agents: AgentStepView[]): number {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const a of agents) {
    if (a.started_at) starts.push(parseDate(a.started_at).getTime());
    if (a.completed_at) ends.push(parseDate(a.completed_at).getTime());
  }
  if (starts.length && ends.length) {
    const span = Math.max(...ends) - Math.min(...starts);
    if (span > 0) return span;
  }
  return agents.reduce((sum, a) => sum + (a.duration_ms ?? 0), 0);
}

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

export function formatCost(usd: number): string {
  if (usd <= 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

// ── Quality score ─────────────────────────────────────────────────────────

export interface QualityDimension {
  key: string;
  label: string;
  score: number; // 0..100
  hint: string;
}

export interface QualityScore {
  overall: number; // 0..100
  grade: string;
  dimensions: QualityDimension[];
}

/**
 * A transparent, heuristic quality score. Every dimension is computed from real
 * report data so the number is explainable, not decorative.
 */
export function computeQuality(report: Report, m: ReportMetrics): QualityScore {
  const evidencePerFinding = m.findings ? m.chunksRetrieved / m.findings : 0;

  const coverage = clamp01(m.sources / 4) * 100; // 4+ sources = full coverage
  const evidence = clamp01(evidencePerFinding / 3) * 100; // 3+ chunks/finding
  const citationQuality = m.avgCitationConfidence * 100;
  const confidence = m.confidence * 100;
  // Transparency: do we expose per-stage models, tokens and timings?
  const withMeta = report.agents.filter((a) => a.model && a.duration_ms != null).length;
  const transparency = report.agents.length
    ? (withMeta / report.agents.length) * 100
    : 0;

  const dimensions: QualityDimension[] = [
    { key: "coverage", label: "Coverage", score: round(coverage), hint: `${m.sources} source${m.sources === 1 ? "" : "s"} referenced` },
    { key: "evidence", label: "Evidence", score: round(evidence), hint: `${evidencePerFinding.toFixed(1)} chunks per finding` },
    { key: "citations", label: "Citation quality", score: round(citationQuality), hint: `${Math.round(m.avgCitationConfidence * 100)}% avg citation confidence` },
    { key: "confidence", label: "Confidence", score: round(confidence), hint: "Overall report confidence" },
    { key: "transparency", label: "Transparency", score: round(transparency), hint: "Per-stage models, tokens & timings exposed" },
  ];

  const overall = round(mean(dimensions.map((d) => d.score)));
  return { overall, grade: grade(overall), dimensions };
}

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "A-";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

// ── Derived insights ────────────────────────────────────────────────────────

export interface Insight {
  kind: "coverage" | "confidence" | "source" | "warning" | "process";
  text: string;
}

export function computeInsights(report: Report, m: ReportMetrics): Insight[] {
  const out: Insight[] = [];

  out.push({
    kind: "coverage",
    text: `${m.findings} finding${m.findings === 1 ? "" : "s"} supported by ${m.citations} citation${m.citations === 1 ? "" : "s"} across ${m.sources} source${m.sources === 1 ? "" : "s"}.`,
  });

  const top = topFinding(report.key_findings);
  if (top) {
    out.push({
      kind: "confidence",
      text: `Highest-confidence finding (${Math.round(top.confidence * 100)}%): "${trimClaim(top.claim)}"`,
    });
  }

  const mostCited = mostCitedSource(report);
  if (mostCited) {
    out.push({
      kind: "source",
      text: `Most-referenced source: ${mostCited.name} (${mostCited.count} citation${mostCited.count === 1 ? "" : "s"}).`,
    });
  }

  if (m.contradictions > 0) {
    out.push({
      kind: "warning",
      text: `${m.contradictions} contradiction${m.contradictions === 1 ? "" : "s"} flagged by the Validator — review before relying on affected claims.`,
    });
  }

  const analyst = report.agents.find((a) => a.agent === "Analyst");
  if (analyst?.model) {
    out.push({
      kind: "process",
      text: `Analyst reasoned over the curated evidence using ${analyst.model}; report assembled in ${formatDuration(m.researchTimeMs)}.`,
    });
  }

  return out;
}

function topFinding(findings: Finding[]): Finding | null {
  if (!findings.length) return null;
  return [...findings].sort((a, b) => b.confidence - a.confidence)[0];
}

function mostCitedSource(report: Report): { name: string; count: number } | null {
  const counts = new Map<string, { name: string; count: number }>();
  for (const c of report.citations) {
    const cur = counts.get(c.document_id) ?? { name: c.document_name, count: 0 };
    cur.count += 1;
    counts.set(c.document_id, cur);
  }
  let best: { name: string; count: number } | null = null;
  for (const v of counts.values()) {
    if (!best || v.count > best.count) best = v;
  }
  return best;
}

function trimClaim(claim: string, max = 90): string {
  return claim.length > max ? claim.slice(0, max - 1).trimEnd() + "…" : claim;
}

export function readingTimeMinutes(text: string): number {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ── small helpers ──────────────────────────────────────────────────────────

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round(n: number): number {
  return Math.round(n);
}
