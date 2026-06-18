import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import Message from '@/models/Message';
import { COMMUNITY_CONFIG } from '@/lib/community';

/**
 * GET /api/messages?before=<isoDate>
 *
 * Returns the latest PAGE_SIZE messages for the "general" channel,
 * ordered oldest→newest so the frontend can render top-to-bottom.
 * Pass ?before=<ISO date> to paginate backwards ("load older").
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await connectDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const before = searchParams.get('before');

  const filter: Record<string, any> = { channel: COMMUNITY_CONFIG.DEFAULT_CHANNEL };
  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }

  // Grab newest PAGE_SIZE, then reverse so feed reads oldest→newest
  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(COMMUNITY_CONFIG.PAGE_SIZE)
    .lean();

  messages.reverse();

  // Check if there are older messages beyond what we returned
  const hasOlder = messages.length === COMMUNITY_CONFIG.PAGE_SIZE;

  return NextResponse.json({ messages, hasOlder });
}

/**
 * POST /api/messages
 *
 * Create a new message. Author info comes from the server-side session
 * (never from client payload) so it can't be spoofed.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await connectDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const body = await req.json();
  const { text, replyTo } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
  }

  if (text.trim().length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
  }

  // Build replyTo reference if provided
  let replyRef = undefined;
  if (replyTo && replyTo.messageId && replyTo.authorName && replyTo.snippet) {
    replyRef = {
      messageId: String(replyTo.messageId),
      authorName: String(replyTo.authorName),
      snippet: String(replyTo.snippet).slice(0, 120),
    };
  }

  const message = await Message.create({
    authorId: session.rollNumber,
    authorName: session.name,
    authorRole: session.isAdmin ? 'admin' : 'student',
    text: text.trim(),
    channel: COMMUNITY_CONFIG.DEFAULT_CHANNEL,
    replyTo: replyRef,
  });

  return NextResponse.json({ message }, { status: 201 });
}
