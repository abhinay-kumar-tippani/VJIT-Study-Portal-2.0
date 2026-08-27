#!/usr/bin/env node
/**
 * eval/generateReal.ts
 *
 * Real Evaluation Set Generator from Production Traffic.
 * Pulls top 60 most frequent real student queries from `rag_queries`.
 * Provides an interactive CLI for human labelling:
 *   Shows the query + top 10 retrieved chunks from DB.
 *   Operator inputs '1'..'10' to select the correct source file, or 's' to skip.
 * Outputs `eval/questions.real.json`.
 *
 * Run:
 *   npx tsx eval/generateReal.ts
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

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

export interface QuestionItem {
  question: string;
  keywords: string[];
  subject: string;
  expectedDriveFileId: string;
  expectedFileName: string;
  sourceChunkId: string;
}

function askQuestion(rl: readline.Interface, promptText: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      resolve(answer.trim());
    });
  });
}

function extractKeywords(query: string, chunkText: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['what', 'how', 'why', 'explain', 'where', 'when', 'is', 'are', 'the', 'and', 'with'].includes(w));
  return words.slice(0, 5);
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║   VJIT RAG — Production Real Query Labeller (eval:gen:real)      ║`);
  console.log(`║   Human-in-the-Loop Labelling CLI -> eval/questions.real.json    ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

  const { connectDB } = await import('../lib/db');
  await connectDB();

  const { default: RagQuery } = await import('../models/RagQuery');
  const { retrieveChunks } = await import('../lib/rag/retrieve');

  const outPath = path.resolve(process.cwd(), 'eval', 'questions.real.json');

  let existingQuestions: QuestionItem[] = [];
  if (fs.existsSync(outPath)) {
    try {
      existingQuestions = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
      console.log(`📋 Found existing checkpoint: ${existingQuestions.length} labelled questions loaded.`);
    } catch {
      existingQuestions = [];
    }
  }

  const seenQuestions = new Set(existingQuestions.map((q) => q.question.toLowerCase().trim()));

  // 1. Aggregate top 60 most frequent real student queries
  const topQueriesAgg = await RagQuery.aggregate([
    { $group: { _id: { $toLower: { $trim: { input: '$query' } } }, originalQuery: { $first: '$query' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 100 },
  ]);

  if (topQueriesAgg.length === 0) {
    console.log('ℹ️ No queries found in rag_queries collection yet. Populate production queries or run test queries first.');
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`📊 Found ${topQueriesAgg.length} candidate frequent student queries for human labelling.`);
  console.log(`👉 Press 1-10 to select the correct source chunk, or 's' to skip.\n`);

  for (let idx = 0; idx < topQueriesAgg.length; idx++) {
    if (existingQuestions.length >= 60) break;

    const item = topQueriesAgg[idx];
    const qText = item.originalQuery;

    if (seenQuestions.has(qText.toLowerCase().trim())) {
      continue;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`❓ [Question ${existingQuestions.length + 1}/60] (Asked ${item.count}x): "${qText}"`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Fetch top 10 candidate chunks for human inspection
    const ret = await retrieveChunks({
      query: qText,
      mode: 'hybrid',
      limit: 10,
      applyThreshold: false,
    });

    if (ret.chunks.length === 0) {
      console.log('  ⚠️ Zero chunks retrieved for this query. Skipping.');
      continue;
    }

    ret.chunks.forEach((c, cIdx) => {
      const pageTag = c.pageNumber != null ? `Pg ${c.pageNumber}` : 'Docx';
      console.log(`  [${cIdx + 1}] (${c.subject}) ${c.fileName} [${pageTag}] [Score: ${c.score.toFixed(3)}]`);
      console.log(`      Snippet: "${c.text.slice(0, 110).replace(/\n/g, ' ')}…"`);
    });

    const ans = await askQuestion(rl, `\nSelect correct chunk number [1-${ret.chunks.length}], or 's' to skip: `);

    if (ans.toLowerCase() === 's' || ans === '') {
      console.log('  ⏩ Skipped.');
      continue;
    }

    const selectedNum = parseInt(ans, 10);
    if (!isNaN(selectedNum) && selectedNum >= 1 && selectedNum <= ret.chunks.length) {
      const targetChunk = ret.chunks[selectedNum - 1];
      const keywords = extractKeywords(qText, targetChunk.text);

      const newItem: QuestionItem = {
        question: qText,
        keywords,
        subject: targetChunk.subject,
        expectedDriveFileId: targetChunk.driveFileId,
        expectedFileName: targetChunk.fileName,
        sourceChunkId: targetChunk.chunkId,
      };

      existingQuestions.push(newItem);
      seenQuestions.add(qText.toLowerCase().trim());

      fs.writeFileSync(outPath, JSON.stringify(existingQuestions, null, 2), 'utf-8');
      console.log(`  ✅ Labelled source: "${targetChunk.fileName}". Saved to ${outPath}!`);
    } else {
      console.log('  ❌ Invalid choice. Skipped.');
    }
  }

  rl.close();
  console.log(`\n💾 Completed! ${existingQuestions.length} production real evaluation questions saved in ${outPath}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ eval:gen:real failed:', err);
  process.exit(1);
});
