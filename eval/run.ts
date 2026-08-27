#!/usr/bin/env node
/**
 * eval/run.ts
 *
 * Multi-Mode Clean Benchmark Runner (eval).
 * Runs all 4 retrieval modes ('vector', 'bm25', 'hybrid', 'hybrid-rerank') over THREE datasets:
 *   1. Frozen Native Dataset (eval/questions.frozen.json - 58 questions)
 *   2. OCR Dataset (eval/questions.ocr.json - 30 questions)
 *   3. Real Production Dataset (eval/questions.real.json - 60 human-labelled queries)
 *
 * Evaluates: selfRetrievalRate, fileRecall@5, fileRecall@30 (before rerank), MRR, faithfulness, citationRate, and avg totalMs.
 * Saves timestamped JSON result files with configLabel: 'phase2-clean-{mode}' and corpusState: 'pre-ocr'.
 * Includes embedProvider: 'jina' and embedModel: 'jina-embeddings-v3' in config metadata.
 *
 * Prechecks:
 *   1. Live API Key Probe: Tests raw fetch to Jina API. Aborts on non-200 with full raw body.
 *   2. Index Precheck: Aborts immediately if either Vector Search or BM25 Search index returns zero results.
 *
 * Run:
 *   npx tsx eval/run.ts
 */

import fs from 'fs';
import path from 'path';

// 1. MUST LOAD ENV VARIABLES BEFORE ANY MONGOOSE / DB IMPORTS
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

import { RetrievalMode } from '@/lib/rag/retrieve';

interface QuestionItem {
  question: string;
  keywords: string[];
  subject: string;
  expectedDriveFileId: string;
  expectedFileName: string;
  sourceChunkId: string;
}

interface ModeEvalSummary {
  datasetLabel: string;
  mode: RetrievalMode;
  configLabel: string;
  totalQuestions: number;
  selfRetrievalRatePct: number;
  fileRecallTop5Pct: number;
  fileRecallTop30Pct: number;
  mrr: number;
  avgTotalMs: number;
  faithfulnessPct: number;
  citationRatePct: number;
  resultFilePath: string;
}

/**
 * Live Probe Precheck: Executes a raw HTTP fetch to Jina API before work begins.
 * Aborts with exit code 1 and prints the full raw error response body on non-200.
 */
