import { Request, Response } from 'express';
import { AlgoliaService } from '../algolia';
import { DocumentIntelAgent } from '../agents/documentIntelAgent';

// =============================================================================
// Document Intelligence Endpoints (All routes require authentication)
// workspace_id is always derived from req.user, never from client input
// =============================================================================

function parseCommaSeparated(value: unknown): string[] | null {
  if (!value) return null;
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return null;
}

function getWorkspaceId(req: Request): string {
  // First check X-Workspace-ID header (frontend controls workspace)
  const headerWorkspaceId = req.headers['x-workspace-id'] as string;
  if (headerWorkspaceId) {
    return headerWorkspaceId;
  }
  
  // Fall back to auth token workspace_id
  const authWorkspaceId = (req as any).user?.workspace_id || (req as any).user?.uid;
  if (authWorkspaceId) {
    return authWorkspaceId;
  }
  
  // Default workspace for testing
  return 'demo-workspace';
}

import { validateAndRepairTickets, ValidationContext } from '../ticketValidator';

export class DocumentIntelController {
  /**
   * Search across documents and tickets with filters
   */
  static async search(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);


      
      const { q, record_type, ticket_types, statuses, source_types, confidence_min, confidence_max } = req.query;

      const algoliaService = new AlgoliaService();
      const queryStr = typeof q === 'string' ? q : '';
      const parsedTicketTypes = parseCommaSeparated(ticket_types);
      const parsedStatuses = parseCommaSeparated(statuses);
      const parsedSourceTypes = parseCommaSeparated(source_types);
      const minConf = confidence_min ? Number(confidence_min) : null;
      const maxConf = confidence_max ? Number(confidence_max) : null;

      // Search both indices
      const [docsResults, ticketsResults] = await Promise.all([
        algoliaService.searchDocuments(queryStr, undefined),
        algoliaService.searchTickets(queryStr),
      ]);
      



      // Filter by workspace_id (server-enforced) and other criteria
      // Handle both cases: with and without user_ prefix
      const userWorkspaceId = `user_${workspace_id}`;

      
      const filteredDocs = (docsResults as any[]).filter(doc => {
        // Match: exact match, with user_ prefix, or just the uid part
        const docWorkspace = doc.workspace_id || '';
        const isMatch = 
          docWorkspace === workspace_id || 
          docWorkspace === userWorkspaceId ||
          docWorkspace === `user_${workspace_id}` ||
          docWorkspace === workspace_id.replace(/^user_/, '');
        

        return isMatch && (!parsedSourceTypes || parsedSourceTypes.includes(doc.source_type || doc.doc_type));
      });



      const filteredTickets = (ticketsResults as any[]).filter(ticket => {
        const ticketWorkspace = ticket.workspace_id || '';
        return (
          (ticketWorkspace === workspace_id || 
           ticketWorkspace === userWorkspaceId ||
           ticketWorkspace === `user_${workspace_id}` ||
           ticketWorkspace === workspace_id.replace(/^user_/, '')) &&
          (!parsedTicketTypes || parsedTicketTypes.includes(ticket.type)) &&
          (!parsedStatuses || parsedStatuses.includes(ticket.readiness)) &&
          (minConf === null || ticket.confidence >= minConf) &&
          (maxConf === null || ticket.confidence <= maxConf)
        );
      });





      // Apply schema fill to tickets (ensure all canonical fields are present)
      const docIds = filteredDocs.map(d => d.objectID);
      const validationCtx: ValidationContext = {
        sourceDocIds: docIds,
        hasDocuments: docIds.length > 0,
      };

      // Use validateAndRepairTickets to fill missing fields but preserve original IDs
      const { tickets: validatedTickets, log } = validateAndRepairTickets(filteredTickets, validationCtx);



