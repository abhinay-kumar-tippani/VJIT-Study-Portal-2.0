#!/usr/bin/env node
/**
 * scripts/ocr.ts
 *
 * Phase 3 — OCR Scanned Corpus Pipeline.
 * Transcribes scanned pages logged in `pending_ocr` using Gemini Vision (gemini-2.0-flash).
 * Uses `pdf-lib` for pure JS in-memory single-page PDF extraction (0 native binary dependencies).
 * Quality-gates output, embeds chunks with RETRIEVAL_DOCUMENT, marks chunks with `source: 'ocr'`,
 * and commits PER PAGE atomically.
 *
 * Flags:
 *   --subject=DBMS    (Filter by subject)
 *   --limit=10        (Limit number of pages to process)
 *   --dry-run         (Transcribe and print, no DB writes or embedding calls)
 *   --resume          (Process only status: 'pending' items)
 *
 * Run:
 *   npm run ocr
 *   npx tsx scripts/ocr.ts --subject=DBMS --limit=5 --dry-run
 */

import fs from 'fs';
import path from 'path';

// 1. MUST LOAD ENV VARIABLES BEFORE ANY MONGOOSE / MODEL IMPORTS
(function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eq = trimmed.indexOf('=');
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        process.env[key] = val;
      }
    }
  }
})();

import { PDFDocument } from 'pdf-lib';
import { GoogleGenAI } from '@google/genai';
import { google } from 'googleapis';
import { chunkPages } from '@/lib/rag/chunker';
import { embedDocumentChunks } from '@/lib/rag/embeddings';
import {
  acquireRpmBudget,
  getRunningRequestsThisMinute,
  getRunningTokensThisMinute,
  VISION_RPM_BUDGET,
  EMBED_TPM_BUDGET,
} from '@/lib/rag/rateLimiter';

const SYSTEM_TRANSCRIPTION_PROMPT = `Transcribe ALL text in this page of engineering study material from an Indian university. It may be handwritten, a scanned printout, or lecture slides.

RULES:
- Output ONLY the transcribed text. No preamble, no commentary, no markdown fences.
- Preserve structure: headings, numbered points, bullets.
- Transcribe formulas, equations, tables and code as faithfully as plain text allows.
- For diagrams, write: [DIAGRAM: one-line description]
- If the page is blank or fully illegible, write exactly: [BLANK_PAGE]`;

async function runLiveApiKeyProbe() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  console.log(`🔍 Running Live Gemini API Key Probe (Key length: ${apiKey.length})...`);

  if (!apiKey) {
    console.error('❌ FATAL: GEMINI_API_KEY missing from .env.local!');
    process.exit(1);
  }

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
    });
    const body = await res.text();

    if (!res.ok) {
      console.error(`\n❌ FATAL LIVE API PROBE FAILED (HTTP ${res.status} ${res.statusText}):`);
      console.error(`FULL RAW RESPONSE BODY:\n${body}\n`);
      console.error(`👉 Aborting OCR run to prevent mid-run failures.\n`);
      process.exit(1);
    }

    console.log('  ✅ Live Gemini API Key Probe: PASSED (HTTP 200 OK)');
  } catch (err: any) {
    console.error(`❌ FATAL LIVE API PROBE ERROR: ${err.message}`);
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let subject: string | undefined;
  let limit: number | undefined;
  let isDryRun = false;
  let isResume = false;

  for (const arg of args) {
    if (arg.startsWith('--subject=')) {
      subject = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--dry-run') {
      isDryRun = true;
    } else if (arg === '--resume') {
      isResume = true;
    }
  }

  return { subject, limit, isDryRun, isResume };
}

