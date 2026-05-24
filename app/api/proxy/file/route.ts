import { NextRequest, NextResponse } from 'next/server';
import { streamFile, getFileMeta } from '@/lib/drive';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

/**
 * GET /api/proxy/file?id={driveFileId}
 * Streams the file from Google Drive through our server.
 * Student's browser sees our domain, never drive.google.com.
 * Requires authentication.
 */
export async function GET(req: NextRequest) {
  // Require login via custom JWT cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
  }

  try {
    // Get file metadata for Content-Type and filename
    const meta     = await getFileMeta(fileId);
    const mimeType = meta.mimeType ?? 'application/octet-stream';
    const filename = meta.name     ?? 'file';

    // Stream the file from Drive
    const driveRes = await streamFile(fileId);
    const stream   = driveRes.data as NodeJS.ReadableStream;

    // Convert Node stream → Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data',  (chunk: Buffer) => controller.enqueue(chunk));
        stream.on('end',   ()              => controller.close());
        stream.on('error', (err: Error)    => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type':        mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control':       'private, max-age=3600',
        'X-Frame-Options':     'SAMEORIGIN',
      },
    });
  } catch (err: any) {
    console.error('[proxy/file]', err.message);
    return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 });
  }
}
