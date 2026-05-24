import { NextRequest, NextResponse } from 'next/server';
import { listFolder, FOLDER_MIME, ROOT_FOLDER_ID } from '@/lib/drive';

/**
 * GET /api/drive/list?folderId=xxx
 * Lists files and folders inside the given Drive folder.
 * Falls back to ROOT_FOLDER_ID if no folderId provided.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId') || ROOT_FOLDER_ID;

  if (!folderId) {
    return NextResponse.json(
      { error: 'DRIVE_ROOT_FOLDER_ID not configured' },
      { status: 500 }
    );
  }

  try {
    const files = await listFolder(folderId);
    return NextResponse.json({ files }, {
      headers: {
        // Cache for 2 minutes — Drive API has quotas
        'Cache-Control': 's-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (err: any) {
    console.error('[drive/list]', err.message);
    return NextResponse.json(
      { error: 'Failed to list Drive folder', files: [] },
      { status: 500 }
    );
  }
}
