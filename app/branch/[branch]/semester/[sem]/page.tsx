'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, FlaskConical, BookOpen, Clock } from 'lucide-react';

import { ACTIVE_SEM, SEM4_SUBJECTS } from '@/lib/subjects';
import { SubjectCard } from '@/components/ui/SubjectCard';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };


// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SemesterPage() {
  const { branch, sem } = useParams<{ branch: string; sem: string }>();
  const semester  = Number(sem);
  const isActive  = semester === ACTIVE_SEM;
  const subjects  = SEM4_SUBJECTS[branch];
  const hasLabs   = !!subjects?.lab?.length;

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-10">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-xs text-muted-custom mb-6"
      >
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/branch/${branch}`} className="hover:text-primary transition-colors">{branch}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary font-medium">Semester {semester}</span>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-page-h1">
          Semester {semester} — {branch}
        </h1>
        <p className="text-secondary mt-1">
          {isActive && subjects
            ? 'Select a subject to view notes, PYQs, question banks and more'
            : 'Content for this semester is coming soon'}
        </p>
      </motion.div>

      {/* ── ACTIVE: show subjects ── */}
      {isActive && subjects ? (
        <>
          {/* Theory */}
          <div className={hasLabs ? 'mb-8' : ''}>
            {hasLabs && (
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-[rgb(var(--accent-hover))]" />
                <h2 className="text-eyebrow text-secondary">Theory Subjects</h2>
                <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--accent)_/_0.1)] text-[rgb(var(--accent-hover))] text-xs font-medium">
                  {subjects.theory.length}
                </span>
              </div>
            )}
            <motion.div
              variants={container} initial="hidden" animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
            >
              {subjects.theory.map((s, i) => (
                <SubjectCard key={s.id} id={s.id} label={s.label} short={s.short} branch={branch} semester={semester} type="theory" index={i + 1} />
              ))}
            </motion.div>
          </div>

          {/* Lab (only if the branch has labs defined) */}
          {hasLabs && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-4 h-4 text-[rgb(var(--accent-hover))]" />
                <h2 className="text-eyebrow text-secondary">Lab Subjects</h2>
                <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--accent)_/_0.1)] text-[rgb(var(--accent-hover))] text-xs font-medium">
                  {subjects.lab!.length}
                </span>
              </div>
              <motion.div
                variants={container} initial="hidden" animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
              >
                {subjects.lab!.map((s, i) => (
                  <SubjectCard key={s.id} id={s.id} label={s.label} short={s.short} branch={branch} semester={semester} type="lab" index={i + 1} />
                ))}
              </motion.div>
            </div>
          )}
        </>
      ) : (
        /* ── COMING SOON ── */
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 border border-custom flex items-center justify-center mb-6">
            <Clock className="w-9 h-9 text-zinc-500" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-2">Coming Soon</h2>
          <p className="text-secondary max-w-sm">
            Resources for{' '}
            <span className="text-[rgb(var(--accent-hover))] font-medium">{branch} Semester {semester}</span>{' '}
            are being organized and will be uploaded shortly.
          </p>
          <Link href={`/branch/${branch}`}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="mt-8 px-5 py-2.5 rounded-xl glass border border-custom text-secondary hover:text-primary text-sm font-medium transition-all"
            >
              ← Back to Semesters
            </motion.button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
