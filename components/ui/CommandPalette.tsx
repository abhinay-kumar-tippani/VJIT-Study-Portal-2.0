'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FlaskConical, ArrowRight } from 'lucide-react';
import { ALL_SUBJECTS, ACTIVE_SEM } from '@/lib/subjects';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface SearchResult {
  id: string;
  label: string;
  short: string;
  branch: string;
  branchLabel: string;
  type: 'theory' | 'lab';
  href: string;
}

const BRANCH_LABELS: Record<string, string> = {
  'CSE': 'CSE',
  'CSE-AIML': 'CSE-AIML',
  'CSE-DS': 'CSE-DS',
  'IT': 'IT',
};

/** Build search index from ALL_SUBJECTS across semesters. */
function buildIndex(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const [semStr, branchMap] of Object.entries(ALL_SUBJECTS)) {
    const semNum = Number(semStr);
    for (const [branch, config] of Object.entries(branchMap)) {
      for (const s of config.theory) {
        results.push({
          id: s.id,
          label: s.label,
          short: s.short,
          branch,
          branchLabel: BRANCH_LABELS[branch] || branch,
          type: 'theory',
          href: `/subject/${s.id}?branch=${branch}&semester=${semNum}&label=${encodeURIComponent(s.label)}`,
        });
      }
      for (const s of config.lab || []) {
        results.push({
          id: s.id,
          label: s.label,
          short: s.short,
          branch,
          branchLabel: BRANCH_LABELS[branch] || branch,
          type: 'lab',
          href: `/subject/${s.id}?branch=${branch}&semester=${semNum}&label=${encodeURIComponent(s.label)}`,
        });
      }
    }
  }
  return results;
}

/**
 * Global Cmd/Ctrl+K search palette for quickly jumping to any subject.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useFocusTrap(modalRef, open);

  const allResults = useMemo(() => buildIndex(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allResults.slice(0, 12);
    const q = query.toLowerCase();
    return allResults.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.short.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.branchLabel.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }, [query, allResults]);

  // Reset selection when results change
  useEffect(() => setSelectedIndex(0), [filtered]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const navigate = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      router.push(result.href);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start justify-center pt-[6vh] sm:pt-[15vh] px-3 sm:px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg rounded-2xl glass-strong border border-custom shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-custom">
              <Search className="w-4.5 h-4.5 text-muted-custom flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search subjects, e.g. 'DBMS PYQs'..."
                className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted-custom outline-none"
              />
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-card-custom border border-custom text-[10px] font-mono text-muted-custom">
                ESC
              </kbd>
              <button
                onClick={() => setOpen(false)}
                className="sm:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-muted-custom hover:text-primary transition-colors"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div ref={listRef} className="flex-1 min-h-0 max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-custom">
                  No subjects match &ldquo;{query}&rdquo;
                </div>
              )}
              {filtered.map((result, i) => {
                const isFirstTheory = result.type === 'theory' && filtered.findIndex((r) => r.type === 'theory') === i;
                const isFirstLab = result.type === 'lab' && filtered.findIndex((r) => r.type === 'lab') === i;

                return (
                  <div key={`${result.id}-${result.branch}-${result.type}`}>
                    {isFirstTheory && (
                      <div className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-custom select-none">
                        Theory Subjects
                      </div>
                    )}
                    {isFirstLab && (
                      <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-custom select-none border-t border-custom/40 mt-1">
                        Lab Subjects
                      </div>
                    )}

                    <button
                      onClick={() => navigate(result)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 text-left transition-colors
                        ${i === selectedIndex ? 'bg-[rgb(var(--accent)_/_0.1)]' : 'hover:bg-card-custom/50'}
                      `}
                    >
                      <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 relative">
                        {result.short.slice(0, 2)}
                        {result.type === 'lab' && (
                          <FlaskConical className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-white/80" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-primary truncate">{result.label}</div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-custom mt-0.5">
                          <span>{result.branchLabel}</span>
                          <span>·</span>
                          <span className="capitalize">{result.type}</span>
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${i === selectedIndex ? 'text-[rgb(var(--accent-hover))] opacity-100' : 'opacity-0'}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="hidden sm:flex px-4 py-2 border-t border-custom items-center gap-3 text-[10px] text-muted-custom flex-shrink-0">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-card-custom border border-custom font-mono">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-card-custom border border-custom font-mono">↵</kbd> Open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-card-custom border border-custom font-mono">esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Small trigger button for the sidebar. */
export function CommandPaletteTrigger() {
  const handleClick = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-secondary hover:text-primary hover:bg-card-custom/50 transition-all border border-transparent hover:border-custom/40"
    >
      <Search className="w-4 h-4 flex-shrink-0" />
      <span>Search</span>
      <kbd className="ml-auto hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-card-custom border border-custom text-[10px] font-mono text-muted-custom">
        ⌘K
      </kbd>
    </button>
  );
}
