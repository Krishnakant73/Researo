"use client";

import { motion } from "framer-motion";
import { Gauge } from "lucide-react";
import type { Report } from "@/lib/types";
import { computeMetrics, computeQuality } from "@/lib/reports/metrics";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function scoreColor(score: number): string {
  if (score >= 80) return "#23c069";
  if (score >= 60) return "#4dd0ff";
  if (score >= 40) return "#f2b04a";
  return "#ef4a5c";
}

export function ReportQuality({ report }: { report: Report }) {
  const m = computeMetrics(report);
  const q = computeQuality(report, m);

  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = (q.overall / 100) * circ;
  const color = scoreColor(q.overall);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        <Gauge className="h-3.5 w-3.5" />
        Report quality
      </div>

      <div className="flex items-center gap-4">
        <div className="relative grid h-[92px] w-[92px] shrink-0 place-items-center">
          <svg width="92" height="92" className="-rotate-90">
            <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            <motion.circle
              cx="46"
              cy="46"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - dash }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[22px] font-semibold leading-none text-white">{q.overall}</span>
            <span className="text-[10px] text-[color:var(--color-fg-muted)]">/ 100</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[20px] font-semibold text-white">{q.grade}</span>
            <span className="text-[12px] text-[color:var(--color-fg-dim)]">grade</span>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[color:var(--color-fg-muted)]">
            A transparent, heuristic score computed from real coverage, evidence,
            citation and confidence signals.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {q.dimensions.map((d, i) => (
          <Tooltip key={d.key}>
            <TooltipTrigger asChild>
              <div className="cursor-default">
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="text-[color:var(--color-fg-dim)]">{d.label}</span>
                  <span className="tabular-nums text-white">{d.score}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: scoreColor(d.score) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${d.score}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: "easeOut" }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px]">
              <div className="text-[11px] text-[color:var(--color-fg-dim)]">{d.hint}</div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
