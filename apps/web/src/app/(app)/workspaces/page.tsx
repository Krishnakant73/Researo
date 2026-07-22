"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Check,
  Pencil,
  Trash2,
  FileText,
  FlaskConical,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { Topbar } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useWorkspaces,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  useWorkspaceStore,
} from "@/lib/hooks/use-workspace";
import { DEFAULT_WORKSPACE_ID } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function WorkspacesPage() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);

  const list = workspaces ?? [];

  const onSwitch = (ws: Workspace) => {
    if (ws.id === activeId) return;
    setActiveId(ws.id);
    toast.success(`Switched to ${ws.name}`);
  };

  return (
    <>
      <Topbar
        title="Workspaces"
        subtitle="Create and manage isolated research workspaces"
      />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-white">
                Your workspaces
              </h2>
              <p className="text-[12px] text-[color:var(--color-fg-muted)]">
                Documents, research and reports are scoped per workspace.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> New workspace
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-[12px] text-[color:var(--color-fg-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading workspaces…
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((ws) => {
                const isActive = ws.id === activeId;
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "panel flex flex-col gap-3 p-4 transition-colors",
                      isActive &&
                        "ring-1 ring-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#7c5cff] to-[#4dd0ff] text-[13px] font-semibold text-white">
                        {(ws.color || ws.name[0] || "W").slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-[13.5px] font-semibold text-white">
                            {ws.name}
                          </h3>
                          {isActive && <Badge tone="success">Active</Badge>}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11.5px] text-[color:var(--color-fg-muted)]">
                          {ws.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-fg-dim)]">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {ws.document_count} docs
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" /> {ws.research_count}{" "}
                        research
                      </span>
                      <Badge tone="neutral">{ws.plan}</Badge>
                    </div>

                    <div className="mt-auto flex items-center gap-1.5 pt-1">
                      <Button
                        variant={isActive ? "secondary" : "primary"}
                        size="sm"
                        className="flex-1 gap-1"
                        disabled={isActive}
                        onClick={() => onSwitch(ws)}
                      >
                        {isActive ? (
                          <>
                            <Check className="h-3 w-3" /> Current
                          </>
                        ) : (
                          "Switch to"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => setEditing(ws)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteButton ws={ws} activeId={activeId} onLeftActive={() => setActiveId(DEFAULT_WORKSPACE_ID)} />
                    </div>
                  </motion.div>
                );
              })}

              {list.length === 0 && (
                <div className="panel col-span-full flex flex-col items-center gap-2 py-12 text-center">
                  <FolderKanban className="h-6 w-6 text-[color:var(--color-fg-muted)]" />
                  <div className="text-[13px] font-medium text-white">
                    No workspaces yet
                  </div>
                  <div className="text-[11.5px] text-[color:var(--color-fg-muted)]">
                    Create your first workspace to get started.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <WorkspaceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
      />
      <WorkspaceFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        mode="edit"
        workspace={editing}
      />
    </>
  );
}

function DeleteButton({
  ws,
  activeId,
  onLeftActive,
}: {
  ws: Workspace;
  activeId: string;
  onLeftActive: () => void;
}) {
  const del = useDeleteWorkspace();
  const isDefault = ws.id === DEFAULT_WORKSPACE_ID;

  const onDelete = async () => {
    if (isDefault) return;
    if (!confirm(`Delete "${ws.name}"? This cannot be undone.`)) return;
    try {
      await del.mutateAsync(ws.id);
      if (activeId === ws.id) onLeftActive();
      toast.success("Workspace deleted");
    } catch {
      toast.error("Could not delete workspace");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      title={isDefault ? "The default workspace can't be deleted" : "Delete"}
      disabled={isDefault || del.isPending}
      onClick={onDelete}
    >
      {del.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function WorkspaceFormDialog({
  open,
  onOpenChange,
  mode,
  workspace,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  workspace?: Workspace | null;
}) {
  const create = useCreateWorkspace();
  const update = useUpdateWorkspace();
  const setActiveId = useWorkspaceStore((s) => s.setActiveId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");

  // Sync form when opening for edit.
  const [initFor, setInitFor] = useState<string | null>(null);
  if (open && mode === "edit" && workspace && initFor !== workspace.id) {
    setName(workspace.name);
    setDescription(workspace.description || "");
    setColor(workspace.color || "");
    setInitFor(workspace.id);
  }
  if (open && mode === "create" && initFor !== "__create__") {
    setName("");
    setDescription("");
    setColor("");
    setInitFor("__create__");
  }
  if (!open && initFor !== null) setInitFor(null);

  const pending = create.isPending || update.isPending;

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    try {
      if (mode === "create") {
        const ws = await create.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          color: color.trim() || undefined,
        });
        setActiveId(ws.id);
        toast.success(`Created "${ws.name}"`);
      } else if (workspace) {
        await update.mutateAsync({
          id: workspace.id,
          name: name.trim(),
          description: description.trim(),
          color: color.trim(),
        });
        toast.success("Workspace updated");
      }
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New workspace" : "Edit workspace"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Workspaces keep documents and research separate."
              : "Update this workspace's details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-white">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Climate Research"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-white">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional — what this workspace is for"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-white">
              Avatar label
            </label>
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value.slice(0, 2))}
              placeholder="1–2 characters, e.g. CR"
              maxLength={2}
              className="w-32"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="gap-1.5"
            disabled={pending}
            onClick={onSubmit}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "create" ? "Create workspace" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
