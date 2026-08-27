#!/usr/bin/env node
/**
 * scripts/survey.ts
 *
 * Read-only corpus survey of Google Drive study materials.
 * Scoped to CSE-AIML, Semester 4.
 *
 * For every PDF: downloads → pdf-parse v2 → classifies text density.
 * For non-PDFs: counts by MIME type.
 *
 * Outputs:
 *   survey-results.json  — full per-file data
 *   stdout               — summary tables
 *
 * Run:
 *   npx tsx scripts/survey.ts
 */

import fs from 'fs';
import path from 'path';

// ─── Load .env.local before anything that reads process.env ─────────
(function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found. Run this script from the vjit-portal/ directory.');
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq);
    const val = t.slice(eq + 1);
    if (!(key in process.env)) process.env[key] = val;
  }
})();

// ─── Types ──────────────────────────────────────────────────────────

type Classification = 'TEXT' | 'SCANNED' | 'MIXED' | 'NON_PDF';

interface FileResult {
  fileName: string;
  driveFileId: string;
  subject: string;
  tab: string;
  mimeType: string;
  pageCount: number;
  extractedCharCount: number;
  classification: Classification;
  charsPerPage: number;
  error?: string;
}

// ─── CSE-AIML Sem 4 subject config (inlined from lib/subjects.ts) ──

