import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Resource from '@/models/Resource';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
  }

  try {
    const db = await connectDB();
    if (db) {
      // Find the resource by its url containing the file name
      const resource = await Resource.findOne({ url: { $regex: fileName } });
      
      if (resource && resource.status !== 'approved') {
        const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get('__session')?.value;
        const session = token ? await verifyToken(token) : null;
        
        const isUploader = session && session.rollNumber === resource.uploadedBy;
        const isAdmin = session && (session.isAdmin || session.isSuperAdmin);
        
        if (!isUploader && !isAdmin) {
          return NextResponse.json({ error: 'Unauthorized to view this pending/rejected file' }, { status: 403 });
        }
      }
    }
  } catch (dbErr) {
    console.warn('DB check failed in view route, proceeding with stream:', dbErr);
  }

  try {
    const keyJson = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!keyJson || !bucketName) {
      return NextResponse.json({ error: 'GCS env variables are missing' }, { status: 500 });
    }

    let credentials;
    try {
      credentials = JSON.parse(keyJson);
    } catch {
      const decoded = Buffer.from(keyJson, 'base64').toString('utf-8');
      credentials = JSON.parse(decoded);
    }

    const storage = new Storage({ credentials });
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Get metadata to set correct content-type
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || 'application/octet-stream';

    // Stream the file
    const fileStream = file.createReadStream();

    // Convert NodeJS ReadableStream to Web ReadableStream (Next.js supports NodeJS Readable as Response body)
    return new Response(fileStream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName.split('/').pop() || 'file')}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    console.error('File stream error:', error);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
  }
}
