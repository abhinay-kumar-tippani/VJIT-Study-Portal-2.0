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
      className={`flex-1 min-h-screen overflow-x-hidden flex flex-col justify-between transition-all duration-300 ${
        isAuthOrLanding
          ? 'ml-0 pt-0'
          : 'ml-0 md:ml-64 pt-16 md:pt-0'
      }`}
    >
      <div className="flex-1 w-full flex flex-col">
        {children}
      </div>
      <footer className="w-full py-8 border-t border-custom bg-card-custom/20 text-center text-xs text-muted-custom mt-auto">
        <div className="max-w-7xl mx-auto px-6 space-y-1.5">
          <p>
            Built with passion by{' '}
            <a
              href="https://www.linkedin.com/in/abhinay-kumar-tippani/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-indigo-400 font-semibold transition-colors underline decoration-dotted underline-offset-4"
            >
              Abhinay Kumar
            </a>{' '}
            · CSE AI-ML · VJIT
          </p>
          <p className="text-[10px] text-muted-custom/60 uppercase tracking-wider font-mono">VJIT Study Portal v2.0</p>
        </div>
      </footer>
    </main>
  );
}
