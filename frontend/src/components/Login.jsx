import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b141a] px-4 py-12 chat-bg-pattern">
      {/* Aesthetic glassmorphic card */}
      <div className="w-full max-w-md rounded-2xl bg-[#111b21]/90 p-8 shadow-2xl border border-white/5 backdrop-blur-xl animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-wa-teal text-white shadow-lg shadow-wa-teal/20 mb-3">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h2>
          <p className="mt-1 text-sm text-wa-text-secondary text-center">
            Sign in to chat with friends and groups in real-time
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-wa-text-secondary mb-2">
              Email or Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wa-text-secondary">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or username"
                className="w-full rounded-lg bg-[#202c33] py-2.5 pl-10 pr-4 text-sm text-white placeholder-wa-text-secondary border border-transparent focus:border-wa-teal focus:outline-none transition-all duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-wa-text-secondary mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wa-text-secondary">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-[#202c33] py-2.5 pl-10 pr-4 text-sm text-white placeholder-wa-text-secondary border border-transparent focus:border-wa-teal focus:outline-none transition-all duration-200"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-lg bg-wa-teal py-3 text-sm font-semibold text-[#111b21] hover:bg-[#00c298] transition-all duration-200 hover:shadow-lg hover:shadow-wa-teal/10 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-wa-text-secondary">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-wa-teal hover:underline"
          >
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
