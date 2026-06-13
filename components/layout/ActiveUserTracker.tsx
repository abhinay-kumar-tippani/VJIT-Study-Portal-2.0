'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function ActiveUserTracker() {
  const pathname = usePathname();
  const isUnauthorizedRef = useRef(false);

  useEffect(() => {
    // Reset authorization flag when pathname changes (user might have logged in)
    isUnauthorizedRef.current = false;

    // Do not run on auth pages
    const isAuthPage = pathname === '/login' || pathname === '/signup';
    if (isAuthPage) return;

    const sendHeartbeat = async () => {
      if (isUnauthorizedRef.current) return;
      if (document.visibilityState !== 'visible') return;

      try {
        const res = await fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 401) {
          // User is not logged in, stop subsequent heartbeats on this page session
          isUnauthorizedRef.current = true;
        }
      } catch (err) {
        console.error('[ActiveUserTracker] Failed to send heartbeat:', err);
      }
    };

    // Send immediately on page load/navigation
    sendHeartbeat();

    // Set up heartbeat interval (every 3 minutes)
    const interval = setInterval(sendHeartbeat, 3 * 60 * 1000);

    // Event listener for tab visibility change to send heartbeat when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
