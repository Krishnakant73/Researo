"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Filter, FileText } from "lucide-react";
import type { Report, EvidenceItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EvidenceExplorer({
  report,
  compact = false,
}: {
  report: Report;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState<EvidenceItem | null>(report.evidence[0] ?? null);
  const [filterDoc, setFilterDoc] = useState<string | "all">("all");

  const items = report.evidence.filter(
    (e) => filterDoc === "all" || e.document_id === filterDoc
  );
  const uniqDocs = Array.from(new Map(report.evidence.map((e) => [e.document_id, e.document_name])));

  return (
    <div className={cn("panel", compact ? "p-4" : "p-5")}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Evidence
          </div>
          <h2 className="text-[15px] font-semibold text-white">
            Supporting sources
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[color:var(--color-fg-muted)]">
          <Filter className="h-3 w-3" />
          <select
            value={filterDoc}
            onChange={(e) => setFilterDoc(e.target.value as any)}
            className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-1.5 py-1 text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-soft)]"
          >
            <option value="all">All documents</option>
            {uniqDocs.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={cn("grid gap-3", compact ? "" : "md:grid-cols-[280px_1fr]")}>
        <div className={cn("space-y-1.5", compact ? "" : "max-h-[520px] overflow-y-auto pr-1")}>
          {items.map((e, i) => {
            const active = selected?.id === e.id;
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className={cn(
                  "w-full rounded-lg border p-2.5 text-left transition-colors",
                  active
                    ? "border-[rgba(124,92,255,0.4)] bg-[color:var(--color-accent-soft)]"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] hover:bg-[color:var(--color-bg-hover)]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)] shrink-0" />
                    <span className="truncate text-[12px] font-medium text-white">
                      {e.document_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                    p.{e.page}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11.5px] text-[color:var(--color-fg-dim)] leading-snug">
                  {e.text}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-[color:var(--color-accent)]"
                      style={{ width: `${Math.round(e.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                    {Math.round(e.confidence * 100)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {!compact && (
          <motion.div
            key={selected?.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-4"
          >
            {selected ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                      Passage
                    </div>
                    <h3 className="text-[14px] font-semibold text-white">
                      {selected.document_name}
                    </h3>
                    <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                      Page {selected.page}
                      {selected.section ? ` · ${selected.section}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge tone="accent">
                      {Math.round(selected.confidence * 100)}% confidence
                    </Badge>
                    <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                      score {selected.score.toFixed(2)}
                    </span>
                  </div>
                </div>
                <blockquote className="rounded border-l-2 border-[color:var(--color-accent)] bg-[rgba(124,92,255,0.05)] px-3 py-2 text-[13px] leading-relaxed text-[color:var(--color-fg-dim)]">
                  {selected.text}
                </blockquote>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/documents/${selected.document_id}`}
                    className="rounded-md border border-[color:var(--color-border)] px-2.5 py-1 text-[11px] text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-hover)]"
                  >
                    Open source document
                  </Link>
                  <span className="text-[11px] text-[color:var(--color-fg-muted)]">
                    Chunk {selected.chunk_id.split("_").slice(-2).join("/")}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[13px] text-[color:var(--color-fg-muted)]">
                Select a passage to inspect.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
