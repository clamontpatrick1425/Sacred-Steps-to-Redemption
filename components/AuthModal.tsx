import React, { useState } from 'react';
import { auth, googleProvider, facebookProvider, signInWithPopup } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { name: string; email: string }) => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
   <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
       <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
   </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
      setError(err.message || 'Authentication failed');
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
        setError(err.message || `${providerName} login failed`);
      } finally {
        setLoading(false);
      }
  }

  return (
    <div className="no-print fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-card rounded-lg shadow-2xl max-w-md w-full flex flex-col animate-fade-in overflow-hidden">
        <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-main mb-2">
                {isRegistering ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <p className="text-center text-muted mb-6">
                {isRegistering ? 'Start your journey of redemption today.' : 'Sign in to continue your journey.'}
            </p>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

            <div className="space-y-3 mb-6">
                <button 
                    onClick={() => handleSocialLogin('Google')}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-2 border border-default rounded-md hover:bg-card-secondary transition-colors text-main font-medium disabled:opacity-50"
                >
                    <span className="mr-3"><GoogleIcon /></span>
                    Continue with Google
                </button>
                <button 
                    onClick={() => handleSocialLogin('Facebook')}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-2 border border-default rounded-md hover:bg-card-secondary transition-colors text-main font-medium disabled:opacity-50"
                >
                    <span className="mr-3"><FacebookIcon /></span>
                    Continue with Facebook
                </button>
            </div>

            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-default"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted">Or continue with email</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                    <div className="animate-fade-in">
                        <label htmlFor="name" className="block text-sm font-medium text-muted mb-1">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-input rounded-md focus:ring-primary focus:border-primary bg-card-secondary focus:bg-card"
                            required={isRegistering}
                            disabled={loading}
                        />
                    </div>
                )}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-muted mb-1">Email Address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md focus:ring-primary focus:border-primary bg-card-secondary focus:bg-card"
                        required
                        disabled={loading}
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-muted mb-1">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md focus:ring-primary focus:border-primary bg-card-secondary focus:bg-card"
                        required
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-primary text-on-primary rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-primary transition-colors font-medium mt-2 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Sign In')}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                <span className="text-muted">
                    {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                </span>
                <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-primary hover:text-primary-hover font-medium underline"
                    disabled={loading}
                >
                    {isRegistering ? 'Sign In' : 'Sign Up'}
                </button>
            </div>
        </div>
        <div className="bg-card-secondary p-4 text-center border-t border-default">
            <button onClick={onClose} className="text-sm text-muted hover:text-main" disabled={loading}>
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};