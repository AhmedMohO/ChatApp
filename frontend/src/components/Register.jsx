import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, User, Mail, Lock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seed, setSeed] = useState(Math.random().toString(36).substring(7));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;

  const randomizeAvatar = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setSubmitting(true);
    const result = await register(username, email, password, avatarUrl);
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b141a] px-4 py-12 chat-bg-pattern">
      <div className="w-full max-w-md rounded-2xl bg-[#111b21]/90 p-8 shadow-2xl border border-white/5 backdrop-blur-xl animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-wa-teal text-white shadow-lg shadow-wa-teal/20 mb-3">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="mt-1 text-sm text-wa-text-secondary text-center">
            Sign up to connect and create chats instantly
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Selector */}
          <div className="flex flex-col items-center gap-2 mb-4 bg-[#202c33]/40 p-3 rounded-xl border border-white/5">
            <span className="text-xs font-semibold uppercase tracking-wider text-wa-text-secondary">
              Profile Avatar
            </span>
            <div className="relative group">
              <img
                src={avatarUrl}
                alt="Avatar Preview"
                className="h-20 w-20 rounded-full border-2 border-wa-teal bg-[#111b21] p-1 object-cover shadow-md transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={randomizeAvatar}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-wa-teal text-[#111b21] shadow hover:bg-[#00c298] transition-all active:scale-95"
                title="Randomize Avatar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-wa-text-secondary mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wa-text-secondary">
                <User className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="chat_master"
                className="w-full rounded-lg bg-[#202c33] py-2 pl-10 pr-4 text-sm text-white placeholder-wa-text-secondary border border-transparent focus:border-wa-teal focus:outline-none transition-all duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-wa-text-secondary mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wa-text-secondary">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                className="w-full rounded-lg bg-[#202c33] py-2 pl-10 pr-4 text-sm text-white placeholder-wa-text-secondary border border-transparent focus:border-wa-teal focus:outline-none transition-all duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-wa-text-secondary mb-1.5">
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
                className="w-full rounded-lg bg-[#202c33] py-2 pl-10 pr-4 text-sm text-white placeholder-wa-text-secondary border border-transparent focus:border-wa-teal focus:outline-none transition-all duration-200"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-lg bg-wa-teal py-2.5 text-sm font-semibold text-[#111b21] hover:bg-[#00c298] transition-all duration-200 hover:shadow-lg hover:shadow-wa-teal/10 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none mt-2"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-wa-text-secondary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-wa-teal hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
