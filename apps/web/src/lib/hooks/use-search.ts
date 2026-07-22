import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SearchHit } from "@/lib/types";

export interface SearchParams {
  query: string;
  top_k?: number;
  document_ids?: string[];
}

/**
 * Hybrid semantic + lexical search against the active workspace.
 *
 * Uses a mutation rather than a query because search is user-triggered
 * (submit a query) rather than driven by a stable key. The workspace is
 * resolved server-side from the X-Workspace-Id header set by the api client.
 */
export function useSearch() {
  return useMutation<SearchHit[], Error, SearchParams>({
    mutationFn: ({ query, top_k = 12, document_ids }: SearchParams) =>
      api.post<SearchHit[]>("/api/v1/search", {
        query,
        top_k,
        document_ids,
      }),
  });
}
