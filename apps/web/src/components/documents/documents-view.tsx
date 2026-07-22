"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Upload,
  ArrowDownUp,
  MoreHorizontal,
  Trash2,
  Loader2,
  FolderClosed,
  Sparkles,
  Grid3x3,
  Rows,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDocuments,
  useDeleteDocument,
} from "@/lib/hooks/use-documents";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { formatBytes, formatRelative, cn } from "@/lib/utils";
import type { DocumentSummary } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";

const CATEGORIES_BASE = ["All", "AI Papers", "Annual Reports", "Climate", "Financial", "General", "Other"];

type SortKey = "newest" | "oldest" | "name" | "size" | "pages" | "chunks";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name (A–Z)" },
  { value: "size", label: "Largest" },
  { value: "pages", label: "Most pages" },
  { value: "chunks", label: "Most chunks" },
];
const STATUS_TONE: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  ready: "success",
  processing: "warn",
  uploading: "warn",
  failed: "danger",
  archived: "neutral",
};

export function DocumentsView() {
  const { data: docs = [], isLoading } = useDocuments();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  // Preselect the category if arriving from a clickable chart slice
  // (e.g. /documents?category=Climate).
  const [cat, setCat] = useState<string>(searchParams.get("category") ?? "All");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const del = useDeleteDocument();

  const categories = useMemo(() => {
    const set = new Set(CATEGORIES_BASE);
    docs.forEach((d) => d.category && set.add(d.category));
    if (cat) set.add(cat);
    return Array.from(set);
  }, [docs, cat]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = docs.filter((d) => {
      if (cat !== "All" && d.category !== cat) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.author?.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
    const time = (s: string) => new Date(s).getTime() || 0;
    const sorters: Record<SortKey, (a: DocumentSummary, b: DocumentSummary) => number> = {
      newest: (a, b) => time(b.updated_at) - time(a.updated_at),
      oldest: (a, b) => time(a.updated_at) - time(b.updated_at),
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => b.size - a.size,
      pages: (a, b) => b.pages - a.pages,
      chunks: (a, b) => b.chunks - a.chunks,
    };
    return [...out].sort(sorters[sort]);
  }, [docs, query, cat, sort]);

  const isFiltered = cat !== "All" || query.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-[1360px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">
            Documents
          </h1>
          <p className="text-[12.5px] text-[color:var(--color-fg-muted)]">
            {isFiltered ? (
              <>
                Showing {filtered.length} of {docs.length} ·{" "}
                <button
                  onClick={() => {
                    setCat("All");
                    setQuery("");
                  }}
                  className="text-[color:var(--color-accent)] hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                {docs.length} documents · {docs.filter((d) => d.status === "ready").length} indexed
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            className="gap-1.5"
            onClick={() => setShowUpload((v) => !v)}
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
          <Link href="/research">
            <Button variant="primary" size="md" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Research
            </Button>
          </Link>
        </div>
      </div>

      {showUpload && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <UploadDropzone onDone={() => toast.success("Document uploaded")} />
        </motion.div>
      )}

      <div className="panel p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--color-fg-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents, tags, authors…"
              className="h-8 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] pl-8 pr-2 text-[12.5px] text-white placeholder:text-[color:var(--color-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent-soft)]"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-0.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded px-2 py-1 text-[11.5px] font-medium transition-colors",
                  cat === c
                    ? "bg-[color:var(--color-bg-hover)] text-white"
                    : "text-[color:var(--color-fg-dim)] hover:text-white"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ArrowDownUp className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-0.5">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "grid h-6 w-6 place-items-center rounded",
                view === "grid" ? "bg-[color:var(--color-bg-hover)] text-white" : "text-[color:var(--color-fg-muted)]"
              )}
            >
              <Grid3x3 className="h-3 w-3" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "grid h-6 w-6 place-items-center rounded",
                view === "list" ? "bg-[color:var(--color-bg-hover)] text-white" : "text-[color:var(--color-fg-muted)]"
              )}
            >
              <Rows className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel h-[168px] p-4">
              <div className="h-4 w-2/3 rounded shimmer bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onUpload={() => setShowUpload(true)} />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((d) => (
            <DocumentCard
              key={d.id}
              doc={d}
              onDelete={() => del.mutate(d.id)}
              deleting={del.isPending && del.variables === d.id}
            />
          ))}
        </div>
      ) : (
        <div className="panel divide-y divide-[color:var(--color-border)] overflow-hidden">
          {filtered.map((d) => (
            <DocumentRow key={d.id} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({
  doc,
  onDelete,
  deleting,
}: {
  doc: DocumentSummary;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group panel relative overflow-hidden p-4 transition-all hover:-translate-y-[1px] hover:border-[color:var(--color-border-strong)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[color:var(--color-border)] bg-gradient-to-br from-[rgba(239,74,92,0.08)] to-[rgba(124,92,255,0.08)] text-[color:var(--color-fg-dim)]">
          {doc.status === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin text-[color:var(--color-warning)]" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/documents/${doc.id}`} className="block">
            <div className="truncate text-[13.5px] font-semibold text-white leading-tight">
              {doc.name}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-[color:var(--color-fg-muted)]">
              {doc.author ?? "Unknown"} · {formatBytes(doc.size)}
            </div>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconSm">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/documents/${doc.id}`}>Open</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[color:var(--color-danger)]"
              onSelect={onDelete}
            >
              <Trash2 className="h-3 w-3" /> {deleting ? "Deleting…" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-[10.5px]">
        <Stat label="Pages" value={doc.pages} />
        <Stat label="Chunks" value={doc.chunks} />
        <Stat label="Status" value={doc.status} status />
      </dl>

      <div className="mt-3 flex flex-wrap gap-1">
        {doc.tags.slice(0, 3).map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
        {doc.category && <Badge tone="accent">{doc.category}</Badge>}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10.5px] text-[color:var(--color-fg-muted)]">
        <span>Updated {formatRelative(doc.updated_at)}</span>
        <Link
          href={`/documents/${doc.id}`}
          className="text-[color:var(--color-fg-dim)] hover:text-white"
        >
          Open →
        </Link>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, status }: { label: string; value: number | string; status?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {label}
      </div>
      {status ? (
        <Badge tone={STATUS_TONE[String(value)] ?? "neutral"} className="mt-0.5 capitalize">
          {value}
        </Badge>
      ) : (
        <div className="mt-0.5 text-[13px] font-semibold text-white">{value}</div>
      )}
    </div>
  );
}

function DocumentRow({ doc }: { doc: DocumentSummary }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--color-bg-hover)]/60"
    >
      <FileText className="h-4 w-4 text-[color:var(--color-fg-muted)]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-white">{doc.name}</div>
        <div className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
          {doc.author ?? "Unknown"} · {doc.pages} pages · {doc.chunks} chunks
        </div>
      </div>
      <span className="hidden sm:inline text-[11px] text-[color:var(--color-fg-muted)]">
        {formatBytes(doc.size)}
      </span>
      <Badge tone={STATUS_TONE[doc.status] ?? "neutral"} className="capitalize">
        {doc.status}
      </Badge>
      <span className="hidden md:inline text-[11px] text-[color:var(--color-fg-muted)]">
        {formatRelative(doc.updated_at)}
      </span>
    </Link>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="panel grid place-items-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]">
        <FolderClosed className="h-5 w-5 text-[color:var(--color-fg-muted)]" />
      </div>
      <h3 className="mt-3 text-[15px] font-semibold text-white">
        No documents yet
      </h3>
      <p className="mt-1 max-w-md text-[13px] text-[color:var(--color-fg-dim)]">
        Upload PDFs and Researo will parse, chunk, embed and index them so you can ask evidence-backed questions.
      </p>
      <Button onClick={onUpload} variant="primary" size="md" className="mt-4 gap-1.5">
        <Upload className="h-3.5 w-3.5" /> Upload your first document
      </Button>
    </div>
  );
}
