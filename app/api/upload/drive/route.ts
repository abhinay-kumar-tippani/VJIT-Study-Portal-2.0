import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
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

    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const parentId = process.env.DRIVE_ROOT_FOLDER_ID;

    if (!keyJson || !parentId) {
      return NextResponse.json({ error: 'Drive env variables are missing' }, { status: 500 });
    }

    let credentials;
    try {
      credentials = JSON.parse(keyJson);
    } catch {
      const decoded = Buffer.from(keyJson, 'base64').toString('utf-8');
      credentials = JSON.parse(decoded);
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Step 5: Get or create "Contributions" subfolder
    const contributionsFolderId = await getOrCreateContributionsFolder(drive, parentId);

    // Upload file
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [contributionsFolderId],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: 'id',
    });

    const fileId = fileResponse.data.id;
    if (!fileId) {
      throw new Error('Failed to create file in Google Drive');
    }

    // Set permission to anyone with link can view
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    return NextResponse.json({ viewUrl });
  } catch (error: any) {
    console.error('Google Drive Upload Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

async function getOrCreateContributionsFolder(drive: any, parentId: string): Promise<string> {
  const listRes = await drive.files.list({
    q: `'${parentId}' in parents and name = 'Contributions' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
  });

  const files = listRes.data.files;
  if (files && files.length > 0) {
    return files[0].id!;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: 'Contributions',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return createRes.data.id!;
}
