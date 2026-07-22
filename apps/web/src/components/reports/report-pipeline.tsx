"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Compass,
  Search,
  ListOrdered,
  Filter,
  Brain,
  ShieldCheck,
  FileOutput,
  CheckCircle2,
  Loader2,
  Clock3,
  X,
  Cpu,
  Coins,
  Hash,
  Timer,
  ChevronRight,
} from "lucide-react";
import type { AgentStepView, Report } from "@/lib/types";
import { cn, parseDate } from "@/lib/utils";
import { agentCostUsd, formatCost, formatDuration } from "@/lib/reports/metrics";

const AGENTS: {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}[] = [
  { key: "Planner", label: "Planner", icon: Compass, hint: "Breaks the question into research objectives" },
  { key: "Retriever", label: "Retriever", icon: Search, hint: "Hybrid BM25 + dense retrieval over your library" },
  { key: "Ranker", label: "Ranker", icon: ListOrdered, hint: "Reranks retrieved chunks by relevance" },
  { key: "Curator", label: "Curator", icon: Filter, hint: "Selects the strongest, non-redundant evidence" },
  { key: "Analyst", label: "Analyst", icon: Brain, hint: "Reasons across evidence to produce findings" },
  { key: "Validator", label: "Validator", icon: ShieldCheck, hint: "Verifies every claim against evidence" },
  { key: "Publisher", label: "Publisher", icon: FileOutput, hint: "Assembles the final report with citations" },
];

type Status = AgentStepView["status"];

function statusLabel(step: AgentStepView): string {
  switch (step.status) {
    case "running":
      return "Running…";
    case "completed":
      return step.duration_ms != null ? formatDuration(step.duration_ms) : "Done";
    case "failed":
      return "Failed";
    case "waiting":
      return "Queued";
    default:
      return "";
  }
}

export function ReportPipeline({ report }: { report: Report }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const steps = report.agents;
  const active = openKey ? steps.find((s) => s.agent === openKey) ?? null : null;
  const activeMeta = AGENTS.find((a) => a.key === openKey) ?? null;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Multi-agent pipeline
          </div>
          <p className="text-[11.5px] text-[color:var(--color-fg-muted)]">
            Click any agent to inspect its model, tokens and output
          </p>
        </div>
        <span className="text-[11px] text-[color:var(--color-fg-muted)]">
          {steps.reduce((a, s) => a + (s.duration_ms ?? 0), 0) > 0 &&
            `${formatDuration(steps.reduce((a, s) => a + (s.duration_ms ?? 0), 0))} · `}
          {steps.reduce((a, s) => a + (s.tokens ?? 0), 0).toLocaleString()} tokens
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {AGENTS.map((a, i) => {
          const step =
            steps.find((s) => s.agent === a.key) ??
            ({ agent: a.key, status: "waiting" as Status } as AgentStepView);
          const Icon = a.icon;
          const running = step.status === "running";
          const done = step.status === "completed";
          const failed = step.status === "failed";
          const waiting = step.status === "waiting";
          return (
            <div key={a.key} className="flex items-center gap-1.5">
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setOpenKey(a.key)}
                aria-label={`${a.label} — ${statusLabel(step)}. View details`}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all sm:w-auto sm:min-w-[128px]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-soft)]",
                  done
                    ? "border-[rgba(35,192,105,0.24)] bg-[rgba(35,192,105,0.06)] hover:bg-[rgba(35,192,105,0.1)]"
                    : running
                    ? "border-[rgba(124,92,255,0.4)] bg-[color:var(--color-accent-soft)] shadow-[0_0_0_1px_rgba(124,92,255,0.15),0_10px_30px_-14px_rgba(124,92,255,0.5)]"
                    : failed
                    ? "border-[rgba(239,74,92,0.35)] bg-[rgba(239,74,92,0.08)] hover:bg-[rgba(239,74,92,0.12)]"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] hover:bg-[color:var(--color-bg-hover)]"
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      done
                        ? "text-[color:var(--color-success)]"
                        : running
                        ? "text-[color:var(--color-accent)]"
                        : failed
                        ? "text-[color:var(--color-danger)]"
                        : "text-[color:var(--color-fg-muted)]"
                    )}
                  />
                  {running && (
                    <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)] pulse-dot" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col text-[11px] leading-tight">
                  <span className={cn("font-medium", done || running ? "text-white" : "text-[color:var(--color-fg-dim)]")}>
                    {a.label}
                  </span>
                  <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                    {statusLabel(step)}
                    {done && step.tokens ? ` · ${step.tokens.toLocaleString()} tok` : ""}
                  </span>
                </div>
                <span className="ml-auto pl-1">
                  {done && <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--color-success)]" />}
                  {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-[color:var(--color-accent)]" />}
                  {waiting && <Clock3 className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />}
                  {failed && <X className="h-3.5 w-3.5 text-[color:var(--color-danger)]" />}
                </span>
              </motion.button>
              {i < AGENTS.length - 1 && (
                <div className="hidden h-px w-3 shrink-0 bg-gradient-to-r from-[color:var(--color-border)] to-transparent sm:block" />
              )}
            </div>
          );
        })}
      </div>

      <AgentDrawer
        open={!!active}
        onClose={() => setOpenKey(null)}
        step={active}
        label={activeMeta?.label ?? ""}
        hint={activeMeta?.hint ?? ""}
        icon={activeMeta?.icon ?? Cpu}
      />
    </div>
  );
}

