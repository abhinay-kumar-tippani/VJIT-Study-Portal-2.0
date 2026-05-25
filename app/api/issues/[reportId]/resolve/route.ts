import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import Issue from '@/models/Issue';
import Notification from '@/models/Notification';

// Helper to authenticate admin session
async function getAdminSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session || (!session.isAdmin && !session.isSuperAdmin)) return null;
  return session;
}

// POST /api/issues/[reportId]/resolve — Admin marks an issue as resolved
export async function POST(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { reportId } = params;
  if (!reportId) {
    return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
  }

  try {
    await connectDB();

    const issue = await Issue.findOne({ reportId });
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (issue.status === 'resolved') {
      return NextResponse.json({ error: 'Issue is already resolved' }, { status: 400 });
    }

    // Update Issue status
    issue.status = 'resolved';
    issue.resolvedAt = new Date();
    await issue.save();

    // Create notification for the student
    await Notification.create({
      studentRollNo: issue.studentRollNo,
      message: `Your issue '${issue.issueType}' has been resolved by the admin.`,
      relatedReportId: issue.reportId,
      isRead: false,
    });

    return NextResponse.json({
      message: 'Issue marked as resolved and notification triggered successfully.',
      issue: {
        ...issue.toObject(),
        _id: String(issue._id),
      },
    });
  } catch (err: any) {
    console.error('[api/issues/resolve]', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

// Also support PATCH as specified in implementation plan
export { POST as PATCH };
