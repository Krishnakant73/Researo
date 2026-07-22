"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Quote,
  Scale,
  Lightbulb,
  GitCompare,
} from "lucide-react";
import type { Report, Finding } from "@/lib/types";
import { cn } from "@/lib/utils";

function importance(confidence: number): { label: string; color: string } {
  if (confidence >= 0.85) return { label: "High", color: "#23c069" };
  if (confidence >= 0.7) return { label: "Medium", color: "#4dd0ff" };
  return { label: "Emerging", color: "#f2b04a" };
}

export function KeyFindings({
  report,
  activeCitationId,
  onCite,
}: {
  report: Report;
  activeCitationId: string | null;
  onCite: (citationId: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(
    // First finding expanded by default.
    report.key_findings[0] ? { [report.key_findings[0].id]: true } : {}
  );

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Key findings</h2>
        <span className="text-[11px] text-[color:var(--color-fg-muted)]">
          {report.key_findings.length} finding
          {report.key_findings.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-2.5">
        {report.key_findings.map((f, i) => (
          <FindingCard
            key={f.id}
            finding={f}
            index={i}
            report={report}
            expanded={!!open[f.id]}
            onToggle={() => setOpen((s) => ({ ...s, [f.id]: !s[f.id] }))}
            activeCitationId={activeCitationId}
            onCite={onCite}
          />
        ))}
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  index,
  report,
  expanded,
  onToggle,
  activeCitationId,
  onCite,
}: {
  finding: Finding;
  index: number;
  report: Report;
  expanded: boolean;
  onToggle: () => void;
  activeCitationId: string | null;
  onCite: (id: string) => void;
}) {
  const router = useRouter();
  const imp = importance(finding.confidence);
  const cited = finding.citation_ids
    .map((cid) => report.citations.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const ask = (q: string) => router.push(`/research?q=${encodeURIComponent(q)}`);
  const claimShort = finding.claim.length > 80 ? finding.claim.slice(0, 79) + "…" : finding.claim;

  return (
    <motion.div
      layout
      className={cn(
        "overflow-hidden rounded-xl border transition-colors",
        expanded
          ? "border-[rgba(124,92,255,0.28)] bg-[color:var(--color-bg-elev)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] hover:border-[color:var(--color-border-strong)]"
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-3.5 text-left"
      >
        <span
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold text-white"
          style={{ background: `${imp.color}26`, color: imp.color }}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-medium leading-snug text-white">
            {finding.claim}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: `${imp.color}1f`, color: imp.color }}
            >
              {imp.label} importance
            </span>
            <span className="inline-flex items-center gap-1 text-[10.5px] text-[color:var(--color-fg-muted)]">
              <Quote className="h-2.5 w-2.5" /> {cited.length} citation
              {cited.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round(finding.confidence * 100)}%`, background: imp.color }}
                />
              </div>
              <span className="text-[10.5px] tabular-nums text-[color:var(--color-fg-muted)]">
                {Math.round(finding.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-[color:var(--color-fg-muted)] transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[color:var(--color-border)] px-3.5 pb-3.5 pt-3">
              <p className="text-[12.5px] leading-relaxed text-[color:var(--color-fg-dim)]">
                {finding.detail}
              </p>

              {cited.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                    Supporting evidence
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cited.map((c) => {
                      const n = report.citations.findIndex((x) => x.id === c.id) + 1;
                      const active = activeCitationId === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => onCite(c.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors",
                            active
                              ? "border-[rgba(124,92,255,0.5)] bg-[color:var(--color-accent-soft)] text-white"
                              : "border-[color:var(--color-border)] text-[color:var(--color-fg-dim)] hover:border-[rgba(124,92,255,0.35)] hover:bg-[color:var(--color-bg-hover)] hover:text-white"
                          )}
                          title={`${c.document_name} · page ${c.page}`}
                        >
                          <span className="font-semibold text-[color:var(--color-accent)]">[{n}]</span>
                          <span className="max-w-[160px] truncate">{c.document_name}</span>
                          <span className="text-[color:var(--color-fg-muted)]">p.{c.page}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                <ActionChip
                  icon={Lightbulb}
                  label="Explain further"
                  onClick={() => ask(`Explain in more detail: ${claimShort}`)}
                />
                <ActionChip
                  icon={Scale}
                  label="Challenge this"
                  onClick={() => ask(`What evidence challenges or contradicts this claim: ${claimShort}?`)}
                />
                <ActionChip
                  icon={GitCompare}
                  label="Compare"
                  onClick={() => ask(`How does this compare with other sources in my library: ${claimShort}?`)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)] px-2 py-1 text-[11px] text-[color:var(--color-fg-dim)] transition-colors hover:border-[rgba(124,92,255,0.35)] hover:text-white"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
