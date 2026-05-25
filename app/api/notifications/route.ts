import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import Notification from '@/models/Notification';

// Helper to authenticate user session
async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/notifications — Fetch all notifications for the logged-in student
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const notifications = await Notification.find({ studentRollNo: session.rollNumber })
      .sort({ createdAt: -1 })
      .lean();

    const mappedNotifs = notifications.map(n => ({
      ...n,
      _id: String(n._id),
    }));

    return NextResponse.json({ notifications: mappedNotifs });
  } catch (err: any) {
    console.error('[api/notifications/GET]', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

// PATCH /api/notifications — Mark a notification as read (or mark all as read)
export async function PATCH(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { notificationId } = await req.json().catch(() => ({ notificationId: null }));
    await connectDB();

    if (notificationId) {
      // Mark specific notification as read
      const updated = await Notification.findOneAndUpdate(
        { notificationId, studentRollNo: session.rollNumber },
        { isRead: true },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Success', notification: updated });
    } else {
      // Mark all notifications as read for this student
      await Notification.updateMany(
        { studentRollNo: session.rollNumber, isRead: false },
        { isRead: true }
      );
      return NextResponse.json({ message: 'All notifications marked as read' });
    }
  } catch (err: any) {
    console.error('[api/notifications/PATCH]', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
