import { NextRequest, NextResponse } from 'next/server';
import { listFolder, ROOT_FOLDER_ID } from '@/lib/drive';

/** Debug endpoint — shows exactly what's inside the root Drive folder */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId') || ROOT_FOLDER_ID;

  if (!folderId) {
    return NextResponse.json({ error: 'DRIVE_ROOT_FOLDER_ID not set in .env.local' }, { status: 500 });
  }

  try {
    const files = await listFolder(folderId);
    return NextResponse.json({
      folderId,
      totalItems: files.length,
      items: files.map((f) => ({
        name:     f.name,
        id:       f.id,
        type:     f.mimeType === 'application/vnd.google-apps.folder' ? 'FOLDER' : 'FILE',
        mimeType: f.mimeType,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({
      error:   err.message,
      hint:    'Check that the service account has access to this folder',
      folderId,
    }, { status: 500 });
  }
}
