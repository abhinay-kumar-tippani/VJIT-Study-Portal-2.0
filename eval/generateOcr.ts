#!/usr/bin/env node
/**
 * eval/generateOcr.ts
 *
 * Auto-generates eval/questions.ocr.json strictly from OCR-transcribed chunks (`source === 'ocr'`).
 *
 * Requirements:
 * 1. Targets ONLY OCR chunks (`source === 'ocr'`) to evaluate post-OCR retrieval accuracy.
 * 2. Samples 30 questions total across DBMS, IAI, OOPs-Java, PC.
 * 3. File-level cap: MAX 2 questions per source file (expectedDriveFileId).
 * 4. Atomic checkpointing & resume: APPENDS to eval/questions.ocr.json after EVERY question generated.
 * 5. Deduplication: Drops generated questions with cosine similarity > 0.9 against existing questions.
 *
 * Run:
 *   npx tsx eval/generateOcr.ts
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

const TARGET_SUBJECTS = ['IAI', 'PC', 'OOPs-Java', 'DBMS'];
const CHUNKS_PER_SUBJECT = 8;
const MAX_QUESTIONS_PER_FILE = 2;

export interface QuestionItem {
  question: string;
  keywords: string[];
  subject: string;
  expectedDriveFileId: string;
  expectedFileName: string;
  sourceChunkId: string;
  embedding?: number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function callGeminiQuestionGen(
  text: string,
  subject: string,
  apiKey: string
): Promise<{ question: string; keywords: string[] } | null> {
  const prompt = `You are creating exam-style questions for a VJIT engineering student. Below is an excerpt from their ${subject} study material.

Write ONE question a student would actually type into a study assistant, that this excerpt answers.

RULES:
- Phrase it the way a student would, NOT the way the text is written. Do not reuse distinctive phrases from the excerpt.
- It must be answerable ONLY from this excerpt, not from general knowledge.
- Also extract 3-5 keywords that MUST appear in any correct answer.

Return ONLY JSON, no markdown fences:
{"question": "...", "keywords": ["..."]}

EXCERPT:
${text}`;

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
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Gemini API Error (${res.status}): ${JSON.stringify(data)}`);
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      },
      { label: 'OCR Question Gen' }
    );

    if (!rawJson) return null;

    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.warn('  ⚠️ Gemini question generation error:', err.message);
    return null;
  }
}

async function main() {
  const { connectDB } = await import('../lib/db');
  const { default: Chunk } = await import('../models/Chunk');
  const { embedQuery } = await import('../lib/rag/embeddings');

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   VJIT RAG — OCR Question Dataset Generator          ║');
  console.log('║   Targeting ONLY source === "ocr" Chunks             ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const db = await connectDB();
  if (!db) {
    console.error('❌ Could not connect to MongoDB Atlas');
    process.exit(1);
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing from .env.local');
    process.exit(1);
  }

  const outPath = path.resolve(process.cwd(), 'eval', 'questions.ocr.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let existingQuestions: QuestionItem[] = [];
  if (fs.existsSync(outPath)) {
    try {
      existingQuestions = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
      console.log(`📋 Found existing checkpoint: ${existingQuestions.length} OCR questions loaded from ${outPath}`);
    } catch {
      existingQuestions = [];
    }
  }

  const seenChunkIds = new Set(existingQuestions.map((q) => q.sourceChunkId));

  for (const q of existingQuestions) {
    if (!q.embedding && q.question) {
      try {
        q.embedding = await embedQuery(q.question);
      } catch {}
    }
  }

  function saveCheckpoint() {
    const toSave = existingQuestions.map(({ embedding, ...rest }) => rest);
    fs.writeFileSync(outPath, JSON.stringify(toSave, null, 2), 'utf-8');
  }

  const ocrChunkCount = await Chunk.countDocuments({ source: 'ocr' });
  if (ocrChunkCount === 0) {
    console.log('ℹ️ Zero OCR chunks found in database (source === "ocr"). Run "npm run ocr" first before generating OCR eval questions.');
    process.exit(0);
  }

  for (const subject of TARGET_SUBJECTS) {
    const currentSubjectCount = existingQuestions.filter((q) => q.subject === subject).length;
    if (currentSubjectCount >= CHUNKS_PER_SUBJECT) {
      console.log(`━━━ 🎯 ${subject}: Already complete (${currentSubjectCount}/${CHUNKS_PER_SUBJECT}) ━━━`);
      continue;
    }

    console.log(`━━━ 🎯 Sampling OCR chunks for ${subject} (Need ${CHUNKS_PER_SUBJECT - currentSubjectCount} more) ━━━`);

    const candidates = await Chunk.aggregate([
      { $match: { subject, source: 'ocr', $expr: { $gt: [{ $strLenCP: '$text' }, 150] } } },
      { $sample: { size: 50 } },
    ]);

    const fileCountMap: Record<string, number> = {};

    for (const q of existingQuestions) {
      fileCountMap[q.expectedDriveFileId] = (fileCountMap[q.expectedDriveFileId] || 0) + 1;
    }

    const sampledChunks: typeof candidates = [];
    for (const chunk of candidates) {
      if (seenChunkIds.has(String(chunk._id))) continue;

      const fId = chunk.driveFileId;
      const countForFile = fileCountMap[fId] || 0;
      if (countForFile >= MAX_QUESTIONS_PER_FILE) continue;

      fileCountMap[fId] = countForFile + 1;
      sampledChunks.push(chunk);

      if (existingQuestions.filter((q) => q.subject === subject).length + sampledChunks.length >= CHUNKS_PER_SUBJECT) {
        break;
      }
    }

    console.log(`  Selected ${sampledChunks.length} OCR chunks across distinct files (capped at ${MAX_QUESTIONS_PER_FILE}/file)`);

    for (const chunk of sampledChunks) {
      const chunkIdStr = String(chunk._id);
      if (seenChunkIds.has(chunkIdStr)) continue;

      process.stdout.write(`  Generating Q for ${chunk.fileName.slice(0, 30)} (Pg ${chunk.pageNumber || 'N/A'}) … `);
      const res = await callGeminiQuestionGen(chunk.text, subject, apiKey);

      if (res && res.question && Array.isArray(res.keywords)) {
        try {
          const qEmbedding = await embedQuery(res.question);

          let isDuplicate = false;
          for (const accepted of existingQuestions) {
            if (accepted.embedding) {
              const sim = cosineSimilarity(qEmbedding, accepted.embedding);
              if (sim > 0.9) {
                isDuplicate = true;
                break;
              }
            }
          }

          if (isDuplicate) {
            console.log(`🟡 Skipped duplicate question.`);
            continue;
          }

          const newQItem: QuestionItem = {
            question: res.question,
            keywords: res.keywords,
            subject,
            expectedDriveFileId: chunk.driveFileId,
            expectedFileName: chunk.fileName,
            sourceChunkId: chunkIdStr,
            embedding: qEmbedding,
          };

          existingQuestions.push(newQItem);
          seenChunkIds.add(chunkIdStr);

          saveCheckpoint();
          console.log(`✅ Saved Q: "${res.question.slice(0, 45)}…"`);
        } catch (err: any) {
          console.log(`❌ Embedding failed: ${err.message}`);
        }
      }
    }
  }

  saveCheckpoint();
  console.log(`\n💾 Completed! ${existingQuestions.length} total OCR questions saved to ${outPath}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ eval:gen:ocr failed:', err);
  process.exit(1);
});
