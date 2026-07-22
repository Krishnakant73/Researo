"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Target,
  TrendingUp,
  BookMarked,
  AlertTriangle,
  Workflow,
} from "lucide-react";
import type { Report } from "@/lib/types";
import { computeInsights, computeMetrics, type Insight } from "@/lib/reports/metrics";

const ICONS: Record<
  Insight["kind"],
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  coverage: Target,
  confidence: TrendingUp,
  source: BookMarked,
  warning: AlertTriangle,
  process: Workflow,
};

const COLORS: Record<Insight["kind"], string> = {
  coverage: "#7c5cff",
  confidence: "#23c069",
  source: "#4dd0ff",
  warning: "#ef4a5c",
  process: "#f2b04a",
};

export function ResearchInsights({ report }: { report: Report }) {
  const m = computeMetrics(report);
  const insights = computeInsights(report, m);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        <Sparkles className="h-3.5 w-3.5 text-[#4dd0ff]" />
        Research insights
      </div>
      <ul className="space-y-2">
        {insights.map((ins, i) => {
          const Icon = ICONS[ins.kind];
          const color = COLORS[ins.kind];
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-2.5 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-2.5"
            >
              <div
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
                style={{ background: `${color}1f` }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <p className="text-[12px] leading-relaxed text-[color:var(--color-fg-dim)]">
                {ins.text}
              </p>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
