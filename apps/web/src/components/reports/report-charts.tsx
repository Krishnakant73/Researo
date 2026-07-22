"use client";

import { motion } from "framer-motion";
import { BarChart3, Hash } from "lucide-react";
import type { Report } from "@/lib/types";

function confColor(c: number): string {
  if (c >= 0.85) return "#23c069";
  if (c >= 0.7) return "#4dd0ff";
  if (c >= 0.5) return "#f2b04a";
  return "#ef4a5c";
}

export function ReportCharts({ report }: { report: Report }) {
  const tokenAgents = report.agents.filter((a) => (a.tokens ?? 0) > 0);
  const maxTokens = Math.max(1, ...tokenAgents.map((a) => a.tokens ?? 0));

  return (
    <div className="space-y-3">
      {/* Confidence distribution */}
      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          <BarChart3 className="h-3.5 w-3.5" />
          Confidence by finding
        </div>
        {report.key_findings.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2.5">
            {report.key_findings.map((f, i) => (
              <div key={f.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="truncate text-[color:var(--color-fg-dim)]">
                    {i + 1}. {f.claim}
                  </span>
                  <span className="shrink-0 tabular-nums text-white">
                    {Math.round(f.confidence * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: confColor(f.confidence) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(f.confidence * 100)}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tokens per agent */}
      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          <Hash className="h-3.5 w-3.5" />
          Token usage by agent
        </div>
        {tokenAgents.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2.5">
            {tokenAgents.map((a, i) => (
              <div key={a.agent}>
                <div className="mb-1 flex items-center justify-between text-[11.5px]">
                  <span className="text-[color:var(--color-fg-dim)]">{a.agent}</span>
                  <span className="tabular-nums text-white">
                    {(a.tokens ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] to-[#4dd0ff]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((a.tokens ?? 0) / maxTokens) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <p className="py-4 text-center text-[12px] text-[color:var(--color-fg-muted)]">
      No data available.
    </p>
  );
}
