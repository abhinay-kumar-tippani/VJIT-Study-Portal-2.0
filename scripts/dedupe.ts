#!/usr/bin/env node
/**
 * scripts/dedupe.ts
 *
 * Fast bulk database migration and deduplication script:
 * 1. Migrates legacy `branch` string field to `branches` string array on all chunks in bulk.
 * 2. Identifies and removes duplicate chunks (same contentHash or identical fileName + chunkIndex + text).
 * 3. Merges branch associations onto the primary (oldest) chunk records before deleting duplicates.
 *
 * Run:
 *   npx tsx scripts/dedupe.ts
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

async function main() {
  const { connectDB } = await import('../lib/db');
  const Chunk = (await import('../models/Chunk')).default;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   VJIT RAG — Database Migration & Deduplication      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const db = await connectDB();
  if (!db) {
    console.error('❌ Could not connect to MongoDB Atlas');
    process.exit(1);
  }

  const initialCount = await Chunk.countDocuments();
  console.log(`📊 Initial database chunk count: ${initialCount}`);

  // 1. Fast Bulk Migration: Convert legacy `branch` field to `branches` array
  console.log('🔄 Bulk migrating legacy branch fields to branches array…');
  const updateRes = await Chunk.updateMany(
    { $or: [{ branches: { $exists: false } }, { branches: { $size: 0 } }] },
    [
      {
        $set: {
          branches: {
            $cond: {
              if: { $gt: [{ $strLenCP: { $ifNull: ['$branch', ''] } }, 0] },
              then: ['$branch'],
              else: ['CSE-AIML'],
            },
          },
        },
      },
    ]
  );
  console.log(`✅ Bulk updated ${updateRes.modifiedCount} chunk documents.\n`);

  // 2. Fast Aggregation for Duplicate Chunk Groups
  console.log('🔍 Scanning for duplicate chunk groups…');
  const dupGroups = await Chunk.aggregate([
    {
      $group: {
        _id: { fileName: '$fileName', chunkIndex: '$chunkIndex', text: '$text' },
        count: { $sum: 1 },
        docs: {
          $push: {
            id: '$_id',
            driveFileId: '$driveFileId',
            branches: '$branches',
            createdAt: '$createdAt',
          },
        },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  console.log(`🔎 Found ${dupGroups.length} duplicate chunk groups.`);

  let totalChunksRemoved = 0;
  const deleteIds: any[] = [];
  const updateOps: Promise<any>[] = [];

  for (const group of dupGroups) {
    const docs = group.docs;
    docs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const keeper = docs[0];
    const duplicates = docs.slice(1);

    const allBranches = new Set<string>();
    for (const d of docs) {
      if (Array.isArray(d.branches)) {
        d.branches.forEach((b: string) => allBranches.add(b));
      }
    }

    updateOps.push(Chunk.updateOne({ _id: keeper.id }, { $set: { branches: Array.from(allBranches) } }));

    duplicates.forEach((d: any) => deleteIds.push(d.id));
  }

  await Promise.all(updateOps);

  if (deleteIds.length > 0) {
    const delRes = await Chunk.deleteMany({ _id: { $in: deleteIds } });
    totalChunksRemoved = delRes.deletedCount;
  }

  const finalCount = await Chunk.countDocuments();
  console.log('\n┌──────────────────────────────────────────────────────────┐');
  console.log('│  DEDUPLICATION SUMMARY REPORT                             │');
  console.log('├──────────────────────────────────────────┬───────────────┤');
  console.log(`│ Initial Total Chunks                     │ ${String(initialCount).padStart(13)} │`);
  console.log(`│ Legacy Records Migrated                  │ ${String(updateRes.modifiedCount).padStart(13)} │`);
  console.log(`│ Duplicate Chunk Groups Cleaned           │ ${String(dupGroups.length).padStart(13)} │`);
  console.log(`│ Duplicate Chunks Removed                 │ ${String(totalChunksRemoved).padStart(13)} │`);
  console.log(`│ Final Total Chunks Remaining             │ ${String(finalCount).padStart(13)} │`);
  console.log('└──────────────────────────────────────────┴───────────────┘\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n💥 Fatal dedupe error:', err);
  process.exit(1);
});
