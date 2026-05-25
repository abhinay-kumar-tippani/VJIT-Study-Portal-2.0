import { NextRequest, NextResponse } from 'next/server';
import { getDriveClient, ROOT_FOLDER_ID, FOLDER_MIME } from '@/lib/drive';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { SEM4_SUBJECTS } from '@/lib/subjects';

/**
 * GET /api/drive/files?branch=CSE-AIML&semester=4&subject=DM&tab=Notes
 *
 * Does the ENTIRE Drive tree traversal server-side in one request:
 *   root → branch → semester → subject → tab → files
 *
 * ~5× faster than the old approach of 5 sequential browser→server fetches.
 * Server-side folder ID cache means repeat requests for the same path are instant.
 */

// ─── Server-side folder ID cache (persists for lifetime of the Node process) ───
const folderIdCache = new Map<string, string | null>();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** List ONLY folders or shortcuts inside parentId (faster — filtered query) */
async function listFolders(parentId: string) {
  const cacheKey = `folders:${parentId}`;
  // We cache folder lists for 5 minutes
  const cached = (listFolders as any)._cache?.get(cacheKey);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.data;

  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${parentId}' in parents and trashed = false and (mimeType = '${FOLDER_MIME}' or mimeType = 'application/vnd.google-apps.shortcut')`,
    fields: 'files(id, name, mimeType, shortcutDetails)',
    pageSize: 100,
    orderBy: 'name',
  });
  const data = res.data.files ?? [];

  if (!(listFolders as any)._cache) (listFolders as any)._cache = new Map();
  (listFolders as any)._cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

/** Resolve a folder or shortcut by name inside parentId. Returns the real folder ID or null. */
async function findFolder(
  parentId: string,
  subject: string,
  label: string = ''
): Promise<string | null> {
  const key = `${parentId}::${subject}`;
  if (folderIdCache.has(key)) return folderIdCache.get(key)!;

  const folders = await listFolders(parentId);
  const normSubject = norm(subject);
  const normLabel   = norm(label);

  const findMatch = (candidate: (typeof folders)[number]) => {
    const fn = norm(candidate.name ?? '');
    if (fn === normSubject) return true;
    if (normLabel && fn === normLabel) return true;
    if (normLabel.length > 3 && fn.length > 2 && normLabel.includes(fn)) return true;
    if (normSubject.length > 3 && fn.includes(normSubject)) return true;
    return false;
  };

  const exactFolder = folders.find((f) => {
    if (f.mimeType !== FOLDER_MIME) return false;
    return findMatch(f);
  });

  const exactShortcut = folders.find((f) => {
    if (f.mimeType !== 'application/vnd.google-apps.shortcut') return false;
    return findMatch(f);
  });

  const match = exactFolder ?? exactShortcut ?? folders.find(findMatch);
  const found = match ? (match.mimeType === 'application/vnd.google-apps.shortcut'
    ? match.shortcutDetails?.targetId ?? null
    : match.id)
    : null;

  folderIdCache.set(key, found);
  return found;
}

/** List all non-folder files inside a folder (the final file list) */
async function listFiles(folderId: string) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`,
    fields: 'files(id, name, mimeType, size, modifiedTime)',
    orderBy: 'name',
    pageSize: 200,
  });
  return res.data.files ?? [];
}

export async function GET(req: NextRequest) {
  // Auth check
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branch   = searchParams.get('branch')   ?? '';
  const semester = searchParams.get('semester')  ?? '4';
  const subject  = searchParams.get('subject')   ?? '';
  const label    = searchParams.get('label')     ?? '';
  const tab      = searchParams.get('tab')       ?? 'Notes';

  if (!branch || !subject) {
    return NextResponse.json({ error: 'branch and subject are required' }, { status: 400 });
  }

  // Look up the subject configuration to find the correct Google Drive folder name and label
  let driveFolderName = subject;
  let searchLabel = label;
  if (branch && SEM4_SUBJECTS[branch]) {
    const branchConfig = SEM4_SUBJECTS[branch];
    const foundSubject = [...(branchConfig.theory || []), ...(branchConfig.lab || [])]
      .find((s) => s.id === subject || s.label === subject);
    if (foundSubject) {
      driveFolderName = foundSubject.driveFolder;
      searchLabel = foundSubject.label;
    }
  }

  if (!ROOT_FOLDER_ID) {
    return NextResponse.json({ error: 'DRIVE_ROOT_FOLDER_ID not configured' }, { status: 500 });
  }

  try {
    // ── Step 1: branch folder ─────────────────────────────────────────
    const branchId = await findFolder(ROOT_FOLDER_ID, branch);
    if (!branchId) {
      return NextResponse.json({ error: `Branch "${branch}" not found in Drive` }, { status: 404 });
    }

    // ── Step 2: semester folder ────────────────────────────────────────
    // Try "Semester 4", "Sem 4", "Sem4", "4" — all in one shot
    const semFolders = await listFolders(branchId);
    const semCandidates = [`semester${semester}`, `sem${semester}`, semester];
    const semFolder = semFolders.find((f) => {
      const fn = norm(f.name ?? '');
      return semCandidates.some((c) => fn === c || fn.includes(c));
    });
    if (!semFolder?.id) {
      return NextResponse.json({ error: `Semester ${semester} not found in "${branch}"` }, { status: 404 });
    }
    // Cache it
    folderIdCache.set(`${branchId}::Semester ${semester}`, semFolder.id);

    // ── Step 3: subject folder ─────────────────────────────────
    const subjectId = await findFolder(semFolder.id, driveFolderName, searchLabel);
    if (!subjectId) {
      return NextResponse.json({ error: 'No materials uploaded yet for this subject.' }, { status: 404 });
    }

    // ── Step 4: tab folder (Notes / PYQs / etc.) ───────────────────────
    const tabId = await findFolder(subjectId, tab);
    if (!tabId) {
      // Tab folder doesn't exist — return empty (not an error)
      return NextResponse.json({ files: [], ytLink: null });
    }

    // ── Step 5: YouTube tab — read playlist.txt ────────────────────────
    if (tab === 'YouTube') {
      const drive = getDriveClient();
      const ytRes = await drive.files.list({
        q: `'${tabId}' in parents and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 10,
      });
      const txtFile = (ytRes.data.files ?? []).find(
        (f) => f.name?.endsWith('.txt') || f.name?.toLowerCase().includes('playlist')
      );
      if (!txtFile?.id) return NextResponse.json({ files: [], ytLink: null });

      const content = await drive.files.get(
        { fileId: txtFile.id, alt: 'media' },
        { responseType: 'text' }
      ) as unknown as { data: string };

      return NextResponse.json({ files: [], ytLink: (content.data ?? '').trim() });
    }

    // ── Step 6: list files in tab folder ──────────────────────────────
    const files = await listFiles(tabId);
    return NextResponse.json({ files, ytLink: null });

  } catch (err: any) {
    console.error('[drive/files]', err.message);
    return NextResponse.json({ error: 'Drive error: ' + err.message }, { status: 500 });
  }
}
