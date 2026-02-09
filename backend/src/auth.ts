import admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/lib/auth/token-verifier';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    let credential: admin.credential.Credential;

    // Option 1: Load from service account JSON file via GOOGLE_APPLICATION_CREDENTIALS
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountPath) {
      const resolvedPath = path.resolve(serviceAccountPath);
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      credential = admin.credential.cert(serviceAccount);
      console.log(`Firebase Admin SDK loading from: ${resolvedPath}`);
    } else {
      // Option 2: Fall back to individual env vars
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      });
    }

    admin.initializeApp({ credential });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

let auth: admin.auth.Auth | null = null;
try {
  auth = admin.auth();
} catch (error) {
  console.warn('Firebase Auth not available - authenticated routes will be disabled');
}

export interface AuthenticatedUser extends DecodedIdToken {
  workspace_id?: string;
}

export class FirebaseAuthService {
  /**
   * Verify Firebase ID token and return decoded user info
   */
  static async verifyToken(idToken: string): Promise<AuthenticatedUser> {
    if (!auth) throw new Error('Firebase Auth is not configured');
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken as AuthenticatedUser;
    } catch (error) {
      throw new Error('Invalid or expired authentication token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Middleware to verify Firebase token (optional for development)
   * Falls back to workspace_id header if no auth token provided
   */
  static requireAuth = async (req: any, res: any, next: any) => {
    try {
      const token = this.extractTokenFromHeader(req.headers.authorization);
      
      if (!token) {
        // For development/testing: use workspace_id from header or generate a demo user
        const workspaceId = req.headers['x-workspace-id'] || 'demo-workspace';
        req.user = { uid: 'demo-user', workspace_id: workspaceId };
        return next();
      }

      const user = await this.verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      // For development: still allow request with demo user
      const workspaceId = req.headers['x-workspace-id'] || 'demo-workspace';
      req.user = { uid: 'demo-user', workspace_id: workspaceId };
      next();
    }
  };

  /**
   * Get user by UID
   */
  static async getUser(uid: string) {
    if (!auth) throw new Error('Firebase Auth is not configured');
    try {
      return await auth.getUser(uid);
    } catch (error) {
      throw new Error('User not found');
    }
  }

  /**
   * Create custom token for testing
   */
  static async createCustomToken(uid: string, additionalClaims?: object) {
    if (!auth) throw new Error('Firebase Auth is not configured');
    try {
      return await auth.createCustomToken(uid, additionalClaims);
    } catch (error) {
      throw new Error('Failed to create custom token');
    }
  }
}

export { auth };