function AgentDrawer({
  open,
  onClose,
  step,
  label,
  hint,
  icon: Icon,
}: {
  open: boolean;
  onClose: () => void;
  step: AgentStepView | null;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <AnimatePresence>
      {open && step && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-label={`${label} agent details`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-svh w-full max-w-[420px] flex-col border-l border-[color:var(--color-border)] bg-[color:var(--color-bg-panel)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-border)] p-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]">
                  <Icon className="h-4 w-4 text-[color:var(--color-accent)]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white">{label}</h3>
                  <p className="text-[11px] text-[color:var(--color-fg-muted)]">{hint}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-md text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-hover)] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <StatusPill status={step.status} />

              <div className="grid grid-cols-2 gap-2">
                <MetricBox icon={Cpu} label="Model" value={step.model || "—"} mono />
                <MetricBox icon={Timer} label="Duration" value={step.duration_ms != null ? formatDuration(step.duration_ms) : "—"} />
                <MetricBox icon={Hash} label="Tokens" value={step.tokens != null ? step.tokens.toLocaleString() : "—"} />
                <MetricBox icon={Coins} label="Est. cost" value={formatCost(agentCostUsd(step))} />
              </div>

              {step.detail && (
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                    Output summary
                  </div>
                  <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3 text-[12.5px] text-[color:var(--color-fg-dim)]">
                    {step.detail}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                  Execution log
                </div>
                <div className="space-y-1.5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3 font-mono text-[11px] text-[color:var(--color-fg-dim)]">
                  {step.started_at && (
                    <LogLine ts={step.started_at} text={`${label} started`} />
                  )}
                  {step.detail && step.completed_at && (
                    <LogLine ts={step.completed_at} text={step.detail} />
                  )}
                  {step.completed_at && (
                    <LogLine
                      ts={step.completed_at}
                      text={`${label} ${step.status === "failed" ? "failed" : "completed"}${
                        step.duration_ms != null ? ` in ${formatDuration(step.duration_ms)}` : ""
                      }`}
                    />
                  )}
                  {!step.started_at && !step.completed_at && (
                    <span className="text-[color:var(--color-fg-muted)]">No timing data recorded.</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LogLine({ ts, text }: { ts: string; text: string }) {
  const d = parseDate(ts);
  const time = Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-[color:var(--color-fg-muted)]">{time}</span>
      <span className="flex items-start gap-1">
        <ChevronRight className="mt-[3px] h-2.5 w-2.5 shrink-0 text-[color:var(--color-accent)]" />
        {text}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: "Completed", cls: "bg-[rgba(35,192,105,0.12)] text-[color:var(--color-success)]" },
    running: { label: "Running", cls: "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]" },
    failed: { label: "Failed", cls: "bg-[rgba(239,74,92,0.12)] text-[color:var(--color-danger)]" },
    waiting: { label: "Queued", cls: "bg-white/[0.05] text-[color:var(--color-fg-muted)]" },
  };
  const s = map[status] ?? map.waiting;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

function MetricBox({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn("mt-1 truncate text-[13px] font-medium text-white", mono && "font-mono text-[11.5px]")}>
        {value}
      </div>
    </div>
  );
}
