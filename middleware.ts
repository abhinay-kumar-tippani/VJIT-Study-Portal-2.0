import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const PROTECTED   = ['/dashboard', '/branch', '/subject', '/community', '/ai'];
const ADMIN_PATHS = ['/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAdmin     = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage  = pathname === '/login' || pathname === '/signup';

  const token   = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isAdmin) {
    if (!session)         return NextResponse.redirect(new URL('/login',     req.url));
    if (!session.isAdmin) return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/branch/:path*', '/subject/:path*',
    '/community/:path*', '/ai/:path*', '/admin/:path*',
    '/login', '/signup',
  ],
};
