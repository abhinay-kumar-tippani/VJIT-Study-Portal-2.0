import { NextRequest, NextResponse } from 'next/server';
import { getFileMeta } from '@/lib/drive';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'vjit-portal-jwt-secret-2024-change-me'
);

/**
 * GET /api/proxy/file/preview?id={fileId}
 * Secures access via user session.
 * Generates a short-lived (10 mins) token for cookie-less streaming by Google Docs Viewer.
 * For PDFs and Images: Redirects directly to browser rendering.
 * For DOCX, PPTX, etc.: Redirects to Google Docs Viewer.
 */
export async function GET(req: NextRequest) {
  // 1. Require user authentication
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
    // 2. Fetch file metadata to determine MIME type
    const meta = await getFileMeta(fileId);
    const mimeType = (meta.mimeType ?? 'application/octet-stream').toLowerCase();

    // 3. Generate a short-lived token (10 minutes)
    const tempToken = await new SignJWT({ fileId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(SECRET);

    // 4. Construct temporary public streaming link
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publicUrl = `${origin}/api/proxy/file/public?token=${tempToken}`;

    const isPDF = mimeType.includes('pdf');
    const isImage = mimeType.includes('image');

    if (isPDF || isImage) {
      // Stream directly to the browser for native rendering
      return NextResponse.redirect(publicUrl);
    } else {
      // Redirect to Google Docs Viewer with our temporary tokenized URL
      // We do not add &embedded=true so it displays as a full page in the tab!
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}`;
      return NextResponse.redirect(viewerUrl);
    }
  } catch (err: any) {
    console.error('[proxy/file/preview]', err.message);
    return NextResponse.json(
      { error: 'Failed to generate preview. Make sure the file exists and is accessible.' },
      { status: 500 }
    );
  }
}
