"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Layers,
  Quote,
  Lightbulb,
  Timer,
  Hash,
  Coins,
  ShieldCheck,
} from "lucide-react";
import type { Report } from "@/lib/types";
import { CountUp } from "@/components/ui/count-up";
import {
  computeMetrics,
  formatCost,
  formatDuration,
} from "@/lib/reports/metrics";

export function ReportStats({ report }: { report: Report }) {
  const m = computeMetrics(report);

  const cards: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    node: React.ReactNode;
    accent: string;
  }[] = [
    {
      icon: FileText,
      label: "Sources",
      accent: "#7c5cff",
      node: <CountUp value={m.sources} />,
    },
    {
      icon: Layers,
      label: "Chunks retrieved",
      accent: "#4dd0ff",
      node: <CountUp value={m.chunksRetrieved} />,
    },
    {
      icon: Quote,
      label: "Citations",
      accent: "#4dd0ff",
      node: <CountUp value={m.citations} />,
    },
    {
      icon: Lightbulb,
      label: "Findings",
      accent: "#f2b04a",
      node: <CountUp value={m.findings} />,
    },
    {
      icon: Timer,
      label: "Research time",
      accent: "#23c069",
      node: <CountUp value={m.researchTimeMs} format={(n) => formatDuration(Math.round(n))} />,
    },
    {
      icon: Hash,
      label: "Tokens used",
      accent: "#ff77b0",
      node: <CountUp value={m.tokens} />,
    },
    {
      icon: Coins,
      label: "Est. cost",
      accent: "#f2b04a",
      node: <CountUp value={m.estCostUsd} format={(n) => formatCost(n)} />,
    },
    {
      icon: ShieldCheck,
      label: "Confidence",
      accent: "#23c069",
      node: <CountUp value={Math.round(m.confidence * 100)} suffix="%" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="panel group relative overflow-hidden p-3"
          >
            <div
              className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-[0.12] blur-xl transition-opacity group-hover:opacity-25"
              style={{ background: c.accent }}
            />
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
              <Icon className="h-3 w-3" style={{ color: c.accent }} />
              <span className="truncate">{c.label}</span>
            </div>
            <div className="mt-1.5 text-[19px] font-semibold tabular-nums text-white">
              {c.node}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
