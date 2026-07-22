import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  api,
  DEFAULT_WORKSPACE_ID,
  registerWorkspaceGetter,
} from "@/lib/api";
import type { Workspace } from "@/lib/types";

/* ─── Active workspace store (persisted to localStorage) ──────────────────── */

interface WorkspaceStore {
  activeId: string;
  setActiveId: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeId: DEFAULT_WORKSPACE_ID,
      setActiveId: (id: string) => set({ activeId: id || DEFAULT_WORKSPACE_ID }),
    }),
    {
      name: "researo.workspace",
    }
  )
);

// The API client reads the active workspace from the store at request time, so
// the X-Workspace-Id header can never lag behind the selected workspace.
registerWorkspaceGetter(() => useWorkspaceStore.getState().activeId);

/** Active workspace id, subscribed so consumers re-render (and queries with
 * this id in their key refetch) when the workspace switches. */
export function useActiveWorkspaceId(): string {
  return useWorkspaceStore((s) => s.activeId);
}

/* ─── React-query hooks ───────────────────────────────────────────────────── */

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => api.get<Workspace[]>("/api/v1/workspaces"),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      color?: string;
      plan?: string;
    }) => api.post<Workspace>("/api/v1/workspaces", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      color?: string;
      plan?: string;
    }) => api.patch<Workspace>(`/api/v1/workspaces/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/workspaces/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
