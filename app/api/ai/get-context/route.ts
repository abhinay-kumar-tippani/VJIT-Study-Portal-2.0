import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Resource from '@/models/Resource';

export async function POST(req: NextRequest) {
  try {
    const { query, branch, semester, subject } = await req.json();
    if (!query) return NextResponse.json({ chunks: [] });

    const db = await connectDB();
    if (!db) return NextResponse.json({ chunks: [] });

    // Fall back to text search if no vector index is configured
    const filter: Record<string, unknown> = { status: 'approved' };
    if (branch) filter.branch = branch;
    if (semester) filter.semester = Number(semester);
    if (subject) filter.subject = subject;

    // Simple keyword search on textContent
    const resources = await Resource.find({
      ...filter,
      textContent: { $regex: query.split(' ').slice(0, 5).join('|'), $options: 'i' },
    })
      .select('title textContent subject')
      .limit(5)
      .lean();

    const chunks = resources.map((r) => ({
      title: r.title,
      subject: r.subject,
      snippet: (r.textContent ?? '').slice(0, 800),
    }));

    return NextResponse.json({ chunks });
  } catch (err) {
    console.error('[get-context]', err);
    return NextResponse.json({ chunks: [] });
  }
}
