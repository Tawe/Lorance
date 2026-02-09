// =============================================================================
// Document Intelligence Types
// =============================================================================

import { TicketRecord } from '../../../shared/types';

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