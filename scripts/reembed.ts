#!/usr/bin/env node
/**
 * scripts/reembed.ts
 *
 * Re-embeds all existing chunks in MongoDB collection `chunks` using Jina Embeddings v3 (768-dim).
 * Sets task: "retrieval.passage" and dimensions: 768.
 * Updates `embedding` array in place and marks `embedModel: 'jina-embeddings-v3'`.
 * Supports batching, rate limiting, withRetry, atomic checkpointing & resume.
 * Tracks and reports total Jina API tokens consumed.
 *
 * Run:
 *   npx tsx scripts/reembed.ts
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

const BATCH_SIZE = 20;

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║   VJIT RAG — Corpus Re-Embedder (jina-embeddings-v3, 768-dim)   ║`);
  console.log(`║   Re-embeds chunks in place without re-extracting text          ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

  const apiKey = process.env.JINA_API_KEY || '';
  if (!apiKey) {
    console.error('❌ JINA_API_KEY is missing from .env.local!');
    process.exit(1);
  }

  const { connectDB } = await import('../lib/db');
  await connectDB();

  const { default: Chunk } = await import('../models/Chunk');
  const { withRetry } = await import('../lib/utils/retry');

  const totalChunkCount = await Chunk.countDocuments({});
  const unmigratedCount = await Chunk.countDocuments({ embedModel: { $ne: 'jina-embeddings-v3' } });

  console.log(`📊 Total Corpus Chunks in DB: ${totalChunkCount}`);
  console.log(`⏳ Chunks needing re-embedding: ${unmigratedCount}`);

  if (unmigratedCount === 0) {
    console.log('✅ All chunks are already re-embedded with jina-embeddings-v3!');
    process.exit(0);
  }

  const unmigratedChunks = await Chunk.find({ embedModel: { $ne: 'jina-embeddings-v3' } })
    .select('_id text fileName pageNumber chunkIndex subject')
    .lean();

  const totalBatches = Math.ceil(unmigratedChunks.length / BATCH_SIZE);
  console.log(`🚀 Starting re-embedding across ${totalBatches} batch(es) (Batch size: ${BATCH_SIZE})...\n`);

  let totalTokensConsumed = 0;
  let reembeddedCount = 0;

  for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
    const batch = unmigratedChunks.slice(bIdx * BATCH_SIZE, (bIdx + 1) * BATCH_SIZE);
    const batchNum = bIdx + 1;

    process.stdout.write(`  [Batch ${batchNum}/${totalBatches}] Re-embedding ${batch.length} chunk(s) … `);
    const startTime = Date.now();

    try {
      const { embeddings, batchTokens } = await withRetry(
        async () => {
          const res = await fetch('https://api.jina.ai/v1/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'jina-embeddings-v3',
              task: 'retrieval.passage',
              dimensions: 768,
              input: batch.map((c) => c.text.trim()),
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(`Jina API Error (${res.status}): ${JSON.stringify(data)}`);
          }

          const embs = data.data?.map((item: any) => item.embedding);
          const tokens = data.usage?.total_tokens || 0;

          if (!embs || embs.length !== batch.length) {
            throw new Error(`Expected ${batch.length} embeddings, got ${embs?.length || 0}`);
          }

          return { embeddings: embs, batchTokens: tokens };
        },
        { label: `Re-embed Batch ${batchNum}/${totalBatches}` }
      );

      const elapsedMs = Date.now() - startTime;
      totalTokensConsumed += batchTokens;

      // Prepare bulk update operations
      const bulkOps = batch.map((chunk, idx) => ({
        updateOne: {
          filter: { _id: chunk._id },
          update: {
            $set: {
              embedding: embeddings[idx],
              embedModel: 'jina-embeddings-v3',
            },
          },
        },
      }));

      await Chunk.bulkWrite(bulkOps);
      reembeddedCount += batch.length;

      console.log(`✅ OK [${elapsedMs}ms] [Tokens: ${batchTokens} | Total: ${totalTokensConsumed}]`);
    } catch (err: any) {
      console.log(`💥 FAILED: ${err.message}`);
      console.error('❌ Re-embedding aborted due to error.');
      process.exit(1);
    }
  }

  console.log(`\n====================================================================`);
  console.log(`🎉 CORPUS RE-EMBEDDING COMPLETE!`);
  console.log(`  - Re-embedded Chunks: ${reembeddedCount}/${totalChunkCount}`);
  console.log(`  - Embed Model: jina-embeddings-v3 (768-dim)`);
  console.log(`  - Total Jina Tokens Consumed: ${totalTokensConsumed.toLocaleString()}`);
  console.log(`====================================================================\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ reembed script failed:', err);
  process.exit(1);
});
