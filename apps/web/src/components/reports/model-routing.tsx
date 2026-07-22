"use client";

import { Cpu } from "lucide-react";
import type { Report } from "@/lib/types";
import { agentCostUsd, formatCost, formatDuration } from "@/lib/reports/metrics";

/** Friendly, shortened model label (keeps the provider signal, drops noise). */
function shortModel(model: string | undefined): string {
  if (!model) return "—";
  const m = model.includes("/") ? model.split("/").pop()! : model;
  return m;
}

function isLocal(model: string | undefined): boolean {
  const m = (model || "").toLowerCase();
  return m.includes("hybrid") || m.includes("heuristic") || m.includes("local");
}

export function ModelRouting({ report }: { report: Report }) {
  const rows = report.agents.filter((a) => a.model);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        <Cpu className="h-3.5 w-3.5" />
        Model routing
      </div>

      <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)]">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-[color:var(--color-bg-elev)] text-[color:var(--color-fg-muted)]">
              <th className="px-2.5 py-1.5 text-left font-medium">Agent</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Model</th>
              <th className="px-2.5 py-1.5 text-right font-medium">Tokens</th>
              <th className="px-2.5 py-1.5 text-right font-medium">Latency</th>
              <th className="px-2.5 py-1.5 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr
                key={a.agent}
                className="border-t border-[color:var(--color-border)] text-[color:var(--color-fg-dim)]"
              >
                <td className="px-2.5 py-1.5 font-medium text-white">{a.agent}</td>
                <td className="px-2.5 py-1.5">
                  <span
                    className={
                      isLocal(a.model)
                        ? "rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-[color:var(--color-fg-muted)]"
                        : "rounded bg-[color:var(--color-accent-soft)] px-1.5 py-0.5 font-mono text-[10.5px] text-[#c9bcff]"
                    }
                  >
                    {shortModel(a.model)}
                  </span>
                </td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">
                  {a.tokens ? a.tokens.toLocaleString() : "—"}
                </td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">
                  {a.duration_ms != null ? formatDuration(a.duration_ms) : "—"}
                </td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">
                  {formatCost(agentCostUsd(a))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10.5px] text-[color:var(--color-fg-muted)]">
        Retrieval &amp; reranking stages run locally (no token cost). Cost is an
        estimate from real token counts.
      </p>
    </div>
  );
}
