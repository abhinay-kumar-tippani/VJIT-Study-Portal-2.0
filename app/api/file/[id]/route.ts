import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ContributionFile from '@/models/ContributionFile';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const fileDoc = await ContributionFile.findById(params.id);
    if (!fileDoc) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(fileDoc.data, {
      headers: {
        'Content-Type': fileDoc.contentType || 'application/octet-stream',
        'Content-Length': String(fileDoc.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileDoc.filename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
