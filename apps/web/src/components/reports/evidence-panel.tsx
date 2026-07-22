"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  ChevronDown,
  ExternalLink,
  Layers,
  Gauge,
} from "lucide-react";
import type { Report, EvidenceItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EvidencePanel({
  report,
  activeCitationId,
}: {
  report: Report;
  activeCitationId: string | null;
}) {
  const [filterDoc, setFilterDoc] = useState<string | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Group evidence by document for the "sources map".
  const groups = useMemo(() => {
    const m = new Map<
      string,
      { id: string; name: string; pages: Set<number>; count: number }
    >();
    for (const e of report.evidence) {
      const g = m.get(e.document_id) ?? {
        id: e.document_id,
        name: e.document_name,
        pages: new Set<number>(),
        count: 0,
      };
      g.pages.add(e.page);
      g.count += 1;
      m.set(e.document_id, g);
    }
    return Array.from(m.values());
  }, [report.evidence]);

  // The chunk referenced by the currently-active citation (for highlighting).
  const activeChunkId = useMemo(() => {
    if (!activeCitationId) return null;
    const c = report.citations.find((x) => x.id === activeCitationId);
    return c?.chunk_id ?? null;
  }, [activeCitationId, report.citations]);

  // When a citation is activated, expand + scroll its matching evidence card.
  useEffect(() => {
    if (!activeChunkId) return;
    const target = report.evidence.find((e) => e.chunk_id === activeChunkId);
    if (!target) return;
    setFilterDoc("all");
    setExpanded((s) => ({ ...s, [target.id]: true }));
    const el = cardRefs.current.get(target.id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeChunkId, report.evidence]);

  const items =
    filterDoc === "all"
      ? report.evidence
      : report.evidence.filter((e) => e.document_id === filterDoc);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          <Layers className="h-3.5 w-3.5" />
          Evidence · {report.evidence.length}
        </div>
      </div>

      {/* Sources map */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <SourceChip
          active={filterDoc === "all"}
          onClick={() => setFilterDoc("all")}
          label="All sources"
          sub={`${report.evidence.length}`}
        />
        {groups.map((g) => (
          <SourceChip
            key={g.id}
            active={filterDoc === g.id}
            onClick={() => setFilterDoc(g.id)}
            label={g.name}
            sub={`${g.count} · p.${Math.min(...g.pages)}${g.pages.size > 1 ? `–${Math.max(...g.pages)}` : ""}`}
          />
        ))}
      </div>

      <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {items.map((e) => {
          const n = report.citations.findIndex((c) => c.chunk_id === e.chunk_id);
          const active = activeChunkId === e.chunk_id;
          return (
            <EvidenceCard
              key={e.id}
              item={e}
              citationNumber={n >= 0 ? n + 1 : null}
              active={active}
              expanded={!!expanded[e.id]}
              onToggle={() => setExpanded((s) => ({ ...s, [e.id]: !s[e.id] }))}
              registerRef={(el) => {
                if (el) cardRefs.current.set(e.id, el);
                else cardRefs.current.delete(e.id);
              }}
            />
          );
        })}
        {items.length === 0 && (
          <p className="py-6 text-center text-[12px] text-[color:var(--color-fg-muted)]">
            No evidence for this source.
          </p>
        )}
      </div>
    </div>
  );
}

function SourceChip({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex max-w-[190px] items-center gap-1.5 rounded-lg border px-2 py-1 text-left transition-colors",
        active
          ? "border-[rgba(124,92,255,0.4)] bg-[color:var(--color-accent-soft)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] hover:bg-[color:var(--color-bg-hover)]"
      )}
    >
      <FileText className="h-3 w-3 shrink-0 text-[color:var(--color-fg-muted)]" />
      <span className={cn("truncate text-[11px]", active ? "text-white" : "text-[color:var(--color-fg-dim)]")}>
        {label}
      </span>
      <span className="shrink-0 text-[10px] text-[color:var(--color-fg-muted)]">{sub}</span>
    </button>
  );
}

function EvidenceCard({
  item,
  citationNumber,
  active,
  expanded,
  onToggle,
  registerRef,
}: {
  item: EvidenceItem;
  citationNumber: number | null;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const chunkShort = item.chunk_id.split("_").slice(-1)[0]?.slice(0, 8) ?? item.chunk_id;
  return (
    <motion.div
      ref={registerRef}
      layout
      animate={
        active
          ? { boxShadow: "0 0 0 1px rgba(124,92,255,0.5)" }
          : { boxShadow: "0 0 0 0px rgba(124,92,255,0)" }
      }
      className={cn(
        "overflow-hidden rounded-lg border",
        active
          ? "border-[rgba(124,92,255,0.5)] bg-[color:var(--color-accent-soft)]"
          : "border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]"
      )}
    >
      <button onClick={onToggle} className="flex w-full items-start gap-2 p-2.5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {citationNumber && (
              <span className="font-semibold text-[11px] text-[color:var(--color-accent)]">
                [{citationNumber}]
              </span>
            )}
            <span className="truncate text-[12px] font-medium text-white">
              {item.document_name}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-[color:var(--color-fg-muted)]">
            <span>Page {item.page}</span>
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-2.5 w-2.5" /> {Math.round(item.confidence * 100)}% conf
            </span>
            <span>score {item.score.toFixed(3)}</span>
            <span className="font-mono">#{chunkShort}</span>
          </div>
          {!expanded && (
            <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-[color:var(--color-fg-dim)]">
              {item.text}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-fg-muted)] transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5">
              <blockquote className="rounded border-l-2 border-[color:var(--color-accent)] bg-[rgba(124,92,255,0.06)] px-2.5 py-2 text-[12px] leading-relaxed text-[color:var(--color-fg-dim)]">
                {item.text}
              </blockquote>
              <div className="mt-2">
                <Link
                  href={`/documents/${item.document_id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)] hover:text-white"
                >
                  <ExternalLink className="h-3 w-3" /> View source &amp; context
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
