export interface AlgoliaSecuredKeyResponse {
  securedApiKey: string;
  workspace_id: string;
  user_uid: string;
  expires_in: number;
}

export interface AuthUser {
  uid: string;
  email: string;
  workspace_id?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  algoliaKey: AlgoliaSecuredKeyResponse | null;
}

export class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isLoading: true,
    error: null,
    algoliaKey: null,
  };
  private listeners: Set<(state: AuthState) => void> = new Set();

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeAuth() {
    try {
      // Import Firebase auth dynamically to avoid SSR issues
      const { FirebaseAuthService } = await import('./auth');
      
      // Listen to auth state changes
      FirebaseAuthService.onAuthStateChanged(async (user) => {
        if (user) {
          const userInfo = await FirebaseAuthService.getUserInfo();
          this.authState.user = userInfo;
          
          // Get secured Algolia key
          await this.fetchAlgoliaKey();
        } else {
          this.authState.user = null;
          this.authState.algoliaKey = null;
        }
        
        this.authState.isLoading = false;
        this.notifyListeners();
      });
    } catch (error) {
      this.authState.error = 'Failed to initialize authentication';
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  private async fetchAlgoliaKey() {
    try {
      const { FirebaseAuthService } = await import('./auth');
      const token = await FirebaseAuthService.getIdToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/algolia-key`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Algolia key');
      }

      const keyData: AlgoliaSecuredKeyResponse = await response.json();
      this.authState.algoliaKey = keyData;
    } catch (error) {
      console.warn('Failed to fetch Algolia key:', error);
      // Non-blocking: Algolia key is optional, don't set auth error
    }
  }

  // Public methods
  async signInWithEmail(email: string, password: string) {
    try {
      this.authState.isLoading = true;
      this.authState.error = null;
      this.notifyListeners();

      const { FirebaseAuthService } = await import('./auth');
      await FirebaseAuthService.signInWithEmail(email, password);
    } catch (error) {
      this.authState.error = 'Failed to sign in';
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  async signUpWithEmail(email: string, password: string) {
    try {
      this.authState.isLoading = true;
      this.authState.error = null;
      this.notifyListeners();

      const { FirebaseAuthService } = await import('./auth');
      await FirebaseAuthService.signUpWithEmail(email, password);
    } catch (error: any) {
      this.authState.error = error.message || 'Failed to create account';
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  async signInWithGoogle() {
    try {
      this.authState.isLoading = true;
      this.authState.error = null;
      this.notifyListeners();

      const { FirebaseAuthService } = await import('./auth');
      await FirebaseAuthService.signInWithGoogle();
    } catch (error) {
      this.authState.error = 'Failed to sign in with Google';
      this.authState.isLoading = false;
      this.notifyListeners();
    }
  }

  async signOut() {
    try {
      const { FirebaseAuthService } = await import('./auth');
      await FirebaseAuthService.signOut();
    } catch (error) {
      this.authState.error = 'Failed to sign out';
      this.notifyListeners();
    }
  }

  // State management
  getState(): AuthState {
    return { ...this.authState };
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    listener(this.getState());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Helper methods
  isAuthenticated(): boolean {
    return this.authState.user !== null;
  }

  getUser(): AuthUser | null {
    return this.authState.user;
  }

  getAlgoliaKey(): AlgoliaSecuredKeyResponse | null {
    return this.authState.algoliaKey;
  }

  getError(): string | null {
    return this.authState.error;
  }

  clearError() {
    this.authState.error = null;
    this.notifyListeners();
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();