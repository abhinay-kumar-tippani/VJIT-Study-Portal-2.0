'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Users, Bot,
  ShieldCheck, LogOut, GraduationCap, ChevronRight, User,
  AlertCircle, Upload, Loader2, CheckCircle2, Image as ImageIcon, X
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';


interface Session {
  rollNumber: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  branch?: string;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/branch',    label: 'My Subjects',  icon: BookOpen        },
  { href: '/contribute', label: 'Contribute',   icon: Users           },
  { href: '#report-issue', label: 'Report an Issue', icon: AlertCircle, isAction: true },
  { href: '/ai',        label: 'JARVIS',       icon: Bot             },
  { href: '/admin',     label: 'Admin Panel',  icon: ShieldCheck, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Issue reporting states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [screenshotSize, setScreenshotSize] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then(setSession)
      .catch(() => setSession(null));
  }, [pathname]);

  useEffect(() => {
    const handleToggle = () => setIsOpenMobile((open) => !open);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setIsOpenMobile(false);
  }, [pathname]);

  // Autofill subject logic
  useEffect(() => {
    if (pathname.startsWith('/subject/') && isReportModalOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const labelParam = urlParams.get('label');
      const subjectId = pathname.split('/').pop()?.split('?')[0] || '';
      const autofill = labelParam ? decodeURIComponent(labelParam) : decodeURIComponent(subjectId);
      setFormSubject(autofill);
    } else if (isReportModalOpen) {
      setFormSubject('');
    }
  }, [pathname, isReportModalOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setReportError('Please upload an image file only');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setReportError('Image size must be less than 5MB');
      return;
    }

    setReportError('');
    setScreenshotName(file.name);
    setScreenshotSize(file.size);

    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType || !description) {
      setReportError('Issue Type and Description are required');
      return;
    }

    setSubmitting(true);
    setReportError('');
    setReportSuccess(false);

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType,
          subject: formSubject,
          description,
          screenshotUrl: screenshot,
          branch: session?.branch || 'CSE-AIML',
          semester: '4', // current active sem default
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReportSuccess(true);
        // Reset form
        setIssueType('');
        setDescription('');
        setScreenshot('');
        setScreenshotName('');
        setScreenshotSize(0);
        
        // Auto close after 1.5s
        setTimeout(() => {
          setIsReportModalOpen(false);
          setReportSuccess(false);
        }, 1500);
      } else {
        setReportError(data.error || 'Failed to submit report');
      }
    } catch {
      setReportError('Network error — check your connection');
    } finally {
      setSubmitting(false);
    }
  };

  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-screen w-64 glass-strong flex flex-col z-50 border-r border-custom
        transition-transform duration-300 ease-out
        ${isOpenMobile ? 'translate-x-0 shadow-2xl shadow-indigo-500/5' : '-translate-x-full md:translate-x-0'}
      `}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-custom flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center glow-accent">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-primary leading-none">VJIT Portal</p>
            <p className="text-xs text-secondary mt-0.5">Study Platform 2.0</p>
          </div>
        </Link>
        <div className="hidden md:block">
          <NotificationBell />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter((item) => !item.adminOnly || session?.isAdmin).map((item) => {
          if (item.isAction) {
            return (
              <button
                key={item.href}
                onClick={() => setIsReportModalOpen(true)}
                className="
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  text-secondary hover:text-primary hover:bg-card-custom/50
                  transition-all duration-150 cursor-pointer focus:outline-none border border-transparent hover:border-custom/40
                "
              >
                <item.icon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          }

          const finalHref = item.href === '/branch' ? `/branch/${session?.branch ?? 'CSE-AIML'}/semester/4` : item.href;
          const isActive = pathname === finalHref || pathname.startsWith(finalHref + '/');
          return (
            <Link key={item.href} href={finalHref}>
              <motion.div
                whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 cursor-pointer
                  ${isActive ? 'text-white' : 'text-secondary hover:text-primary'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 gradient-accent rounded-xl opacity-90"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-2 border-t border-custom pt-3">
        <ThemeToggle />

        {session && (
          <div className="px-3 py-2.5 rounded-xl bg-card-custom border border-custom">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-primary truncate">{session.name}</p>
            </div>
            <p className="text-[11px] font-mono text-muted-custom pl-8">{session.rollNumber}</p>
            {session.isSuperAdmin && (
              <span className="mt-1 ml-8 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-semibold">
                <ShieldCheck className="w-2.5 h-2.5" /> Super Admin
              </span>
            )}
          </div>
        )}

        {session ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        ) : (
          <Link href="/login" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-primary transition-all">
            Sign In
          </Link>
        )}
      </div>
    </aside>

    {/* ── Report Issue Modal ── */}
    <AnimatePresence>
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg rounded-3xl glass-strong border border-custom bg-card-custom shadow-2xl p-6 overflow-hidden flex flex-col gap-4"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-custom border border-transparent hover:border-custom transition-all focus:outline-none"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                Report an Issue
              </h3>
              <p className="text-xs text-secondary mt-1">Found a bug or missing something? Let the admin team know.</p>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4 pt-2">
              {/* Issue Type */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">
                  Issue Type *
                </label>
                <select
                  required
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-card-custom border border-custom text-primary text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  <option value="">Select an issue type...</option>
                  <option value="Missing Study Material">Missing Study Material</option>
                  <option value="Broken PDF/File">Broken PDF/File</option>
                  <option value="AI Assistant Not Working">AI Assistant Not Working</option>
                  <option value="Wrong Subject/Semester">Wrong Subject/Semester</option>
                  <option value="Login/Signup Problem">Login/Signup Problem</option>
                  <option value="YouTube Link Not Working">YouTube Link Not Working</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Subject (Optional) */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">
                  Subject (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. OOPs through Java"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-card-custom border border-custom text-primary placeholder:text-muted-custom text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-card-custom border border-custom text-primary placeholder:text-muted-custom text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                />
              </div>

              {/* Screenshot (Optional) */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">
                  Screenshot (Optional, Max 5MB)
                </label>
                
                {screenshot ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card-custom/50 border border-custom relative">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-custom bg-zinc-950 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshot} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-primary font-medium truncate">{screenshotName}</p>
                      <p className="text-[10px] text-muted-custom">{(screenshotSize / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshot('');
                        setScreenshotName('');
                        setScreenshotSize(0);
                      }}
                      className="p-1 rounded text-muted-custom hover:text-red-400 transition-colors focus:outline-none"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="screenshot-file-input"
                    />
                    <label
                      htmlFor="screenshot-file-input"
                      className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-custom hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer text-xs font-semibold text-secondary hover:text-primary transition-all"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Upload Screenshot (Image only)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Status/Error Alerts */}
              {reportError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}
              {reportSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Your issue has been reported! We&apos;ll look into it soon.</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl gradient-accent text-white font-semibold flex items-center justify-center gap-2 glow-accent disabled:opacity-60 cursor-pointer text-sm focus:outline-none"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {submitting ? 'Submitting Report...' : 'Submit Report'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}
