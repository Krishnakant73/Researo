import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Report, ResearchSessionSummary } from "@/lib/types";
import { useActiveWorkspaceId } from "@/lib/hooks/use-workspace";

export function useResearchList() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery<ResearchSessionSummary[]>({
    queryKey: ["research", workspaceId],
    queryFn: () =>
      api.get<ResearchSessionSummary[]>("/api/v1/research/history"),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
}

export function useReports() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery<Report[]>({
    queryKey: ["reports", workspaceId],
    queryFn: () => api.get<Report[]>("/api/v1/reports"),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
}

export function useReport(id: string | undefined) {
  return useQuery<Report>({
    queryKey: ["report", id],
    queryFn: () => {
      if (!id) throw new Error("missing id");
      return api.get<Report>(`/api/v1/reports/${id}`);
    },
    enabled: !!id,
  });
}

export function useStartResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { question: string; document_ids?: string[] }) =>
      api.post<Report>("/api/v1/research/query", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
