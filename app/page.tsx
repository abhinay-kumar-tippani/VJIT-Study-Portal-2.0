'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Code2, Brain, BarChart3, Monitor, ArrowRight, Sparkles } from 'lucide-react';

function pluralStudents(count: number): string {
  return `${count} student${count !== 1 ? 's' : ''}`;
}

const BRANCHES = [
  {
    id: 'CSE',
    label: 'Computer Science',
    short: 'CSE',
    icon: Code2,
    desc: 'Core CS — DS, Algorithms, OS, Networks, DBMS',
  },
  {
    id: 'CSE-AIML',
    label: 'Artificial Intelligence & Machine Learning',
    short: 'CSE-AIML',
    icon: Brain,
    desc: 'ML, Deep Learning, NLP, Computer Vision',
  },
  {
    id: 'CSE-DS',
    label: 'Data Science',
    short: 'CSE-DS',
    icon: BarChart3,
    desc: 'Statistics, Big Data, Analytics, Visualization',
  },
  {
    id: 'IT',
    label: 'Information Technology',
    short: 'IT',
    icon: Monitor,
    desc: 'Web Tech, Networking, Cloud, Security',
  },
];

const BRANCH_HIGHLIGHT = 'bg-[rgb(var(--accent)_/_0.1)] border-[rgb(var(--accent)_/_0.25)] text-[rgb(var(--accent-hover))]';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function HomePage() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [branchCounts, setBranchCounts] = useState<Record<string, number>>({
    'CSE': 0,
    'CSE-AIML': 0,
    'CSE-DS': 0,
    'IT': 0,
  });

  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/stats')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setUserCount(data.totalUsers);
            if (data.branchCounts) {
              setBranchCounts(data.branchCounts);
            }
          }
        })
        .catch((err) => console.error('[Stats fetch error]', err));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-grid-pattern flex flex-col justify-center">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 sm:mb-8 text-center max-w-2xl mx-auto px-1"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-custom text-eyebrow mb-4">
          <Sparkles className="w-3 h-3 text-[rgb(var(--accent-hover))]" />
          Academic Resource Hub
        </div>
        <p className="text-eyebrow text-[rgb(var(--accent-hover))] mb-1">VJIT Study Portal 2.0</p>
        <h1 className="text-hero mb-2">
          <span className="gradient-text">All your resources in one place</span>
        </h1>
        <p className="text-secondary text-base sm:text-lg px-2">
          Notes, PYQs, Question Banks, and AI-powered study assistance.
        </p>

        {userCount !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full glass border border-custom text-[rgb(var(--accent-hover))] text-xs font-semibold"
          >
            <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent-emerald))]" />
            <span>{pluralStudents(userCount)} joined the portal</span>
          </motion.div>
        )}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center px-2">
          <Link href="/login" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl gradient-accent text-white font-semibold text-sm glow-accent disabled:opacity-60"
            >
              Sign In
            </motion.button>
          </Link>
          <Link href="/signup" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-white/5 border border-white/[0.12] text-primary font-semibold text-sm hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Create Account
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Branch Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto items-stretch w-full"
      >
        {BRANCHES.map((branch) => (
          <motion.div key={branch.id} variants={item} className="h-full">
            <Link href={`/branch/${branch.id}`} className="h-full block">
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className="card-hover p-4 sm:p-5 cursor-pointer group h-full flex flex-col"
              >
                <div className="flex items-start justify-between mb-3 flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center shadow-lg">
                    <branch.icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-custom group-hover:text-[rgb(var(--accent-hover))] transition-all duration-150 group-hover:translate-x-1" />
                </div>

                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[rgb(var(--accent-hover))]">
                      {branch.short}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold shadow-sm flex items-center gap-1.5 ${BRANCH_HIGHLIGHT}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {pluralStudents(branchCounts[branch.id] ?? 0)}
                    </span>
                  </div>
                  <h2 className="text-section mb-2">{branch.label}</h2>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
