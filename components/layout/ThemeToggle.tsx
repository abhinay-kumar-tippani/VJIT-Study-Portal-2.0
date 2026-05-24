'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        text-secondary hover:text-primary transition-all duration-150
        hover:bg-card-custom border border-transparent hover:border-custom
      "
    >
      <div className="relative w-4 h-4">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <Moon className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <Sun className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      {/* Toggle pill */}
      <div
        className={`ml-auto w-8 h-4 rounded-full relative transition-colors duration-300 ${
          isDark ? 'bg-indigo-500' : 'bg-zinc-300'
        }`}
      >
        <motion.div
          layout
          className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm"
          animate={{ left: isDark ? '17px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}
