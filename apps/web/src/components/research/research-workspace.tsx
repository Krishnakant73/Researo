"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Library,
  FileText,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentPipeline } from "@/components/research/agent-pipeline";
import { useDocuments } from "@/lib/hooks/use-documents";
import { useStartResearch } from "@/lib/hooks/use-research";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import type { AgentStepView, DocumentSummary, Report } from "@/lib/types";
import { EvidenceExplorer } from "@/components/reports/evidence-explorer";
import { ReportView } from "@/components/reports/report-view";

const EXAMPLES = [
  "What are the risks of Agentic AI in the enterprise?",
  "Summarise the impact of the Transformer architecture on NLP.",
  "How does exceeding 1.5°C warming affect global health?",
  "What is NVIDIA's strategic moat in AI compute?",
];

const ORDER = [
  "Planner",
  "Retriever",
  "Ranker",
  "Curator",
  "Analyst",
  "Validator",
  "Publisher",
];

export function ResearchWorkspace() {
  const { data: docs } = useDocuments();
  const start = useStartResearch();
  const searchParams = useSearchParams();

  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStepView[]>(
    ORDER.map((a) => ({ agent: a, status: "waiting" }))
  );
  // Keep every completed research result so asking a new question does not
  // erase the previous one. Newest first.
  const [results, setResults] = useState<Report[]>([]);

  // Document scope: "all" searches the whole library, "selected" restricts the
  // retriever to the chosen documents (one or many).
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Opened from a document ("Research this document") → pre-select it in the
  // scope. Accepts ?doc=<id> or ?documents=<id1>,<id2>. Applied once.
  const appliedScopeParam = useRef(false);
  useEffect(() => {
    if (appliedScopeParam.current) return;
    const raw = searchParams.get("doc") || searchParams.get("documents");
    if (!raw) return;
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length) {
      setSelectedDocIds(ids);
      setScopeMode("selected");
      appliedScopeParam.current = true;
    }
  }, [searchParams]);

  // Pre-fill the question when arriving with ?q=<question> (e.g. from a
  // report's follow-up questions or a shared link). Applied once.
  const appliedQuestionParam = useRef(false);
  useEffect(() => {
    if (appliedQuestionParam.current) return;
    const q = searchParams.get("q");
    if (q && q.trim()) {
      setQuestion(q);
      appliedQuestionParam.current = true;
    }
  }, [searchParams]);

  const readyDocs = docs?.filter((d) => d.status === "ready") ?? [];
  const docCount = readyDocs.length;

  const toggleDoc = (id: string) =>
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const onSubmit = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question first");
      return;
    }
    if (docCount === 0) {
      toast.error("Upload at least one document before running research");
      return;
    }
    const documentIds = scopeMode === "selected" ? selectedDocIds : [];
    if (scopeMode === "selected" && documentIds.length === 0) {
      toast.error("Select at least one document, or switch to All documents");
      return;
    }
    try {
      setRunning(true);
      setSteps(ORDER.map((a) => ({ agent: a, status: "waiting" })));
      const resp = await start.mutateAsync({
        question,
        document_ids: documentIds,
      });
      setResults((prev) => [resp, ...prev]);
      setSteps(
        resp.agents.length
          ? resp.agents
          : ORDER.map((a) => ({ agent: a, status: "completed" }))
      );
      toast.success("Research complete");
    } catch (e) {
      // No simulated fallback — report the real failure.
      setSteps((prev) =>
        prev.map((s) => (s.status === "completed" ? s : { ...s, status: "failed" }))
      );
      toast.error("Research failed", {
        description:
          e instanceof ApiError
            ? e.message
            : "Could not reach the research API. Please try again.",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1360px] flex-col gap-5">
      <QuestionCard
        value={question}
        onChange={setQuestion}
        onSubmit={onSubmit}
        running={running}
      />

      <DocumentScope
        docs={readyDocs}
        mode={scopeMode}
        onModeChange={setScopeMode}
        selected={selectedDocIds}
        onToggle={toggleDoc}
        onSelectAll={() => setSelectedDocIds(readyDocs.map((d) => d.id))}
        onClear={() => setSelectedDocIds([])}
      />

      <ExamplePrompts onPick={setQuestion} />

      <PipelineCard steps={steps} running={running} />

      <AnimatePresence>
        {results.map((r, idx) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-5 xl:grid-cols-[1.35fr_1fr]"
          >
            <div className="panel p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                      Generated Report
                    </span>
                    {idx === 0 ? (
                      <Badge tone="success">Latest</Badge>
                    ) : (
                      <Badge tone="neutral">#{results.length - idx}</Badge>
                    )}
                    <Badge tone="success">
                      <ShieldCheck className="h-3 w-3" />
                      {Math.round(r.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-[color:var(--color-accent)]">
                    {r.question}
                  </p>
                  <h2 className="mt-0.5 text-[16px] font-semibold text-white">
                    {r.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[color:var(--color-fg-muted)]">
                    <span>{r.key_findings.length} findings</span>
                    <span>·</span>
                    <span>{r.citations.length} citations</span>
                    <span>·</span>
                    <span>
                      {new Set(r.citations.map((c) => c.document_id)).size} sources
                    </span>
                  </div>
                </div>
                <Link href={`/reports/${r.id}`}>
                  <Button variant="secondary" size="sm" className="gap-1 shrink-0">
                    Full view <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <ReportView report={r} inline />
            </div>
            <EvidenceExplorer report={r} compact />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function QuestionCard({
  value,
  onChange,
  onSubmit,
  running,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  running: boolean;
}) {
  return (
    <div className="panel-elev relative overflow-hidden p-5">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-white">
              Ask a research question
            </h2>
            <p className="text-[11px] text-[color:var(--color-fg-muted)]">
              Grounded in your library. Every claim will be backed by evidence.
            </p>
          </div>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="e.g. What are the risks of Agentic AI in the enterprise?"
          className="min-h-[92px] text-[14px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-1.5">
            <Badge tone="accent">
              <BookOpen className="h-3 w-3" /> Library-grounded
            </Badge>
            <Badge tone="cyan">Multi-agent</Badge>
            <Badge tone="success">Cited</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[color:var(--color-fg-muted)]">
              <kbd className="kbd">⌘</kbd> + <kbd className="kbd">↵</kbd> to run
            </span>
            <Button
              onClick={onSubmit}
              variant="primary"
              size="md"
              disabled={running}
              className="gap-1.5"
            >
              {running ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Run research
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentScope({
  docs,
  mode,
  onModeChange,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  docs: DocumentSummary[];
  mode: "all" | "selected";
  onModeChange: (m: "all" | "selected") => void;
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const scopeLabel =
    mode === "all"
      ? `All documents · ${docs.length}`
      : selected.length === 0
      ? "No documents selected"
      : `${selected.length} of ${docs.length} selected`;

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]">
            <Library className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-white">
              Document scope
            </h3>
            <p className="text-[11px] text-[color:var(--color-fg-muted)]">
              {scopeLabel}
            </p>
          </div>
        </div>

        {/* Segmented mode toggle */}
        <div className="flex items-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("all")}
            className={cn(
              "rounded px-2.5 py-1 text-[11.5px] font-medium transition-colors",
              mode === "all"
                ? "bg-[color:var(--color-bg-hover)] text-white"
                : "text-[color:var(--color-fg-dim)] hover:text-white"
            )}
          >
            All / Any
          </button>
          <button
            type="button"
            onClick={() => onModeChange("selected")}
            className={cn(
              "rounded px-2.5 py-1 text-[11.5px] font-medium transition-colors",
              mode === "selected"
                ? "bg-[color:var(--color-bg-hover)] text-white"
                : "text-[color:var(--color-fg-dim)] hover:text-white"
            )}
          >
            Select documents
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mode === "selected" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-[color:var(--color-fg-muted)]">
                Pick one or more documents to ground the answer
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-[11px] text-[color:var(--color-accent)] hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="text-[11px] text-[color:var(--color-fg-muted)] hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            {docs.length === 0 ? (
              <div className="mt-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-4 text-center text-[11.5px] text-[color:var(--color-fg-muted)]">
                No indexed documents yet. Upload documents first.
              </div>
            ) : (
              <div className="mt-2 grid max-h-[220px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {docs.map((d) => {
                  const on = selected.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => onToggle(d.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                        on
                          ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]/40"
                          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] hover:border-[color:var(--color-border-strong)]"
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                          on
                            ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent)] text-white"
                            : "border-[color:var(--color-border-strong)]"
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </div>
                      <FileText className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-fg-muted)]" />
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium text-white">
                          {d.name}
                        </div>
                        <div className="truncate text-[10px] text-[color:var(--color-fg-muted)]">
                          {d.category ?? "General"} · {d.chunks} chunks
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExamplePrompts({ onPick }: { onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-[color:var(--color-fg-muted)]">Try:</span>
      {EXAMPLES.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="chip hover:bg-[color:var(--color-bg-hover)] hover:text-[color:var(--color-fg)] transition-colors cursor-pointer"
        >
          {e}
          <ChevronRight className="h-2.5 w-2.5" />
        </button>
      ))}
    </div>
  );
}

function PipelineCard({
  steps,
  running,
}: {
  steps: AgentStepView[];
  running: boolean;
}) {
  const done = steps.filter((s) => s.status === "completed").length;
  const total = steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const anyRunning = running || steps.some((s) => s.status === "running");
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-white">Research Pipeline</h2>
          {anyRunning ? (
            <Badge tone="accent">
              <Loader2 className="h-3 w-3 animate-spin" /> Running
            </Badge>
          ) : done === total && total > 0 ? (
            <Badge tone="success">Complete</Badge>
          ) : (
            <Badge tone="neutral">Idle</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-fg-muted)]">
          <span>
            {done} / {total} stages
          </span>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#7c5cff] to-[#4dd0ff]"
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
          </div>
        </div>
      </div>
      <AgentPipeline steps={steps} />
    </div>
  );
}
