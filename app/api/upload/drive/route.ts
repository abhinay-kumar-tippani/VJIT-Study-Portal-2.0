import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
  let creds;
  try { 
    creds = JSON.parse(rawKey); 
  } catch { 
    creds = JSON.parse(Buffer.from(rawKey, 'base64').toString()); 
  }

  return Response.json({ 
    email: creds.client_email,
    folderId: process.env.DRIVE_ROOT_FOLDER_ID 
  });
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
