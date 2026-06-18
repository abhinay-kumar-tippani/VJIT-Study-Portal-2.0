import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import Message from '@/models/Message';
import User from '@/models/User';
import { COMMUNITY_CONFIG } from '@/lib/community';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ count: 0 });

  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ count: 0 });

  const db = await connectDB();
  if (!db) return NextResponse.json({ count: 0 });

  const user = await User.findOne({ rollNumber: session.rollNumber })
    .select('communityLastReadAt')
    .lean();

  const lastReadAt = user?.communityLastReadAt || new Date(0);

  const count = await Message.countDocuments({
    channel: COMMUNITY_CONFIG.DEFAULT_CHANNEL,
    authorId: { $ne: session.rollNumber },
    createdAt: { $gt: lastReadAt }
  });

  return NextResponse.json({ count });
}
