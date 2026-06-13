import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import DailyActivity from '@/models/DailyActivity';

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

    // Query logs for the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const logs = await DailyActivity.find({
      date: { $gte: sevenDaysAgo },
    })
      .sort({ date: -1, name: 1 })
      .lean();

    // Group logs by date string in JavaScript
    const groupedMap = new Map<string, any>();

    // Pre-populate last 7 days so that empty days still show up in the logs
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      d.setUTCHours(0, 0, 0, 0);
      const isoStr = d.toISOString();
      groupedMap.set(isoStr, {
        date: isoStr,
        count: 0,
        users: [],
      });
    }

    // Populate actual logs
    for (const entry of logs) {
      const isoStr = entry.date.toISOString();
      let dayGroup = groupedMap.get(isoStr);
      if (!dayGroup) {
        dayGroup = {
          date: isoStr,
          count: 0,
          users: [],
        };
        groupedMap.set(isoStr, dayGroup);
      }
      dayGroup.users.push({
        _id: String(entry._id),
        rollNumber: entry.studentRollNo,
        name: entry.name,
      });
      dayGroup.count = dayGroup.users.length;
    }

    // Convert grouped map to a sorted array (newest date first)
    const result = Array.from(groupedMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ logs: result });
  } catch (err: unknown) {
    console.error('[activity-logs]', err);
    return NextResponse.json(
      {
        error: 'Server error',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
