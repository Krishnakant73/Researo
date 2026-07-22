"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, FileText, X, CheckCircle2, Loader2, Ban } from "lucide-react";
import { toast } from "sonner";
import { useUploadDocument } from "@/lib/hooks/use-documents";
import { ApiError, API_URL } from "@/lib/api";
import { formatBytes, cn } from "@/lib/utils";

type UploadStatus =
  | "pending"
  | "uploading"
  | "done"
  | "failed"
  | "cancelled";

interface UploadState {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  controller: AbortController;
  error?: string;
}

// Accepted upload formats. Mirrors the backend parser (app/parsing/pdf.py).
const ACCEPT = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt", ".md", ".log"],
  "text/markdown": [".md", ".markdown"],
  "text/csv": [".csv"],
  "text/tab-separated-values": [".tsv"],
  "application/json": [".json"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
};

export function UploadDropzone({ onDone }: { onDone?: () => void }) {
  const [items, setItems] = useState<UploadState[]>([]);
  const uploader = useUploadDocument();
  const counter = useRef(0);

  const patch = useCallback(
    (id: string, changes: Partial<UploadState>) => {
      setItems((cur) => cur.map((c) => (c.id === id ? { ...c, ...changes } : c)));
    },
    []
  );

  const runUpload = useCallback(
    async (state: UploadState) => {
      patch(state.id, { status: "uploading", progress: 30 });

      // Fake a smooth progress since fetch upload progress isn't surfaced.
      const timer = setInterval(() => {
        setItems((cur) =>
          cur.map((c) =>
            c.id === state.id && c.status === "uploading" && c.progress < 88
              ? { ...c, progress: c.progress + 6 }
              : c
          )
        );
      }, 220);

      try {
        await uploader.mutateAsync({
          file: state.file,
          signal: state.controller.signal,
        });
        clearInterval(timer);
        patch(state.id, { status: "done", progress: 100 });
        onDone?.();
      } catch (e) {
        clearInterval(timer);
        // User cancelled — leave it marked cancelled, don't fake success.
        if (e instanceof ApiError && e.code === "ABORTED") {
          patch(state.id, { status: "cancelled" });
          return;
        }
        // Can't reach the API at all — backend down/asleep, wrong API URL, or
        // a blocked CORS preflight. Report it honestly instead of faking a
        // "done": the fake success made uploads vanish because nothing was
        // ever persisted, and hid the real connectivity problem.
        if (e instanceof ApiError && e.code === "NETWORK") {
          patch(state.id, {
            status: "failed",
            error: "Couldn't reach the API",
          });
          toast.error("Can't reach the backend", {
            description: `The upload never reached ${API_URL}. Make sure the API is awake and that NEXT_PUBLIC_API_URL and CORS_ORIGINS are set correctly.`,
          });
          return;
        }
        // The API is reachable but the upload failed (server error, unsupported
        // file, etc.) — report it accurately instead of pretending it worked.
        patch(state.id, { status: "failed", error: (e as Error)?.message });
        toast.error("Upload failed", {
          description:
            e instanceof ApiError ? e.message : "Please try again.",
        });
      }
    },
    [uploader, onDone, patch]
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      const staged: UploadState[] = accepted.map((f) => ({
        id: `up_${Date.now().toString(36)}_${counter.current++}`,
        file: f,
        progress: 0,
        status: "pending" as const,
        controller: new AbortController(),
      }));
      setItems((cur) => [...cur, ...staged]);
      staged.forEach(runUpload);
    },
    [runUpload]
  );

  const cancelUpload = useCallback((item: UploadState) => {
    item.controller.abort();
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((cur) => cur.filter((c) => c.id !== id));
  }, []);

  const onReject = useCallback((rejections: { file: File }[]) => {
    if (rejections.length) {
      toast.error("Some files were rejected", {
        description: "Unsupported type or larger than 50MB.",
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: onReject,
    accept: ACCEPT,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="panel p-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors cursor-pointer",
          isDragActive
            ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]"
            : "border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elev)]/50 hover:border-[color:var(--color-accent)] hover:bg-[color:var(--color-bg-hover)]"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)]">
            <Upload className="h-4 w-4 text-[color:var(--color-accent)]" />
          </div>
          <div className="text-[14px] font-medium text-white">
            {isDragActive
              ? "Drop to upload"
              : "Drop files to index"}
          </div>
          <div className="text-[11px] text-[color:var(--color-fg-muted)]">
            PDF, DOCX, TXT, MD, CSV, TSV, XLSX, JSON · or click to browse · max
            50MB per file
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((it) => {
            const active = it.status === "pending" || it.status === "uploading";
            return (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2"
              >
                <FileText className="h-4 w-4 text-[color:var(--color-fg-muted)] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] text-white">
                      {it.file.name}
                    </span>
                    <span className="text-[10.5px] text-[color:var(--color-fg-muted)]">
                      {it.status === "cancelled"
                        ? "Cancelled"
                        : formatBytes(it.file.size)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        it.status === "failed"
                          ? "bg-[color:var(--color-danger)]"
                          : it.status === "cancelled"
                          ? "bg-[color:var(--color-fg-muted)]"
                          : "bg-gradient-to-r from-[#7c5cff] to-[#4dd0ff]"
                      )}
                      style={{
                        width: `${
                          it.status === "cancelled" ? 100 : it.progress
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Status icon */}
                {it.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)] shrink-0" />
                ) : it.status === "failed" ? (
                  <X className="h-4 w-4 text-[color:var(--color-danger)] shrink-0" />
                ) : it.status === "cancelled" ? (
                  <Ban className="h-4 w-4 text-[color:var(--color-fg-muted)] shrink-0" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-[color:var(--color-accent)] shrink-0" />
                )}

                {/* Action button: cancel while active, otherwise remove */}
                <button
                  type="button"
                  onClick={() =>
                    active ? cancelUpload(it) : removeItem(it.id)
                  }
                  title={active ? "Cancel upload" : "Remove from list"}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[color:var(--color-fg-muted)] transition-colors hover:bg-[color:var(--color-bg-hover)] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
