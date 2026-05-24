'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Fallback redirect page for /branch route.
 * Redirects the user directly to their detected branch.
 */
export default function BranchIndexPage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        const branch = session?.branch ?? 'CSE-AIML';
        router.replace(`/branch/${branch}`);
      })
      .catch(() => {
        router.replace('/branch/CSE-AIML');
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse font-semibold text-sm text-indigo-400">
        Redirecting to your branch...
      </div>
    </div>
  );
}
