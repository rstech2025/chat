import React, { useState } from 'react';
import {
  MessageSquare,
  Lock,
  Mail,
  User,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Check,
  Smile,
} from 'lucide-react';
import {
  registerUser,
  loginUser,
  DEFAULT_AVATARS,
} from '../firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('Hey there! I am using Orbitto.');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }

        const profile = await registerUser(
          email.trim(),
          password,
          displayName.trim(),
          selectedAvatar,
          bio.trim()
        );
        onSuccess(profile);
      } else {
        const profile = await loginUser(email.trim(), password);
        onSuccess(profile);
      }
    } catch (err: any) {
      console.warn('Auth notification:', err.message);
      let msg = err.message || 'Authentication failed. Please try again.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = 'Invalid credentials. If you are new here, click "Create Account".';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please switch to "Sign In".';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Quick helper to test 2-person chatting immediately
  const handleQuickDemo = async (demoName: 'Alice' | 'Bob') => {
    setError(null);
    setLoading(true);
    const demoEmail = demoName === 'Alice' ? 'alice.demo@orbitto.app' : 'bob.demo@orbitto.app';
    const demoPass = 'password123';
    const demoAvatar = demoName === 'Alice' ? DEFAULT_AVATARS[0] : DEFAULT_AVATARS[1];
    const demoBio = demoName === 'Alice' ? 'Product Designer 🎨 • Loving Orbitto' : 'Software Engineer 🚀 • Building real-time apps';

    try {
      // Try login first
      const profile = await loginUser(demoEmail, demoPass);
      onSuccess(profile);
    } catch {
      // If not yet created, register demo account
      try {
        const profile = await registerUser(demoEmail, demoPass, demoName, demoAvatar, demoBio);
        onSuccess(profile);
      } catch (e: any) {
        // If already exists or error, try login once more
        try {
          const profile = await loginUser(demoEmail, demoPass);
          onSuccess(profile);
        } catch {
          setError(e.message || 'Could not launch demo account');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden my-auto">
        {/* Subtle decorative glowing background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 mb-3">
            <MessageSquare className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Orbitto</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isSignUp ? 'Create a new account to start messaging' : 'Sign in to your existing account'}
          </p>
        </div>

        {/* Demo Fast Switcher Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Instant Demo Sign-in:
            </span>
            <span className="text-[10px] text-slate-400">1-click test</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('Alice')}
              className="py-2 px-3 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-xl transition text-center font-medium hover:border-emerald-500/50 border border-transparent flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <img src={DEFAULT_AVATARS[0]} alt="Alice" className="w-4 h-4 rounded-full object-cover" />
              Sign in as Alice
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('Bob')}
              className="py-2 px-3 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-xl transition text-center font-medium hover:border-emerald-500/50 border border-transparent flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <img src={DEFAULT_AVATARS[1]} alt="Bob" className="w-4 h-4 rounded-full object-cover" />
              Sign in as Bob
            </button>
          </div>
        </div>

        {/* Clear Toggle Login / SignUp Tabs */}
        <div className="flex p-1 bg-slate-800/80 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              isSignUp
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                {error.includes('switch to "Create Account"') || error.includes('click "Create Account"') ? (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(true);
                        setError(null);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                    >
                      Click here to Create Account →
                    </button>
                  </div>
                ) : null}
                {error.includes('switch to the Sign In') || error.includes('switch to "Sign In"') ? (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setError(null);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                    >
                      Click here to Sign In →
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Alex Johnson"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Pick an Avatar</label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {DEFAULT_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={`relative w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        selectedAvatar === url
                          ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-500/30'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                      {selectedAvatar === url && (
                        <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">About / Status</label>
                <div className="relative">
                  <Smile className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Status message"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <span className="text-[10px] text-slate-400">Your password</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
              >
                Create an Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
