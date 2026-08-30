import { google } from 'googleapis';
import { Readable } from 'stream';

let auth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAuth() {
  if (auth) return auth;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
  const credentials = JSON.parse(Buffer.from(keyJson, 'base64').toString('utf8'));
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
  return auth;
}

export function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

export const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID ?? '';

/** List direct children of a Drive folder (files + subfolders) */
export async function listFolder(folderId: string) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size, modifiedTime)',
    orderBy: 'name',
    pageSize: 200,
  });
  return res.data.files ?? [];
}

/** Get metadata for a single file */
export async function getFileMeta(fileId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, modifiedTime',
  });
  return res.data;
}

/** Stream a file's content — returns the response stream */
export async function streamFile(fileId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return res;
}

/** Read a text file's full content */
export async function readTextFile(fileId: string): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  ) as unknown as { data: string };
  return (res.data ?? '').trim();
}

/**
 * Upload a file buffer directly to Google Drive (15GB Free Storage).
 * Automatically sets file permissions to public viewable ("anyone" reader).
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<{ id: string; webViewLink: string; webContentLink: string }> {
  const drive = getDriveClient();
  const targetFolderId = parentFolderId || ROOT_FOLDER_ID;

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: targetFolderId ? [targetFolderId] : undefined,
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, name, webViewLink, webContentLink',
  });

  const fileId = res.data.id!;

  // Grant public read permission so anyone with the link can view/download
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permErr) {
    console.warn('[uploadFileToDrive] Could not set public permissions automatically:', permErr);
  }

  const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  const webContentLink = res.data.webContentLink || webViewLink;

  return {
    id: fileId,
    webViewLink,
    webContentLink,
  };
}

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const RESOURCE_TYPES = ['Notes', 'Question Banks', 'PYQs', 'Syllabus', 'Textbooks', 'YouTube'] as const;
export type ResourceTypeName = typeof RESOURCE_TYPES[number];
