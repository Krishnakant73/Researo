"use client";

import { motion } from "framer-motion";
import { GitBranch, CheckCircle2, Loader2, Clock3, XCircle } from "lucide-react";
import type { Report, AgentStepView } from "@/lib/types";
import { cn, parseDate } from "@/lib/utils";
import { formatDuration } from "@/lib/reports/metrics";

const ORDER = ["Planner", "Retriever", "Ranker", "Curator", "Analyst", "Validator", "Publisher"];

function fmtTime(iso?: string): string {
  if (!iso) return "";
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ReasoningTimeline({ report }: { report: Report }) {
  const steps = [...report.agents].sort(
    (a, b) => ORDER.indexOf(a.agent) - ORDER.indexOf(b.agent)
  );

  return (
    <div className="panel p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        <GitBranch className="h-3.5 w-3.5" />
        Reasoning timeline
      </div>
      <p className="mb-3 text-[11px] text-[color:var(--color-fg-muted)]">
        How the agents reasoned toward the answer (summaries only).
      </p>

      <ol className="relative ml-1">
        {steps.map((s, i) => (
          <TimelineRow key={s.agent} step={s} last={i === steps.length - 1} index={i} />
        ))}
      </ol>
    </div>
  );
}

function TimelineRow({
  step,
  last,
  index,
}: {
  step: AgentStepView;
  last: boolean;
  index: number;
}) {
  const done = step.status === "completed";
  const running = step.status === "running";
  const failed = step.status === "failed";
  const color = done ? "#23c069" : running ? "#7c5cff" : failed ? "#ef4a5c" : "#6b6f7a";

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative flex gap-3 pb-4 last:pb-0"
    >
      {!last && (
        <span className="absolute left-[9px] top-6 h-[calc(100%-12px)] w-px bg-[color:var(--color-border)]" />
      )}
      <span
        className="relative z-10 mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2"
        style={{ borderColor: color, background: "var(--color-bg-panel)" }}
      >
        {done && <CheckCircle2 className="h-2.5 w-2.5" style={{ color }} />}
        {running && <Loader2 className="h-2.5 w-2.5 animate-spin" style={{ color }} />}
        {failed && <XCircle className="h-2.5 w-2.5" style={{ color }} />}
        {step.status === "waiting" && <Clock3 className="h-2.5 w-2.5" style={{ color }} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-[12.5px] font-medium", done || running ? "text-white" : "text-[color:var(--color-fg-dim)]")}>
            {step.agent}
          </span>
          <span className="shrink-0 text-[10.5px] tabular-nums text-[color:var(--color-fg-muted)]">
            {fmtTime(step.started_at)}
            {step.duration_ms != null ? ` · ${formatDuration(step.duration_ms)}` : ""}
          </span>
        </div>
        {step.detail && (
          <p className="mt-0.5 text-[11.5px] leading-snug text-[color:var(--color-fg-muted)]">
            {step.detail}
          </p>
        )}
      </div>
    </motion.li>
  );
}
