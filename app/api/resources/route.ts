import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import Resource from '@/models/Resource';

// GET /api/resources?branch=CSE&semester=3&subject=xyz&type=notes
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branch = searchParams.get('branch');
  const semester = searchParams.get('semester');
  const subject = searchParams.get('subject');
  const type = searchParams.get('type');

  const db = await connectDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const filter: Record<string, unknown> = { status: 'approved' };
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  if (subject) filter.subject = subject;
  if (type) filter.type = type;

  const resources = await Resource.find(filter)
    .select('-embedding -textContent')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ resources });
}

// POST /api/resources — create resource metadata (after GCS upload)
export async function POST(req: NextRequest) {
  const token = req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, type, branch, semester, subject, url, fileType } = body;

  if (!title || !type || !branch || !semester || !subject || !url || !fileType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = await connectDB();
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const resource = await Resource.create({
    title,
    type,
    branch,
    semester: Number(semester),
    subject,
    url,
    fileType,
    uploadedBy: session.rollNumber,
    status: 'pending',
  });

  return NextResponse.json({ resource }, { status: 201 });
}
