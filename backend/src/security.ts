import { AlgoliaService } from './algolia';
import { FirebaseAuthService } from './auth';

export interface AlgoliaSecuredKeyResponse {
  securedApiKey: string;
  workspace_id: string;
  user_uid: string;
  expires_in: number;
}

export class AlgoliaSecurityService {
  /**
   * Generate a secured Algolia API key for a specific user
   */
  static async generateSecuredKey(user: any): Promise<AlgoliaSecuredKeyResponse> {
    const workspace_id = user.workspace_id || `user_${user.uid}`;
    
    // Create secured key with user-specific filters
    const securedKey = AlgoliaService.generateSecuredKey({
      filters: `workspace_id:${workspace_id}`,
      // Optional: restrict to specific indices
      restrictIndices: ['lorance_documents', 'lorance_tickets'],
      // Set expiration to 1 hour
      validUntil: Math.floor(Date.now() / 1000) + 3600,
    });

    return {
      securedApiKey: securedKey,
      workspace_id,
      user_uid: user.uid,
      expires_in: 3600,
    };
  }

  /**
   * Add ownership fields to Algolia records
   */
  static addOwnershipFields(record: any, user: any): any {
    const workspace_id = user.workspace_id || `user_${user.uid}`;
    
    return {
      ...record,
      workspace_id,
      owner_uid: user.uid,
      timestamp: record.timestamp || Date.now(),
    };
  }

  /**
   * Verify user has access to a specific record
   */
  static async verifyRecordAccess(objectID: string, user: any): Promise<boolean> {
    try {
      const workspace_id = user.workspace_id || `user_${user.uid}`;
      
      // Create a temporary AlgoliaService instance to fetch the record
      const algoliaService = new AlgoliaService();
      const record = await algoliaService.getDocument(objectID);
      
      if (!record) {
        return false;
      }

      // Check if record belongs to user's workspace
      return record.workspace_id === workspace_id;
    } catch (error) {
      return false;
    }
  }
}