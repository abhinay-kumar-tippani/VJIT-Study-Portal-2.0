'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock,
  BookMarked, Crown, X
} from 'lucide-react';
import Link from 'next/link';
import { getBranchFromRollNumber, getBranchLabel } from '@/lib/branch';
import { getBranchSubjects, ACTIVE_SEM, type Subject } from '@/lib/subjects';
import { SubjectCard, SubjectCardSkeleton, type SubjectType } from '@/components/ui/SubjectCard';

interface Session {
  rollNumber: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  branch: string;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

function pluralStudents(count: number): string {
  return `${count} student${count !== 1 ? 's' : ''}`;
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showResolvedBanner, setShowResolvedBanner] = useState(false);

  const checkNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const unread = (data.notifications ?? []).filter((n: any) => !n.isRead);
        setShowResolvedBanner(unread.length > 0);
      }
    } catch (err) {
      console.error('[Dashboard Notifications Error]', err);
    }
  };

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
    checkNotifications();

    const handleUpdate = () => {
      checkNotifications();
    };
    window.addEventListener('notifications-updated', handleUpdate);
    return () => window.removeEventListener('notifications-updated', handleUpdate);
  }, []);

  const handleBannerClick = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setShowResolvedBanner(false);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error(err);
    }
  };

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
        .catch((err) => console.error('[Dashboard stats fetch error]', err))
        .finally(() => setStatsLoading(false));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 md:px-8 py-8 space-y-8 animate-pulse">
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
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
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

  const subjects = getBranchSubjects(branch, ACTIVE_SEM) ?? getBranchSubjects('CSE-AIML', ACTIVE_SEM)!;

  // Other branches list for exploration
  const OTHER_BRANCHES = [
    { id: 'CSE', label: 'Computer Science' },
    { id: 'CSE-AIML', label: 'Artifical Intelligence & Machine Learning' },
    { id: 'CSE-DS', label: 'Data Science' },
    { id: 'IT', label: 'Information Technology' },
  ].filter((b) => b.id !== branch);

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Dynamic Resolution Banner */}
      {showResolvedBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          onClick={handleBannerClick}
          className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm cursor-pointer hover:bg-emerald-500/15 transition-all shadow-lg shadow-emerald-500/5 group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span role="img" aria-label="celebrate" className="text-base flex-shrink-0">🎉</span>
            <span className="font-semibold truncate">
              Your reported issue has been resolved! Click to view.
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowResolvedBanner(false);
            }}
            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400/70 hover:text-emerald-400 transition-colors focus:outline-none"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Personalized Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl glass-strong border border-custom relative overflow-hidden"
      >
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2 text-eyebrow text-[rgb(var(--accent-hover))]">
            <Clock className="w-3.5 h-3.5" />
            <span>Welcome back</span>
          </div>
          <h1 className="text-page-h1">
            Hello, <span className="font-black">{name}</span>
          </h1>
          <p className="text-body md:text-base font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
            <span>Roll Number:</span>
            <span className="font-mono text-[rgb(var(--accent-hover))] bg-[rgb(var(--accent)_/_0.1)] px-2 py-0.5 rounded-lg border border-[rgb(var(--accent)_/_0.15)] text-xs">
              {rollNumber}
            </span>
            {userCount !== null && (
              <span className="text-xs font-semibold text-[rgb(var(--accent-emerald))] ml-0 md:ml-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent-emerald))]" />
                <span>{pluralStudents(userCount)} joined</span>
              </span>
            )}
          </p>
        </div>

        {/* Branch Indicator Badge */}
        <div className="z-10 flex flex-col items-start md:items-end gap-1 flex-shrink-0">
          <span className="text-eyebrow">Current Branch</span>
          <div className="px-3 py-2 rounded-2xl gradient-accent text-white font-bold text-sm shadow-lg">
            {branchLabel}
          </div>
          <span className="text-xs font-semibold text-[rgb(var(--accent-emerald))] mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[rgb(var(--accent-emerald))] animate-pulse" />
            Semester {ACTIVE_SEM} Active
          </span>
        </div>
      </motion.div>

      {/* Subjects — split into Core Theory / PE / OE / Lab */}
      {(() => {
        /** Classify a theory subject by its id prefix */
        function classifySubject(s: Subject): SubjectType {
          if (s.id.startsWith('PE-')) return 'pe';
          if (s.id.startsWith('OE-')) return 'oe';
          return 'theory';
        }

        const coreTheory = subjects.theory.filter((s) => classifySubject(s) === 'theory');
        const peSubjects = subjects.theory.filter((s) => classifySubject(s) === 'pe');
        const oeSubjects = subjects.theory.filter((s) => classifySubject(s) === 'oe');
        const labSubjects = subjects.lab ?? [];

        const totalCount = subjects.theory.length + labSubjects.length;

        type SectionDef = {
          key: string;
          title: string;
          icon: string;
          items: Subject[];
          type: SubjectType;
        };

        const sections: SectionDef[] = [
          { key: 'theory', title: 'Theory',                  icon: '📖', items: coreTheory, type: 'theory' },
          { key: 'pe',     title: 'Professional Electives',  icon: '🎯', items: peSubjects, type: 'pe'     },
          { key: 'oe',     title: 'Open Electives',          icon: '🌐', items: oeSubjects, type: 'oe'     },
          { key: 'lab',    title: 'Lab Subjects',            icon: '🧪', items: labSubjects, type: 'lab'   },
        ].filter((s) => s.items.length > 0);

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-[rgb(var(--accent-hover))]" />
                <h2 className="text-section">Your Subjects (Semester {ACTIVE_SEM})</h2>
              </div>
              <span className="text-xs text-muted-custom bg-card-custom px-2.5 py-1 rounded-full border border-custom font-semibold">
                {totalCount} Total
              </span>
            </div>

            {/* Each section */}
            {sections.map((section) => (
              <div key={section.key} className="space-y-3">
                {/* Section sub-header */}
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{section.icon}</span>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--accent)_/_0.1)] text-[rgb(var(--accent-hover))] text-xs font-semibold">
                    {section.items.length}
                  </span>
                </div>

                {/* Grid */}
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  {section.items.map((s, i) => (
                    <SubjectCard
                      key={s.id}
                      id={s.id}
                      label={s.label}
                      short={s.short}
                      branch={branch}
                      semester={ACTIVE_SEM}
                      type={section.type}
                      index={i + 1}
                    />
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Top Batch Contributors */}
      {(statsLoading || topContributors.length > 0) && (
        <div className="space-y-4 pt-2 max-w-5xl">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[rgb(var(--accent-hover))]" />
            <h2 className="text-section">Top Batch Contributors</h2>
          </div>
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 justify-start">
            {statsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-5 space-y-3">
                  <div className="skeleton w-10 h-10 rounded-full mx-auto" />
                  <div className="skeleton h-4 w-3/4 mx-auto rounded" />
                  <div className="skeleton h-3 w-1/2 mx-auto rounded" />
                </div>
              ))
            ) : (
              <>
            {topContributors.map((c, i) => (
              <motion.div
                key={c.rollNumber}
                whileHover={{ y: -3, scale: 1.01 }}
                className="card-hover p-5 text-center relative overflow-hidden bg-card-custom/40 flex flex-col justify-between"
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
                  <span className="text-[rgb(var(--accent-hover))] font-bold">{c.count}</span>{' '}
                  <span className="text-secondary font-medium">{c.count === 1 ? 'contribution' : 'contributions'}</span>
                </div>
              </motion.div>
            ))}
            {Array.from({ length: Math.max(0, 3 - topContributors.length) }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className="p-5 text-center rounded-xl border-2 border-dashed border-custom flex flex-col items-center justify-center min-h-[160px] opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-card-custom border border-custom flex items-center justify-center text-muted-custom mb-2">
                  <span className="text-lg">?</span>
                </div>
                <p className="text-xs text-muted-custom font-medium">Open spot</p>
                <p className="text-[10px] text-muted-custom mt-0.5">Contribute to rank up</p>
              </div>
            ))}
              </>
            )}
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
              <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-card-custom hover:bg-[rgb(var(--accent)_/_0.1)] border border-custom hover:border-[rgb(var(--accent)_/_0.3)] text-secondary hover:text-[rgb(var(--accent-hover))] transition-all cursor-pointer">
                {b.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
