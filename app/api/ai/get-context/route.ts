import { NextRequest, NextResponse } from 'next/server';
import { retrieveChunks, RetrievalMode } from '@/lib/rag/retrieve';
import RagQuery from '@/models/RagQuery';
import { connectDB } from '@/lib/db';
import crypto from 'crypto';

let globalFallbackCount = 0;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { query, subject, branch, semester, searchAll } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const defaultMode = (process.env.RAG_MODE as RetrievalMode) || 'vector';
    const effectiveBranch = searchAll ? undefined : branch;
    const effectiveSemester = searchAll ? undefined : semester;

    // Hard 3000ms retrieval timeout: falls back to 'vector' if total retrieval exceeds 3000ms
    let fellBack = false;
    let effectiveMode = defaultMode;

    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 3000)
    );

    const retrievalPromise = retrieveChunks({
      query,
      subject,
      branch: effectiveBranch,
      semester: effectiveSemester,
      mode: effectiveMode,
      fetchDepth: 30,
      limit: 5,
      applyThreshold: true,
    }).then((res) => ({ timeout: false as const, res }));

    const result = await Promise.race([retrievalPromise, timeoutPromise]);

    let finalRes;
    if ('timeout' in result && result.timeout) {
      fellBack = true;
      globalFallbackCount++;
      console.warn(`[get-context] HARD TIMEOUT (3000ms) exceeded for mode '${defaultMode}'. Falling back to 'vector'. (Total Fallbacks: ${globalFallbackCount})`);

      effectiveMode = 'vector';
      finalRes = await retrieveChunks({
        query,
        subject,
        branch: effectiveBranch,
        semester: effectiveSemester,
        mode: 'vector',
        fetchDepth: 30,
        limit: 5,
        applyThreshold: true,
      });
    } else if ('res' in result) {
      finalRes = result.res;
    } else {
      throw new Error('Unexpected retrieval result state');
    }

    const latencyMs = Date.now() - startTime;
    const topScore = finalRes.chunks.length > 0 ? finalRes.chunks[0].score : 0;
    const scores = finalRes.chunks.map((c) => c.score);
    const grounded = finalRes.chunks.length > 0 && topScore >= 0.6;

    let nativeCount = 0;
    let ocrCount = 0;
    for (const c of finalRes.chunks) {
      if (c.source === 'ocr') ocrCount++;
      else nativeCount++;
    }

    // Zero-PII Production Query Logging to rag_queries collection
    let queryLogId = null;
    try {
      await connectDB();
      const sessionId = req.headers.get('x-session-id') || crypto.randomUUID();

      const queryDoc = await RagQuery.create({
        query,
        userBranch: branch || 'ALL',
        semester: semester || null,
        searchAllToggle: Boolean(searchAll),
        mode: effectiveMode,
        chunksReturned: finalRes.chunks.length,
        topScore,
        scores,
        grounded,
        sourceMix: { native: nativeCount, ocr: ocrCount },
        latencyMs,
        fellBack,
        answeredAt: new Date(),
        sessionId,
      });
      queryLogId = String(queryDoc._id);
    } catch (logErr) {
      console.error('[get-context] Failed to log query to rag_queries:', logErr);
    }

    return NextResponse.json({
      chunks: finalRes.chunks,
      grounded,
      mode: effectiveMode,
      fellBack,
      fallbackCount: globalFallbackCount,
      queryLogId,
      latencyMs,
    });
  } catch (err: any) {
    console.error('[get-context error]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
