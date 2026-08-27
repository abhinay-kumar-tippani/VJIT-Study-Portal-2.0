'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Eye, EyeOff, Loader2, AlertCircle, MessageCircle, X, KeyRound, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ rollNumber: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

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
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || process.env.NODE_ENV !== 'production')) {
          setErrorDetail(data.detail ?? '');
        }
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const adminWhatsApp = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '91XXXXXXXXXX';
  const prefilledMsg = encodeURIComponent(
    `Hi Admin! 👋 I forgot my VJIT Study Portal password.\n\nRoll Number: ${form.rollNumber.trim().toUpperCase() || '[Your Roll Number]'}\n\nPlease reset/delete my account so I can sign up again!`
  );
  const whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${prefilledMsg}`;

  const inputClass = `
    w-full px-4 py-3 rounded-xl bg-card-custom border border-custom
    text-primary placeholder:text-muted-custom text-sm font-mono
    focus:outline-none focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent)_/_0.2)]
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
        <div className="glass-strong rounded-2xl p-6 sm:p-10 shadow-2xl relative">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs text-[rgb(var(--accent-hover))] hover:underline font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
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
              {errorDetail && process.env.NODE_ENV !== 'production' && (
                <div className="text-xs text-secondary mt-1">{errorDetail}</div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl gradient-accent text-white font-semibold text-sm glow-accent disabled:opacity-60 flex items-center justify-center gap-2 mt-2 cursor-pointer"
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

      {/* Forgot Password / WhatsApp Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-sm glass-strong rounded-2xl p-6 border border-custom relative shadow-2xl"
            >
              <button
                onClick={() => setShowHelpModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-muted-custom hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-base">Forgot Password?</h3>
                  <p className="text-xs text-secondary">Instant Account Reset</p>
                </div>
              </div>

              <p className="text-sm text-secondary leading-relaxed mb-5">
                Message the Admin on WhatsApp to clear your old account details. Once cleared, you can immediately click <strong className="text-primary">Sign Up</strong> to set your new password!
              </p>

              <div className="space-y-2.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/5"
                >
                  <MessageCircle className="w-4 h-4 fill-emerald-400 text-emerald-950" />
                  Message Admin on WhatsApp
                </a>

                <Link
                  href="/signup"
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-card-custom hover:bg-card-custom/80 border border-custom text-secondary hover:text-primary font-medium text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Already Reset? Go to Sign Up
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
