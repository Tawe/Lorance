// =============================================================================
// Document Intelligence Types
// =============================================================================

export interface DocumentChunk {
  objectID: string;
  record_type: 'doc_chunk';
  content: string;
  source_type: 'slack' | 'email' | 'prd' | 'meeting' | 'other';
  document_id: string;
  chunk_id: string;
  timestamp: number;
  workspace_id: string;
  action_signal_score?: number;
  title?: string;
  author?: string;
}

export interface TicketRecord {
  objectID: string;
  record_type: 'ticket';
  title: string;
  description: string;
  type: 'decision' | 'task' | 'user_story' | 'bug' | 'spike' | 'infrastructure';
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  dependencies: string[];
  confidence: number;
  citations: Array<{ document_id: string; chunk_id: string }>;
  suggested_assignee?: string;
  assignee?: string;
  estimated_effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  acceptance_criteria?: string[];
  known_edge_cases?: string[];
  open_questions?: string[];
  setup_requirements?: Array<{
    description: string;
    type: string;
    resolved: boolean;
  }>;
  citation_keys?: string[];
  workspace_id: string;
  readiness?: 'ready' | 'partially_blocked' | 'blocked';
  readiness_reason?: string;
  suggested_dependencies?: string[];
  stakeholders?: string[];
  is_derived?: boolean;
  derived_rationale?: string;
  source_mode?: 'grounded' | 'synthetic';
}
