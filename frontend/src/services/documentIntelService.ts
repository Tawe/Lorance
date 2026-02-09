import { SearchResult, FilterOptions, DocumentChunk, TicketRecord } from '@/types';

// =============================================================================
// Document Intelligence API Service
// All requests include auth token; workspace_id is derived server-side
// =============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Get workspace_id - use auth workspace_id when signed in
  let workspaceId = 'demo-workspace';
  try {
    const auth = await import('./authService');
    const authState = auth.authService.getState();
    
    if (authState.user?.workspace_id) {
      // Use auth workspace_id when signed in
      workspaceId = authState.user.workspace_id;
      console.log('[Auth] Using auth workspace_id:', workspaceId);
    } else {
      // Use localStorage workspace_id when not signed in
      workspaceId = localStorage?.getItem('lorance_workspace_id') || 'demo-workspace';
      console.log('[Auth] Using localStorage workspace_id:', workspaceId);
    }
  } catch {
    // localStorage not available (SSR or private mode)
  }
  
  headers['X-Workspace-ID'] = workspaceId;
  
  try {
    const { FirebaseAuthService } = await import('./auth');
    const token = await FirebaseAuthService.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Auth not available
  }
  return headers;
}

export class DocumentIntelService {
  private static readonly API_URL = 'http://localhost:3001';

  /**
    * Search across documents and tickets with filters
    */
  static async search(
    query: string,
    filters: FilterOptions = {}
  ): Promise<SearchResult> {
    const params = new URLSearchParams({ q: query });

    // Add filters (workspace_id is no longer sent — server derives it from auth token)
    if (filters.recordType && filters.recordType !== 'all') {
      params.append('record_type', filters.recordType);
    }
    if (filters.ticketType && filters.ticketType.length > 0) {
      params.append('ticket_types', filters.ticketType.join(','));
    }
    if (filters.status && filters.status.length > 0) {
      params.append('statuses', filters.status.join(','));
    }
    if (filters.sourceType && filters.sourceType.length > 0) {
      params.append('source_types', filters.sourceType.join(','));
    }
    if (filters.confidenceRange) {
      params.append('confidence_min', filters.confidenceRange[0].toString());
      params.append('confidence_max', filters.confidenceRange[1].toString());
    }

    const headers = await getAuthHeaders();
    
    // Add cache-busting timestamp to prevent browser caching
    params.append('_t', Date.now().toString());
    
    const response = await fetch(`${this.API_URL}/api/intel/search?${params}`, { 
      headers,
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Search] Failed:', response.status, errorText);
      throw new Error(`Search failed: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Get structured answer from Agent Studio based on search results
   */
  static async getStructuredAnswer(
    query: string,
    searchResults: SearchResult
  ): Promise<any> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.API_URL}/api/intel/answer`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        search_results: searchResults,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate structured answer');
    }

    return response.json();
  }

  /**
   * Index document chunks
   */
  static async indexDocumentChunks(chunks: Partial<DocumentChunk>[]): Promise<void> {
    const headers = await getAuthHeaders();

    const chunksToIndex = chunks.map(chunk => ({
      ...chunk,
      record_type: 'doc_chunk' as const,
      timestamp: chunk.timestamp || Date.now(),
    }));

    const response = await fetch(`${this.API_URL}/api/intel/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chunks: chunksToIndex,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to index document chunks');
    }
  }

  /**
   * Index tickets
   */
  static async indexTickets(tickets: Partial<TicketRecord>[]): Promise<void> {
    const headers = await getAuthHeaders();

    const ticketsToIndex = tickets.map(ticket => ({
      ...ticket,
      record_type: 'ticket' as const,
      confidence: ticket.confidence || 0.5,
    }));

    const response = await fetch(`${this.API_URL}/api/intel/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tickets: ticketsToIndex,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to index tickets');
    }
  }

  /**
   * Delete a document by objectID
   */
  static async deleteDocument(objectID: string): Promise<void> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${this.API_URL}/api/intel/document`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ objectID }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Delete a ticket by objectID
   */
  static async deleteTicket(objectID: string): Promise<void> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${this.API_URL}/api/intel/ticket`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ objectID }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete ticket');
    }
  }

  /**
   * Update a document
   */
  static async updateDocument(objectID: string, updates: { content?: string; title?: string; source_type?: string }): Promise<void> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${this.API_URL}/api/intel/document`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ objectID, ...updates }),
    });

    if (!response.ok) {
      throw new Error('Failed to update document');
    }
  }

  /**
   * Get filter options for the current workspace
    */
  static async getFilterOptions(): Promise<{
    sourceTypes: string[];
    ticketTypes: string[];
    owners: string[];
    statuses: string[];
  }> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.API_URL}/api/intel/filters`, { headers });

    if (!response.ok) {
      throw new Error('Failed to get filter options');
    }

    return response.json();
  }

  /**
   * Delete all data for current workspace
   */
  static async clearWorkspace(): Promise<void> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${this.API_URL}/api/intel/clear`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to clear workspace');
    }
  }
}
