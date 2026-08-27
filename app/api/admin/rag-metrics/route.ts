import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import RagQuery from '@/models/RagQuery';
import RagFeedback from '@/models/RagFeedback';

export const dynamic = 'force-dynamic';

async function getAdminSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const allQueries = await RagQuery.find({}).sort({ answeredAt: -1 }).lean();
    const totalQueries = allQueries.length;

    if (totalQueries === 0) {
      return NextResponse.json({
        totalQueries: 0,
        queriesPerDay: 0,
        groundedRatePct: 100,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        thumbsUpRatePct: 100,
        fallbackCount: 0,
        topUngroundedQueries: [],
        topThumbsDownQueries: [],
        scoreHistogram: { '0-0.2': 0, '0.2-0.4': 0, '0.4-0.6': 0, '0.6-0.8': 0, '0.8-1.0': 0 },
        sourceSplit: { native: 0, ocr: 0 },
      });
    }

    // 1. Queries per day
    const oldestDate = allQueries[allQueries.length - 1].answeredAt;
    const daysDiff = Math.max(1, (Date.now() - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24));
    const queriesPerDay = Number((totalQueries / daysDiff).toFixed(1));

    // 2. Grounded Rate %
    const groundedCount = allQueries.filter((q) => q.grounded).length;
    const groundedRatePct = Number(((groundedCount / totalQueries) * 100).toFixed(1));

    // 3. Avg & P95 Latency
    const latencies = allQueries.map((q) => q.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs = Math.round(latencies.reduce((a, b) => a + b, 0) / totalQueries);
    const p95Idx = Math.floor(totalQueries * 0.95);
    const p95LatencyMs = latencies[p95Idx] || latencies[totalQueries - 1];

    // 4. Fallback Count
    const fallbackCount = allQueries.filter((q) => q.fellBack).length;

    // 5. Native vs OCR Chunk Split
    let totalNativeChunks = 0;
    let totalOcrChunks = 0;
    for (const q of allQueries) {
      totalNativeChunks += q.sourceMix?.native || 0;
      totalOcrChunks += q.sourceMix?.ocr || 0;
    }

    // 6. Score Distribution Histogram
    const histogram = { '0-0.2': 0, '0.2-0.4': 0, '0.4-0.6': 0, '0.6-0.8': 0, '0.8-1.0': 0 };
    for (const q of allQueries) {
      const s = q.topScore;
      if (s <= 0.2) histogram['0-0.2']++;
      else if (s <= 0.4) histogram['0.2-0.4']++;
      else if (s <= 0.6) histogram['0.4-0.6']++;
      else if (s <= 0.8) histogram['0.6-0.8']++;
      else histogram['0.8-1.0']++;
    }

    // 7. Top 20 Ungrounded Queries (Corpus Gaps)
    const ungroundedMap = new Map<string, { query: string; count: number; lastAsked: Date }>();
    for (const q of allQueries) {
      if (!q.grounded) {
        const norm = q.query.toLowerCase().trim();
        if (ungroundedMap.has(norm)) {
          const item = ungroundedMap.get(norm)!;
          item.count++;
        } else {
          ungroundedMap.set(norm, { query: q.query, count: 1, lastAsked: q.answeredAt });
        }
      }
    }
    const topUngroundedQueries = Array.from(ungroundedMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // 8. Feedback Metrics & Top 20 Thumbs-Down Queries
    const allFeedback = await RagFeedback.find({}).populate('queryLogId').sort({ createdAt: -1 }).lean();
    const totalFeedback = allFeedback.length;
    const upCount = allFeedback.filter((f) => f.verdict === 'up').length;
    const thumbsUpRatePct = totalFeedback > 0 ? Number(((upCount / totalFeedback) * 100).toFixed(1)) : 100;

    const downFeedbackList = allFeedback
      .filter((f) => f.verdict === 'down' && f.queryLogId)
      .map((f: any) => ({
        feedbackId: String(f._id),
        query: f.queryLogId?.query || 'Unknown Query',
        userBranch: f.queryLogId?.userBranch || '—',
        topScore: f.queryLogId?.topScore || 0,
        optionalComment: f.optionalComment || '',
        createdAt: f.createdAt,
      }))
      .slice(0, 20);

    return NextResponse.json({
      totalQueries,
      queriesPerDay,
      groundedRatePct,
      avgLatencyMs,
      p95LatencyMs,
      thumbsUpRatePct,
      fallbackCount,
      topUngroundedQueries,
      topThumbsDownQueries: downFeedbackList,
      scoreHistogram: histogram,
      sourceSplit: { native: totalNativeChunks, ocr: totalOcrChunks },
    });
  } catch (err: any) {
    console.error('[rag-metrics error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
