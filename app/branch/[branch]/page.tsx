'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen, Clock } from 'lucide-react';

// Semester 4 is live for all branches — everything else is Coming Soon
const BRANCH_META: Record<string, { label: string; color: string }> = {
  'CSE':      { label: 'Computer Science Engineering',   color: 'from-indigo-500 to-violet-600' },
  'CSE-AIML': { label: 'CSE — AI & Machine Learning',    color: 'from-emerald-500 to-teal-600'  },
  'CSE-DS':   { label: 'CSE — Data Science',             color: 'from-orange-500 to-amber-600'  },
  'IT':       { label: 'Information Technology',         color: 'from-sky-500 to-blue-600'      },
};

const ACTIVE_SEM = 4; // Only Semester 4 is live across all branches

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
  const meta = BRANCH_META[branch] ?? { label: branch, color: 'from-zinc-500 to-zinc-700' };

  return (
    <div className="px-8 py-10">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-xs text-muted-custom mb-6"
      >
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary font-medium">{branch}</span>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${meta.color} mb-3`}>
          {branch}
        </div>
        <h1 className="text-3xl font-bold text-primary">{meta.label}</h1>
        <p className="text-secondary mt-1">
          Semester 4 is available — other semesters coming soon
        </p>
      </motion.div>

      {/* Semester grid */}
      <motion.div
        variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-5"
      >
        {Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => {
          const isActive = sem === ACTIVE_SEM;
          return (
            <motion.div key={sem} variants={item}>
              {isActive ? (
                <Link href={`/branch/${branch}/semester/${sem}`}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="card-hover p-6 cursor-pointer text-center group relative overflow-hidden"
                  >
                    {/* Glow ring on hover */}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ boxShadow: 'inset 0 0 0 1.5px rgba(99,102,241,0.5)' }} />

                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl shadow-lg`}>
                      {sem}
                    </div>
                    <div className="font-semibold text-primary text-sm">{SEM_LABELS[sem]}</div>
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-indigo-400 font-medium">
                      <BookOpen className="w-3 h-3" />
                      View subjects
                    </div>
                    {/* Live badge */}
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wide">
                      Live
                    </span>
                  </motion.div>
                </Link>
              ) : (
                <div className="card p-6 text-center opacity-45 cursor-not-allowed select-none">
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