async function runLiveApiKeyProbe() {
  const jinaKey = process.env.JINA_API_KEY || '';
  console.log(`🔍 Running Live Jina API Probe (Key length: ${jinaKey.length})...`);

  if (!jinaKey) {
    console.error('❌ FATAL: JINA_API_KEY missing from .env.local!');
    process.exit(1);
  }

  try {
    const res = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jinaKey}`,
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        task: 'retrieval.query',
        dimensions: 768,
        input: ['Live probe check'],
      }),
    });
    const body = await res.text();

    if (!res.ok) {
      console.error(`\n❌ FATAL LIVE API PROBE FAILED (HTTP ${res.status} ${res.statusText}):`);
      console.error(`FULL RAW RESPONSE BODY:\n${body}\n`);
      console.error(`👉 Aborting evaluation run to prevent mid-run failures.\n`);
      process.exit(1);
    }

    console.log('  ✅ Live Jina API Key Probe: PASSED (HTTP 200 OK)');
  } catch (err: any) {
    console.error(`❌ FATAL LIVE API PROBE ERROR: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Startup Precheck: Ensures both Atlas Vector Search and Atlas Search (BM25) indexes exist and return results.
 * Aborts with a clear fatal error if either index is missing or returns zero candidates.
 */
async function runIndexPrecheck() {
  console.log('🔍 Running Atlas Search Index Startup Prechecks...');
  const { connectDB } = await import('@/lib/db');
  const mongooseInstance = await connectDB();
  if (!mongooseInstance || !mongooseInstance.connection.db) {
    console.error('❌ FATAL: Unable to connect to MongoDB Atlas.');
    process.exit(1);
  }

  const collection = mongooseInstance.connection.db.collection('chunks');

  // 1. Vector Search Precheck
  try {
    const vectorSample = await collection
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

    if (!vectorSample || vectorSample.length === 0) {
      throw new Error(
        "Vector Search query returned 0 results. Ensure 'chunk_vector_index' exists and is active on collection 'chunks'."
      );
    }
    console.log('  ✅ Atlas Vector Search Index (chunk_vector_index): OK');
  } catch (err: any) {
    console.error(`\n❌ FATAL INDEX PRECHECK ERROR: Atlas Vector Search Failed!`);
    console.error(`   Details: ${err.message}`);
    console.error(`👉 Please create the Vector Search index named 'chunk_vector_index' in MongoDB Atlas UI before running evaluation!\n`);
    process.exit(1);
  }

  // 2. BM25 Search Precheck
  try {
    const bm25Sample = await collection
      .aggregate([
        {
          $search: {
            index: 'chunk_text_index',
            text: { query: 'data', path: 'text' },
          },
        },
        { $limit: 1 },
      ])
      .toArray();

    if (!bm25Sample || bm25Sample.length === 0) {
      throw new Error(
        "Atlas Search (BM25) query returned 0 results. Ensure 'chunk_text_index' exists and is active on collection 'chunks'."
      );
    }
    console.log('  ✅ Atlas Search BM25 Index (chunk_text_index): OK');
  } catch (err: any) {
    console.error(`\n❌ FATAL INDEX PRECHECK ERROR: Atlas BM25 Search Failed!`);
    console.error(`   Details: ${err.message}`);
    console.error(`👉 Please create the Lucene BM25 Search index named 'chunk_text_index' in MongoDB Atlas UI before running evaluation!\n`);
    process.exit(1);
  }
}

async function callGeminiAnswer(
  question: string,
  contextTexts: string[],
  apiKey: string
): Promise<string> {
  const prompt = `You are VJIT Jarvis, an AI study assistant for VJIT students.
Answer the user's question using ONLY the provided course material excerpts below.

RULES:
- Start directly with the answer. Do not use conversational filler.
- Include file citations e.g. (Unit-1.docx) where applicable.

QUESTION: ${question}

COURSE MATERIAL EXCERPTS:
${contextTexts.join('\n\n---\n\n')}`;

  try {
    const { withRetry } = await import('../lib/utils/retry');

    const rawJson = await withRetry(
      async () => {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Gemini API Error (${res.status}): ${JSON.stringify(data)}`);
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      },
      { label: 'Eval Answer Gen' }
    );

    return rawJson || '';
  } catch (err: any) {
    console.warn('  ⚠️ Gemini answer generation failed:', err.message);
    return '';
  }
}

async function evaluateMode(
  mode: RetrievalMode,
  datasetTag: string,
  questions: QuestionItem[],
  apiKey: string,
  liveChunkCount: number
): Promise<ModeEvalSummary> {
  const { retrieveChunks } = await import('../lib/rag/retrieve');
  const configLabel = `phase2-clean-${mode}`;

  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`🚀 RUNNING BENCHMARK: [Dataset: ${datasetTag.toUpperCase()}] [Mode: ${mode.toUpperCase()}] (${questions.length} Qs)`);
  console.log(`──────────────────────────────────────────────────────────`);

  let selfRetrievedCount = 0;
  let fileRetrievedCount = 0;
  let fileRetrieved30Count = 0;
  let totalReciprocalRank = 0;
  let totalLatency = 0;
  let totalFaithfulness = 0;
  let totalCitations = 0;

  const detailedResults: any[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    process.stdout.write(`  [${i + 1}/${questions.length}] Mode: ${mode} | Q: "${q.question.slice(0, 45)}…" `);

    const startTime = Date.now();
    const result = await retrieveChunks({
      query: q.question,
      subject: q.subject,
      mode,
      fetchDepth: 30,
      limit: 5,
      applyThreshold: false, // PRE-THRESHOLD metric evaluation
    });
    const latencyMs = Date.now() - startTime;
    totalLatency += latencyMs;

    const top5Chunks = result.chunks;
    const top30Candidates = result.candidatesBeforeRerank || top5Chunks;

    const retrievedChunkIds = top5Chunks.map((c) => c.chunkId);
    const retrievedFileNames = top5Chunks.map((c) => c.fileName);
    const retrievedTop30FileIds = top30Candidates.map((c) => c.driveFileId);

    // 1. Self Retrieval Rate (exact source chunk in top 5)
    const selfRetrieved = retrievedChunkIds.includes(q.sourceChunkId);
    if (selfRetrieved) selfRetrievedCount++;

    // 2. File Recall @ 5
    const fileRetrieved5 = top5Chunks.some((c) => c.driveFileId === q.expectedDriveFileId);
    if (fileRetrieved5) fileRetrievedCount++;

    // 3. File Recall @ 30 (pre-rerank candidate pool recall)
    const fileRetrieved30 = retrievedTop30FileIds.includes(q.expectedDriveFileId);
    if (fileRetrieved30) fileRetrieved30Count++;

    // 4. MRR (Mean Reciprocal Rank) based on exact file match
    const fileRankIndex = top5Chunks.findIndex((c) => c.driveFileId === q.expectedDriveFileId);
    const rr = fileRankIndex >= 0 ? 1 / (fileRankIndex + 1) : 0;
    totalReciprocalRank += rr;

    // 5 & 6. Faithfulness & Citation Rate (via LLM answer generation)
    let faithfulness = 0;
    let cited = false;

    if (apiKey && top5Chunks.length > 0) {
      const contextTexts = top5Chunks.map((c) => `[Source: ${c.fileName}]\n${c.text}`);
      const answer = await callGeminiAnswer(q.question, contextTexts, apiKey);

      const lowerAnswer = answer.toLowerCase();

      // Keyword coverage percentage for faithfulness
      if (q.keywords && q.keywords.length > 0) {
        const foundCount = q.keywords.filter((kw) => lowerAnswer.includes(kw.toLowerCase())).length;
        faithfulness = foundCount / q.keywords.length;
      }
      totalFaithfulness += faithfulness;

      // Strict citation detection
      const lowerExpectedFile = q.expectedFileName.toLowerCase();
      const lowerExpectedBase = lowerExpectedFile.replace(/\.[^/.]+$/, '');
      cited = lowerAnswer.includes(lowerExpectedFile) || lowerAnswer.includes(lowerExpectedBase);

      if (cited) totalCitations++;
    }

    detailedResults.push({
      question: q.question,
      subject: q.subject,
      expectedFileName: q.expectedFileName,
      sourceChunkId: q.sourceChunkId,
      retrievedChunkIds,
      retrievedFileNames,
      selfRetrievedTop5: selfRetrieved,
      fileRetrievedTop5: fileRetrieved5,
      fileRetrievedTop30: fileRetrieved30,
      reciprocalRank: rr,
      latencyMs,
      faithfulnessScore: faithfulness,
      citedFile: cited,
    });

    const icon = selfRetrieved ? '🎯' : fileRetrieved5 ? '✅' : fileRetrieved30 ? '🟡 (in top 30)' : '❌';
    console.log(`${icon} [${latencyMs}ms]`);
  }

  const N = questions.length;
  const selfRetrievalRatePct = Number((N ? (selfRetrievedCount / N) * 100 : 0).toFixed(1));
  const fileRecallTop5Pct = Number((N ? (fileRetrievedCount / N) * 100 : 0).toFixed(1));
  const fileRecallTop30Pct = Number((N ? (fileRetrieved30Count / N) * 100 : 0).toFixed(1));
  const mrr = Number((N ? totalReciprocalRank / N : 0).toFixed(3));
  const avgTotalMs = N ? Math.round(totalLatency / N) : 0;
  const faithfulnessPct = Number((N ? (totalFaithfulness / N) * 100 : 0).toFixed(1));
  const citationRatePct = Number((N ? (totalCitations / N) * 100 : 0).toFixed(1));

  // Save mode JSON output to eval/results/
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(process.cwd(), 'eval', 'results');
  fs.mkdirSync(outDir, { recursive: true });

  const resultFilePath = path.join(outDir, `${timestamp}_${configLabel}.json`);
  const outputData = {
    evalTimestamp: new Date().toISOString(),
    datasetLabel: 'vjit-eval-set',
    configLabel,
    retrievalMode: mode,
    embedProvider: 'jina',
    embedModel: 'jina-embeddings-v3',
    chunkCount: liveChunkCount,
    corpusState: 'pre-ocr',
    questionCount: N,
    summary: {
      selfRetrievalRatePct,
      fileRecallTop5Pct,
      fileRecallTop30Pct,
      mrr,
      faithfulnessPct,
      citationRatePct,
      avgTotalMs,
    },
    questions: detailedResults,
  };

  fs.writeFileSync(resultFilePath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`💾 Saved ${mode} (${datasetTag}) evaluation results → ${resultFilePath}`);

  return {
    datasetLabel: datasetTag,
    mode,
    configLabel,
    totalQuestions: N,
    selfRetrievalRatePct,
    fileRecallTop5Pct,
    fileRecallTop30Pct,
    mrr,
    avgTotalMs,
    faithfulnessPct,
    citationRatePct,
    resultFilePath: `eval/results/${path.basename(resultFilePath)}`,
  };
}

function printMatrixTable(title: string, summaries: ModeEvalSummary[]) {
  console.log(`\n┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐`);
  console.log(`│  ${title.padEnd(112)} │`);
  console.log(`├──────────────────────┬────────────┬──────────────┬───────────────┬─────────┬──────────────┬──────────────┬───────────┤`);
  console.log(`│ Retrieval Mode       │ Self-Ret % │ FileRecall@5 │ FileRecall@30 │ MRR     │ Faithfulness │ CitationRate │ Avg Latency│`);
  console.log(`├──────────────────────┼────────────┼──────────────┼───────────────┼─────────┼──────────────┼──────────────┼───────────┤`);

  for (const s of summaries) {
    const modeCol = s.mode.padEnd(20);
    const selfRetCol = `${s.selfRetrievalRatePct.toFixed(1)}%`.padStart(10);
    const recall5Col = `${s.fileRecallTop5Pct.toFixed(1)}%`.padStart(12);
    const recall30Col = `${s.fileRecallTop30Pct.toFixed(1)}%`.padStart(13);
    const mrrCol = s.mrr.toFixed(3).padStart(7);
    const faithCol = `${s.faithfulnessPct.toFixed(1)}%`.padStart(12);
    const citeCol = `${s.citationRatePct.toFixed(1)}%`.padStart(12);
    const latCol = `${s.avgTotalMs} ms`.padStart(9);

    console.log(`│ ${modeCol} │ ${selfRetCol} │ ${recall5Col} │ ${recall30Col} │ ${mrrCol} │ ${faithCol} │ ${citeCol} │ ${latCol} │`);
  }

  console.log(`└──────────────────────┴────────────┴──────────────┴───────────────┴─────────┴──────────────┴──────────────┴───────────┘\n`);
}

async function runBenchmark() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
  console.log(`║   VJIT RAG — Clean Phase 2 Benchmark Runner (Jina Embeddings v3)  ║`);
  console.log(`║   Modes: Vector | BM25 | Hybrid (RRF) | Hybrid + Neural Rerank   ║`);
  console.log(`║   Dataset: Frozen Native (58 Qs)                                 ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

  // 1. Run Live API Probe Precheck
  await runLiveApiKeyProbe();

  // 2. Run Startup Index Precheck
  await runIndexPrecheck();

  const apiKey = process.env.GEMINI_API_KEY || '';

  // 3. Count live chunks from MongoDB Atlas
  const { default: Chunk } = await import('../models/Chunk');
  const dbChunkCount = await Chunk.countDocuments();
  console.log(`📊 Live corpus chunk count (pre-ocr state): ${dbChunkCount}`);

  const modes: RetrievalMode[] = ['vector', 'bm25', 'hybrid', 'hybrid-rerank'];

  // 4. Load FROZEN Native synthetic dataset (questions.frozen.json - 58 Qs)
  const frozenPath = path.resolve(process.cwd(), 'eval', 'questions.frozen.json');
  if (!fs.existsSync(frozenPath)) {
    console.error(`❌ FROZEN dataset not found at ${frozenPath}`);
    process.exit(1);
  }

  const frozenQuestions: QuestionItem[] = JSON.parse(fs.readFileSync(frozenPath, 'utf-8'));
  console.log(`🔒 Loaded ${frozenQuestions.length} test questions from FROZEN Native dataset (${frozenPath})`);

  const nativeSummaries: ModeEvalSummary[] = [];
  for (const mode of modes) {
    const summary = await evaluateMode(mode, 'native', frozenQuestions, apiKey, dbChunkCount);
    nativeSummaries.push(summary);
  }

  printMatrixTable('TABLE 1: CLEAN PHASE 2 BENCHMARK (FROZEN NATIVE DATASET - 58 QUESTIONS - JINA EMBEDDINGS V3)', nativeSummaries);

  console.log('\n📄 Measured Result File Summary:');
  for (const s of nativeSummaries) {
    console.log(`  - Mode '${s.mode}': ${s.resultFilePath} (configLabel: ${s.configLabel})`);
  }

  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('❌ Eval run failed:', err);
  process.exit(1);
});
