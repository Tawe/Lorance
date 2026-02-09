// =============================================================================
// Shared Types for Lorance Project
// =============================================================================

// =============================================================================
// Document Types
// =============================================================================

export type DocType = 'prd' | 'meeting' | 'architecture' | 'tech_stack' | 'requirements';

export interface ProjectDocument {
  objectID: string;
  content: string;
  doc_type: DocType;
  title?: string;
  timestamp: string;
  author?: string;
  workspace_id?: string;
  owner_uid?: string;
}

// =============================================================================
// Ticket Types
// =============================================================================

export type TicketType = 'user_story' | 'task' | 'bug' | 'spike' | 'infrastructure' | 'decision';
export type EffortSize = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Readiness = 'ready' | 'partially_blocked' | 'blocked';
export type SetupRequirementType = 'external_system' | 'prior_ticket' | 'decision' | 'schema' | 'other';

export interface SetupRequirement {
  description: string;
  type: SetupRequirementType;
  resolved: boolean;
}

export type SourceMode = 'grounded' | 'synthetic';

export interface TicketCitation {
  document_id: string;
  chunk_id: string;
  line_start?: number;
  line_end?: number;
}

export interface Ticket {
  id: string;

  // -- Canonical required fields (every ticket MUST have these) --
  title: string;
  description: string;
  type: TicketType;
  acceptance_criteria: string[];
  known_edge_cases: string[];
  open_questions: string[];
  setup_requirements: SetupRequirement[];
  dependencies: string[];              // title refs to blocking tickets
  estimated_effort: EffortSize;
  priority: Priority;
  labels: string[];
  suggested_assignee: string;          // role/team responsible
  confidence: number;                  // 0.0–1.0
  citations: TicketCitation[];         // structured objects, not strings

  // -- Derived/computed fields --
  citation_keys: string[];             // "doc_id:chunk_id" strings for indexing

  // -- Optional metadata (useful but not part of core contract) --
  stakeholders?: string[];
  suggested_dependencies?: string[];
  is_derived?: boolean;
  derived_rationale?: string;
  readiness?: Readiness;
  readiness_reason?: string;
  source_docs?: string[];
  source_mode?: SourceMode;
  workspace_id?: string;
  owner_uid?: string;
}

// =============================================================================
// Export Types
// =============================================================================

export type ExportPlatform = 'linear' | 'jira' | 'github';

export interface LinearCredentials {
  apiKey: string;
  teamId: string;
}

export interface JiraCredentials {
  email: string;
  token: string;
  domain: string;
  projectKey: string;
}

export interface GitHubCredentials {
  token: string;
  owner: string;
  repo: string;
}

export interface ExportResult {
  success: boolean;
  issue?: {
    id: string | number;
    identifier?: string;
    key?: string;
    number?: number;
    url?: string;
    html_url?: string;
  };
  error?: string;
}

export interface ExportSummary {
  total: number;
  successful: number;
  failed: number;
}

export interface ExportResponse {
  success: boolean;
  results: ExportResult[];
  summary: ExportSummary;
  error?: string;
}

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

  // -- Canonical fields --
  title: string;
  description: string;
  type: 'decision' | 'task' | 'user_story' | 'bug' | 'spike' | 'infrastructure';
  priority: 'critical' | 'high' | 'medium' | 'low';
  labels: string[];
  dependencies: string[];
  confidence: number;
  citations: TicketCitation[];
  suggested_assignee?: string;
  estimated_effort?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  acceptance_criteria?: string[];
  known_edge_cases?: string[];
  open_questions?: string[];
  setup_requirements?: Array<{
    description: string;
    type: string;
    resolved: boolean;
  }>;

  // -- Display / compat --
  assignee?: string;                  // populated from suggested_assignee for display

  // -- Derived --
  citation_keys?: string[];
  workspace_id: string;

  // -- Optional metadata --
  readiness?: 'ready' | 'partially_blocked' | 'blocked';
  readiness_reason?: string;
  suggested_dependencies?: string[];
  stakeholders?: string[];
  is_derived?: boolean;
  derived_rationale?: string;
  source_mode?: 'grounded' | 'synthetic';
}

export interface SearchResult {
  document_chunks: DocumentChunk[];
  tickets: TicketRecord[];
}

export interface FilterOptions {
  recordType?: 'doc_chunk' | 'ticket' | 'all';
  ticketType?: string[];
  status?: string[];
  owner?: string[];
  confidenceRange?: [number, number];
  sourceType?: string[];
}

export interface StructuredAnswer {
  summary: string[];
  keyFindings: {
    blockers?: string[];
    decisions?: string[];
    owners?: string[];
    openQuestions?: string[];
    nextSteps?: string[];
  };
  referencedItems: {
    documents: Array<{
      id: string;
      title?: string;
      source_type: string;
      relevance: string;
    }>;
    tickets: Array<{
      id: string;
      title: string;
      type: string;
      relevance: string;
    }>;
  };
  citations: Array<{
    type: 'document' | 'ticket';
    id: string;
    title?: string;
    excerpt: string;
  }>;
  recommendations?: {
    filters?: string[];
    followUpQueries?: string[];
  };
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface GenerateTicketsRequest {
  query: string;
  doc_ids?: string[];
}

export interface GenerateTicketsResponse {
  tickets: Ticket[];
  sources: ProjectDocument[];
}

export interface ExportLinearRequest {
  tickets: Ticket[];
  apiKey: string;
  teamId: string;
}

export interface ExportJiraRequest {
  tickets: Ticket[];
  email: string;
  token: string;
  domain: string;
  projectKey: string;
}

export interface ExportGitHubRequest {
  tickets: Ticket[];
  token: string;
  owner: string;
  repo: string;
}