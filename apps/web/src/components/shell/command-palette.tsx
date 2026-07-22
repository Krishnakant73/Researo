"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Search,
  Home,
  FileText,
  BookText,
  BarChart3,
  Network,
  Quote,
  Settings,
  FlaskConical,
  Sparkles,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/lib/hooks/use-documents";
import { useReports } from "@/lib/hooks/use-research";

type Item = {
  id: string;
  label: string;
  hint?: string;
  section: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const { data: documents } = useDocuments();
  const { data: reports } = useReports();

  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      { id: "n1", label: "Dashboard", section: "Navigate", icon: Home, href: "/" },
      { id: "n2", label: "Research", section: "Navigate", icon: FlaskConical, href: "/research" },
      { id: "n_search", label: "Search knowledge base", section: "Navigate", icon: Search, href: "/search" },
      { id: "n3", label: "Documents", section: "Navigate", icon: FileText, href: "/documents" },
      { id: "n4", label: "Reports", section: "Navigate", icon: BookText, href: "/reports" },
      { id: "n5", label: "Analytics", section: "Navigate", icon: BarChart3, href: "/analytics" },
      { id: "n6", label: "Knowledge Graph", section: "Navigate", icon: Network, href: "/graph" },
      { id: "n7", label: "Citations", section: "Navigate", icon: Quote, href: "/citations" },
      { id: "n8", label: "Settings", section: "Navigate", icon: Settings, href: "/settings" },
      { id: "a1", label: "Start new research", section: "Actions", icon: Sparkles, href: "/research" },
    ];
    for (const d of (documents ?? []).slice(0, 8)) {
      base.push({
        id: `d_${d.id}`,
        label: d.name,
        hint: `${d.pages} pages · ${d.author ?? "—"}`,
        section: "Documents",
        icon: FileText,
        href: `/documents/${d.id}`,
      });
    }
    for (const r of (reports ?? []).slice(0, 8)) {
      base.push({
        id: `r_${r.id}`,
        label: r.title,
        hint: `${Math.round(r.confidence * 100)}% confidence`,
        section: "Reports",
        icon: BookText,
        href: `/reports/${r.id}`,
      });
    }
    return base;
  }, [documents, reports]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const ql = q.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(ql) ||
        (i.hint || "").toLowerCase().includes(ql) ||
        i.section.toLowerCase().includes(ql)
    );
  }, [q, items]);

  useEffect(() => {
    setIdx(0);
  }, [q, open]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of filtered) {
      if (!m.has(it.section)) m.set(it.section, []);
      m.get(it.section)!.push(it);
    }
    return Array.from(m.entries());
  }, [filtered]);

  const flat = filtered;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = flat[idx];
      if (it) {
        onOpenChange(false);
        if (it.href) router.push(it.href);
        it.action?.();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="p-0 max-w-2xl overflow-hidden"
        aria-describedby={undefined}
      >
        <div className="flex items-center gap-2 border-b border-[color:var(--color-border)] px-3.5 py-2.5">
          <Search className="h-4 w-4 text-[color:var(--color-fg-muted)]" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search documents, reports, actions…"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-[color:var(--color-fg-muted)] focus:outline-none"
          />
          <kbd className="kbd">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {q.trim() && (
            <button
              onClick={() => {
                onOpenChange(false);
                router.push(`/search?q=${encodeURIComponent(q.trim())}`);
              }}
              className="mb-1 flex w-full items-center gap-2 rounded-md bg-[rgba(124,92,255,0.12)] px-2 py-2 text-left text-[13px] text-white transition-colors hover:bg-[rgba(124,92,255,0.2)]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#4dd0ff]" />
              <span className="flex-1 truncate">
                Search evidence for &ldquo;{q.trim()}&rdquo;
              </span>
              <kbd className="kbd">↵ search</kbd>
            </button>
          )}
          {grouped.length === 0 && !q.trim() && (
            <div className="px-3 py-8 text-center text-[13px] text-[color:var(--color-fg-muted)]">
              Type to search…
            </div>
          )}
          {grouped.map(([section, its]) => (
            <div key={section} className="mb-2">
              <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {section}
              </div>
              {its.map((it) => {
                const Icon = it.icon;
                const active = flat.indexOf(it) === idx;
                return (
                  <button
                    key={it.id}
                    onMouseEnter={() => setIdx(flat.indexOf(it))}
                    onClick={() => {
                      onOpenChange(false);
                      if (it.href) router.push(it.href);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                      active
                        ? "bg-[color:var(--color-bg-hover)] text-white"
                        : "text-[color:var(--color-fg-dim)] hover:bg-[color:var(--color-bg-hover)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.hint && (
                      <span className="text-[11px] text-[color:var(--color-fg-muted)]">
                        {it.hint}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[color:var(--color-border)] px-3 py-1.5 text-[11px] text-[color:var(--color-fg-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="kbd">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> Open</span>
          </div>
          <span className="flex items-center gap-1"><Command className="h-3 w-3" /> K to toggle</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