      res.json({
        document_chunks: filteredDocs,
        tickets: validatedTickets,
      });
    } catch (error) {
      console.error('[BACKEND-SEARCH] Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  /**
   * Generate structured answer using Agent Studio
   */
  static async getAnswer(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);
      const { query, search_results } = req.body;

      if (!query || !search_results) {
        return res.status(400).json({ error: 'query and search_results are required' });
      }

      // Use Document Intelligence Agent
      const agent = new DocumentIntelAgent();

      // Prepare context for analysis
      const context = {
        query,
        workspace_id,
        documents: search_results.document_chunks || [],
        tickets: search_results.tickets || [],
        total_results: (search_results.document_chunks?.length || 0) + (search_results.tickets?.length || 0),
      };

      // Generate structured answer
      const answer = await agent.generateStructuredAnswer(context);

      res.json(answer);
    } catch (error) {
      console.error('Answer generation error:', error);
      res.status(500).json({ error: 'Failed to generate answer' });
    }
  }

  /**
   * Index document chunks
   */
  static async indexDocuments(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);
      const { chunks } = req.body;

      if (!chunks || !Array.isArray(chunks)) {
        return res.status(400).json({ error: 'chunks array is required' });
      }

      const algoliaService = new AlgoliaService();

      // Force workspace_id from authenticated user (ignore client-provided workspace_id)
      const processedChunks = chunks.map((chunk: any) => ({
        ...chunk,
        objectID: chunk.objectID || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        record_type: 'doc_chunk',
        timestamp: chunk.timestamp || Date.now(),
        workspace_id,
      }));

      await algoliaService.indexDocuments(processedChunks);

      res.json({ success: true, indexed: processedChunks.length });
    } catch (error) {
      console.error('Document indexing error:', error);
      res.status(500).json({ error: 'Failed to index documents' });
    }
  }

  /**
   * Index tickets
   */
  static async indexTickets(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);
      const { tickets } = req.body;

      if (!tickets || !Array.isArray(tickets)) {
        return res.status(400).json({ error: 'tickets array is required' });
      }

      const algoliaService = new AlgoliaService();

      // Force workspace_id from authenticated user (ignore client-provided workspace_id)
      const processedTickets = (tickets as any[]).map(ticket => ({
        ...ticket,
        objectID: ticket.objectID || ticket.id || `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        record_type: 'ticket',
        confidence: ticket.confidence || 0.5,
        workspace_id,
      }));

      await algoliaService.indexTickets(processedTickets);

      res.json({ success: true, indexed: processedTickets.length });
    } catch (error) {
      console.error('Ticket indexing error:', error);
      res.status(500).json({ error: 'Failed to index tickets' });
    }
  }

  /**
   * Get filter options for workspace
   */
  static async getFilters(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);

      const algoliaService = new AlgoliaService();

      // Get all documents and tickets for the workspace
      const [docs, tickets] = await Promise.all([
        algoliaService.searchDocuments('', undefined),
        algoliaService.searchTickets(''),
      ]);

      // Filter by workspace (server-enforced)
      const workspaceDocs = (docs as any[]).filter(doc => doc.workspace_id === workspace_id);
      const workspaceTickets = (tickets as any[]).filter(ticket => ticket.workspace_id === workspace_id);

      // Extract unique values
      const sourceTypes = [...new Set(workspaceDocs.map(doc => doc.source_type || doc.doc_type).filter(Boolean))];
      const ticketTypes = [...new Set(workspaceTickets.map(ticket => ticket.type).filter(Boolean))];
      const owners = [...new Set(workspaceTickets.map(ticket => ticket.assignee || ticket.assignee_role).filter(Boolean))];
      const statuses = [...new Set(workspaceTickets.map(ticket => ticket.readiness).filter(Boolean))];

      res.json({
        sourceTypes,
        ticketTypes,
        owners,
        statuses,
      });
    } catch (error) {
      console.error('Filter options error:', error);
      res.status(500).json({ error: 'Failed to get filter options' });
    }
  }

  /**
   * Clear workspace data
   */
  static async clearWorkspace(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);

      const algoliaService = new AlgoliaService();

      // Get all documents and tickets for the workspace
      const [docs, tickets] = await Promise.all([
        algoliaService.searchDocuments('', undefined),
        algoliaService.searchTickets(''),
      ]);

      // Filter by workspace (server-enforced)
      const workspaceDocs = (docs as any[]).filter(doc => doc.workspace_id === workspace_id);
      const workspaceTickets = (tickets as any[]).filter(ticket => ticket.workspace_id === workspace_id);

      // Delete from indices
      if (workspaceDocs.length > 0) {
        await algoliaService.deleteDocuments(
          workspaceDocs.map(doc => doc.objectID)
        );
      }

      if (workspaceTickets.length > 0) {
        await algoliaService.deleteTickets(
          workspaceTickets.map((ticket: any) => ticket.objectID || ticket.id)
        );
      }

      res.json({
        success: true,
        deleted: {
          documents: workspaceDocs.length,
          tickets: workspaceTickets.length,
        }
      });
    } catch (error) {
      console.error('Clear workspace error:', error);
      res.status(500).json({ error: 'Failed to clear workspace' });
    }
  }

  /**
   * Delete a single document by objectID
   */
  static async deleteDocument(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);
      const { objectID } = req.body;

      if (!objectID) {
        return res.status(400).json({ error: 'objectID is required' });
      }

      // Get the document to verify ownership
      const algoliaService = new AlgoliaService();
      const results = await algoliaService.searchDocuments('', undefined);
      const doc = (results as any[]).find(d => d.objectID === objectID);

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify workspace ownership
      const docWorkspace = doc.workspace_id || '';
      const userWorkspaceId = `user_${workspace_id}`;
      const isOwner = docWorkspace === workspace_id || docWorkspace === userWorkspaceId || 
                      docWorkspace === workspace_id.replace(/^user_/, '');

      if (!isOwner) {
        return res.status(403).json({ error: 'Not authorized to delete this document' });
      }

      // Delete from Algolia
      await algoliaService.deleteDocuments([objectID]);

      res.json({ success: true, deleted: objectID });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  /**
   * Update a single document
   */
  static async updateDocument(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);
      const { objectID, content, title, source_type } = req.body;
      if (!objectID) {
        return res.status(400).json({ error: 'objectID is required' });
      }

      const algoliaService = new AlgoliaService();
      // Get the document to verify ownership
      const results = await algoliaService.searchDocuments('', undefined);
      const doc = (results as any[]).find(d => d.objectID === objectID);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify workspace ownership (remains important for security)
      const docWorkspace = doc.workspace_id || '';
      const userWorkspaceId = `user_${workspace_id}`;
      const isOwner = docWorkspace === workspace_id || docWorkspace === userWorkspaceId || 
                      docWorkspace === workspace_id.replace(/^user_/, '');
      if (!isOwner) {
        return res.status(403).json({ error: 'Not authorized to update this document' });
      }

      // Update document in Algolia
      const updatedDoc = {
        ...doc,
        objectID,
        content: content !== undefined ? content : doc.content,
        title: title !== undefined ? title : doc.title,
        source_type: source_type !== undefined ? source_type : doc.source_type,
        workspace_id: doc.workspace_id,
        timestamp: Date.now(),
      };
      await algoliaService.indexDocuments([updatedDoc]);
      res.json({ success: true, updated: objectID });
    } catch (error: any) {
      console.error('[BACKEND-UPDATE] Update document error:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }

  /**
   * Delete a single ticket by objectID
   */
  static async deleteTicket(req: Request, res: Response) {
    try {
      const workspace_id = getWorkspaceId(req);
      const { objectID } = req.body;

      if (!objectID) {
        return res.status(400).json({ error: 'objectID is required' });
      }

      // Get the ticket to verify ownership
      const algoliaService = new AlgoliaService();
      const results = await algoliaService.searchTickets('');
      const ticket = (results as any[]).find(t => t.objectID === objectID);

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Verify workspace ownership
      const ticketWorkspace = ticket.workspace_id || '';
      const userWorkspaceId = `user_${workspace_id}`;
      const isOwner = ticketWorkspace === workspace_id || ticketWorkspace === userWorkspaceId ||
                      ticketWorkspace === workspace_id.replace(/^user_/, '');

      if (!isOwner) {
        return res.status(403).json({ error: 'Not authorized to delete this ticket' });
      }

      // Delete from Algolia
      await algoliaService.deleteTickets([objectID]);

      res.json({ success: true, deleted: objectID });
    } catch (error) {
      console.error('Delete ticket error:', error);
      res.status(500).json({ error: 'Failed to delete ticket' });
    }
  }
}
