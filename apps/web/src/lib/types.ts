/**
 * Shared frontend types — mirror the backend Pydantic schemas.
 */

export type DocumentStatus =
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export interface DocumentSummary {
  id: string;
  name: string;
  filename: string;
  mime_type: string;
  size: number;
  status: DocumentStatus;
  pages: number;
  chunks: number;
  language: string;
  tags: string[];
  category?: string;
  author?: string;
  downloadable?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  page: number;
  chunk_index: number;
  text: string;
  token_count: number;
}

export type ResearchStatus =
  | "queued"
  | "running"
  | "planning"
  | "retrieving"
  | "ranking"
  | "curating"
  | "analyzing"
  | "validating"
  | "publishing"
  | "completed"
  | "failed";

export interface AgentStepView {
  agent: string;
  status: "waiting" | "running" | "completed" | "failed";
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  tokens?: number;
  model?: string;
  detail?: string;
}

export interface ResearchSessionSummary {
  id: string;
  title: string;
  question: string;
  status: ResearchStatus;
  confidence: number;
  document_count: number;
  citation_count: number;
  started_at: string;
  completed_at?: string;
}

export interface Citation {
  id: string;
  document_id: string;
  document_name: string;
  page: number;
  chunk_id: string;
  citation_text: string;
  confidence: number;
  section?: string;
}

export interface EvidenceItem {
  id: string;
  document_id: string;
  document_name: string;
  page: number;
  chunk_id: string;
  text: string;
  score: number;
  confidence: number;
  section?: string;
}

export interface Finding {
  id: string;
  claim: string;
  detail: string;
  confidence: number;
  citation_ids: string[];
  contradicts?: string[];
}

export interface Report {
  id: string;
  research_id: string;
  title: string;
  question: string;
  status: ResearchStatus;
  confidence: number;
  summary: string;
  executive_summary: string;
  methodology: string;
  key_findings: Finding[];
  contradictions: string[];
  recommendations: string[];
  follow_up_questions: string[];
  citations: Citation[];
  evidence: EvidenceItem[];
  agents: AgentStepView[];
  markdown: string;
  created_at: string;
}

export interface DashboardMetrics {
  research_count: number;
  document_count: number;
  research_this_week?: number;
  documents_this_week?: number;
  avg_confidence: number;
  citation_accuracy: number;
  total_tokens: number;
  total_cost_usd: number;
  activity: {
    date: string;
    research: number;
    documents: number;
    tokens?: number;
    confidence?: number;
  }[];
  agent_perf: { agent: string; success: number; failure: number; avg_ms: number }[];
  category_distribution?: { name: string; value: number }[];
  recent_research: ResearchSessionSummary[];
  recent_documents: DocumentSummary[];
}

export interface GraphNodeData {
  id: string;
  label: string;
  type: "research" | "document" | "entity" | "citation" | "finding";
  meta?: Record<string, unknown>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GraphPayload {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface SearchHit {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page: number;
  section?: string | null;
  text: string;
  score: number;
}

export interface AppSettings {
  default_model: string;
  fast_model: string;
  quality_model: string;
  top_k_dense: number;
  top_k_bm25: number;
  top_k_final: number;
  use_reranker: boolean;
  // Read-only status fields surfaced by the backend.
  llm_live: boolean;
  embedding_model: string;
  embedding_backend: string;
}

export type AppSettingsUpdate = Partial<
  Pick<
    AppSettings,
    | "default_model"
    | "fast_model"
    | "quality_model"
    | "top_k_dense"
    | "top_k_bm25"
    | "top_k_final"
    | "use_reranker"
  >
>;

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  plan: string;
  document_count: number;
  research_count: number;
  created_at: string;
  updated_at: string;
}
