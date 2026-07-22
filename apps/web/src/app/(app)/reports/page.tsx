"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ShieldCheck, BookText, Filter } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { useReports } from "@/lib/hooks/use-research";
import { Badge } from "@/components/ui/badge";
import { formatRelative, truncate, cn } from "@/lib/utils";

export default function ReportsPage() {
  const { data: reports = [] } = useReports();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    return reports.filter(
      (r) =>
        !query ||
        r.title.toLowerCase().includes(query) ||
        r.question.toLowerCase().includes(query)
    );
  }, [reports, q]);

  return (
    <>
      <Topbar title="Reports" subtitle="Evidence-backed research reports" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--color-fg-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search reports…"
                className="h-8 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] pl-8 pr-2 text-[12.5px] text-white placeholder:text-[color:var(--color-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-soft)]"
              />
            </div>
            <span className="text-[11px] text-[color:var(--color-fg-muted)]">
              {filtered.length} reports
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="panel grid place-items-center px-6 py-16 text-center">
              <BookText className="h-6 w-6 text-[color:var(--color-fg-muted)]" />
              <h3 className="mt-2 text-[14px] font-semibold text-white">
                No research reports yet
              </h3>
              <p className="mt-1 text-[13px] text-[color:var(--color-fg-dim)]">
                Start your first evidence-backed research project.
              </p>
              <Link
                href="/research"
                className="mt-3 rounded-md border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[rgba(124,92,255,0.22)]"
              >
                New research
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/reports/${r.id}`}
                    className={cn(
                      "block panel p-4 transition-all hover:-translate-y-[1px] hover:border-[color:var(--color-border-strong)]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                          Report · {formatRelative(r.created_at)}
                        </div>
                        <h3 className="mt-1 text-[15px] font-semibold text-white">
                          {r.title}
                        </h3>
                        <p className="mt-1 text-[12.5px] text-[color:var(--color-fg-dim)]">
                          {truncate(r.summary, 200)}
                        </p>
                      </div>
                      <Badge tone="success" className="shrink-0">
                        <ShieldCheck className="h-3 w-3" />
                        {Math.round(r.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--color-fg-muted)]">
                      <span>{r.key_findings.length} findings</span>
                      <span>·</span>
                      <span>{r.citations.length} citations</span>
                      <span>·</span>
                      <span>
                        {new Set(r.citations.map((c) => c.document_id)).size} sources
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
