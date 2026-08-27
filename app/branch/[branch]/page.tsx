'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen, Clock } from 'lucide-react';

import { ACTIVE_SEM, getBranchSubjects } from '@/lib/subjects';

const BRANCH_META: Record<string, { label: string }> = {
  'CSE':      { label: 'Computer Science Engineering' },
  'CSE-AIML': { label: 'CSE — AI & Machine Learning' },
  'CSE-DS':   { label: 'CSE — Data Science' },
  'IT':       { label: 'Information Technology' },
};

const SEM_LABELS: Record<number, string> = {
  1: '1st Sem', 2: '2nd Sem', 3: '3rd Sem', 4: '4th Sem',
  5: '5th Sem', 6: '6th Sem', 7: '7th Sem', 8: '8th Sem',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  show:   { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export default function BranchPage() {
  const { branch } = useParams<{ branch: string }>();
  const meta = BRANCH_META[branch] ?? { label: branch };

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-10">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-xs text-muted-custom mb-6 flex-wrap"
      >
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary font-medium">{branch}</span>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white gradient-accent mb-3">
          {branch}
        </div>
        <h1 className="text-page-h1">{meta.label}</h1>
        <p className="text-secondary mt-1">
          Semesters 4 & 5 are available — other semesters coming soon
        </p>
      </motion.div>

      {/* Semester grid */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5"
      >
        {Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => {
          const hasSubjects = !!getBranchSubjects(branch, sem);
          const isActive = sem === 4 || sem === 5 || hasSubjects;
          return (
            <motion.div key={sem} variants={item}>
              {isActive ? (
                <Link href={`/branch/${branch}/semester/${sem}`}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="card-hover p-4 sm:p-6 cursor-pointer text-center group relative overflow-hidden"
                  >
                    <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl shadow-lg">
                      {sem}
                    </div>
                    <div className="font-semibold text-primary text-sm">{SEM_LABELS[sem]}</div>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-[rgb(var(--accent-hover))] font-medium">
                      <BookOpen className="w-3 h-3" />
                      View subjects
                    </div>
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[rgb(var(--accent-emerald)_/_0.15)] text-[rgb(var(--accent-emerald))] text-[9px] font-bold uppercase tracking-wide">
                      Live
                    </span>
                  </motion.div>
                </Link>
              ) : (
                <div className="card p-4 sm:p-6 text-center opacity-45 cursor-not-allowed select-none">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-700/40 flex items-center justify-center mx-auto mb-4 text-zinc-600 font-bold text-xl">
                    {sem}
                  </div>
                  <div className="font-semibold text-secondary text-sm">{SEM_LABELS[sem]}</div>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-custom">
                    <Clock className="w-3 h-3" />
                    Coming soon
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
