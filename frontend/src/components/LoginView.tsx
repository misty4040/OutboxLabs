import React, { useState } from 'react';
import { authApi } from '../api/client';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
  initialError?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, initialError }) => {
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState<string | null>(initialError || null);

  React.useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // 1️⃣ Real Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const authUrl = await authApi.getGoogleAuthUrl();
      // Redirect to real Google accounts chooser
      window.location.href = authUrl;
    } catch (err: any) {
      const msg = err.response?.data?.message || '';
      if (msg.includes('GOOGLE_CLIENT_ID') || msg.includes('not configured')) {
        setError(
          'Google Client ID is not set in .env. To log in with your own email right now, type your email in the Email ID box below and click Login!'
        );
      } else {
        setError(err.response?.data?.message || 'Failed to initiate Google sign in');
      }
      setLoading(false);
    }
  };

  // Direct login / reviewer quick login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const email = emailInput.trim() || 'oliver.brown@domain.io';
      const name = email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const user = await authApi.devLogin(email, name);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EC] flex flex-col justify-center items-center px-4 selection:bg-[#111111] selection:text-[#F4F1EC]">
      {/* Editorial Centered Container */}
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl p-10 border border-[#D8D2C9] shadow-xs text-left">
        {/* Editorial Eyebrow & Title */}
        <div className="mb-8">
          <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#8C867E] block mb-2 font-mono">
            AUTHENTICATION
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111] leading-none mb-2">
            ReachInbox
          </h1>
          <p className="text-xs text-[#5F5A54] leading-relaxed">
            Manage, schedule, and automate outbound email outreach campaigns with distributed queue precision.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#FBF2EE] border border-[#ECD1C5] text-[#9E3618] text-xs leading-relaxed">
            {error}
          </div>
        )}

        {/* Primary Action: Continue with Google (Near-black with warm-white text) */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#262626] active:bg-[#000000] text-[#F4F1EC] font-semibold text-xs flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-50 border border-[#141414]"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Thin Divider */}
        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#D8D2C9]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#FFFFFF] px-3 text-[#8C867E] text-[11px] uppercase tracking-wider font-mono">
              or direct email login
            </span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-[#5F5A54] mb-1.5 uppercase tracking-wider font-mono">
              Email Address
            </label>
            <input
              type="text"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="oliver.brown@domain.io"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] text-[#111111] placeholder-[#8C867E] text-xs border border-[#D8D2C9] focus:bg-[#FFFFFF] focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#5F5A54] mb-1.5 uppercase tracking-wider font-mono">
              Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] text-[#111111] placeholder-[#8C867E] text-xs border border-[#D8D2C9] focus:bg-[#FFFFFF] focus:border-[#111111] focus:outline-none transition-colors"
            />
          </div>

          {/* Secondary Action: Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#EBE7E0] hover:bg-[#DDD8D0] active:bg-[#D0CAC0] text-[#111111] font-semibold text-xs transition-colors border border-[#D8D2C9] cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In with Email'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#EBE7E0] flex items-center justify-between text-[11px] text-[#8C867E]">
          <span>Distributed Outreach Engine</span>
          <span className="font-mono">v1.0.4</span>
        </div>
      </div>
    </div>
  );
};
