'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

import { usePathname } from 'next/navigation';

const HIDDEN_ON = ['/ai', '/community', '/contribute'];

export function AIChatPanel() {
  const router = useRouter();
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <motion.button
      onClick={() => router.push('/ai')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 rounded-2xl gradient-accent text-white shadow-lg flex items-center justify-center z-50 cursor-pointer mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)]"
      aria-label="Open AI Assistant"
    >
      <Bot className="w-5 h-5" />
    </motion.button>
  );
}
