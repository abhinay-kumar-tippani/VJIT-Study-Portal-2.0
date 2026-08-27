import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RagFeedback from '@/models/RagFeedback';

export async function POST(req: NextRequest) {
  try {
    const { queryLogId, verdict, optionalComment } = await req.json();

    if (!queryLogId || !verdict || (verdict !== 'up' && verdict !== 'down')) {
      return NextResponse.json({ error: 'Invalid feedback parameters' }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const feedbackDoc = await RagFeedback.create({
      queryLogId,
      verdict,
      optionalComment: optionalComment ? String(optionalComment).trim() : undefined,
    });

    return NextResponse.json({ success: true, feedbackId: String(feedbackDoc._id) });
  } catch (err: any) {
    console.error('[Feedback API Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