function evaluateQuality(text: string): { accepted: boolean; reason: string } {
  if (!text || !text.trim()) {
    return { accepted: false, reason: 'Empty text' };
  }
  const clean = text.trim();
  if (clean === '[BLANK_PAGE]') {
    return { accepted: false, reason: 'Blank page' };
  }
  if (clean.length < 30) {
    return { accepted: false, reason: `Too short (${clean.length} chars)` };
  }

  const nonAlphaNumCount = (clean.match(/[^a-zA-Z0-9\s.,;:\-()\/\n]/g) || []).length;
  const ratio = nonAlphaNumCount / clean.length;
  if (ratio > 0.4) {
    return { accepted: false, reason: `Excessive non-alphanumeric noise ratio (${(ratio * 100).toFixed(1)}%)` };
  }

  return { accepted: true, reason: 'Passed quality gate' };
}

async function extractPdfPageAsBase64(pdfBuffer: Buffer, pageNumber: number): Promise<string> {
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const totalPages = srcDoc.getPageCount();

  const targetPageIndex = pageNumber - 1;
  if (targetPageIndex < 0 || targetPageIndex >= totalPages) {
    throw new Error(`Page ${pageNumber} out of bounds (total pages: ${totalPages})`);
  }

  const singlePageDoc = await PDFDocument.create();
  const [copiedPage] = await singlePageDoc.copyPages(srcDoc, [targetPageIndex]);
  singlePageDoc.addPage(copiedPage);

  const singlePageBytes = await singlePageDoc.save();
  return Buffer.from(singlePageBytes).toString('base64');
}

async function downloadDriveFile(drive: any, fileId: string): Promise<Buffer> {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data);
}

