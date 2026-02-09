'use client';

import { useState, useEffect } from 'react';
import { authService, AuthState } from '@/services/authService';
import { Loader2, Mail, Chrome, AlertCircle, Sparkles } from 'lucide-react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({ user: null, isLoading: true, error: null, algoliaKey: null });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      await authService.signUpWithEmail(email, password);
    } else {
      await authService.signInWithEmail(email, password);
    }
  };

  const handleGoogleSignIn = async () => {
    await authService.signInWithGoogle();
  };

  // Always render loading on server and before mount to avoid hydration mismatch
  if (!mounted || (authState.isLoading && !authState.user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Authenticated - render app
  if (authState.user) {
    return <>{children}</>;
  }

  // Not authenticated - show login/signup page
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Lorance</h1>
          </div>
          <p className="text-gray-500 text-sm">AI-Powered Tech Architect</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>

          {authState.error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authState.error}</span>
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={authState.isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 text-gray-900"
          >
            <Chrome className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">or</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-gray-900 bg-white placeholder:text-gray-400"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-gray-900 bg-white placeholder:text-gray-400"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={authState.isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {authState.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Toggle sign in / sign up */}
          <p className="text-center text-sm text-gray-500 mt-5">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                authService.clearError();
              }}
              className="text-indigo-600 font-medium hover:text-indigo-700"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
