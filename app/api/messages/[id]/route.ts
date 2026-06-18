import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import Message from '@/models/Message';

/**
 * DELETE /api/messages/:id
 *
 * Admin-only. Checks server-side that the requester has isAdmin=true.
 * A non-admin hitting this (Postman, curl, whatever) gets a hard 403.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Hard server-side admin check — the hidden delete button in the UI
  // is just UX convenience, this is the real gate.
  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  const db = await connectDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { id } = params;

  const deleted = await Message.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Deleted' });
}
