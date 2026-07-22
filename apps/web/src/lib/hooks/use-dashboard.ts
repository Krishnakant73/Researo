import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardMetrics } from "@/lib/types";
import { useActiveWorkspaceId } from "@/lib/hooks/use-workspace";

export function useDashboard() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", workspaceId],
    queryFn: () => api.get<DashboardMetrics>("/api/v1/analytics/dashboard"),
    // Live-refresh so KPIs and charts stay current as research/uploads happen.
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
