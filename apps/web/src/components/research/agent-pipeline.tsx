"use client";

import { motion } from "framer-motion";
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
} from "lucide-react";
import type { AgentStepView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AGENTS: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { key: "Planner", label: "Planner", icon: Compass, hint: "Breaks the question into research objectives" },
  { key: "Retriever", label: "Retriever", icon: Search, hint: "Hybrid BM25 + dense retrieval over your library" },
  { key: "Ranker", label: "Ranker", icon: ListOrdered, hint: "Cross-encoder reranking of retrieved chunks" },
  { key: "Curator", label: "Curator", icon: Filter, hint: "Selects the strongest, non-redundant evidence" },
  { key: "Analyst", label: "Analyst", icon: Brain, hint: "Reasons across evidence to produce findings" },
  { key: "Validator", label: "Validator", icon: ShieldCheck, hint: "Verifies every claim against evidence" },
  { key: "Publisher", label: "Publisher", icon: FileOutput, hint: "Assembles the final report with citations" },
];

// Deterministic sample metrics per agent. Using Math.random() here caused a
// server/client hydration mismatch because the values differed between the
// SSR pass and the client render. Fixed, stable numbers render identically.
const SAMPLE_METRICS: Record<string, { duration_ms: number; tokens: number }> = {
  Planner: { duration_ms: 820, tokens: 1420 },
  Retriever: { duration_ms: 640, tokens: 900 },
  Ranker: { duration_ms: 410, tokens: 700 },
  Curator: { duration_ms: 720, tokens: 980 },
  Analyst: { duration_ms: 1840, tokens: 3120 },
  Validator: { duration_ms: 1240, tokens: 1810 },
  Publisher: { duration_ms: 610, tokens: 940 },
};

const DEFAULT_STATE: AgentStepView[] = AGENTS.map((a) => ({
  agent: a.key,
  status: "completed",
  duration_ms: SAMPLE_METRICS[a.key]?.duration_ms ?? 700,
  tokens: SAMPLE_METRICS[a.key]?.tokens ?? 800,
  model: "gpt-4o-mini",
}));

export function AgentPipeline({
  steps = DEFAULT_STATE,
  compact = false,
}: {
  steps?: AgentStepView[];
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "gap-x-1.5 gap-y-2" : "gap-x-2 gap-y-3"
      )}
    >
      {AGENTS.map((a, i) => {
        const step = steps.find((s) => s.agent === a.key) ?? DEFAULT_STATE[i];
        const Icon = a.icon;
        const running = step.status === "running";
        const done = step.status === "completed";
        const failed = step.status === "failed";
        const waiting = step.status === "waiting";
        return (
          <div key={a.key} className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 min-w-[112px] transition-colors",
                    done
                      ? "border-[rgba(35,192,105,0.24)] bg-[rgba(35,192,105,0.06)]"
                      : running
                      ? "border-[rgba(124,92,255,0.4)] bg-[color:var(--color-accent-soft)] shadow-[0_0_0_1px_rgba(124,92,255,0.15),0_10px_30px_-14px_rgba(124,92,255,0.5)]"
                      : failed
                      ? "border-[rgba(239,74,92,0.35)] bg-[rgba(239,74,92,0.08)]"
                      : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]"
                  )}
                >
                  <div className="relative">
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
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
                  <div className="flex flex-col text-[11px] leading-tight">
                    <span
                      className={cn(
                        "font-medium",
                        done || running ? "text-white" : "text-[color:var(--color-fg-dim)]"
                      )}
                    >
                      {a.label}
                    </span>
                    <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                      {running
                        ? "Running…"
                        : done
                        ? `${(step.duration_ms ?? 0) / 1000}s`
                        : failed
                        ? "Failed"
                        : waiting
                        ? "Waiting"
                        : ""}
                    </span>
                  </div>
                  {done && <CheckCircle2 className="h-3 w-3 text-[color:var(--color-success)] ml-auto" />}
                  {running && <Loader2 className="h-3 w-3 text-[color:var(--color-accent)] animate-spin ml-auto" />}
                  {waiting && <Clock3 className="h-3 w-3 text-[color:var(--color-fg-muted)] ml-auto" />}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center">
                <div className="text-[11px] font-medium text-white">{a.label}</div>
                <div className="text-[10.5px] text-[color:var(--color-fg-dim)] mt-0.5">
                  {a.hint}
                </div>
                {step.model && (
                  <div className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
                    {step.model}
                    {step.tokens ? ` · ${step.tokens.toLocaleString()} tok` : ""}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
            {i < AGENTS.length - 1 && (
              <div className="h-px w-3 bg-gradient-to-r from-[color:var(--color-border)] to-transparent shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
