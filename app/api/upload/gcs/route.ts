import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const keyJson = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!keyJson || !bucketName) {
      return NextResponse.json({ error: 'GCS env variables are missing' }, { status: 500 });
    }

    // Robust parsing for raw or base64 GCS credentials
    let credentials;
    try {
      credentials = JSON.parse(keyJson);
    } catch {
      const decoded = Buffer.from(keyJson, 'base64').toString('utf-8');
      credentials = JSON.parse(decoded);
    }

    // Initialize Google Cloud Storage Client
    const storage = new Storage({ credentials });
    const bucket = storage.bucket(bucketName);

    // Prepare filename to avoid collisions
    const fileName = `contributions/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const blob = bucket.file(fileName);

    // Upload buffer directly from server side
    const buffer = Buffer.from(await file.arrayBuffer());
    await blob.save(buffer, {
      contentType: file.type,
      resumable: false,
    });

    // Make public so students/admin can view it immediately
    try {
      await blob.makePublic();
    } catch (makePublicError) {
      console.warn('Could not make object public automatically. Ensure bucket has correct permissions:', makePublicError);
    }

    const viewUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    return NextResponse.json({ viewUrl });
  } catch (error: any) {
    console.error('GCS Server-Side Upload Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
