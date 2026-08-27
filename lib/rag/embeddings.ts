/**
 * lib/rag/embeddings.ts
 *
 * Jina Embeddings API Wrapper (jina-embeddings-v3, 768-dim Matryoshka)
 * Uses HTTP Bearer Auth (`Authorization: Bearer ${JINA_API_KEY}`) with rate limiting and retry.
 */

import { withRetry } from '@/lib/utils/retry';
import {
  acquireTokenBudget,
  estimateBatchTokens,
  estimateTokens,
  EMBED_BATCH_SIZE,
} from './rateLimiter';

function getJinaApiKey(): string {
  const key = process.env.JINA_API_KEY;
  if (!key || !key.trim()) {
    throw new Error('JINA_API_KEY is missing from .env.local.');
  }
  return key.trim();
}

const JINA_EMBEDDING_ENDPOINT = 'https://api.jina.ai/v1/embeddings';
const JINA_EMBEDDING_MODEL = 'jina-embeddings-v3';
const JINA_EMBEDDING_DIMENSION = 768;

export interface EmbedOptions {
  batchProgressCallback?: (
    currentBatch: number,
    totalBatches: number,
    batchChunkCount: number,
    runningTokensThisMin: number,
    budgetTpm: number
  ) => void;
}

/**
 * Generate 768-dim vector embeddings for document chunks using Jina task 'retrieval.passage'.
 */
export async function embedDocumentChunks(
  texts: string[],
  options: EmbedOptions = {}
): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];

  const apiKey = getJinaApiKey();
  const allEmbeddings: number[][] = [];
  const totalBatches = Math.ceil(texts.length / EMBED_BATCH_SIZE);

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const batchTokens = estimateBatchTokens(batch);
    await acquireTokenBudget(batchTokens);

    const batchEmbeddings = await withRetry(
      async () => {
        const res = await fetch(JINA_EMBEDDING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: JINA_EMBEDDING_MODEL,
            task: 'retrieval.passage',
            dimensions: JINA_EMBEDDING_DIMENSION,
            input: batch.map((t) => t.trim()),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Jina Embeddings API Error (${res.status}): ${JSON.stringify(data)}`);
        }

        const embeddings = data.data?.map((item: any) => item.embedding);
        if (!embeddings || embeddings.length !== batch.length) {
          throw new Error(`[embedDocumentChunks] Expected ${batch.length} embeddings, got ${embeddings?.length || 0}`);
        }

        return embeddings;
      },
      { label: `Jina Document Embeddings Batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1}/${totalBatches}` }
    );

    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}

/**
 * Generate 768-dim vector embedding for a query using Jina task 'retrieval.query'.
 */
export async function embedQuery(text: string): Promise<number[]> {
  if (!text || !text.trim()) {
    throw new Error('Empty query string provided to embedQuery');
  }

  const apiKey = getJinaApiKey();
  const queryTokens = estimateTokens(text);
  await acquireTokenBudget(queryTokens);

  return withRetry(
    async () => {
      const res = await fetch(JINA_EMBEDDING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: JINA_EMBEDDING_MODEL,
          task: 'retrieval.query',
          dimensions: JINA_EMBEDDING_DIMENSION,
          input: [text.trim()],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(`Jina Query Embedding API Error (${res.status}): ${JSON.stringify(data)}`);
      }

      const embedding = data.data?.[0]?.embedding as number[];
      if (!embedding || embedding.length === 0) {
        throw new Error('[embedQuery] Empty embedding returned from Jina API');
      }

      return embedding;
    },
    { label: 'Jina Query Embedding' }
  );
}
