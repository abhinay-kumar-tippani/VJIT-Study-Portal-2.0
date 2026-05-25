'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Sparkles, Clock, ArrowRight,
  GraduationCap, User, FileText, HelpCircle,
  Library, Users, Compass, BookMarked, Crown
} from 'lucide-react';
import Link from 'next/link';
import { getBranchFromRollNumber, getBranchLabel, getBranchColor } from '@/lib/branch';
import { SEM4_SUBJECTS, ACTIVE_SEM } from '@/lib/subjects';

interface Session {
  rollNumber: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  branch: string;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [topContributors, setTopContributors] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/stats')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setUserCount(data.totalUsers);
            // Hide initially, show top contributors only when contributions are > 0
            const activeContributors = (data.topContributors ?? []).filter((c: any) => c.count > 0);
            setTopContributors(activeContributors);
          }
        })
        .catch((err) => console.error('[Dashboard stats fetch error]', err));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="px-8 py-10 space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-10 w-64 rounded-xl" />
          <div className="skeleton h-5 w-48 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-6 w-48 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback default if not signed in or rollNumber is missing
  const rollNumber = session?.rollNumber ?? '24911A66J6';
  const name = session?.name ?? 'Guest Student';
  const branch = session?.branch ?? getBranchFromRollNumber(rollNumber);
  const branchLabel = getBranchLabel(branch);
  const branchGradient = getBranchColor(branch);

  const subjects = SEM4_SUBJECTS[branch] ?? SEM4_SUBJECTS['CSE-AIML'];

  // Other branches list for exploration
  const OTHER_BRANCHES = [
    { id: 'CSE', label: 'Computer Science' },
    { id: 'CSE-AIML', label: 'Artifical Intelligence & Machine Learning' },
    { id: 'CSE-DS', label: 'Data Science' },
    { id: 'IT', label: 'Information Technology' },
  ].filter((b) => b.id !== branch);

  return (
    <div className="px-6 md:px-8 py-8 md:py-10 max-w-7xl mx-auto space-y-8">
      {/* Personalized Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 rounded-3xl glass-strong border border-custom relative overflow-hidden"
      >
        <div className="absolute -right-24 -top-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5" />
            <span>Welcome back</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
            Hello, <span className="gradient-text font-black">{name}</span> 👋
          </h1>
          <p className="text-secondary text-sm md:text-base font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
            <span>Roll Number:</span>
            <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/15 text-xs">
              {rollNumber}
            </span>
            {userCount !== null && (
              <span className="text-xs font-semibold text-emerald-400 ml-0 md:ml-3 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{userCount} students joined</span>
              </span>
            )}
          </p>
        </div>

        {/* Branch Indicator Badge */}
        <div className="z-10 flex flex-col items-start md:items-end gap-1 flex-shrink-0">
          <span className="text-[10px] uppercase font-bold text-muted-custom tracking-wider">Current Branch</span>
          <div className={`px-4 py-2 rounded-2xl bg-gradient-to-r ${branchGradient} text-white font-bold text-sm shadow-lg shadow-indigo-500/5`}>
            {branchLabel}
          </div>
          <span className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Semester 4 Active
          </span>
        </div>
      </motion.div>

      {/* Main Core Subjects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-primary tracking-wide">Your Subjects (Semester 4)</h2>
          </div>
          <span className="text-xs text-muted-custom bg-card-custom px-2.5 py-1 rounded-full border border-custom font-semibold">
            {subjects.theory.length + (subjects.lab?.length ?? 0)} Total
          </span>
        </div>

        {/* Theory Subjects */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {subjects.theory.map((s, idx) => (
            <motion.div key={s.id} variants={item}>
              <Link
                href={`/subject/${s.id}?branch=${branch}&semester=${ACTIVE_SEM}&label=${encodeURIComponent(s.label)}`}
              >
                <motion.div
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="card-hover p-5 cursor-pointer group flex flex-col justify-between h-full min-h-[120px] relative overflow-hidden"
                >
                  <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-all font-black text-4xl text-indigo-400">
                    {s.short}
                  </div>
                  <div>
                    <div className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                      Theory
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-indigo-400 transition-colors leading-snug">
                      {s.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold mt-4">
                    <span>Browse materials</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}

          {/* Lab Subjects */}
          {subjects.lab?.map((s) => (
            <motion.div key={s.id} variants={item}>
              <Link
                href={`/subject/${s.id}?branch=${branch}&semester=${ACTIVE_SEM}&label=${encodeURIComponent(s.label)}`}
              >
                <motion.div
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="card-hover p-5 cursor-pointer group flex flex-col justify-between h-full min-h-[120px] border-emerald-500/15 relative overflow-hidden"
                >
                  <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-all font-black text-4xl text-emerald-400">
                    LAB
                  </div>
                  <div>
                    <div className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                      Practical
                    </div>
                    <h3 className="font-bold text-sm text-primary group-hover:text-emerald-400 transition-colors leading-snug">
                      {s.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold mt-4">
                    <span>Browse lab tasks</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Useful Academic Tools Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-primary tracking-wide">Academic Workspace Tools</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* AI Assistant */}
          <Link href="/ai">
            <motion.div
              whileHover={{ y: -3 }}
              className="card-hover p-6 cursor-pointer flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-primary">JARVIS Assistant</h3>
                <p className="text-xs text-secondary leading-normal">
                  Your AI personal assistant answers all your academic doubts dynamically based on your uploaded subject files.
                </p>
              </div>
            </motion.div>
          </Link>

          {/* Contribute Resources */}
          <Link href="/contribute">
            <motion.div
              whileHover={{ y: -3 }}
              className="card-hover p-6 cursor-pointer flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-primary">Contribute Resources</h3>
                <p className="text-xs text-secondary leading-normal">
                  Upload & share study materials, syllabus, notes, or previous question papers directly with your batch.
                </p>
              </div>
            </motion.div>
          </Link>

          {/* Resources Finder */}
          <Link href={`/branch/${branch}/semester/4`}>
            <motion.div
              whileHover={{ y: -3 }}
              className="card-hover p-6 cursor-pointer flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-primary">Browse Semesters</h3>
                <p className="text-xs text-secondary leading-normal">
                  Access all semester syllabus folders, previous semesters archives, and explore all structured files.
                </p>
              </div>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Top Contributors Section (initially hidden, shown only when contributions > 0) */}
      {topContributors.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
            <h2 className="text-lg font-bold text-primary tracking-wide">Top Batch Contributors</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topContributors.map((c, i) => (
              <motion.div
                key={c.rollNumber}
                whileHover={{ y: -3, scale: 1.01 }}
                className="card p-5 text-center border-custom relative overflow-hidden bg-card-custom/40 flex flex-col justify-between"
              >
                {/* Ranking badge */}
                <div className="absolute top-2 left-2 text-[10px] font-mono font-bold text-muted-custom bg-card-custom px-2 py-0.5 rounded-full border border-custom">
                  #{i + 1}
                </div>
                
                <div className="my-3 space-y-2.5">
                  <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-extrabold mx-auto text-sm shadow-md">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-primary text-sm truncate" title={c.name}>{c.name}</h4>
                    <p className="text-[10px] text-muted-custom font-mono">{c.rollNumber}</p>
                  </div>
                </div>

                <div className="mt-2 pt-2.5 border-t border-custom text-xs">
                  <span className="text-indigo-400 font-bold">{c.count}</span>{' '}
                  <span className="text-secondary font-medium">materials</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Explore Other Branches Section */}
      <div className="p-6 rounded-3xl glass-strong border border-custom flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-primary">Need to browse materials from another branch?</h3>
          <p className="text-xs text-secondary mt-0.5">Explore files, playlists, and question banks for different departments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {OTHER_BRANCHES.map((b) => (
            <Link key={b.id} href={`/branch/${b.id}`}>
              <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card-custom hover:bg-indigo-500/10 border border-custom hover:border-indigo-500/30 text-secondary hover:text-indigo-400 transition-all cursor-pointer">
                {b.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
