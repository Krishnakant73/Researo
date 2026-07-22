"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Search as SearchIcon,
  Loader2,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearch } from "@/lib/hooks/use-search";
import { useDocuments } from "@/lib/hooks/use-documents";
import type { SearchHit } from "@/lib/types";

function highlight(text: string, query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/gi, ""))
    .filter((t) => t.length > 2);
  if (terms.length === 0) return text;
  const re = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark
        key={i}
        className="rounded bg-[color:var(--color-accent)]/25 px-0.5 text-white"
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function SearchView() {
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [scope, setScope] = useState<string>("all");
  const [submitted, setSubmitted] = useState("");
  const search = useSearch();
  const { data: documents } = useDocuments();

  const results = search.data ?? [];

  const runSearch = (q: string, docScope: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSubmitted(trimmed);
    search.mutate({
      query: trimmed,
      top_k: 15,
      document_ids: docScope === "all" ? undefined : [docScope],
    });
  };

  // Auto-run when arriving with a ?q= param (e.g. from the command palette).
  const autoRan = useRef(false);
  useEffect(() => {
    if (initialQ && !autoRan.current) {
      autoRan.current = true;
      runSearch(initialQ, "all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query, scope);
  };

  const scopeName = useMemo(() => {
    if (scope === "all") return null;
    return documents?.find((d) => d.id === scope)?.name ?? null;
  }, [scope, documents]);

  return (
    <div className="mx-auto max-w-[900px]">
      <form onSubmit={onSubmit} className="panel p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-fg-muted)]" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your knowledge base semantically…"
              className="pl-9"
            />
          </div>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="All documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All documents</SelectItem>
              {(documents ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="gap-1.5"
            disabled={search.isPending || !query.trim()}
          >
            {search.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SearchIcon className="h-3.5 w-3.5" />
            )}
            Search
          </Button>
        </div>
        <p className="mt-2 text-[11.5px] text-[color:var(--color-fg-muted)]">
          Hybrid retrieval — dense embeddings fused with BM25 lexical ranking
          {scopeName ? ` · scoped to ${scopeName}` : ""}.
        </p>
      </form>

      <div className="mt-4">
        {search.isError && (
          <div className="rounded-md border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/10 p-3 text-[12.5px] text-[color:var(--color-danger)]">
            Search failed. Is the API running?
          </div>
        )}

        {!search.isPending && submitted && results.length === 0 && !search.isError && (
          <div className="panel flex flex-col items-center gap-2 p-10 text-center">
            <SearchIcon className="h-6 w-6 text-[color:var(--color-fg-muted)]" />
            <div className="text-[13px] font-medium text-white">
              No matches for &ldquo;{submitted}&rdquo;
            </div>
            <p className="max-w-sm text-[12px] text-[color:var(--color-fg-muted)]">
              Try different keywords, or upload more documents to expand the
              knowledge base.
            </p>
          </div>
        )}

        {!submitted && !search.isPending && (
          <div className="panel flex flex-col items-center gap-2 p-10 text-center">
            <Sparkles className="h-6 w-6 text-[#4dd0ff]" />
            <div className="text-[13px] font-medium text-white">
              Search across your evidence
            </div>
            <p className="max-w-sm text-[12px] text-[color:var(--color-fg-muted)]">
              Ask a question or enter keywords to find the most relevant passages
              from your indexed documents, ranked by semantic + lexical relevance.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[12px] text-[color:var(--color-fg-muted)]">
                {results.length} passage{results.length === 1 ? "" : "s"} for
                &ldquo;{submitted}&rdquo;
              </span>
            </div>
            <ul className="space-y-2">
              {results.map((hit, i) => (
                <SearchResult key={hit.chunk_id} hit={hit} rank={i} query={submitted} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function SearchResult({
  hit,
  rank,
  query,
}: {
  hit: SearchHit;
  rank: number;
  query: string;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.3) }}
      className="panel p-3.5"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-[color:var(--color-fg-muted)]" />
        <Link
          href={`/documents/${hit.document_id}`}
          className="truncate text-[12.5px] font-medium text-white hover:text-[color:var(--color-accent)]"
        >
          {hit.document_name || "Document"}
        </Link>
        <span className="text-[11px] text-[color:var(--color-fg-muted)]">
          p.{hit.page}
          {hit.section ? ` · ${hit.section}` : ""}
        </span>
        <Badge tone="neutral" className="ml-auto">
          {(hit.score * 100).toFixed(1)}% match
        </Badge>
      </div>
      <p className="text-[12.5px] leading-relaxed text-[color:var(--color-fg-dim)]">
        {highlight(hit.text.slice(0, 480), query)}
        {hit.text.length > 480 ? "…" : ""}
      </p>
      <div className="mt-2">
        <Link
          href={`/documents/${hit.document_id}`}
          className="inline-flex items-center gap-1 text-[11.5px] text-[color:var(--color-accent)] hover:underline"
        >
          Open document <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.li>
  );
}
