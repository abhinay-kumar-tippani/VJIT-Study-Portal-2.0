'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface SubjectCardProps {
  id: string;
  label: string;
  short: string;
  branch: string;
  semester: number;
  type: 'theory' | 'lab';
  index: number;
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

/** Skeleton placeholder matching SubjectCard layout. */
export function SubjectCardSkeleton() {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="skeleton w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-12 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      </div>
      <div className="skeleton h-3 w-3/4 rounded" />
      <div className="skeleton h-3 w-24 rounded" />
    </div>
  );
}

/**
 * Shared subject card used on Dashboard and Semester pages.
 * 32px monogram badge, type eyebrow, subject name, browse link.
 */
export function SubjectCard({ id, label, short, branch, semester, type, index }: SubjectCardProps) {
  const isLab = type === 'lab';

  return (
    <motion.div variants={item}>
      <Link
        href={`/subject/${id}?branch=${branch}&semester=${semester}&label=${encodeURIComponent(label)}`}
      >
        <motion.div
          whileHover={{ y: -2 }}
          className="card-hover p-4 sm:p-5 cursor-pointer group flex flex-col items-start gap-2 min-h-[72px]"
        >
          <div className="flex items-center gap-2 w-full">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {index}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-eyebrow">{isLab ? 'Lab' : 'Theory'}</div>
              <div className="text-card-title truncate group-hover:text-[rgb(var(--accent-hover))] transition-colors">
                {short}
              </div>
            </div>
          </div>

          <div className="text-body truncate w-full">{label}</div>

          <div className="flex items-center gap-1 text-xs text-[rgb(var(--accent-hover))] font-semibold">
            Browse materials
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
