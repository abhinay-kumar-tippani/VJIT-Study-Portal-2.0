'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, FlaskConical, BookOpen, ArrowRight, Clock } from 'lucide-react';

import { ACTIVE_SEM, SEM4_SUBJECTS, type Subject } from '@/lib/subjects';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

function SubjectCard({
  subject, branch, sem, index,
}: {
  subject: Subject; branch: string; sem: number; index: number;
}) {
  return (
    <motion.div variants={item}>
      <Link
        href={`/subject/${subject.id}?branch=${branch}&semester=${sem}&label=${encodeURIComponent(subject.label)}`}
      >
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          className="card-hover p-5 cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {index + 1}
            </div>
            <div>
              <div className="font-bold text-sm text-primary tracking-wide">{subject.short}</div>
              <div className="text-xs text-secondary mt-0.5 leading-snug">{subject.label}</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-custom group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SemesterPage() {
  const { branch, sem } = useParams<{ branch: string; sem: string }>();
  const semester  = Number(sem);
  const isActive  = semester === ACTIVE_SEM;
  const subjects  = SEM4_SUBJECTS[branch];
  const hasLabs   = !!subjects?.lab?.length;

  return (
    <div className="px-8 py-10">
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
        <h1 className="text-3xl font-bold text-primary">
          Semester {semester} — <span className="gradient-text">{branch}</span>
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
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">Theory Subjects</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-medium">
                  {subjects.theory.length}
                </span>
              </div>
            )}
            <motion.div
              variants={container} initial="hidden" animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {subjects.theory.map((s, i) => (
                <SubjectCard key={s.id} subject={s} branch={branch} sem={semester} index={i} />
              ))}
            </motion.div>
          </div>

          {/* Lab (only if the branch has labs defined) */}
          {hasLabs && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">Lab Subjects</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
                  {subjects.lab!.length}
                </span>
              </div>
              <motion.div
                variants={container} initial="hidden" animate="show"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {subjects.lab!.map((s, i) => (
                  <SubjectCard key={s.id} subject={s} branch={branch} sem={semester} index={i} />
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
            <span className="text-indigo-400 font-medium">{branch} Semester {semester}</span>{' '}
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
