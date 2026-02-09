'use client';

import { useState, useEffect, useRef } from 'react';
import { authService, AuthState } from '@/services/authService';
import { LogIn, LogOut, Mail, Chrome, Loader2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [authState, setAuthState] = useState<AuthState>(authService.getState());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  // Auto-close after a fresh sign-in (user was null, then became non-null)
  const wasSignedIn = useRef(!!authState.user);
  useEffect(() => {
    if (!wasSignedIn.current && authState.user) {
      onClose();
    }
    wasSignedIn.current = !!authState.user;
  }, [authState.user, onClose]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await authService.signInWithEmail(email, password);
  };

  const handleGoogleSignIn = async () => {
    await authService.signInWithGoogle();
  };

  const handleSignOut = async () => {
    await authService.signOut();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {authState.user ? 'Account' : 'Sign In'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {authState.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : authState.user ? (
            // User is signed in - show account info
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-indigo-600">
                    {authState.user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {authState.user.email}
                </h3>
                <p className="text-sm text-gray-500">
                  Workspace: {authState.user.workspace_id}
                </p>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            // Sign in form
            <div className="space-y-4">
              {authState.error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authState.error}</span>
                </div>
              )}

              {/* Email Sign In Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200"
                >
                  <Mail className="w-4 h-4" />
                  Sign In
                </button>
              </form>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Sign in to access your workspace
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}