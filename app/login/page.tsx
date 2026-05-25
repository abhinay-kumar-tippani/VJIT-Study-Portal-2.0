'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ rollNumber: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: form.rollNumber.trim().toUpperCase(),
          password:   form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Login failed'); return; }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
    w-full px-4 py-3 rounded-xl bg-zinc-800/60 border border-zinc-700
    text-white placeholder:text-zinc-500 text-sm font-mono
    focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
    transition-all duration-150
  `;

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-2xl p-10 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-accent glow-accent flex items-center justify-center mb-4">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Welcome back</h1>
            <p className="text-secondary text-sm mt-1">Sign in to VJIT Study Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Roll Number */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">
                Roll Number
              </label>
              <input
                type="text"
                placeholder="e.g. 24911A66J6"
                value={form.rollNumber}
                onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))}
                required
                autoCapitalize="characters"
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl gradient-accent text-white font-semibold text-sm glow-accent disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </motion.button>
          </form>

          <p className="text-center text-sm text-secondary mt-6">
            No account?{' '}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign up here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
