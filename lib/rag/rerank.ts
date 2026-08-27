/**
 * lib/rag/rerank.ts
 *
 * Jina Reranker v2 REST API integration (jina-reranker-v2-base-multilingual).
 * Reranks retrieved candidate chunks based on deep neural semantic relevance to the query.
 * NO SILENT FALLBACKS: If the API key is missing or the request fails, throws an Error.
 */

import { withRetry } from '@/lib/utils/retry';

export interface RerankItem {
  index: number;
  relevanceScore: number;
}

export async function rerankChunks(
  query: string,
  texts: string[],
  topN: number
): Promise<RerankItem[]> {
  if (!texts || texts.length === 0) return [];

  const apiKey = (process.env.JINA_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error(
      '❌ JINA_API_KEY is missing from environment variables (.env.local). Cannot run neural reranking.'
    );
  }

  const endpoint = 'https://api.jina.ai/v1/rerank';

  const res = await withRetry(
    async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'jina-reranker-v2-base-multilingual',
          query,
          documents: texts,
          top_n: topN,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Jina Reranker HTTP ${response.status}: ${errBody}`);
      }

      return response.json();
    },
    { label: 'Jina Reranker v2' }
  );

  const results = res.results ?? [];
  return results.map((item: any) => ({
    index: item.index,
    relevanceScore: item.relevance_score ?? 0,
  }));
}
