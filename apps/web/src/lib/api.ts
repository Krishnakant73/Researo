/**
 * Thin fetch client for the Researo API.
 *
 * All requests hit NEXT_PUBLIC_API_URL (defaults to http://localhost:8000).
 * The client is intentionally small — it wraps fetch, adds JSON handling,
 * and normalises the {success, data, error} envelope from the backend.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const DEFAULT_WORKSPACE_ID = "ws_default";

// The active workspace is sent with every request as X-Workspace-Id so the
// backend scopes documents/research/reports/analytics to it. Rather than keep
// a copy that can drift out of sync with the store, the workspace store
// registers a getter that always returns the current active id at request
// time. This avoids the desync where the header lagged behind the selected
// workspace (which showed the wrong workspace's data).
let workspaceGetter: () => string = () => DEFAULT_WORKSPACE_ID;

export function registerWorkspaceGetter(fn: () => string) {
  workspaceGetter = fn;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  message?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }
  headers.set("accept", "application/json");
  headers.set("x-workspace-id", workspaceGetter() || DEFAULT_WORKSPACE_ID);

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    // Propagate user-initiated cancellations so callers can treat them
    // differently from real network failures.
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Upload cancelled", "ABORTED", 0);
    }
    throw new ApiError(
      "Network error — is the API running?",
      "NETWORK",
      0
    );
  }

  const text = await res.text();
  let body: ApiEnvelope<T> | null = null;
  try {
    body = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;
  } catch {
    body = null;
  }

  if (!res.ok || (body && body.success === false)) {
    const code = body?.error?.code || `HTTP_${res.status}`;
    const message = body?.error?.message || res.statusText || "Request failed";
    throw new ApiError(message, code, res.status);
  }

  if (body && "data" in body) return body.data as T;
  return body as unknown as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),
  postForm: <T>(path: string, form: FormData, signal?: AbortSignal) =>
    request<T>(path, { method: "POST", body: form, signal }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
