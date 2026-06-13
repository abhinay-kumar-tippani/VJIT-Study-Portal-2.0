import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    await User.findByIdAndUpdate(session.userId, {
      lastActiveAt: now,
    });

    return NextResponse.json({ success: true, lastActiveAt: now });
  } catch (err: unknown) {
    console.error('[heartbeat]', err);
    return NextResponse.json(
      {
        error: 'Server error',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
