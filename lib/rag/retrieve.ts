import Chunk from '@/models/Chunk';
import { embedQuery } from './embeddings';
import { rerankChunks } from './rerank';

export type RetrievalMode = 'vector' | 'bm25' | 'hybrid' | 'hybrid-rerank';

export interface RetrievalOptions {
  query: string;
  branch?: string;
  semester?: number;
  subject?: string;
  mode?: RetrievalMode;      // Default 'vector'
  fetchDepth?: number;        // Default 30 (candidate retrieval depth before fusion/reranking)
  limit?: number;             // Default 5 (final output count)
  scoreThreshold?: number;    // Default 0.6
  applyThreshold?: boolean;   // Default true (set false for evaluation metrics)
}

export interface RetrievalChunk {
  chunkId: string;
  driveFileId: string;
  fileName: string;
  webViewLink: string;
  subject: string;
  resourceType: string;
  pageNumber?: number | null;
  text: string;
  source: 'native' | 'ocr';
  score: number;
  rrfScore?: number;
  rerankScore?: number;
}

export interface RetrievalTiming {
  vectorMs: number;
  bm25Ms: number;
  fuseMs: number;
  rerankMs: number;
  totalMs: number;
}

export interface RetrievalResult {
  chunks: RetrievalChunk[];
  candidatesBeforeRerank?: RetrievalChunk[]; // Top candidates at fetchDepth before reranking (for recall@30)
  grounded: boolean;
  timings: RetrievalTiming;
}

const RRF_K = 60;

/**
 * Perform pure vector search via MongoDB Atlas $vectorSearch on `chunk_vector_index`.
 */
async function runVectorSearch(
  query: string,
  preFilter: Record<string, unknown>,
  fetchDepth: number
): Promise<{ chunks: RetrievalChunk[]; durationMs: number }> {
  const start = Date.now();
  const queryVector = await embedQuery(query);

  const rawResults = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: 'chunk_vector_index',
        path: 'embedding',
        queryVector,
        numCandidates: fetchDepth * 3,
        limit: fetchDepth,
        filter: Object.keys(preFilter).length > 0 ? preFilter : undefined,
      },
    },
    {
      $project: {
        chunkId: '$_id',
        driveFileId: 1,
        fileName: 1,
        webViewLink: 1,
        subject: 1,
        resourceType: 1,
        pageNumber: 1,
        text: 1,
        source: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);

  const chunks: RetrievalChunk[] = (rawResults ?? []).map((c: any) => ({
    chunkId: String(c.chunkId),
    driveFileId: c.driveFileId,
    fileName: c.fileName,
    webViewLink: c.webViewLink,
    subject: c.subject,
    resourceType: c.resourceType,
    pageNumber: c.pageNumber,
    text: c.text,
    source: c.source ?? 'native',
    score: c.score ?? 0,
  }));

  return { chunks, durationMs: Date.now() - start };
}

/**
 * Perform BM25 keyword search via MongoDB Atlas $search on `chunk_text_index`.
 */
async function runBM25Search(
  query: string,
  branch?: string,
  semester?: number,
  subject?: string,
  fetchDepth = 30
): Promise<{ chunks: RetrievalChunk[]; durationMs: number }> {
  const start = Date.now();

  const filterClauses: any[] = [];
  if (branch) {
    filterClauses.push({ text: { query: branch, path: 'branches' } });
  }
  if (semester) {
    filterClauses.push({ equals: { value: Number(semester), path: 'semester' } });
  }
  if (subject) {
    filterClauses.push({ text: { query: subject, path: 'subject' } });
  }

  const searchStage: any = {
    $search: {
      index: 'chunk_text_index',
      compound: {
        must: [
          {
            text: {
              query,
              path: 'text',
            },
          },
        ],
        ...(filterClauses.length > 0 ? { filter: filterClauses } : {}),
      },
    },
  };

  try {
    const rawResults = await Chunk.aggregate([
      searchStage,
      { $limit: fetchDepth },
      {
        $project: {
          chunkId: '$_id',
          driveFileId: 1,
          fileName: 1,
          webViewLink: 1,
          subject: 1,
          resourceType: 1,
          pageNumber: 1,
          text: 1,
          source: 1,
          score: { $meta: 'searchScore' },
        },
      },
    ]);

    const chunks: RetrievalChunk[] = (rawResults ?? []).map((c: any) => ({
      chunkId: String(c.chunkId),
      driveFileId: c.driveFileId,
      fileName: c.fileName,
      webViewLink: c.webViewLink,
      subject: c.subject,
      resourceType: c.resourceType,
      pageNumber: c.pageNumber,
      text: c.text,
      source: c.source ?? 'native',
      score: c.score ?? 0,
    }));

    return { chunks, durationMs: Date.now() - start };
  } catch (err: any) {
    console.warn(`[runBM25Search] Atlas search error (check if chunk_text_index exists): ${err.message}`);
    return { chunks: [], durationMs: Date.now() - start };
  }
}

