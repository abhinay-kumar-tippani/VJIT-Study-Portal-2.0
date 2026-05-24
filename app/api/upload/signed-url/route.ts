import { NextRequest, NextResponse } from 'next/server';
import { generateSignedUploadUrl } from '@/lib/gcs';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { fileName, contentType } = await req.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const signedUrl = await generateSignedUploadUrl(fileName, contentType);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error('[signed-url]', err);
    return NextResponse.json(
      { error: 'Could not generate signed URL — check GCS configuration' },
      { status: 500 }
    );
  }
}
