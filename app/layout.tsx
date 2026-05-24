import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { AIChatPanel } from '@/components/layout/AIChatPanel';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: { default: 'VJIT Study Portal 2.0', template: '%s | VJIT Study Portal 2.0' },
  description: 'Premium academic resource platform for VJIT students — notes, PYQs, question banks, and AI study assistance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 min-h-screen overflow-x-hidden">
              {children}
            </main>
            <AIChatPanel />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
