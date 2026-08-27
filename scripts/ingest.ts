#!/usr/bin/env node
/**
 * scripts/ingest.ts
 *
 * Atomic RAG ingestion script for Google Drive study materials.
 * Target Subjects: IAI, PC, OOPs-Java, DBMS
 * Branches: CSE, CSE-AIML, CSE-DS, IT | Semester: 4
 *
 * Features:
 *   - SHA-256 content hash deduplication & multi-branch tagging ($addToSet: { branches })
 *   - Token-bucket rate limiting (EMBED_TPM_BUDGET, EMBED_BATCH_SIZE)
 *   - Live DB corpus coverage reporting on exit & SIGINT
 *   - Resume mode (--resume) skipping already ingested files while maintaining branch coverage
 *
 * CLI Flags:
 *   --dry-run       Extract + chunk & print summary without embedding or DB writes
 *   --resume        Resume ingestion by skipping files already in DB
 *   --subject=XYZ   Filter ingestion to a specific subject (e.g. DBMS)
 *   --branch=XYZ    Filter ingestion to a specific branch (e.g. CSE-AIML)
 *   --limit=N       Limit total files processed
 *
 * Run:
 *   npx tsx scripts/ingest.ts --resume
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ─── Load .env.local ────────────────────────────────────────────────
(function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
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

// ─── Parse CLI Flags ────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isResume = args.includes('--resume');

const getArgVal = (prefix: string): string | null => {
  const arg = args.find((a) => a.startsWith(`${prefix}=`));
  return arg ? arg.split('=')[1] : null;
};

const filterSubject = getArgVal('--subject');
const filterBranch = getArgVal('--branch');
const limitVal = getArgVal('--limit');
const fileLimit = limitVal ? parseInt(limitVal, 10) : Infinity;

const semArg = getArgVal('--semester');
const SEMESTER = semArg ? parseInt(semArg, 10) : 5;

const DEFAULT_BRANCHES = ['CSE-AIML', 'CSE', 'CSE-DS', 'IT'];
const TARGET_BRANCHES = filterBranch ? [filterBranch] : DEFAULT_BRANCHES;

const DEFAULT_SUBJECT_IDS = SEMESTER === 5
  ? ['CN', 'DAA', 'EML', 'GS', 'PE-IDS', 'PE-CS', 'PE-OOAD', 'OE-DM', 'OE-SE', 'OE-EOM', 'Flutter-Lab', 'CN-Lab', 'ML-Lab']
  : ['IAI', 'PC', 'OOPs-Java', 'DBMS', 'DM', 'ATCD', 'OS', 'SE', 'FIoT', 'QMLR'];
const TARGET_SUBJECT_IDS = filterSubject ? [filterSubject] : DEFAULT_SUBJECT_IDS;

const TABS = ['Notes', 'PYQs', 'Question Banks', 'Syllabus'];

const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function main() {
  const startTime = Date.now();
  const formatElapsed = () => {
    const elapsedMs = Date.now() - startTime;
    const totalSec = Math.floor(elapsedMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s}s`;
  };

  const { connectDB } = await import('../lib/db');
  const { getDriveClient, ROOT_FOLDER_ID } = await import('../lib/drive');
  const { SEM4_SUBJECTS } = await import('../lib/subjects');
  const { extractDocumentText } = await import('../lib/rag/extractText');
  const { chunkPages } = await import('../lib/rag/chunker');
  const { embedDocumentChunks } = await import('../lib/rag/embeddings');
  const { printCorpusCoverageReport } = await import('./coverage');
  const Chunk = (await import('../models/Chunk')).default;
  const PendingOCR = (await import('../models/PendingOCR')).default;

  // ─── Register Signal Traps for Interrupted Runs ──────────────────
  let hasHandledExit = false;
  const handleExit = async (signal: string) => {
    if (hasHandledExit) return;
    hasHandledExit = true;
    console.log(`\n\n⚠️ Interrupted by ${signal}. Printing live DB corpus coverage report…`);
    await printCorpusCoverageReport();
    process.exit(0);
  };

  process.on('SIGINT', () => handleExit('SIGINT'));
  process.on('SIGTERM', () => handleExit('SIGTERM'));

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║   VJIT RAG Ingestion ${isDryRun ? '(DRY RUN MODE)' : '(PROD INGESTION)'}`.padEnd(55) + '║');
  console.log(`║   Target Subjects: ${TARGET_SUBJECT_IDS.join(', ')}`.padEnd(55) + '║');
  console.log(`║   Target Branches: ${TARGET_BRANCHES.join(', ')}`.padEnd(55) + '║');
  if (isResume) {
    console.log('║   Mode: RESUME (Skipping files already in DB)'.padEnd(55) + '║');
  }
  if (fileLimit < Infinity) {
    console.log(`║   File Limit: ${fileLimit}`.padEnd(55) + '║');
  }
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (!isDryRun) {
    const db = await connectDB();
    if (!db) {
      console.error('❌ Could not connect to MongoDB Atlas');
      process.exit(1);
    }
    console.log('✅ Connected to MongoDB Atlas\n');
  } else {
    console.log('ℹ️ DRY RUN: Extracting & chunking files only. NO embeddings, NO DB writes.\n');
  }

  const drive = getDriveClient();

  async function listChildren(parentId: string) {
    const all: any[] = [];
    let pageToken: string | undefined;
    do {
      const res: any = await drive.files.list({
        q: `'${parentId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, shortcutDetails)',
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
      (f: any) => f.mimeType === FOLDER_MIME && isMatch(norm(f.name ?? ''))
    );
    if (folder) return folder.id;

    const shortcut = children.find(
      (f: any) => f.mimeType === SHORTCUT_MIME && isMatch(norm(f.name ?? ''))
    );
    if (shortcut) return shortcut.shortcutDetails?.targetId ?? null;

    return null;
  }

  async function downloadBuffer(fileId: string): Promise<Buffer> {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  let totalFilesProcessed = 0;

  for (const branch of TARGET_BRANCHES) {
    if (totalFilesProcessed >= fileLimit) break;

    console.log(`━━━ 📂 Branch: ${branch} ━━━`);
    const branchId = await findFolder(ROOT_FOLDER_ID, branch);
    if (!branchId) {
      console.log(`   ⚠️ Branch folder "${branch}" not found in Drive. Skipping.`);
      continue;
    }

  const { getBranchSubjects, ACTIVE_SEM } = await import('../lib/subjects');
  const targetSem = SEMESTER;

  // ...
    const semChildren = await listChildren(branchId);
    const semEntry = semChildren.find((f: any) => {
      const fn = norm(f.name ?? '');
      return [
        `semester${targetSem}`,
        `sem${targetSem}`,
        `semester ${targetSem}`,
        `sem ${targetSem}`,
        String(targetSem),
      ].some((c) => fn === c || fn.includes(c));
    });

    if (!semEntry?.id) {
      console.log(`   ⚠️ Semester ${targetSem} folder not found in ${branch}. Skipping.`);
      continue;
    }
    const semId =
      semEntry.mimeType === SHORTCUT_MIME
        ? semEntry.shortcutDetails?.targetId ?? semEntry.id
        : semEntry.id;

    const branchSubjects = getBranchSubjects(branch, targetSem);
    if (!branchSubjects) continue;
    const allSubjects = [...(branchSubjects.theory || []), ...(branchSubjects.lab || [])];

    for (const subjConfig of allSubjects) {
      if (totalFilesProcessed >= fileLimit) break;
      if (!TARGET_SUBJECT_IDS.includes(subjConfig.id)) continue;

      const subjId = subjConfig.id;
      console.log(`\n  📚 Subject: ${subjConfig.label} (${subjId})`);
      const subjectFolderId = await findFolder(semId, subjConfig.driveFolder, subjConfig.label);
      if (!subjectFolderId) {
        console.log(`     ⚠️ Folder "${subjConfig.driveFolder}" not found`);
        continue;
      }

      for (const tab of TABS) {
        if (totalFilesProcessed >= fileLimit) break;
        const tabFolderId = await findFolder(subjectFolderId, tab);
        if (!tabFolderId) continue;

        const files = await listChildren(tabFolderId);
        const dataFiles = files.filter(
          (f: any) => f.mimeType !== FOLDER_MIME && f.mimeType !== SHORTCUT_MIME
        );

        if (dataFiles.length === 0) continue;
        console.log(`     📁 ${tab} (${dataFiles.length} files)`);

        for (const file of dataFiles) {
          if (totalFilesProcessed >= fileLimit) break;

          const fileId = file.id!;
          const fileName = file.name ?? 'Untitled';
          const webViewLink = file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

          // Handle Cross-Branch Shortcuts: If driveFileId already exists in DB, add branch to branches array
          if (!isDryRun) {
            const existingFile = await Chunk.exists({ driveFileId: fileId });
            if (existingFile) {
              await Chunk.updateMany({ driveFileId: fileId }, { $addToSet: { branches: branch } });
              console.log(`       ⏭️  Drive file already ingested (added branch "${branch}"): "${fileName}"`);
              continue;
            }
          }

          process.stdout.write(`       ⚙️  Processing: "${fileName}" … \n`);

          try {
            const buffer = await downloadBuffer(fileId);
            const extracted = await extractDocumentText(
              buffer,
              file.mimeType,
              fileName,
              fileId,
              webViewLink
            );

            const fullText = extracted.pages.map((p) => p.text).join('\n');
            const contentHash = crypto.createHash('sha256').update(fullText).digest('hex');

            // Handle Content-Duplicate files (identical text content under a different Drive ID)
            if (!isDryRun) {
              const existingHash = await Chunk.exists({ contentHash });
              if (existingHash) {
                await Chunk.updateMany({ contentHash }, { $addToSet: { branches: branch } });
                console.log(`       ⏭️  Content duplicate skipped (added branch "${branch}"): "${fileName}"\n`);
                continue;
              }
            }

            const textPages = extracted.pages.filter((p) => !p.isScanned);
            const scannedPages = extracted.pages.filter((p) => p.isScanned);
            const rawChunks = chunkPages(textPages);

            if (isDryRun) {
              console.log(`       ┌─────────────────────────────────────────────────────────────┐`);
              console.log(`       │ DRY RUN SUMMARY: ${fileName.slice(0, 42).padEnd(42)} │`);
              console.log(`       ├─────────────────────────────────────────────────────────────┤`);
              console.log(`       │ Total Pages:   ${String(extracted.pages.length).padStart(4)} | Text Pages:    ${String(textPages.length).padStart(4)} │`);
              console.log(`       │ Scanned Pages: ${String(scannedPages.length).padStart(4)} | Chunk Count:   ${String(rawChunks.length).padStart(4)} │`);
              console.log(`       ├─────────────────────────────────────────────────────────────┤`);

              if (rawChunks.length > 0) {
                const firstChunkSample = rawChunks[0].text.slice(0, 180).replace(/\n/g, ' ');
                const lastChunkSample = rawChunks[rawChunks.length - 1].text.slice(0, 180).replace(/\n/g, ' ');

                console.log(`       │ Chunk 0 (Pg ${rawChunks[0].pageNumber ?? 'N/A'}): "${firstChunkSample}…"`);
                console.log(`       │ Chunk ${rawChunks.length - 1} (Pg ${rawChunks[rawChunks.length - 1].pageNumber ?? 'N/A'}): "${lastChunkSample}…"`);
              } else {
                console.log(`       │ (No text chunks generated - file is image-only or scanned) │`);
              }
              console.log(`       └─────────────────────────────────────────────────────────────┘\n`);

              totalFilesProcessed++;
              continue;
            }

            // --- PROD MODE (DB & Embeddings) ---

            if (scannedPages.length > 0) {
              const ocrDocs = scannedPages.map((p) => ({
                driveFileId: fileId,
                fileName,
                subject: subjId,
                pageNumber: p.pageNumber,
              }));
              await PendingOCR.insertMany(ocrDocs, { ordered: false }).catch(() => {});
            }

            if (textPages.length === 0 || rawChunks.length === 0) {
              console.log(`       🔴 Scanned file logged (${scannedPages.length} scanned pages). 0 text chunks.\n`);
              totalFilesProcessed++;
              continue;
            }

            const chunkTexts = rawChunks.map((c) => c.text);

            // Embed chunks with Token-Bucket Rate Limiter & Progress Pacing
            const embeddings = await embedDocumentChunks(chunkTexts, {
              batchProgressCallback: (batchIndex, totalBatches, batchChunkCount, tokensThisMin, tpmBudget) => {
                console.log(
                  `       📦 Batch ${batchIndex}/${totalBatches} (${batchChunkCount} chunks) [Tokens this min: ${tokensThisMin.toLocaleString()}/${tpmBudget.toLocaleString()}] [Elapsed: ${formatElapsed()}]`
                );
              },
            });

            const chunkDocs = rawChunks.map((c, idx) => ({
              driveFileId: fileId,
              fileName,
              webViewLink,
              branches: [branch],
              semester: SEMESTER,
              subject: subjId,
              resourceType: tab,
              chunkIndex: c.chunkIndex,
              pageNumber: c.pageNumber,
              text: c.text,
              contentHash,
              embedding: embeddings[idx],
            }));

            // Atomic Insert per file
            await Chunk.insertMany(chunkDocs);

            totalFilesProcessed++;
            console.log(`       ✅ Ingested ${chunkDocs.length} chunks (${textPages.length} text pages) [Elapsed: ${formatElapsed()}]\n`);

            await sleep(200);
          } catch (err: any) {
            console.log(`       ❌ FAILED: ${err.message}\n`);
          }
        }
      }
    }
  }

  // ─── Print Live Database Corpus Coverage Report ─────────────────
  if (!hasHandledExit) {
    hasHandledExit = true;
    await printCorpusCoverageReport();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Fatal ingestion error:', err);
  process.exit(1);
});
