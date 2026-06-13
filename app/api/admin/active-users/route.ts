import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Active users window: past 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeCount = await User.countDocuments({
      lastActiveAt: { $gte: fiveMinutesAgo },
    });

    return NextResponse.json({ activeCount });
  } catch (err: unknown) {
    console.error('[active-users]', err);
    return NextResponse.json(
      {
        error: 'Server error',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
