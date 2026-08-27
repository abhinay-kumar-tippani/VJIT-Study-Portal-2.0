#!/usr/bin/env node
/**
 * scripts/coverage.ts
 *
 * Database-backed Corpus Coverage Reporter.
 * Queries MongoDB Atlas across all subjects to report live corpus statistics:
 *   distinctFiles, totalChunks, scannedPages (PendingOCR), and branchesCovered.
 *
 * Run:
 *   npx tsx scripts/coverage.ts
 */

import fs from 'fs';
import path from 'path';

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

export async function printCorpusCoverageReport() {
  const { connectDB } = await import('../lib/db');
  const Chunk = (await import('../models/Chunk')).default;
  const PendingOCR = (await import('../models/PendingOCR')).default;

  const db = await connectDB();
  if (!db) {
    console.error('❌ Could not connect to MongoDB Atlas for coverage report');
    return;
  }

  // Get list of distinct subjects in Chunks + PendingOCR
  const chunkSubjects = await Chunk.distinct('subject');
  const ocrSubjects = await PendingOCR.distinct('subject');
  const allSubjects = Array.from(new Set([...chunkSubjects, ...ocrSubjects])).sort();

  const rpad = (s: string, n: number) => s.padStart(n);
  const pad = (s: string, n: number) => s.padEnd(n);

  console.log('\n┌──────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  LIVE DATABASE CORPUS COVERAGE REPORT (Queried directly from MongoDB Atlas)                    │');
  console.log('├──────────────┬────────────────┬───────────────┬───────────────────┬──────────────────────────────┤');
  console.log('│ Subject      │ Distinct Files │ Total Chunks  │ Scan Pages Logged │ Branches Covered             │');
  console.log('├──────────────┼────────────────┼───────────────┼───────────────────┼──────────────────────────────┤');

  let grandFiles = 0;
  let grandChunks = 0;
  let grandOcrPages = 0;
  const grandBranchesSet = new Set<string>();

  for (const subj of allSubjects) {
    const files = await Chunk.distinct('driveFileId', { subject: subj });
    const chunkCount = await Chunk.countDocuments({ subject: subj });
    const ocrCount = await PendingOCR.countDocuments({ subject: subj });
    const branches = await Chunk.distinct('branches', { subject: subj });

    branches.forEach((b: string) => grandBranchesSet.add(b));
    grandFiles += files.length;
    grandChunks += chunkCount;
    grandOcrPages += ocrCount;

    const branchStr = branches.join(', ') || 'None';

    console.log(
      `│ ${pad(subj, 12)} │ ${rpad(String(files.length), 14)} │ ${rpad(String(chunkCount), 13)} │ ${rpad(String(ocrCount), 17)} │ ${pad(branchStr, 28)} │`
    );
  }

  console.log('├──────────────┼────────────────┼───────────────┼───────────────────┼──────────────────────────────┤');
  console.log(
    `│ ${pad('GRAND TOTAL', 12)} │ ${rpad(String(grandFiles), 14)} │ ${rpad(String(grandChunks), 13)} │ ${rpad(String(grandOcrPages), 17)} │ ${pad(Array.from(grandBranchesSet).join(', ') || 'None', 28)} │`
  );
  console.log('└──────────────┴────────────────┴───────────────┴───────────────────┴──────────────────────────────┘\n');
}

if (process.argv[1] && process.argv[1].endsWith('coverage.ts')) {
  printCorpusCoverageReport()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
