"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, FileText, ExternalLink, Layers, Sparkles, Loader2 } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import {
  useDocuments,
  useDocumentChunks,
  useReindexDocument,
} from "@/lib/hooks/use-documents";
import { useReports } from "@/lib/hooks/use-research";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/api";
import { formatBytes, formatRelative } from "@/lib/utils";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useDocuments();
  const { data: reports } = useReports();
  const doc = data?.find((d) => d.id === params.id);
  const { data: chunks } = useDocumentChunks(params.id);
  const reindex = useReindexDocument();
  const [downloading, setDownloading] = useState(false);
  const citedIn = (reports ?? []).filter((r) =>
    r.citations.some((c) => c.document_id === params.id)
  );

  const onReindex = async () => {
    try {
      await reindex.mutateAsync(params.id);
      toast.success("Document reindexed");
    } catch {
      toast.error("Reindex failed");
    }
  };

  const onDownload = async () => {
    if (!doc) return;
    if (doc.downloadable === false) {
      toast.error("This sample document has no downloadable source file.");
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/${doc.id}/download`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename || `${doc.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Source file is not available for download.");
    } finally {
      setDownloading(false);
    }
  };

  if (!doc) {
    return (
      <>
        <Topbar title="Document" subtitle="Document detail" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1200px]">
            <Link
              href="/documents"
              className="mb-4 inline-flex items-center gap-1 text-[12px] text-[color:var(--color-fg-muted)] hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" /> Back to documents
            </Link>
            <div className="panel grid place-items-center px-6 py-16 text-center">
              <FileText className="h-6 w-6 text-[color:var(--color-fg-muted)]" />
              <p className="mt-2 text-[13px] text-[color:var(--color-fg-dim)]">
                {isLoading
                  ? "Loading document…"
                  : "Document not found in this workspace."}
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title={doc.name} subtitle="Document detail" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-[1200px]">
          <Link
            href="/documents"
            className="mb-4 inline-flex items-center gap-1 text-[12px] text-[color:var(--color-fg-muted)] hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> Back to documents
          </Link>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <motion.section
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel p-5"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-[color:var(--color-border)] bg-gradient-to-br from-[rgba(239,74,92,0.08)] to-[rgba(124,92,255,0.08)]">
                  <FileText className="h-5 w-5 text-[color:var(--color-fg-dim)]" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-[18px] font-semibold text-white">
                    {doc.name}
                  </h1>
                  <p className="mt-0.5 text-[12px] text-[color:var(--color-fg-muted)]">
                    {doc.author ?? "Unknown"} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Pages" value={doc.pages} />
                <Stat label="Chunks" value={doc.chunks} />
                <Stat label="Size" value={formatBytes(doc.size)} />
                <Stat label="Language" value={doc.language.toUpperCase()} />
              </div>

              <div className="mt-5">
                <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                  Tags
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {doc.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                  {doc.category && <Badge tone="accent">{doc.category}</Badge>}
                </div>
              </div>

              <div className="mt-5 border-t border-[color:var(--color-border)] pt-4">
                <h3 className="text-[13px] font-semibold text-white">
                  Indexed chunks
                </h3>
                <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
                  {chunks ? `${chunks.length} shown` : "Loading…"} · the actual
                  semantic chunks stored in the vector index.
                </p>
                <div className="mt-3 space-y-2">
                  {(chunks ?? []).slice(0, 8).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3"
                    >
                      <div className="flex items-center justify-between text-[10.5px] text-[color:var(--color-fg-muted)]">
                        <span>
                          Chunk {c.chunk_index + 1} · Page {c.page}
                        </span>
                        <span className="font-mono">{c.token_count} tokens</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--color-fg-dim)]">
                        {c.text.length > 320 ? c.text.slice(0, 320) + "…" : c.text}
                      </p>
                    </div>
                  ))}
                  {chunks && chunks.length === 0 && (
                    <p className="text-[12px] text-[color:var(--color-fg-muted)]">
                      No chunks indexed for this document.
                    </p>
                  )}
                </div>
              </div>
            </motion.section>

            <motion.aside
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-4"
            >
              <div className="panel p-4">
                <h3 className="text-[13px] font-semibold text-white">Actions</h3>
                <div className="mt-3 flex flex-col gap-2">
                  <Link href={`/research?doc=${encodeURIComponent(doc.id)}`}>
                    <Button variant="primary" size="md" className="w-full gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Research this document
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full gap-1.5"
                    disabled={reindex.isPending}
                    onClick={onReindex}
                  >
                    {reindex.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Layers className="h-3.5 w-3.5" />
                    )}
                    Reindex chunks
                  </Button>
                  {doc.downloadable !== false && (
                    <Button
                      variant="ghost"
                      size="md"
                      className="w-full gap-1.5"
                      disabled={downloading}
                      onClick={onDownload}
                    >
                      {downloading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      Download source
                    </Button>
                  )}
                </div>
              </div>

              <div className="panel p-4">
                <h3 className="text-[13px] font-semibold text-white">Cited in</h3>
                {citedIn.length === 0 ? (
                  <p className="mt-2 text-[12px] text-[color:var(--color-fg-muted)]">
                    Not cited yet. Run research to generate citations.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {citedIn.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/reports/${r.id}`}
                          className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[color:var(--color-bg-hover)]"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
                          <span className="flex-1 truncate text-[12px] text-white">
                            {r.title}
                          </span>
                          <span className="text-[10.5px] text-[color:var(--color-fg-muted)]">
                            {formatRelative(r.created_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.aside>
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3">
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {label}
      </div>
      <div className="mt-1 text-[16px] font-semibold text-white">{value}</div>
    </div>
  );
}


