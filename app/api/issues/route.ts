import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import Issue from '@/models/Issue';

// Helper to authenticate user session
async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/issues — Admin fetches all reported issues
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || (!session.isAdmin && !session.isSuperAdmin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();
    const issues = await Issue.find({}).sort({ createdAt: -1 }).lean();
    
    // Map _id to string for react key ease
    const mappedIssues = issues.map(iss => ({
      ...iss,
      _id: String(iss._id),
    }));

    return NextResponse.json({ issues: mappedIssues });
  } catch (err: any) {
    console.error('[api/issues/GET]', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

// POST /api/issues — Student reports a new issue
export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { issueType, subject, description, screenshotUrl, branch, semester } = await req.json();

    if (!issueType || !description) {
      return NextResponse.json({ error: 'Issue type and description are required' }, { status: 400 });
    }

    await connectDB();

    const newIssue = await Issue.create({
      studentRollNo: session.rollNumber,
      studentName: session.name,
      branch: branch || 'CSE-AIML',
      semester: semester || '4',
      issueType,
      subject: subject || '',
      description,
      screenshotUrl: screenshotUrl || '',
      status: 'pending',
    });

    return NextResponse.json({
      message: 'Your issue has been reported! We\'ll look into it soon.',
      issue: {
        ...newIssue.toObject(),
        _id: String(newIssue._id),
      },
    });
  } catch (err: any) {
    console.error('[api/issues/POST]', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
