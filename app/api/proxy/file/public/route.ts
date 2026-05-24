import { NextRequest, NextResponse } from 'next/server';
import { streamFile, getFileMeta } from '@/lib/drive';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'vjit-portal-jwt-secret-2024-change-me'
);

/**
 * GET /api/proxy/file/public?token={tempToken}
 * Public streaming endpoint (requires no session cookie) used by external viewers like Google Docs Viewer.
 * Validates a short-lived, high-security JWT token to extract the file ID and streams the file from Drive.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Verify token and check expiration
    const { payload } = await jwtVerify(token, SECRET);
    const fileId = payload.fileId as string;

    if (!fileId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // 2. Fetch file metadata for headers
    const meta = await getFileMeta(fileId);
    const mimeType = meta.mimeType ?? 'application/octet-stream';
    const filename = meta.name ?? 'file';

    // 3. Stream from Google Drive
    const driveRes = await streamFile(fileId);
    const stream = driveRes.data as NodeJS.ReadableStream;

    // 4. Wrap Node readable stream into Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err: Error) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[proxy/file/public]', err.message);
    return NextResponse.json({ error: 'Unauthorized: Link expired or invalid' }, { status: 401 });
  }
}
