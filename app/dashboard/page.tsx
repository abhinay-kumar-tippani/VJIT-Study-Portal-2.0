'use client';

import { motion } from 'framer-motion';
import { BookOpen, Users, FileText, Youtube, TrendingUp, Clock, Star } from 'lucide-react';
import Link from 'next/link';

const BRANCHES = [
  { id: 'CSE', label: 'CSE', color: 'from-indigo-500 to-violet-600', sem: 3 },
  { id: 'CSE-AIML', label: 'CSE(AI&ML)', color: 'from-emerald-500 to-teal-600', sem: 2 },
  { id: 'CSE-DS', label: 'CSE(DS)', color: 'from-orange-500 to-amber-600', sem: 4 },
  { id: 'IT', label: 'IT', color: 'from-sky-500 to-blue-600', sem: 1 },
];

const STAT_TILES = [
  { icon: FileText, label: 'Total Notes', value: '1,240+', color: 'text-indigo-400' },
  { icon: BookOpen, label: 'Question Banks', value: '380+', color: 'text-emerald-400' },
  { icon: Youtube, label: 'Video Links', value: '290+', color: 'text-red-400' },
  { icon: Users, label: 'Active Students', value: '1,200+', color: 'text-amber-400' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function DashboardPage() {
  return (
    <div className="px-8 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-2 text-muted-custom text-xs mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Welcome back</span>
        </div>
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <p className="text-secondary mt-1">Your academic resources at a glance</p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-4 gap-4 mb-10"
      >
        {STAT_TILES.map((tile) => (
          <motion.div key={tile.label} variants={item} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <tile.icon className={`w-5 h-5 ${tile.color}`} />
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-primary">{tile.value}</div>
            <div className="text-xs text-secondary mt-0.5">{tile.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Branch quick-access */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4 flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold text-primary">Browse by Branch</h2>
        <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
          View all →
        </Link>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
      >
        {BRANCHES.map((b) => (
          <motion.div key={b.id} variants={item}>
            <Link href={`/branch/${b.id}`}>
              <motion.div
                whileHover={{ y: -3 }}
                className="card-hover p-5 cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-3 text-white font-bold text-xs`}>
                  {b.id.split('-')[0]}
                </div>
                <div className="text-sm font-semibold text-primary">{b.label}</div>
                <div className="flex items-center gap-1 mt-2">
                  {/* <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> */}
                  {/* <span className="text-xs text-muted-custom">Sem {b.sem} popular</span> */}
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
      {/* Recent activity placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="card p-6"
      >
        <h3 className="font-semibold text-primary mb-4">Recently Added Resources</h3>
        <div className="space-y-3">
          {[
            { title: 'Data Structures — Unit 3 Notes', branch: 'CSE', type: 'notes', time: '2h ago' },
            { title: 'DBMS PYQ 2023-24', branch: 'CSE', type: 'pyq', time: '5h ago' },
            { title: 'Machine Learning Question Bank', branch: 'CSE-AIML', type: 'qbank', time: '1d ago' },
            { title: 'Web Technology Syllabus', branch: 'IT', type: 'syllabus', time: '2d ago' },
          ].map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="flex items-center justify-between py-2.5 border-b border-custom last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-card-custom border border-custom flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-primary">{r.title}</div>
                  <div className="text-xs text-muted-custom">{r.branch} · {r.type}</div>
                </div>
              </div>
              <span className="text-xs text-muted-custom">{r.time}</span>
            </motion.div>
          ))}
        </div>
      </motion.div> 
    </div>
  );
}
