#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

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

async function main() {
  console.log('🔍 RUNNING LIVE MONGODB ATLAS INDEX PRECHECK...\n');

  const { connectDB } = await import('@/lib/db');
  const mongooseInstance = await connectDB();

  if (!mongooseInstance || !mongooseInstance.connection.db) {
    console.error('❌ Could not connect to MongoDB Atlas');
    process.exit(1);
  }

  const collection = mongooseInstance.connection.db.collection('chunks');
  const chunkCount = await collection.countDocuments();
  console.log(`📊 Total collection document count: ${chunkCount}`);

  // 1. Check Vector Index
  let vectorOk = false;
  try {
    const vecRes = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: 'chunk_vector_index',
            path: 'embedding',
            queryVector: new Array(768).fill(0.01),
            numCandidates: 10,
            limit: 1,
          },
        },
      ])
      .toArray();

    if (vecRes && vecRes.length > 0) {
      vectorOk = true;
      console.log('✅ Atlas Vector Search Index (chunk_vector_index): PASS (Returned candidate doc)');
    } else {
      console.log('❌ Atlas Vector Search Index (chunk_vector_index): FAIL (Returned 0 docs)');
    }
  } catch (err: any) {
    console.log(`❌ Atlas Vector Search Index (chunk_vector_index): FAIL (${err.message})`);
  }

  // 2. Check BM25 Index
  let bm25Ok = false;
  try {
    const bmRes = await collection
      .aggregate([
        {
          $search: {
            index: 'chunk_text_index',
            text: { query: 'database', path: 'text' },
          },
        },
        { $limit: 1 },
      ])
      .toArray();

    if (bmRes && bmRes.length > 0) {
      bm25Ok = true;
      console.log('✅ Atlas BM25 Search Index (chunk_text_index): PASS (Returned candidate doc)');
    } else {
      console.log('❌ Atlas BM25 Search Index (chunk_text_index): FAIL (Returned 0 docs)');
    }
  } catch (err: any) {
    console.log(`❌ Atlas BM25 Search Index (chunk_text_index): FAIL (${err.message})`);
  }

  console.log('\n──────────────────────────────────────────────────');
  console.log(`Index Status Summary: Vector=${vectorOk ? 'PASS' : 'FAIL'}, BM25=${bm25Ok ? 'PASS' : 'FAIL'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Check indexes error:', err);
  process.exit(1);
});