const CSE_AIML_SUBJECTS = [
  { id: 'DM',            label: 'Discrete Mathematics',                   driveFolder: 'DM' },
  { id: 'ATCD',          label: 'Automata Theory & Compiler Design',      driveFolder: 'AT&CD' },
  { id: 'DBMS',          label: 'Database Management Systems',            driveFolder: 'DBMS' },
  { id: 'IAI',           label: 'Introduction to Artificial Intelligence', driveFolder: 'IAI' },
  { id: 'OOPs-Java',     label: 'OOPs through Java',                      driveFolder: 'JAVA' },
  { id: 'PC',            label: 'Professional Communication',             driveFolder: 'PC' },
  // Labs
  { id: 'DBMS-Lab',      label: 'DBMS Lab',                               driveFolder: 'DBMS-Lab' },
  { id: 'PROLOG-Lab',    label: 'PROLOG Lab',                             driveFolder: 'PROLOG-Lab' },
  { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab',                  driveFolder: 'OOPs-Java-Lab' },
];

const TABS = ['Notes', 'PYQs', 'Question Banks', 'Syllabus'];

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

// ─── Helpers ────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const { google } = await import('googleapis');
  const { PDFParse } = await import('pdf-parse');

  /**
   * Wrapper around pdf-parse v2 class API.
   * Returns { numpages, text }
   */
  async function parsePdf(buffer: Buffer): Promise<{ numpages: number; text: string }> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    await (parser as any).load();

    const pageCount: number = (parser as any).doc?.numPages ?? 1;
    let text = '';
    try {
      const res = await parser.getText();
      text = typeof res === 'string' ? res : (res as any)?.text ?? '';
    } catch {
      text = '';
    }

    parser.destroy();
    return { numpages: pageCount, text };
  }

  // ── Authenticate ──────────────────────────────────────────────────
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) {
    console.error('❌  GOOGLE_SERVICE_ACCOUNT_KEY is not set in .env.local');
    process.exit(1);
  }
  const credentials = JSON.parse(Buffer.from(keyJson, 'base64').toString('utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const ROOT = process.env.DRIVE_ROOT_FOLDER_ID;
  if (!ROOT) {
    console.error('❌  DRIVE_ROOT_FOLDER_ID is not set in .env.local');
    process.exit(1);
  }

  // ── Drive helpers ─────────────────────────────────────────────────

  async function listChildren(parentId: string) {
    const all: any[] = [];
    let pageToken: string | undefined;
    do {
      const res: any = await drive.files.list({
        q: `'${parentId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, shortcutDetails)',
        pageSize: 200,
        orderBy: 'name',
        ...(pageToken ? { pageToken } : {}),
      });
      all.push(...(res.data.files ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
    return all;
  }

  async function findFolder(parentId: string, name: string, altName?: string): Promise<string | null> {
    const children = await listChildren(parentId);
    const target = norm(name);
    const alt = altName ? norm(altName) : '';

    const isMatch = (fn: string) => {
      if (fn === target) return true;
      if (alt && fn === alt) return true;
      if (target.length > 2 && fn.includes(target)) return true;
      if (alt && alt.length > 3 && fn.includes(alt)) return true;
      return false;
    };

    const folder = children.find(
      (f: any) => f.mimeType === FOLDER_MIME && isMatch(norm(f.name ?? '')),
    );
    if (folder) return folder.id;

    const shortcut = children.find(
      (f: any) => f.mimeType === SHORTCUT_MIME && isMatch(norm(f.name ?? '')),
    );
    if (shortcut) return shortcut.shortcutDetails?.targetId ?? null;

    return null;
  }

  async function downloadFile(fileId: string): Promise<Buffer> {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  // ── Walk the tree ─────────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   VJIT Study Portal — Corpus Survey                 ║');
  console.log('║   Branch: CSE-AIML  |  Semester: 4                  ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  process.stdout.write('📂 Finding CSE-AIML folder… ');
  const branchId = await findFolder(ROOT, 'CSE-AIML');
  if (!branchId) { console.error('\n❌  CSE-AIML folder not found under root'); process.exit(1); }
  console.log(`✅  ${branchId}`);

  process.stdout.write('📂 Finding Semester 4 folder… ');
  const semChildren = await listChildren(branchId);
  const semEntry = semChildren.find((f: any) => {
    const fn = norm(f.name ?? '');
    return ['semester4', 'sem4', '4'].some((c) => fn === c || fn.includes(c));
  });
  if (!semEntry?.id) { console.error('\n❌  Semester 4 folder not found'); process.exit(1); }
  const semId =
    semEntry.mimeType === SHORTCUT_MIME
      ? semEntry.shortcutDetails?.targetId ?? semEntry.id
      : semEntry.id;
  console.log(`✅  "${semEntry.name}" → ${semId}`);
  console.log('');

  const results: FileResult[] = [];
  let pdfCount = 0;

  for (const subject of CSE_AIML_SUBJECTS) {
    console.log(`━━━ 📚 ${subject.label} (drive: "${subject.driveFolder}") ━━━`);

    const subjectId = await findFolder(semId, subject.driveFolder, subject.label);
    if (!subjectId) {
      console.log('    ⚠️  Folder not found — skipping\n');
      continue;
    }

    for (const tab of TABS) {
      const tabId = await findFolder(subjectId, tab);
      if (!tabId) {
        console.log(`    📁 ${tab.padEnd(16)} — (folder not found)`);
        continue;
      }

      const files = await listChildren(tabId);
      const dataFiles = files.filter(
        (f: any) => f.mimeType !== FOLDER_MIME && f.mimeType !== SHORTCUT_MIME,
      );
      console.log(`    📁 ${tab.padEnd(16)} — ${dataFiles.length} file(s)`);

      for (const file of dataFiles) {
        const fileName = file.name ?? 'unknown';
        const mimeType = file.mimeType ?? 'unknown';
        const fileId = file.id!;

        // ── Non-PDF ─────────────────────────────────────────
        if (mimeType !== 'application/pdf') {
          results.push({
            fileName,
            driveFileId: fileId,
            subject: subject.id,
            tab,
            mimeType,
            pageCount: 0,
            extractedCharCount: 0,
            classification: 'NON_PDF',
            charsPerPage: 0,
          });
          const ext = mimeType.split('/').pop() ?? mimeType;
          console.log(`       ↳ ${fileName}  [${ext}]`);
          continue;
        }

        // ── PDF — download & parse ──────────────────────────
        pdfCount++;
        const tag = `[${pdfCount}]`;
        process.stdout.write(`       ↳ ${tag} ${fileName} … `);

        try {
          const buffer = await downloadFile(fileId);
          const parsed = await parsePdf(buffer);
          const pageCount = parsed.numpages || 1;
          const charCount = (parsed.text ?? '').length;
          const cpp = Math.round(charCount / pageCount);

          let cls: 'TEXT' | 'SCANNED' | 'MIXED';
          if (cpp > 500) cls = 'TEXT';
          else if (cpp < 100) cls = 'SCANNED';
          else cls = 'MIXED';

          results.push({
            fileName,
            driveFileId: fileId,
            subject: subject.id,
            tab,
            mimeType,
            pageCount,
            extractedCharCount: charCount,
            classification: cls,
            charsPerPage: cpp,
          });

          const icon = cls === 'TEXT' ? '✅' : cls === 'SCANNED' ? '🔴' : '🟡';
          console.log(`${icon} ${cls}  ${pageCount}pg  ${charCount.toLocaleString()}ch  ~${cpp}ch/pg`);
        } catch (err: any) {
          results.push({
            fileName,
            driveFileId: fileId,
            subject: subject.id,
            tab,
            mimeType,
            pageCount: 0,
            extractedCharCount: 0,
            classification: 'SCANNED',
            charsPerPage: 0,
            error: err.message ?? String(err),
          });
          console.log(`❌ PARSE_ERROR: ${(err.message ?? '').slice(0, 80)}`);
        }

        // Small delay between downloads to avoid Drive API rate limits
        await sleep(300);
      }
    }
    console.log('');
  }

  // ─── Write JSON ───────────────────────────────────────────────────
  const outPath = path.resolve(process.cwd(), 'survey-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾  Full results → ${outPath}  (${results.length} entries)\n`);

  // ─── Summary Tables ──────────────────────────────────────────────

  const pdfResults = results.filter((r) => r.classification !== 'NON_PDF');
  const nonPdfResults = results.filter((r) => r.classification === 'NON_PDF');

  const subjects = Array.from(new Set(pdfResults.map((r) => r.subject))).sort();

  const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
  const rpad = (s: string, n: number) => s.slice(0, n).padStart(n);

  console.log('┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('│  PDF CLASSIFICATION BY SUBJECT                                          │');
  console.log('├──────────────┬───────┬──────────────┬──────────────┬──────────────┬──────┤');
  console.log('│ Subject      │ Total │ TEXT (✅)     │ MIXED (🟡)   │ SCANNED (🔴) │ Err  │');
  console.log('├──────────────┼───────┼──────────────┼──────────────┼──────────────┼──────┤');

  let totalText = 0, totalMixed = 0, totalScanned = 0, totalErr = 0, totalPdf = 0;

  for (const subj of subjects) {
    const rows = pdfResults.filter((r) => r.subject === subj);
    const text = rows.filter((r) => r.classification === 'TEXT').length;
    const mixed = rows.filter((r) => r.classification === 'MIXED').length;
    const scanned = rows.filter((r) => r.classification === 'SCANNED').length;
    const errs = rows.filter((r) => !!r.error).length;
    const total = rows.length;
    totalText += text; totalMixed += mixed; totalScanned += scanned; totalErr += errs; totalPdf += total;

    const pctText = total ? `${Math.round((text / total) * 100)}%` : '-';
    const pctMixed = total ? `${Math.round((mixed / total) * 100)}%` : '-';
    const pctScan = total ? `${Math.round((scanned / total) * 100)}%` : '-';

    console.log(
      `│ ${pad(subj, 12)} │ ${rpad(String(total), 5)} │ ${rpad(String(text), 4)} ${rpad(pctText, 7)} │ ${rpad(String(mixed), 4)} ${rpad(pctMixed, 7)} │ ${rpad(String(scanned), 4)} ${rpad(pctScan, 7)} │ ${rpad(String(errs), 4)} │`,
    );
  }

  console.log('├──────────────┼───────┼──────────────┼──────────────┼──────────────┼──────┤');
  const pctTotText = totalPdf ? `${Math.round((totalText / totalPdf) * 100)}%` : '-';
  const pctTotMixed = totalPdf ? `${Math.round((totalMixed / totalPdf) * 100)}%` : '-';
  const pctTotScan = totalPdf ? `${Math.round((totalScanned / totalPdf) * 100)}%` : '-';
  console.log(
    `│ ${pad('TOTAL', 12)} │ ${rpad(String(totalPdf), 5)} │ ${rpad(String(totalText), 4)} ${rpad(pctTotText, 7)} │ ${rpad(String(totalMixed), 4)} ${rpad(pctTotMixed, 7)} │ ${rpad(String(totalScanned), 4)} ${rpad(pctTotScan, 7)} │ ${rpad(String(totalErr), 4)} │`,
  );
  console.log('└──────────────┴───────┴──────────────┴──────────────┴──────────────┴──────┘');
  console.log('');

  // Non-PDF files by MIME type
  if (nonPdfResults.length > 0) {
    const byMime = new Map<string, number>();
    for (const r of nonPdfResults) {
      byMime.set(r.mimeType, (byMime.get(r.mimeType) ?? 0) + 1);
    }
    const sorted = Array.from(byMime.entries()).sort((a, b) => b[1] - a[1]);

    console.log('┌──────────────────────────────────────────────────────┐');
    console.log('│  NON-PDF FILES BY TYPE                               │');
    console.log('├──────────────────────────────────────────┬───────────┤');
    console.log('│ MIME Type                                │ Count     │');
    console.log('├──────────────────────────────────────────┼───────────┤');
    for (const [mime, count] of sorted) {
      console.log(`│ ${pad(mime, 40)} │ ${rpad(String(count), 9)} │`);
    }
    console.log('├──────────────────────────────────────────┼───────────┤');
    console.log(`│ ${pad('TOTAL', 40)} │ ${rpad(String(nonPdfResults.length), 9)} │`);
    console.log('└──────────────────────────────────────────┴───────────┘');
    console.log('');
  } else {
    console.log('No non-PDF files found.\n');
  }

  // Quick verdict
  console.log('═══════════════════════════════════════════════════════');
  if (totalPdf > 0) {
    console.log(`  📊 ${totalPdf} PDFs surveyed across ${subjects.length} subjects`);
    console.log(`     ✅ TEXT:     ${totalText} (${pctTotText}) — good for text extraction`);
    console.log(`     🟡 MIXED:    ${totalMixed} (${pctTotMixed}) — partial extraction possible`);
    console.log(`     🔴 SCANNED: ${totalScanned} (${pctTotScan}) — would need OCR`);
    if (totalErr > 0) console.log(`     ❌ ERRORS:   ${totalErr} — parse failures`);
  } else {
    console.log('  ⚠️  No PDFs found!');
  }
  if (nonPdfResults.length > 0) {
    console.log(`     📄 Non-PDF:  ${nonPdfResults.length} files`);
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
