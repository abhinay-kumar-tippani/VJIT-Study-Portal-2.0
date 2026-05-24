'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Code2, Brain, BarChart3, Monitor, ArrowRight, Sparkles } from 'lucide-react';

const BRANCHES = [
  {
    id: 'CSE',
    label: 'Computer Science',
    short: 'CSE',
    icon: Code2,
    color: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99,102,241,0.25)',
    desc: 'Core CS — DS, Algorithms, OS, Networks, DBMS',
    students: '480+',
  },
  {
    id: 'CSE-AIML',
    label: 'AI & Machine Learning',
    short: 'CSE-AIML',
    icon: Brain,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.25)',
    desc: 'ML, Deep Learning, NLP, Computer Vision',
    students: '240+',
  },
  {
    id: 'CSE-DS',
    label: 'Data Science',
    short: 'CSE-DS',
    icon: BarChart3,
    color: 'from-orange-500 to-amber-600',
    glow: 'rgba(249,115,22,0.25)',
    desc: 'Statistics, Big Data, Analytics, Visualization',
    students: '180+',
  },
  {
    id: 'IT',
    label: 'Information Technology',
    short: 'IT',
    icon: Monitor,
    color: 'from-sky-500 to-blue-600',
    glow: 'rgba(14,165,233,0.25)',
    desc: 'Web Tech, Networking, Cloud, Security',
    students: '320+',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function HomePage() {
  return (
    <div className="min-h-screen px-8 py-12 bg-grid-pattern">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-16 text-center max-w-2xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-custom text-xs font-medium text-secondary mb-6">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          Academic Resource Hub
        </div>
        <h1 className="text-5xl font-bold text-primary mb-4 leading-tight">
          VJIT Study Portal 2.0 —{' '}
          <span className="gradient-text">all the resources at one place</span>
        </h1>
        <p className="text-secondary text-lg">
          Notes, PYQs, Question Banks, and AI-powered study assistance.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-xl gradient-accent text-white font-semibold text-sm glow-accent"
            >
              Sign In
            </motion.button>
          </Link>
          <Link href="/signup">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-2.5 rounded-xl glass border border-custom text-primary font-semibold text-sm"
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
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
      >
        {BRANCHES.map((branch) => (
          <motion.div key={branch.id} variants={item}>
            <Link href={`/branch/${branch.id}`}>
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="card-hover p-7 cursor-pointer group"
                style={{ '--glow-color': branch.glow } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${branch.color} flex items-center justify-center shadow-lg`}
                  >
                    <branch.icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-custom group-hover:text-indigo-400 transition-all duration-200 group-hover:translate-x-1" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-mono text-xs font-bold bg-gradient-to-r ${branch.color} bg-clip-text text-transparent`}
                    >
                      {branch.short}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-card-custom border border-custom text-[10px] text-muted-custom">
                      {branch.students} students
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-primary mb-2">{branch.label}</h2>
                  <p className="text-sm text-secondary leading-relaxed">{branch.desc}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-custom flex items-center gap-4 text-xs text-muted-custom">
                  {['Notes', 'PYQs', 'Q-Banks', 'Syllabus'].map((tag) => (
                    <span key={tag} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-indigo-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
