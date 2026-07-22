"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import type { Report } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ReportReferences({
  report,
  activeCitationId,
  onCite,
}: {
  report: Report;
  activeCitationId: string | null;
  onCite: (id: string) => void;
}) {
  const refs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!activeCitationId) return;
    const el = refs.current.get(activeCitationId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeCitationId]);

  if (report.citations.length === 0) return null;

  const copyCitation = (n: number, docName: string, page: number, text: string) => {
    const formatted = `[${n}] ${docName}, p.${page}. "${text}"`;
    navigator.clipboard.writeText(formatted).then(
      () => toast.success("Citation copied"),
      () => toast.error("Couldn't copy")
    );
  };

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">References</h2>
        <span className="text-[11px] text-[color:var(--color-fg-muted)]">
          {report.citations.length} citation{report.citations.length === 1 ? "" : "s"}
        </span>
      </div>

      <ol className="space-y-2">
        {report.citations.map((c, i) => {
          const n = i + 1;
          const active = activeCitationId === c.id;
          return (
            <li
              key={c.id}
              ref={(el) => {
                if (el) refs.current.set(c.id, el);
                else refs.current.delete(c.id);
              }}
              className={cn(
                "flex gap-2 rounded-lg border p-2.5 transition-colors",
                active
                  ? "border-[rgba(124,92,255,0.5)] bg-[color:var(--color-accent-soft)]"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]"
              )}
            >
              <button
                onClick={() => onCite(c.id)}
                className="mt-0.5 h-fit shrink-0 rounded font-semibold text-[11px] text-[color:var(--color-accent)]"
                title="Highlight in evidence"
              >
                [{n}]
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      onClick={() => onCite(c.id)}
                      className="truncate text-left text-[12.5px] font-medium text-white hover:text-[color:var(--color-accent)]"
                    >
                      {c.document_name}
                    </button>
                    <div className="text-[10.5px] text-[color:var(--color-fg-muted)]">
                      Page {c.page}
                      {c.section ? ` · ${c.section}` : ""}
                    </div>
                  </div>
                  <Badge tone="accent">{Math.round(c.confidence * 100)}%</Badge>
                </div>
                <blockquote className="mt-1.5 border-l-2 border-[color:var(--color-accent)] bg-[rgba(124,92,255,0.05)] px-2.5 py-1.5 text-[12px] leading-relaxed text-[color:var(--color-fg-dim)]">
                  {c.citation_text}
                </blockquote>
                <div className="mt-1.5 flex items-center gap-2">
                  <Link
                    href={`/documents/${c.document_id}`}
                    className="inline-flex items-center gap-1 text-[11px] text-[#a795ff] hover:text-white"
                  >
                    Open source <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                  <button
                    onClick={() => copyCitation(n, c.document_name, c.page, c.citation_text)}
                    className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-fg-muted)] hover:text-white"
                  >
                    <Copy className="h-2.5 w-2.5" /> Copy
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
