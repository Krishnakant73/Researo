import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DocumentChunk, DocumentSummary } from "@/lib/types";
import { useActiveWorkspaceId } from "@/lib/hooks/use-workspace";

export function useDocuments() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery<DocumentSummary[]>({
    queryKey: ["documents", workspaceId],
    // No demo fallback here: returning demo data on a transient error made the
    // real library "flash then disappear". On error we keep the last good list
    // (keepPreviousData) instead of swapping in fake documents.
    queryFn: () => api.get<DocumentSummary[]>("/api/v1/documents"),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    // Keep the library live so uploads and status changes appear without a
    // manual reload.
    refetchInterval: 10_000,
  });
}

export function useDocumentChunks(id: string | undefined) {
  return useQuery<DocumentChunk[]>({
    queryKey: ["document-chunks", id],
    queryFn: () => api.get<DocumentChunk[]>(`/api/v1/documents/${id}/chunks`),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, signal }: { file: File; signal?: AbortSignal }) => {
      const form = new FormData();
      form.append("file", file);
      return api.postForm<DocumentSummary>(
        "/api/v1/documents/upload",
        form,
        signal
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useReindexDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<DocumentSummary>(`/api/v1/documents/${id}/reindex`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document-chunks"] });
    },
  });
}
