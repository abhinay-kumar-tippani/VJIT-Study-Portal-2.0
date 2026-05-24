import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  return NextResponse.json(session);
}
