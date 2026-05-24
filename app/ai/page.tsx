'use client';

import { motion } from 'framer-motion';
import { Bot, Key, Sparkles, BookOpen, MessageSquare, Zap } from 'lucide-react';
import { AIChatPanel } from '@/components/layout/AIChatPanel';

const FEATURES = [
  { icon: BookOpen, label: 'Context-Aware', desc: 'Searches your subject resources before answering' },
  { icon: MessageSquare, label: 'Natural Chat', desc: 'Ask in plain language — no special syntax needed' },
  { icon: Zap, label: 'Streaming', desc: 'Real-time streamed responses via Gemini Flash' },
];

export default function AIPage() {
  return (
    <div className="px-8 py-10 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center glow-accent">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">AI Study Assistant</h1>
            <p className="text-secondary text-sm mt-0.5">Powered by Google Gemini · Your personal tutor</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {FEATURES.map((f) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5"
            >
              <f.icon className="w-5 h-5 text-indigo-400 mb-3" />
              <div className="font-semibold text-sm text-primary">{f.label}</div>
              <div className="text-xs text-secondary mt-1">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-amber-400" />
          <h2 className="font-semibold text-primary">Setup</h2>
        </div>
        <ol className="space-y-3 text-sm text-secondary">
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full gradient-accent text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">1</span>
            <span>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-400 hover:underline">aistudio.google.com</a> — get your free Gemini API key (no credit card)</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full gradient-accent text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">2</span>
            <span>Click the <Sparkles className="w-3.5 h-3.5 inline text-indigo-400" /> <strong className="text-primary">AI</strong> button at the bottom-right of any page</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full gradient-accent text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">3</span>
            <span>Click the settings icon <strong className="text-primary">⚙</strong> and paste your API key — it stays in your browser only</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 rounded-full gradient-accent text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">4</span>
            <span>Start asking questions! The AI pulls context from uploaded study materials automatically.</span>
          </li>
        </ol>
      </motion.div>
    </div>
  );
}
