'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Users, Bot,
  ShieldCheck, LogOut, GraduationCap, ChevronRight, User,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface Session {
  rollNumber: string;
  name: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/branch',    label: 'My Subjects',  icon: BookOpen        },
  { href: '/community', label: 'Community',    icon: Users           },
  { href: '/ai',        label: 'AI Assistant', icon: Bot             },
  { href: '/admin',     label: 'Admin Panel',  icon: ShieldCheck, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then(setSession)
      .catch(() => setSession(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (pathname === '/' || pathname === '/login' || pathname === '/signup') return null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-strong flex flex-col z-50 border-r border-custom">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-custom">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center glow-accent">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-primary leading-none">VJIT Portal</p>
            <p className="text-xs text-secondary mt-0.5">Study Platform 2.0</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter((item) => !item.adminOnly || session?.isAdmin).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 cursor-pointer
                  ${isActive ? 'text-white' : 'text-secondary hover:text-primary'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 gradient-accent rounded-xl opacity-90"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                  />
                )}
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-2 border-t border-custom pt-3">
        <ThemeToggle />

        {session && (
          <div className="px-3 py-2.5 rounded-xl bg-card-custom border border-custom">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-primary truncate">{session.name}</p>
            </div>
            <p className="text-[11px] font-mono text-muted-custom pl-8">{session.rollNumber}</p>
            {session.isSuperAdmin && (
              <span className="mt-1 ml-8 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-semibold">
                <ShieldCheck className="w-2.5 h-2.5" /> Super Admin
              </span>
            )}
          </div>
        )}

        {session ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        ) : (
          <Link href="/login" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-primary transition-all">
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
