import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { AlgoliaService } from './algolia';
import { AgentStudioService } from './agent-studio';
import { FirebaseAuthService } from './auth';
import { AlgoliaSecurityService } from './security';
import { exportToLinear } from './exports/linear';
import { exportToJira } from './exports/jira';
import { exportToGitHub, verifyGitHubAccess } from './exports/github';
import { setupDocumentIntelRoutes } from './routes/documentIntel';
import {
  ProjectDocument,
  DocType,
  Ticket,
  ExportLinearRequest,
  ExportJiraRequest,
  ExportGitHubRequest,
} from './types';

// =============================================================================
// Environment Validation
// =============================================================================

const requiredEnvVars = ['ALGOLIA_APP_ID', 'ALGOLIA_ADMIN_KEY'] as const;

function validateEnvironment(): void {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// =============================================================================
// Configuration
// =============================================================================

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  maxContentLength: 100000, // 100KB max document content
  minContentLength: 10,
  maxQueryLength: 1000,
  useAgentStudio: AgentStudioService.isConfigured(),
} as const;

// =============================================================================
// Input Validation
// =============================================================================

interface DocumentInput {
  content: string;
  doc_type: DocType;
  title?: string;
  timestamp?: string;
  author?: string;
  objectID?: string;
}

const validDocTypes: DocType[] = ['prd', 'meeting', 'architecture', 'tech_stack', 'requirements'];

function isValidDocType(type: unknown): type is DocType {
  return typeof type === 'string' && validDocTypes.includes(type as DocType);
}

function validateDocumentInput(body: unknown): DocumentInput {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be an object');
  }

  const input = body as Record<string, unknown>;

  if (typeof input.content !== 'string') {
    throw new ValidationError('Content must be a string');
  }

  if (input.content.length < config.minContentLength) {
    throw new ValidationError(`Content must be at least ${config.minContentLength} characters`);
  }

  if (input.content.length > config.maxContentLength) {
    throw new ValidationError(`Content must not exceed ${config.maxContentLength} characters`);
  }

  if (!isValidDocType(input.doc_type)) {
    throw new ValidationError(`doc_type must be one of: ${validDocTypes.join(', ')}`);
  }

  return {
    content: input.content,
    doc_type: input.doc_type,
    title: typeof input.title === 'string' ? input.title : undefined,
    timestamp: typeof input.timestamp === 'string' ? input.timestamp : undefined,
    author: typeof input.author === 'string' ? input.author : undefined,
    objectID: typeof input.objectID === 'string' ? input.objectID : undefined,
  };
}

function validateQuery(query: unknown): string {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new ValidationError('Query must be a non-empty string');
  }

  if (query.length > config.maxQueryLength) {
    throw new ValidationError(`Query must not exceed ${config.maxQueryLength} characters`);
  }

  return query.trim();
}

function validateTicketsArray(tickets: unknown): Ticket[] {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    throw new ValidationError('tickets must be a non-empty array');
  }
  return tickets as Ticket[];
}

// =============================================================================
// Custom Errors
// =============================================================================

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// App Setup
// =============================================================================

validateEnvironment();

const app = express();
const algoliaService = new AlgoliaService();

// Initialize Agent Studio if configured
let agentStudioService: AgentStudioService | null = null;
if (config.useAgentStudio) {
  try {
    agentStudioService = new AgentStudioService();
    console.log('Agent Studio integration enabled');
  } catch (error) {
    console.warn('Agent Studio not available:', error);
  }
}

// CORS - restrict to allowed origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.) in development
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (origin && config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID'],
  })
);

app.use(express.json({ limit: '200kb' }));

// Setup document intelligence routes (auth required, workspace_id derived from user)
setupDocumentIntelRoutes(app);

// =============================================================================
// Health Check
// =============================================================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Lorance Tech Architect backend is running',
    agentStudio: agentStudioService !== null,
  });
});

// =============================================================================
// Authentication Routes
// =============================================================================

// Get secured Algolia key for authenticated user
app.get('/api/auth/algolia-key', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const securedKeyData = await AlgoliaSecurityService.generateSecuredKey(req.user);
    res.json(securedKeyData);
  } catch (error) {
    next(error);
  }
});

// Get current user info
app.get('/api/auth/me', FirebaseAuthService.requireAuth, async (req: Request, res: Response) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email,
    workspace_id: req.user.workspace_id || `user_${req.user.uid}`,
  });
});

// =============================================================================
// Document Routes (Protected)
// =============================================================================

// Index a project document (requires authentication)
app.post('/api/docs', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = validateDocumentInput(req.body);

    // Add ownership fields
    const documentWithOwnership = AlgoliaSecurityService.addOwnershipFields({
      objectID: input.objectID || crypto.randomUUID(),
      content: input.content,
      doc_type: input.doc_type,
      title: input.title,
      timestamp: input.timestamp || new Date().toISOString(),
      author: input.author,
    }, req.user);

    await algoliaService.indexDocument(documentWithOwnership);
    res.json({ success: true, document: documentWithOwnership });
  } catch (error) {
    next(error);
  }
});

