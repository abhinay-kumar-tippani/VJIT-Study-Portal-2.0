'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Check, Trash2, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationItem {
  _id: string;
  notificationId: string;
  studentRollNo: string;
  message: string;
  isRead: boolean;
  relatedReportId: string;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch (err) {
      console.error('[NotificationBell Fetch Error]', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 12 seconds for new notifications in real-time
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, []);

  // Listen to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadNotifications.length;

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
        );
        // Custom event so that alert banners can hide instantly
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error('[NotificationBell Mark Read Error]', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (err) {
      console.error('[NotificationBell Mark All Read Error]', err);
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-secondary hover:text-primary hover:bg-card-custom transition-all border border-transparent hover:border-custom focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-swing' : ''}`} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-zinc-950"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 glass-strong rounded-2xl border border-custom shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-custom flex items-center justify-between bg-card-custom/40">
              <span className="font-bold text-sm text-primary">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-custom/50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-secondary text-xs space-y-2">
                  <Bell className="w-8 h-8 text-muted-custom mx-auto opacity-40" />
                  <p>All clean! No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-3.5 flex gap-3 transition-colors ${
                      notif.isRead ? 'opacity-60 bg-transparent' : 'bg-indigo-500/5 hover:bg-indigo-500/10'
                    }`}
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-xs text-primary leading-normal break-words">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-custom">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(notif.createdAt).toLocaleDateString('en-IN')}</span>
                        <span>·</span>
                        <span>{new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    {!notif.isRead && (
                      <button
                        onClick={() => markAsRead(notif.notificationId)}
                        className="h-6 w-6 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-card-custom/20 border-t border-custom text-center">
              <span className="text-[10px] text-muted-custom font-mono">VJIT Study Portal Notifications</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
