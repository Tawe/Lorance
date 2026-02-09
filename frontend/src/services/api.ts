import {
  ProjectDocument,
  DocType,
  Ticket,
  LinearCredentials,
  JiraCredentials,
  GitHubCredentials,
  ExportResponse,
} from '@/types';

// =============================================================================
// Configuration
// =============================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// =============================================================================
// Response Types
// =============================================================================

export interface GenerateTicketsResponse {
  tickets: Ticket[];
  sources: ProjectDocument[];
  message?: string;
}

export interface IndexDocumentResponse {
  success: boolean;
  document: ProjectDocument;
}

export interface SearchDocumentsResponse {
  documents: ProjectDocument[];
}

export interface GetDocumentsResponse {
  documents: ProjectDocument[];
}

export interface ApiError {
  error: string;
}

// =============================================================================
// API Client
// =============================================================================

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add authentication header if user is signed in
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Try to get auth token for authenticated requests
    try {
      const { FirebaseAuthService } = await import('./auth');
      const token = await FirebaseAuthService.getIdToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Auth not available, continue without token
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        (data as ApiError).error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }

  // ===========================================================================
  // Document Operations
  // ===========================================================================

  async indexDocument(document: {
    content: string;
    doc_type: DocType;
    title?: string;
    timestamp?: string;
    author?: string;
  }): Promise<IndexDocumentResponse> {
    return this.request<IndexDocumentResponse>('/api/docs', {
      method: 'POST',
      body: JSON.stringify(document),
    });
  }

  async searchDocuments(query: string, docType?: DocType): Promise<SearchDocumentsResponse> {
    const params = new URLSearchParams({ q: query });
    if (docType) {
      params.append('type', docType);
    }
    return this.request<SearchDocumentsResponse>(`/api/docs/search?${params}`);
  }

  async getDocuments(): Promise<GetDocumentsResponse> {
    return this.request<GetDocumentsResponse>('/api/docs');
  }

  // ===========================================================================
  // Ticket Generation
  // ===========================================================================

  async generateTickets(query: string, docIds?: string[]): Promise<GenerateTicketsResponse> {
    return this.request<GenerateTicketsResponse>('/api/generate-tickets', {
      method: 'POST',
      body: JSON.stringify({ query, doc_ids: docIds }),
    });
  }

  // ===========================================================================
  // Export Operations
  // ===========================================================================

  async exportToLinear(
    tickets: Ticket[],
    credentials: LinearCredentials
  ): Promise<ExportResponse> {
    return this.request<ExportResponse>('/api/export/linear', {
      method: 'POST',
      body: JSON.stringify({
        tickets,
        apiKey: credentials.apiKey,
        teamId: credentials.teamId,
      }),
    });
  }

  async exportToJira(tickets: Ticket[], credentials: JiraCredentials): Promise<ExportResponse> {
    return this.request<ExportResponse>('/api/export/jira', {
      method: 'POST',
      body: JSON.stringify({
        tickets,
        email: credentials.email,
        token: credentials.token,
        domain: credentials.domain,
        projectKey: credentials.projectKey,
      }),
    });
  }

  async exportToGitHub(
    tickets: Ticket[],
    credentials: GitHubCredentials
  ): Promise<ExportResponse> {
    return this.request<ExportResponse>('/api/export/github', {
      method: 'POST',
      body: JSON.stringify({
        tickets,
        token: credentials.token,
        owner: credentials.owner,
        repo: credentials.repo,
      }),
    });
  }

  // ===========================================================================
  // Health Check
  // ===========================================================================

  async healthCheck(): Promise<{ status: string; message: string; agentStudio: boolean }> {
    return this.request('/api/health');
  }
}

export const api = new ApiClient();