// Search documents (requires authentication, scoped to workspace)
app.get('/api/docs/search', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = validateQuery(req.query.q);
    const docType = req.query.type as DocType | undefined;
    const workspace_id = req.user.workspace_id || `user_${req.user.uid}`;

    const documents = await algoliaService.searchDocuments(query, docType);
    const userDocuments = documents.filter(doc =>
      doc.workspace_id === workspace_id || doc.owner_uid === req.user.uid
    );
    res.json({ documents: userDocuments });
  } catch (error) {
    next(error);
  }
});

// Get all documents (requires authentication)
app.get('/api/docs', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For now, return all documents for the user
    // In a real implementation, you might want pagination
    const workspace_id = req.user.workspace_id || `user_${req.user.uid}`;
    const documents = await algoliaService.searchDocuments('', undefined);
    
    // Filter documents by workspace_id (this is a simple implementation)
    // In production, you'd use Algolia's built-in filtering
    const userDocuments = documents.filter(doc => 
      doc.workspace_id === workspace_id || doc.owner_uid === req.user.uid
    );
    
    res.json({ documents: userDocuments });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Ticket Generation Route (Protected)
// =============================================================================

app.post('/api/generate-tickets', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const query = validateQuery(body?.query);
    const docIds = Array.isArray(body?.doc_ids) ? (body.doc_ids as string[]) : undefined;

    // Get documents - either specific ones or all, filtered by user's workspace
    let documents: ProjectDocument[];
    const workspace_id = req.user.workspace_id || `user_${req.user.uid}`;
    
    if (docIds && docIds.length > 0) {
      documents = await algoliaService.getDocumentsByIds(docIds);
    } else {
      const allDocuments = await algoliaService.getAllDocuments();
      // Filter by user's workspace
      documents = allDocuments.filter(doc => 
        doc.workspace_id === workspace_id || doc.owner_uid === req.user.uid
      );
    }

    if (documents.length === 0) {
      return res.json({
        tickets: [],
        sources: [],
        message: 'No documents found. Please add project documents first.',
      });
    }

    // Generate tickets using Agent Studio
    if (!agentStudioService) {
      return res.status(503).json({
        error: 'Agent Studio is not configured. Set ALGOLIA_AGENT_ID environment variable.',
      });
    }

    const tickets = await agentStudioService.generateTickets(query, documents);

    // Add ownership to tickets and optionally index them
    if (tickets.length > 0) {
      const ticketsWithOwnership = tickets.map(ticket => 
        AlgoliaSecurityService.addOwnershipFields(ticket, req.user)
      );
      await algoliaService.indexTickets(ticketsWithOwnership);
    }

    res.json({
      tickets,
      sources: documents,
      engine: 'agent-studio',
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Export Routes
// =============================================================================

// Export to Linear
app.post('/api/export/linear', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as ExportLinearRequest;

    if (!body.apiKey || typeof body.apiKey !== 'string') {
      throw new ValidationError('apiKey is required');
    }
    if (!body.teamId || typeof body.teamId !== 'string') {
      throw new ValidationError('teamId is required');
    }

    const tickets = validateTicketsArray(body.tickets);
    const results = await exportToLinear(tickets, body.apiKey, body.teamId);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: failed === 0,
      results,
      summary: {
        total: tickets.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Export to Jira
app.post('/api/export/jira', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as ExportJiraRequest;

    if (!body.email || typeof body.email !== 'string') {
      throw new ValidationError('email is required');
    }
    if (!body.token || typeof body.token !== 'string') {
      throw new ValidationError('token is required');
    }
    if (!body.domain || typeof body.domain !== 'string') {
      throw new ValidationError('domain is required');
    }
    if (!body.projectKey || typeof body.projectKey !== 'string') {
      throw new ValidationError('projectKey is required');
    }

    const tickets = validateTicketsArray(body.tickets);
    const results = await exportToJira(
      tickets,
      { email: body.email, token: body.token, domain: body.domain },
      body.projectKey
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: failed === 0,
      results,
      summary: {
        total: tickets.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Export to GitHub
app.post('/api/export/github', FirebaseAuthService.requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as ExportGitHubRequest;

    if (!body.token || typeof body.token !== 'string') {
      throw new ValidationError('token is required');
    }
    if (!body.owner || typeof body.owner !== 'string') {
      throw new ValidationError('owner is required');
    }
    if (!body.repo || typeof body.repo !== 'string') {
      throw new ValidationError('repo is required');
    }

    const tickets = validateTicketsArray(body.tickets);

    // Verify access first
    const accessCheck = await verifyGitHubAccess(body.token, body.owner, body.repo);
    if (!accessCheck.valid) {
      return res.status(403).json({
        success: false,
        error: accessCheck.error,
      });
    }

    const results = await exportToGitHub(tickets, body.token, body.owner, body.repo);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: failed === 0,
      results,
      summary: {
        total: tickets.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Error Handling Middleware
// =============================================================================

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, error.message);

  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message });
  }

  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message;

  return res.status(500).json({ error: message });
});

// =============================================================================
// Server Startup
// =============================================================================

async function startServer(): Promise<void> {
  try {
    await algoliaService.configureIndex();

    app.listen(config.port, () => {
      console.log(`Lorance Tech Architect backend running on port ${config.port}`);
      console.log(`Allowed origins: ${config.allowedOrigins.join(', ')}`);
      console.log(`Ticket generation: ${agentStudioService ? 'Agent Studio' : 'Not available'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
