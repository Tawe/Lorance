import { DocumentIntelController } from '../controllers/documentIntel';
import { FirebaseAuthService } from '../auth';
import rateLimit from 'express-rate-limit';

const llmRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req as any).user?.uid ?? 'unauthenticated',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again in a minute.' },
});

// =============================================================================
// Document Intelligence Routes (All require authentication)
// =============================================================================

export function setupDocumentIntelRoutes(app: any) {
  // Search across documents and tickets
  app.get('/api/intel/search', FirebaseAuthService.requireAuth, DocumentIntelController.search);

  // Generate structured answer
  app.post('/api/intel/answer', FirebaseAuthService.requireAuth, llmRateLimit, DocumentIntelController.getAnswer);

  // Index document chunks
  app.post('/api/intel/documents', FirebaseAuthService.requireAuth, DocumentIntelController.indexDocuments);

  // Index tickets
  app.post('/api/intel/tickets', FirebaseAuthService.requireAuth, DocumentIntelController.indexTickets);

  // Get filter options
  app.get('/api/intel/filters', FirebaseAuthService.requireAuth, DocumentIntelController.getFilters);

  // Clear workspace
  app.post('/api/intel/clear', FirebaseAuthService.requireAuth, DocumentIntelController.clearWorkspace);

  // Delete single document
  app.delete('/api/intel/document', FirebaseAuthService.requireAuth, DocumentIntelController.deleteDocument);

  // Delete single ticket
  app.delete('/api/intel/ticket', FirebaseAuthService.requireAuth, DocumentIntelController.deleteTicket);

  // Update single document
  app.put('/api/intel/document', FirebaseAuthService.requireAuth, DocumentIntelController.updateDocument);
}