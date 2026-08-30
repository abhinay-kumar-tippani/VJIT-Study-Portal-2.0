import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { uploadFileToDrive } from '@/lib/drive';

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `contributions/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // 1. Try Google Cloud Storage if configured & active
    const keyJson = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (keyJson && bucketName) {
      try {
        let credentials;
        try {
          credentials = JSON.parse(keyJson);
        } catch {
          const decoded = Buffer.from(keyJson, 'base64').toString('utf-8');
          credentials = JSON.parse(decoded);
        }

        const storage = new Storage({ credentials });
        const bucket = storage.bucket(bucketName);
        const blob = bucket.file(fileName);

        await blob.save(buffer, {
          contentType: file.type || 'application/octet-stream',
          resumable: false,
        });

        try {
          await blob.makePublic();
        } catch {}

        const viewUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        return NextResponse.json({ viewUrl });
      } catch (gcsError) {
        console.warn('[Upload Route] GCS Upload failed (trial expired or unconfigured). Falling back to Google Drive API...', gcsError);
      }
    }

    // 2. Fallback to Google Drive API (15GB Free Storage)
    const driveUpload = await uploadFileToDrive(buffer, file.name, file.type || 'application/octet-stream');
    return NextResponse.json({ viewUrl: driveUpload.webViewLink });

  } catch (error: any) {
    console.error('Server Upload Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
