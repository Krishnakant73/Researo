"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import type { Report } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function ReportView({ report, inline = false }: { report: Report; inline?: boolean }) {
  return (
    <div className={inline ? "" : "space-y-5"}>
      {!inline && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
              Research Report
            </div>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-white">
              {report.title}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-[color:var(--color-fg-dim)]">
              {report.question}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge tone="success" className="text-[12px] px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {Math.round(report.confidence * 100)}% confidence
            </Badge>
            <span className="text-[10px] text-[color:var(--color-fg-muted)]">
              {report.citations.length} citations · {report.key_findings.length} findings
            </span>
          </div>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={inline ? "prose-researo" : "panel p-5 prose-researo"}
      >
        <h2 className="!mt-0">Executive Summary</h2>
        <p>{report.executive_summary}</p>
        <h2>Methodology</h2>
        <p>{report.methodology}</p>
        <h2>Key Findings</h2>
        {report.key_findings.map((f, i) => (
          <div key={f.id} id={`finding-${i + 1}`} className="mb-4">
            <h3 className="!mb-1">
              {i + 1}. {f.claim}
            </h3>
            <p className="!mt-1">
              {f.detail}{" "}
              {f.citation_ids.map((cid) => {
                const idx = report.citations.findIndex((c) => c.id === cid);
                if (idx < 0) return null;
                return (
                  <Link
                    key={cid}
                    href={`#cit-${idx + 1}`}
                    className="ml-0.5 rounded border border-[rgba(124,92,255,0.3)] bg-[color:var(--color-accent-soft)] px-1.5 py-[1px] text-[10px] font-medium text-[#c9bcff] no-underline hover:bg-[rgba(124,92,255,0.22)]"
                  >
                    [{idx + 1}]
                  </Link>
                );
              })}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7c5cff] to-[#4dd0ff]"
                  style={{ width: `${Math.round(f.confidence * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-[color:var(--color-fg-muted)]">
                {Math.round(f.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        ))}
        {report.contradictions.length > 0 && (
          <>
            <h2>Contradictions</h2>
            <ul>
              {report.contradictions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </>
        )}
        <h2>Recommendations</h2>
        <ol>
          {report.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
        {report.follow_up_questions.length > 0 && (
          <>
            <h2>Follow-up Questions</h2>
            <ul>
              {report.follow_up_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </>
        )}
        <h2>References</h2>
        <ol className="not-prose space-y-2 pl-0 list-none">
          {report.citations.map((c, i) => (
            <li key={c.id} id={`cit-${i + 1}`} className="flex gap-2">
              <span className="w-6 shrink-0 text-right text-[11px] text-[color:var(--color-fg-muted)]">
                [{i + 1}]
              </span>
              <div className="flex-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-white">
                      {c.document_name}
                    </div>
                    <div className="text-[11px] text-[color:var(--color-fg-muted)]">
                      Page {c.page}{c.section ? ` · ${c.section}` : ""}
                    </div>
                  </div>
                  <Badge tone="accent">{Math.round(c.confidence * 100)}%</Badge>
                </div>
                <blockquote className="mt-2 !m-0 !border-l-2 !border-[color:var(--color-accent)] !bg-[rgba(124,92,255,0.06)] !py-1.5 !px-3 text-[12px] text-[color:var(--color-fg-dim)]">
                  {c.citation_text}
                </blockquote>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Link
                    href={`/documents/${c.document_id}`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#a795ff] hover:text-white"
                  >
                    Open source <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </motion.section>
    </div>
  );
}
