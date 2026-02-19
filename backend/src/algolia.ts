import { algoliasearch } from 'algoliasearch';
import { ProjectDocument, Ticket } from './types';

// =============================================================================
// Configuration
// =============================================================================

const ALGOLIA_CONFIG = {
  docsIndexName: 'lorance_documents',
  ticketsIndexName: 'lorance_tickets',
  defaultHitsPerPage: 1000,
} as const;

// =============================================================================
// AlgoliaService Class
// =============================================================================

export class AlgoliaService {
  private client;
  private docsIndexName: string;
  private ticketsIndexName: string;

  constructor() {
    if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_ADMIN_KEY) {
      throw new Error('Algolia credentials not configured');
    }

    const appId = process.env.ALGOLIA_APP_ID;
    const adminKey = process.env.ALGOLIA_ADMIN_KEY;

    this.client = algoliasearch(appId, adminKey);
    this.docsIndexName = process.env.ALGOLIA_DOCS_INDEX_NAME || ALGOLIA_CONFIG.docsIndexName;
    this.ticketsIndexName = process.env.ALGOLIA_TICKETS_INDEX_NAME || ALGOLIA_CONFIG.ticketsIndexName;
  }

  /**
   * Generate a secured API key with restrictions
   */
  static generateSecuredKey(params: {
    filters?: string;
    restrictIndices?: string[];
    validUntil?: number;
  }): string {
    if (!process.env.ALGOLIA_SEARCH_KEY) {
      throw new Error('Algolia search key not configured');
    }

    const searchKey = process.env.ALGOLIA_SEARCH_KEY;
    const appId = process.env.ALGOLIA_APP_ID || '';

    // Generate secured key using a temporary client with the search-only key
    const tempClient = algoliasearch(appId, searchKey);
    const securedApiKey = tempClient.generateSecuredApiKey({
      parentApiKey: searchKey,
      restrictions: params,
    });

    return securedApiKey;
  }

  // ===========================================================================
  // Document Operations
  // ===========================================================================

  async indexDocument(doc: ProjectDocument): Promise<void> {
    const response = await this.client.saveObject({
      indexName: this.docsIndexName,
      body: doc,
    });
    await this.client.waitForTask({
      indexName: this.docsIndexName,
      taskID: response.taskID,
    });
  }

  async searchDocuments(query: string, docType?: ProjectDocument['doc_type'], workspaceId?: string): Promise<ProjectDocument[]> {
    const filters = docType ? `doc_type:${docType}` : '';
    const facetFilters = workspaceId ? [`workspace_id:${workspaceId}`] : undefined;
    console.log('[Algolia] Searching documents with query:', query, 'filters:', filters, 'workspace:', workspaceId);

    try {
      const results = await this.client.search({
        requests: [
          {
            indexName: this.docsIndexName,
            query,
            filters,
            facetFilters,
            hitsPerPage: ALGOLIA_CONFIG.defaultHitsPerPage,
          },
        ],
      });

      const firstResult = results.results[0];
      if ('hits' in firstResult) {
        console.log('[Algolia] Found', firstResult.hits.length, 'documents');
        return firstResult.hits as ProjectDocument[];
      }
      console.log('[Algolia] No hits in results');
      return [];
    } catch (error) {
      console.error('[Algolia] Search error:', error);
      return [];
    }
  }

  async getAllDocuments(workspaceId?: string): Promise<ProjectDocument[]> {
    const facetFilters = workspaceId ? [`workspace_id:${workspaceId}`] : undefined;
    const results = await this.client.search({
      requests: [
        {
          indexName: this.docsIndexName,
          query: '',
          facetFilters,
          hitsPerPage: ALGOLIA_CONFIG.defaultHitsPerPage,
        },
      ],
    });

    const firstResult = results.results[0];
    if ('hits' in firstResult) {
      return firstResult.hits as ProjectDocument[];
    }
    return [];
  }

  /**
   * Get multiple documents by their IDs
   */
  async getDocumentsByIds(objectIDs: string[]): Promise<ProjectDocument[]> {
    if (objectIDs.length === 0) return [];
    try {
      const results = await this.client.getObjects({
        requests: objectIDs.map(objectID => ({
          indexName: this.docsIndexName,
          objectID,
        })),
      });
      return results.results.filter(Boolean) as ProjectDocument[];
    } catch (error) {
      console.error('Failed to get documents by IDs:', error);
      return [];
    }
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(objectID: string): Promise<ProjectDocument | null> {
    try {
      const results = await this.client.getObjects({
        requests: [
          {
            indexName: this.docsIndexName,
            objectID,
          },
        ],
      });
      return (results.results[0] as ProjectDocument) ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Index multiple documents
   */
  async indexDocuments(documents: any[]): Promise<void> {
    if (documents.length === 0) return;

    const responses = await this.client.saveObjects({
      indexName: this.docsIndexName,
      objects: documents,
    });
    
    // Wait for all batch tasks to complete
    await Promise.all(
      responses.map((response) =>
        this.client.waitForTask({
          indexName: this.docsIndexName,
          taskID: response.taskID,
        })
      )
    );
  }

  /**
   * Delete multiple documents
   */
  async deleteDocuments(objectIDs: string[]): Promise<void> {
    if (objectIDs.length === 0) return;

    await this.client.deleteObjects({
      indexName: this.docsIndexName,
      objectIDs,
    });
  }

  // ===========================================================================
  // Ticket Operations
  // ===========================================================================

  async indexTicket(ticket: Ticket): Promise<void> {
    const response = await this.client.saveObject({
      indexName: this.ticketsIndexName,
      body: { ...ticket, objectID: ticket.id },
    });
    await this.client.waitForTask({
      indexName: this.ticketsIndexName,
      taskID: response.taskID,
    });
  }

  async indexTickets(tickets: Ticket[]): Promise<void> {
    if (tickets.length === 0) return;

    const responses = await this.client.saveObjects({
      indexName: this.ticketsIndexName,
      objects: tickets.map((ticket) => ({ ...ticket, objectID: ticket.id })),
    });

    // Wait for all batch tasks to complete
    await Promise.all(
      responses.map((response) =>
        this.client.waitForTask({
          indexName: this.ticketsIndexName,
          taskID: response.taskID,
        })
      )
    );
  }

  async searchTickets(query: string, workspaceId?: string): Promise<Ticket[]> {
    const facetFilters = workspaceId ? [`workspace_id:${workspaceId}`] : undefined;
    const results = await this.client.search({
      requests: [
        {
          indexName: this.ticketsIndexName,
          query,
          facetFilters,
          hitsPerPage: ALGOLIA_CONFIG.defaultHitsPerPage,
        },
      ],
    });

    const firstResult = results.results[0];
    if ('hits' in firstResult) {
      return firstResult.hits as unknown as Ticket[];
    }
    return [];
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicket(objectID: string): Promise<Ticket | null> {
    try {
      const results = await this.client.getObjects({
        requests: [
          {
            indexName: this.ticketsIndexName,
            objectID,
          },
        ],
      });
      return (results.results[0] as unknown as Ticket) ?? null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete multiple tickets
   */
  async deleteTickets(objectIDs: string[]): Promise<void> {
    if (objectIDs.length === 0) return;

    await this.client.deleteObjects({
      indexName: this.ticketsIndexName,
      objectIDs,
    });
  }

  // ===========================================================================
  // Index Configuration
  // ===========================================================================

  async configureIndex(): Promise<void> {
    // Configure docs index
    await this.client.setSettings({
      indexName: this.docsIndexName,
      indexSettings: {
        attributesForFaceting: ['doc_type', 'source_type', 'record_type', 'workspace_id', 'owner_uid'],
        ranking: ['desc(timestamp)', 'desc(action_signal_score)', 'typo', 'proximity', 'attribute', 'exact', 'custom'],
        searchableAttributes: ['content', 'title'],
        customRanking: ['desc(timestamp)', 'desc(action_signal_score)'],
      },
    });

    // Configure tickets index
    await this.client.setSettings({
      indexName: this.ticketsIndexName,
      indexSettings: {
        attributesForFaceting: ['type', 'priority', 'estimated_effort', 'labels', 'readiness', 'record_type', 'workspace_id', 'owner_uid'],
        numericAttributesForFiltering: ['confidence'],
        ranking: ['desc(confidence)', 'desc(timestamp)', 'typo', 'proximity', 'attribute', 'exact', 'custom'],
        searchableAttributes: ['title', 'description', 'acceptance_criteria', 'labels'],
        customRanking: ['desc(confidence)', 'desc(timestamp)'],
      },
    });

    console.log(`Algolia indices "${this.docsIndexName}" and "${this.ticketsIndexName}" configured successfully`);
  }

  getDocsIndexName(): string {
    return this.docsIndexName;
  }

  getTicketsIndexName(): string {
    return this.ticketsIndexName;
  }
}