async function printCoverageReport(ChunkModel: any, PendingOCRModel: any, title: string) {
  const allSubjects = ['DBMS', 'IAI', 'OOPs-Java', 'PC'];
  console.log(`\n┌─────────────────────────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ ${title.padEnd(95)} │`);
  console.log(`├─────────────────┬──────────┬──────────────┬────────────┬──────────────┬──────────────┬──────────────┤`);
  console.log(`│ Subject         │ Chunks   │ Native Pages │ OCR Pages  │ Failed Pages │ Pending OCR  │ Coverage %   │`);
  console.log(`├─────────────────┼──────────┼──────────────┼────────────┼──────────────┼──────────────┼──────────────┤`);

  let totChunks = 0;
  let totNativePages = 0;
  let totOcrPages = 0;
  let totFailed = 0;
  let totPending = 0;

  for (const subj of allSubjects) {
    const chunkCount = await ChunkModel.countDocuments({ subject: subj });
    const ocrPages = await PendingOCRModel.countDocuments({ subject: subj, status: 'done' });
    const failedPages = await PendingOCRModel.countDocuments({ subject: subj, status: 'failed' });
    const pendingPages = await PendingOCRModel.countDocuments({ subject: subj, status: 'pending' });

    const nativeChunksCount = await ChunkModel.countDocuments({ subject: subj, source: { $ne: 'ocr' } });
    const distinctNativePages = (await ChunkModel.distinct('pageNumber', { subject: subj, source: { $ne: 'ocr' } })).length;

    const totalTargetPages = distinctNativePages + ocrPages + pendingPages;
    const currentProcessedPages = distinctNativePages + ocrPages;
    const covPct = totalTargetPages > 0 ? ((currentProcessedPages / totalTargetPages) * 100).toFixed(1) : '100.0';

    totChunks += chunkCount;
    totNativePages += distinctNativePages;
    totOcrPages += ocrPages;
    totFailed += failedPages;
    totPending += pendingPages;

    console.log(
      `│ ${subj.padEnd(15)} │ ${String(chunkCount).padStart(8)} │ ${String(distinctNativePages).padStart(12)} │ ${String(ocrPages).padStart(10)} │ ${String(failedPages).padStart(12)} │ ${String(pendingPages).padStart(12)} │ ${(covPct + '%').padStart(12)} │`
    );
  }

  const grandTotalTarget = totNativePages + totOcrPages + totPending;
  const grandTotalProcessed = totNativePages + totOcrPages;
  const grandCovPct = grandTotalTarget > 0 ? ((grandTotalProcessed / grandTotalTarget) * 100).toFixed(1) : '100.0';

  console.log(`├─────────────────┼──────────┼──────────────┼────────────┼──────────────┼──────────────┼──────────────┤`);
  console.log(
    `│ GRAND TOTAL     │ ${String(totChunks).padStart(8)} │ ${String(totNativePages).padStart(12)} │ ${String(totOcrPages).padStart(10)} │ ${String(totFailed).padStart(12)} │ ${String(totPending).padStart(12)} │ ${(grandCovPct + '%').padStart(12)} │`
  );
  console.log(`└─────────────────┴──────────┴──────────────┴────────────┴──────────────┴──────────────┴──────────────┘\n`);
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║   VJIT RAG — Phase 3 OCR Scanned Corpus Pipeline (ocr)           ║`);
  console.log(`║   Gemini Vision 2.0 Flash (Pure JS in-memory pdf-lib extraction) ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

  await runLiveApiKeyProbe();

  const { connectDB } = await import('@/lib/db');
  await connectDB();

  const { default: Chunk } = await import('@/models/Chunk');
  const { default: PendingOCR } = await import('@/models/PendingOCR');

  // Automatic Migration for legacy pending_ocr documents missing status
  const unmigratedCount = await PendingOCR.countDocuments({ status: { $exists: false } });
  if (unmigratedCount > 0) {
    console.log(`🔄 Migrating ${unmigratedCount} legacy pending_ocr documents to status: 'pending'...`);
    await PendingOCR.updateMany({ status: { $exists: false } }, { $set: { status: 'pending' } });
    console.log('✅ Migration complete.');
  }

  const { subject, limit, isDryRun, isResume } = parseArgs();

  // Print baseline coverage report before starting
  await printCoverageReport(Chunk, PendingOCR, 'CORPUS COVERAGE REPORT — BEFORE OCR RUN');

  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey && !isDryRun) {
    console.error('❌ GEMINI_API_KEY missing from .env.local');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  const rawAuthKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!rawAuthKey) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY missing from .env.local');
    process.exit(1);
  }

  const credentials = JSON.parse(Buffer.from(rawAuthKey, 'base64').toString('utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });

  const filterQuery: any = {};
  if (subject) filterQuery.subject = subject;
  if (isResume) filterQuery.status = 'pending';
  else {
    filterQuery.status = { $in: ['pending', 'failed'] };
  }

  let pendingList = await PendingOCR.find(filterQuery).sort({ driveFileId: 1, pageNumber: 1 });
  if (limit && limit > 0) {
    pendingList = pendingList.slice(0, limit);
  }

  console.log(`📊 Found ${pendingList.length} pending OCR page task(s) to process.`);
  if (pendingList.length === 0) {
    console.log('ℹ️ No pending OCR tasks found matching criteria.');
    process.exit(0);
  }

  if (isDryRun) {
    console.log(`🧪 DRY-RUN MODE ACTIVE: Vision transcription will run, but NO DB writes or embeddings will occur.\n`);
  }

  const fileBufferCache = new Map<string, Buffer>();

  let processedCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;

  for (let idx = 0; idx < pendingList.length; idx++) {
    const item = pendingList[idx];
    const itemNum = idx + 1;

    await acquireRpmBudget(1);
    const rpmThisMin = getRunningRequestsThisMinute();
    const tpmThisMin = getRunningTokensThisMinute();

    console.log(
      `\n▶ [${itemNum}/${pendingList.length}] (${item.subject}) ${item.fileName} Page ${item.pageNumber} [RPM: ${rpmThisMin}/${VISION_RPM_BUDGET}, TPM: ${tpmThisMin}/${EMBED_TPM_BUDGET}]`
    );

    try {
      let fileBuf = fileBufferCache.get(item.driveFileId);
      if (!fileBuf) {
        process.stdout.write(`   📥 Downloading from Google Drive… `);
        fileBuf = await downloadDriveFile(drive, item.driveFileId);
        fileBufferCache.set(item.driveFileId, fileBuf);
        console.log(`OK (${(fileBuf.length / 1024 / 1024).toFixed(2)} MB)`);
      }

      let mimeType = 'application/pdf';
      let base64Data = '';

      if (item.fileName.endsWith('.pdf')) {
        process.stdout.write(`   📄 Extracting Page ${item.pageNumber} via in-memory pdf-lib… `);
        base64Data = await extractPdfPageAsBase64(fileBuf, item.pageNumber);
        mimeType = 'application/pdf';
        console.log(`OK (${(base64Data.length / 1024).toFixed(1)} KB base64)`);
      } else if (/\.(png|jpe?g)$/i.test(item.fileName)) {
        base64Data = fileBuf.toString('base64');
        mimeType = item.fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      }

      process.stdout.write(`   👁️ Transcribing via Gemini 2.0 Flash Vision… `);
      const startTime = Date.now();

      const visionRes = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          SYSTEM_TRANSCRIPTION_PROMPT,
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ],
        config: { temperature: 0.1 },
      });

      const elapsed = Date.now() - startTime;
      const text = visionRes.text || '';
      console.log(`OK (${elapsed}ms, ${text.length} chars)`);

      const quality = evaluateQuality(text);

      if (!quality.accepted) {
        console.log(`   ⛔ REJECTED BY QUALITY GATE: ${quality.reason}`);
        rejectedCount++;

        if (!isDryRun) {
          item.status = 'failed';
          item.failureReason = quality.reason;
          item.processedAt = new Date();
          await item.save();
        }
      } else {
        console.log(`   ✅ ACCEPTED BY QUALITY GATE`);
        acceptedCount++;

        console.log(`   📝 Sample Transcription:\n      "${text.slice(0, 150).replace(/\n/g, ' ')}…"`);

        const pageItem = {
          driveFileId: item.driveFileId,
          fileName: item.fileName,
          subject: item.subject,
          pageNumber: item.pageNumber,
          text,
          isScanned: true,
        };

        const rawChunks = chunkPages([pageItem]);
        console.log(`   🧩 Chunked into ${rawChunks.length} chunk(s) (1500 char target)`);

        if (!isDryRun && rawChunks.length > 0) {
          const sampleChunk = await Chunk.findOne({ driveFileId: item.driveFileId });
          const branches = sampleChunk?.branches || ['CSE-AIML'];
          const semester = sampleChunk?.semester || 1;
          const resourceType = sampleChunk?.resourceType || 'Scanned Notes';
          const webViewLink = sampleChunk?.webViewLink || `https://drive.google.com/file/d/${item.driveFileId}/view`;

          const chunkTexts = rawChunks.map((c) => c.text);
          const embeddings = await embedDocumentChunks(chunkTexts);

          const chunkDocs = rawChunks.map((rc, cIdx) => ({
            driveFileId: item.driveFileId,
            fileName: item.fileName,
            webViewLink,
            branches,
            semester,
            subject: item.subject,
            resourceType,
            chunkIndex: 90000 + item.pageNumber * 100 + rc.chunkIndex,
            pageNumber: item.pageNumber,
            text: rc.text,
            source: 'ocr',
            embedding: embeddings[cIdx],
          }));

          await Chunk.insertMany(chunkDocs);
        }

        if (!isDryRun) {
          item.status = 'done';
          item.processedAt = new Date();
          await item.save();
        }
      }

      processedCount++;
    } catch (err: any) {
      console.log(`💥 ERROR (${err.message})`);
      if (!isDryRun) {
        item.status = 'failed';
        item.failureReason = `Exception: ${err.message}`;
        item.processedAt = new Date();
        await item.save();
      }
    }
  }

  console.log(`\n🎉 Processing Batch Complete! Accepted: ${acceptedCount}, Rejected: ${rejectedCount}`);

  await printCoverageReport(Chunk, PendingOCR, 'CORPUS COVERAGE REPORT — AFTER OCR RUN');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ OCR Pipeline Failed:', err);
  process.exit(1);
});
