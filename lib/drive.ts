import { google } from 'googleapis';

let auth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAuth() {
  if (auth) return auth;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not set');
  const credentials = JSON.parse(Buffer.from(keyJson, 'base64').toString('utf8'));
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
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

/** Stream a file's content — returns the axios response for piping */
export async function streamFile(fileId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return res;
}

/** Read a text file's full content (for YouTube playlist .txt files) */
export async function readTextFile(fileId: string): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  ) as unknown as { data: string };
  return (res.data ?? '').trim();
}

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const RESOURCE_TYPES = ['Notes', 'Question Banks', 'PYQs', 'Syllabus', 'Textbooks', 'YouTube'] as const;
export type ResourceTypeName = typeof RESOURCE_TYPES[number];