/**
 * Perform manual Reciprocal Rank Fusion (RRF) over vector and BM25 candidate lists.
 * RRF Score(doc) = 1/(60 + rank_vector) + 1/(60 + rank_bm25)
 */
function runReciprocalRankFusion(
  vectorChunks: RetrievalChunk[],
  bm25Chunks: RetrievalChunk[],
  fetchDepth: number
): RetrievalChunk[] {
  const scoreMap = new Map<string, { chunk: RetrievalChunk; rrfScore: number }>();

  vectorChunks.forEach((c, idx) => {
    const rank = idx + 1;
    const rrfContrib = 1 / (RRF_K + rank);
    scoreMap.set(c.chunkId, {
      chunk: c,
      rrfScore: rrfContrib,
    });
  });

  bm25Chunks.forEach((c, idx) => {
    const rank = idx + 1;
    const rrfContrib = 1 / (RRF_K + rank);
    if (scoreMap.has(c.chunkId)) {
      const existing = scoreMap.get(c.chunkId)!;
      existing.rrfScore += rrfContrib;
    } else {
      scoreMap.set(c.chunkId, {
        chunk: c,
        rrfScore: rrfContrib,
      });
    }
  });

  const fused = Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, fetchDepth)
    .map((item) => ({
      ...item.chunk,
      rrfScore: item.rrfScore,
      score: item.rrfScore,
    }));

  return fused;
}

/**
 * Primary multi-mode retrieval function.
 */
export async function retrieveChunks(options: RetrievalOptions): Promise<RetrievalResult> {
  const {
    query,
    branch,
    semester,
    subject,
    mode = 'vector',
    fetchDepth = 30,
    limit = 5,
    scoreThreshold = 0.6,
    applyThreshold = true,
  } = options;

  const preFilter: Record<string, unknown> = {};
  if (branch) preFilter.branches = branch;
  if (semester) preFilter.semester = Number(semester);
  if (subject) preFilter.subject = subject;

  let vectorChunks: RetrievalChunk[] = [];
  let bm25Chunks: RetrievalChunk[] = [];
  let vectorMs = 0;
  let bm25Ms = 0;
  let fuseMs = 0;
  let rerankMs = 0;

  let candidateChunks: RetrievalChunk[] = [];

  if (mode === 'vector') {
    const vRes = await runVectorSearch(query, preFilter, fetchDepth);
    vectorChunks = vRes.chunks;
    vectorMs = vRes.durationMs;
    candidateChunks = vectorChunks;
  } else if (mode === 'bm25') {
    const bRes = await runBM25Search(query, branch, semester, subject, fetchDepth);
    bm25Chunks = bRes.chunks;
    bm25Ms = bRes.durationMs;
    candidateChunks = bm25Chunks;
  } else if (mode === 'hybrid' || mode === 'hybrid-rerank') {
    const [vRes, bRes] = await Promise.all([
      runVectorSearch(query, preFilter, fetchDepth),
      runBM25Search(query, branch, semester, subject, fetchDepth),
    ]);
    vectorChunks = vRes.chunks;
    bm25Chunks = bRes.chunks;
    vectorMs = vRes.durationMs;
    bm25Ms = bRes.durationMs;

    const fuseStart = Date.now();
    candidateChunks = runReciprocalRankFusion(vectorChunks, bm25Chunks, fetchDepth);
    fuseMs = Date.now() - fuseStart;
  }

  const candidatesBeforeRerank = [...candidateChunks];
  let finalChunks: RetrievalChunk[] = candidateChunks;

  // Mode 4: Neural Reranking via Jina Reranker v2 REST API
  if (mode === 'hybrid-rerank' && candidateChunks.length > 0) {
    const rerankStart = Date.now();
    const textsToRerank = candidateChunks.map((c) => c.text);
    const rerankItems = await rerankChunks(query, textsToRerank, limit);
    rerankMs = Date.now() - rerankStart;

    if (rerankItems.length > 0) {
      finalChunks = rerankItems.map((item) => {
        const orig = candidateChunks[item.index];
        return {
          ...orig,
          rerankScore: item.relevanceScore,
          score: item.relevanceScore,
        };
      });
    }
  }

  // Slice top limit
  finalChunks = finalChunks.slice(0, limit);

  // Score threshold filtering (only if applyThreshold is true)
  if (applyThreshold && mode === 'vector') {
    finalChunks = finalChunks.filter((c) => c.score >= scoreThreshold);
  }

  const grounded = finalChunks.length > 0;
  const totalMs = vectorMs + bm25Ms + fuseMs + rerankMs;

  return {
    chunks: finalChunks,
    candidatesBeforeRerank,
    grounded,
    timings: {
      vectorMs,
      bm25Ms,
      fuseMs,
      rerankMs,
      totalMs,
    },
  };
}
