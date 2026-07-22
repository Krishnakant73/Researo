import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppSettings, AppSettingsUpdate } from "@/lib/types";

export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: ["settings"],
    queryFn: () => api.get<AppSettings>("/api/v1/settings"),
    staleTime: 30_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AppSettingsUpdate) =>
      api.put<AppSettings>("/api/v1/settings", payload),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
    },
  });
}
