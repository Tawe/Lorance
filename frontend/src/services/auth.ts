import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  getIdToken
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export interface AuthUser {
  uid: string;
  email: string;
  workspace_id?: string;
}

export class FirebaseAuthService {
  /**
   * Sign in with email and password
   */
  static async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw new Error('Failed to sign in with email and password');
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUpWithEmail(email: string, password: string): Promise<User> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters');
      }
      throw new Error('Failed to create account');
    }
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      throw new Error('Failed to sign in with Google');
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Get ID token for current user
   */
  static async getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      return await getIdToken(user);
    } catch (error) {
      return null;
    }
  }

  /**
   * Listen to auth state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  /**
   * Get user info for API calls
   */
  static async getUserInfo(): Promise<AuthUser | null> {
    const user = auth.currentUser;
    if (!user) return null;

    return {
      uid: user.uid,
      email: user.email || '',
      workspace_id: `user_${user.uid}`, // Default workspace_id
    };
  }
}

export default auth;