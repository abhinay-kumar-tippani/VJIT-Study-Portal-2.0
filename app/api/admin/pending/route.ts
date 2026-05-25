import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import Resource from '@/models/Resource';
import User from '@/models/User';

// Helper to authenticate admin
async function getAdminSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session || (!session.isAdmin && !session.isSuperAdmin)) return null;
  return session;
}

// GET — Fetch all pending study material submissions
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const pendingResources = await Resource.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .lean();

  const resourcesWithUser = await Promise.all(
    pendingResources.map(async (res) => {
      const user = await User.findOne({ rollNumber: res.uploadedBy }).select('name').lean();
      return {
        ...res,
        _id: String(res._id),
        studentName: user?.name || 'Unknown Student',
      };
    })
  );

  return NextResponse.json({ resources: resourcesWithUser });
}

// POST — Approve or Reject a pending submission
export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { resourceId, action, rejectionReason } = await req.json();

    if (!resourceId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    await connectDB();
    const status = action === 'approve' ? 'approved' : 'rejected';
    const updateFields: Record<string, any> = { status };
    if (action === 'reject') {
      updateFields.rejectionReason = rejectionReason || '';
    }

    const updated = await Resource.findByIdAndUpdate(resourceId, updateFields, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Success', resource: updated });
  } catch (err: any) {
    console.error('[admin/pending/POST]', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
