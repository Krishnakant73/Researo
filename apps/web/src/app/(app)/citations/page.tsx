"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Quote, FileText, ChevronRight, Search } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { useReports } from "@/lib/hooks/use-research";
import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/lib/types";

export default function CitationsPage() {
  const { data: reports = [] } = useReports();
  const [q, setQ] = useState("");
  const [docFilter, setDocFilter] = useState<string | "all">("all");
  const [minConf, setMinConf] = useState<number>(0.5);

  const flat = useMemo(() => {
    const rows: (Citation & { report_id: string; report_title: string })[] = [];
    for (const r of reports) {
      for (const c of r.citations) {
        rows.push({ ...c, report_id: r.id, report_title: r.title });
      }
    }
    return rows;
  }, [reports]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return flat.filter((c) => {
      if (docFilter !== "all" && c.document_id !== docFilter) return false;
      if (c.confidence < minConf) return false;
      if (!ql) return true;
      return (
        c.document_name.toLowerCase().includes(ql) ||
        c.citation_text.toLowerCase().includes(ql) ||
        (c.section ?? "").toLowerCase().includes(ql)
      );
    });
  }, [flat, q, docFilter, minConf]);

  const uniqDocs = Array.from(new Map(flat.map((f) => [f.document_id, f.document_name])));

  return (
    <>
      <Topbar title="Citations" subtitle="Every claim traces back to a source" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
          <div className="panel p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--color-fg-muted)]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search citation text, document, section…"
                  className="h-8 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] pl-8 pr-2 text-[12.5px] text-white placeholder:text-[color:var(--color-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-soft)]"
                />
              </div>
              <select
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value as any)}
                className="h-8 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2 text-[12px] text-white"
              >
                <option value="all">All documents</option>
                {uniqDocs.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 text-[11px] text-[color:var(--color-fg-muted)]">
                Min conf
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minConf * 100}
                  onChange={(e) => setMinConf(Number(e.target.value) / 100)}
                  className="w-24 accent-[color:var(--color-accent)]"
                />
                <span className="text-white">{Math.round(minConf * 100)}%</span>
              </div>
              <span className="ml-auto text-[11px] text-[color:var(--color-fg-muted)]">
                {filtered.length} citations
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="panel grid place-items-center px-6 py-16 text-center">
              <Quote className="h-6 w-6 text-[color:var(--color-fg-muted)]" />
              <p className="mt-2 text-[13px] text-[color:var(--color-fg-dim)]">
                No citations match those filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((c, i) => (
                <motion.article
                  key={`${c.report_id}-${c.id}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="panel p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-fg-muted)]">
                        <FileText className="h-3 w-3" />
                        <Link
                          href={`/documents/${c.document_id}`}
                          className="text-[color:var(--color-fg-dim)] hover:text-white"
                        >
                          {c.document_name}
                        </Link>
                        <span>·</span>
                        <span>Page {c.page}</span>
                        {c.section && (
                          <>
                            <span>·</span>
                            <span>{c.section}</span>
                          </>
                        )}
                      </div>
                      <blockquote className="mt-2 rounded border-l-2 border-[color:var(--color-accent)] bg-[rgba(124,92,255,0.05)] px-3 py-2 text-[13px] text-[color:var(--color-fg)]">
                        {c.citation_text}
                      </blockquote>
                    </div>
                    <Badge tone={c.confidence >= 0.85 ? "success" : c.confidence >= 0.7 ? "accent" : "warn"}>
                      {Math.round(c.confidence * 100)}%
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[color:var(--color-fg-muted)]">
                    <span className="font-mono">{c.chunk_id}</span>
                    <Link
                      href={`/reports/${c.report_id}`}
                      className="inline-flex items-center gap-1 text-[color:var(--color-fg-dim)] hover:text-white"
                    >
                      In: <span className="text-white">{c.report_title}</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
