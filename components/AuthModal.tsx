import React, { useState } from 'react';
import { auth, googleProvider, facebookProvider, signInWithPopup } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { name: string; email: string }) => void;
  onContinueAsGuest?: () => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5 shrink-0 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onContinueAsGuest }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<{ code?: string; message: string; domain?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showNetlifyGuide, setShowNetlifyGuide] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'sacredstepsjournal.netlify.app';

  const formatAuthError = (err: any): { code?: string; message: string; domain?: string } => {
    if (!err) return { message: 'Authentication failed. Please try again.' };
    const code = err.code || '';
    const msg = err.message || String(err);

    // Netlify / custom domain unauthorized error
    if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
      return {
        code: 'auth/unauthorized-domain',
        domain: currentHost,
        message: `Domain not authorized in Firebase Authentication: "${currentHost}". Firebase blocks sign-ins on new hosting domains until the domain is added to Authorized Domains in your Firebase Console.`
      };
    }

    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
      return {
        code: 'auth/operation-not-allowed',
        message: 'This sign-in provider is disabled in Firebase. In the Firebase Console, go to Authentication > Sign-in method and enable Email/Password or Google provider.'
      };
    }

    if (code === 'auth/api-key-not-valid' || msg.includes('api-key-not-valid')) {
      return {
        code: 'auth/api-key-not-valid',
        message: 'Firebase Web API Key is invalid or restricted for this domain. Please check Project Settings > General in Firebase Console.'
      };
    }

    if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
      return {
        code: 'auth/popup-blocked',
        message: 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
      };
    }

    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return {
        code: code,
        message: 'Invalid email or password. Please verify your credentials or create a new account.'
      };
    }

    if (code === 'auth/email-already-in-use') {
      return {
        code: code,
        message: 'This email is already registered. Please sign in instead.'
      };
    }

    if (code === 'auth/weak-password') {
      return {
        code: code,
        message: 'Password is too weak. Please use at least 6 characters.'
      };
    }

    if (code === 'auth/popup-closed-by-user') {
      return {
        code: code,
        message: 'Sign-in popup was closed before completing.'
      };
    }

    if (code === 'auth/network-request-failed') {
      return {
        code: code,
        message: 'Network connection failed. Please check your internet connection or ad-blocker.'
      };
    }

    return {
      code,
      message: msg
    };
  };

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        onLogin({ name: name, email: userCredential.user.email || '' });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLogin({ name: userCredential.user.displayName || email.split('@')[0], email: userCredential.user.email || '' });
      }
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerName: string) => {
    setError(null);
    setLoading(true);
    try {
      const provider = providerName === 'Google' ? googleProvider : facebookProvider;
      const result = await signInWithPopup(auth, provider);
      onLogin({ name: result.user.displayName || 'User', email: result.user.email || '' });
      onClose();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    if (onContinueAsGuest) {
      onContinueAsGuest();
    } else {
      onClose();
    }
  };

  return (
    <div className="no-print fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" aria-modal="true" role="dialog">
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full flex flex-col my-8 border border-default overflow-hidden animate-fade-in">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37]/15 text-[#996515] dark:text-[#F5D77F] uppercase tracking-wider mb-2">
                Sacred Steps Sync
              </span>
              <h2 className="text-2xl font-bold text-main">
                {isRegistering ? 'Create Your Account' : 'Welcome Back'}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1 rounded-lg text-muted hover:text-main hover:bg-card-secondary transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-muted mb-6">
            {isRegistering
              ? 'Save your weekly reflections, clean clock milestones, and gratitude safely across your devices.'
              : 'Sign in to sync your recovery steps, sponsors check-ins, and devotional entries.'}
          </p>

          {/* Domain Authorization Diagnostic Banner (When on Netlify or when error occurs) */}
          {error?.code === 'auth/unauthorized-domain' && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-left">
              <div className="flex items-start space-x-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Netlify Domain Authorization Required
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                    Firebase blocks authentication requests from this site because <strong>{currentHost}</strong> has not been added to your Firebase <em>Authorized Domains</em> list yet.
                  </p>

                  <div className="mt-3 p-2.5 bg-white dark:bg-stone-900 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {currentHost}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition-colors shrink-0"
                    >
                      {copiedDomain ? '✓ Copied!' : 'Copy Domain'}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px] text-amber-900/90 dark:text-amber-300">
                    <p className="font-semibold">Quick 60-second fix in Firebase Console:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">Firebase Console</a> and select your project.</li>
                      <li>Click <strong>Authentication</strong> → <strong>Settings</strong> tab → <strong>Authorized domains</strong>.</li>
                      <li>Click <strong>Add domain</strong> and paste <code>{currentHost}</code>.</li>
                      <li>Click <strong>Save</strong>. Login will work immediately!</li>
                    </ol>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between">
                    <span className="text-xs text-amber-800 dark:text-amber-400">
                      Need immediate access?
                    </span>
                    <button
                      type="button"
                      onClick={handleGuest}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors"
                    >
                      Continue in Guest Mode →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generic / Other Error Banner */}
          {error && error.code !== 'auth/unauthorized-domain' && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-900 flex items-start space-x-2">
              <span className="shrink-0 text-base">⚠️</span>
              <div className="flex-1">
                <p className="font-medium">{error.message}</p>
                {error.code === 'auth/operation-not-allowed' && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Fix: Enable <strong>Email/Password</strong> or <strong>Google</strong> under Authentication → Sign-in method in Firebase Console.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Social Sign-In Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2.5 border border-default rounded-xl hover:bg-card-secondary transition-all text-main font-semibold shadow-sm hover:shadow disabled:opacity-50"
            >
              <span className="mr-3"><GoogleIcon /></span>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('Facebook')}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2.5 border border-default rounded-xl hover:bg-card-secondary transition-all text-main font-semibold shadow-sm hover:shadow disabled:opacity-50"
            >
              <span className="mr-3"><FacebookIcon /></span>
              Continue with Facebook
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-default"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-3 bg-card text-muted font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div className="animate-fade-in">
                <label htmlFor="auth-name" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lamont Patrick"
                  className="w-full px-3.5 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent bg-card-secondary focus:bg-card text-main text-sm transition-all"
                  required={isRegistering}
                  disabled={loading}
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-3.5 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent bg-card-secondary focus:bg-card text-main text-sm transition-all"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-default rounded-xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent bg-card-secondary focus:bg-card text-main text-sm transition-all"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#D4AF37] hover:bg-[#C49E2B] text-stone-900 font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ring-[#D4AF37] transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isRegistering ? 'Create Free Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            <span className="text-muted">
              {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-[#996515] dark:text-[#F5D77F] font-bold hover:underline ml-1"
              disabled={loading}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          {/* Zero Barrier Guest Mode */}
          <div className="mt-6 pt-5 border-t border-default text-center">
            <p className="text-xs text-muted mb-2">Want to use the app privately on this device without signing in?</p>
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <span>🕊️ Continue as Guest (Private Device Storage)</span>
            </button>
          </div>
        </div>

        {/* Footer with Netlify Deployment Helper */}
        <div className="bg-card-secondary/70 px-6 py-3.5 text-xs text-muted flex flex-wrap items-center justify-between gap-2 border-t border-default">
          <button
            type="button"
            onClick={() => setShowNetlifyGuide(!showNetlifyGuide)}
            className="text-[11px] text-[#996515] dark:text-[#F5D77F] hover:underline font-medium"
          >
            {showNetlifyGuide ? '▲ Hide Netlify Auth Instructions' : '▼ Netlify Deployment & Firebase Setup Guide'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-main font-medium"
            disabled={loading}
          >
            Close
          </button>
        </div>

        {showNetlifyGuide && (
          <div className="px-6 py-4 bg-stone-50 dark:bg-stone-900 border-t border-default text-xs text-stone-700 dark:text-stone-300 space-y-2">
            <p className="font-bold text-stone-900 dark:text-stone-100">
              Why login requires domain authorization on Netlify:
            </p>
            <p>
              Google & Firebase security rules require any website where users log in to be explicitly whitelisted to prevent unauthorized sites from pretending to be your app.
            </p>
            <div className="p-2.5 bg-white dark:bg-stone-950 rounded-lg border border-default space-y-1 font-mono text-[11px]">
              <div><strong>Your Site:</strong> {currentHost}</div>
              <div><strong>Firebase Project:</strong> gen-lang-client-0573843890</div>
            </div>
            <p>
              To authorize this domain: Go to Firebase Console → Authentication → Settings tab → Authorized domains → Add domain → type <strong>{currentHost}</strong> → Save.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};