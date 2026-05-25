'use client';

import { Menu, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from './NotificationBell';

/**
 * MobileHeader component shown only on mobile viewports (< 768px).
 * Emits a custom 'toggle-sidebar' event to let the Sidebar component open or close.
 */
export function MobileHeader() {
  const toggleSidebar = () => {
    window.dispatchEvent(new Event('toggle-sidebar'));
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass z-40 border-b border-custom flex items-center justify-between px-4 md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-card-custom transition-all border border-transparent hover:border-custom active:scale-95"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-accent flex items-center justify-center text-white shadow shadow-indigo-500/30">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-primary tracking-wide">VJIT Portal</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  );
}
