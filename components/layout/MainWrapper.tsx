'use client';

import { usePathname } from 'next/navigation';

interface MainWrapperProps {
  children: React.ReactNode;
}

/**
 * MainWrapper client component that dynamically applies the correct layout margins
 * and padding based on the current active pathname.
 * It prevents the landing and auth pages (which do not have a sidebar) from being pushed
 * to the right, ensuring they are perfectly centered.
 */
export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Center landing page, login page, and signup page
  const isAuthOrLanding = pathname === '/' || pathname === '/login' || pathname === '/signup';

  return (
    <main
      className={`flex-1 min-h-screen overflow-x-hidden transition-all duration-300 ${
        isAuthOrLanding
          ? 'ml-0 pt-0'
          : 'ml-0 md:ml-64 pt-16 md:pt-0'
      }`}
    >
      {children}
    </main>
  );
}
