'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, CheckCircle2, AlertTriangle, Clock, ThumbsUp, ThumbsDown,
  Layers, RefreshCw, Loader2, Search, ArrowLeft, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

interface MetricsData {
  totalQueries: number;
  queriesPerDay: number;
  groundedRatePct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  thumbsUpRatePct: number;
  fallbackCount: number;
  topUngroundedQueries: Array<{ query: string; count: number; lastAsked: string }>;
  topThumbsDownQueries: Array<{
    feedbackId: string;
    query: string;
    userBranch: string;
    topScore: number;
    optionalComment?: string;
    createdAt: string;
  }>;
  scoreHistogram: Record<string, number>;
  sourceSplit: { native: number; ocr: number };
}

export default function AdminRagDashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/rag-metrics');
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Admin access required');
        throw new Error('Failed to load metrics');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-primary">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <p className="text-sm text-secondary">Loading RAG Observability Metrics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-400 mb-3" />
        <h1 className="text-lg font-bold text-primary mb-1">Access Restricted</h1>
        <p className="text-sm text-muted-custom mb-4">{error}</p>
        <Link href="/admin" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
          Return to Admin Panel
        </Link>
      </div>
    );
  }

  const totalSourceChunks = (data.sourceSplit.native || 0) + (data.sourceSplit.ocr || 0);
  const nativePct = totalSourceChunks > 0 ? ((data.sourceSplit.native / totalSourceChunks) * 100).toFixed(1) : '100.0';
  const ocrPct = totalSourceChunks > 0 ? ((data.sourceSplit.ocr / totalSourceChunks) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" /> RAG Observability Dashboard
            </h1>
            <p className="text-xs text-zinc-400">Live production query metrics, grounding accuracy, and user feedback</p>
          </div>
        </div>

        <button
          onClick={fetchMetrics}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Metrics
        </button>
      </div>

      {/* Top Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Queries / Day</span>
          <p className="text-xl font-bold text-white">{data.queriesPerDay}</p>
          <span className="text-[10px] text-zinc-500">Total Volume: {data.totalQueries}</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Grounded Rate</span>
          <p className="text-xl font-bold text-emerald-400">{data.groundedRatePct}%</p>
          <span className="text-[10px] text-zinc-500">Score &gt;= 0.6 threshold</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Avg Latency</span>
          <p className="text-xl font-bold text-indigo-400">{data.avgLatencyMs} ms</p>
          <span className="text-[10px] text-zinc-500">End-to-end pipeline</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">P95 Latency</span>
          <p className="text-xl font-bold text-indigo-300">{data.p95LatencyMs} ms</p>
          <span className="text-[10px] text-zinc-500">95th percentile</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">Thumbs Up Rate</span>
          <p className="text-xl font-bold text-emerald-400">{data.thumbsUpRatePct}%</p>
          <span className="text-[10px] text-zinc-500">User verdict ratio</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <span className="text-[11px] text-zinc-400 font-medium">3s Timeout Fallbacks</span>
          <p className={`text-xl font-bold ${data.fallbackCount > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
            {data.fallbackCount}
          </p>
          <span className="text-[10px] text-zinc-500">Fell back to vector</span>
        </div>
      </div>

      {/* Middle Row: Score Histogram & Native vs OCR Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Distribution Histogram */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" /> Retrieval Score Distribution Histogram
          </h2>
          <div className="space-y-3 text-xs">
            {Object.entries(data.scoreHistogram).map(([range, count]) => {
              const maxVal = Math.max(1, ...Object.values(data.scoreHistogram));
              const barWidth = Math.round((count / maxVal) * 100);
              return (
                <div key={range} className="space-y-1">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Score Range: {range}</span>
                    <span className="font-mono">{count} queries</span>
                  </div>
                  <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Native vs OCR Usage Split */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Native vs OCR Chunk Usage Split
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Breakdown of retrieved chunks served to users during production RAG generation.
            </p>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">Native Extracted</span>
                <p className="text-2xl font-bold text-indigo-400 mt-1">{data.sourceSplit.native}</p>
                <span className="text-xs text-zinc-500">{nativePct}% of total</span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">OCR Transcribed</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{data.sourceSplit.ocr}</p>
                <span className="text-xs text-zinc-500">{ocrPct}% of total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tables: Ungrounded Queries & Thumbs-Down Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 20 Ungrounded Queries */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Top 20 Ungrounded Queries (Corpus Gaps)
            </h2>
            <span className="text-xs text-zinc-500">{data.topUngroundedQueries.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[11px] text-zinc-500 uppercase border-b border-zinc-800 bg-zinc-950/40">
                <tr>
                  <th className="py-2 px-3">Query</th>
                  <th className="py-2 px-3 text-right">Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data.topUngroundedQueries.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-zinc-500">
                      No ungrounded queries recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.topUngroundedQueries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/80">
                      <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">{item.query}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">{item.count}x</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 20 Thumbs-Down Queries */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ThumbsDown className="w-4 h-4 text-rose-400" /> Top 20 Thumbs-Down Queries
            </h2>
            <span className="text-xs text-zinc-500">{data.topThumbsDownQueries.length} items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[11px] text-zinc-500 uppercase border-b border-zinc-800 bg-zinc-950/40">
                <tr>
                  <th className="py-2 px-3">Query</th>
                  <th className="py-2 px-3">Branch</th>
                  <th className="py-2 px-3 text-right">Top Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data.topThumbsDownQueries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-zinc-500">
                      No thumbs-down feedback recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.topThumbsDownQueries.map((item) => (
                    <tr key={item.feedbackId} className="hover:bg-zinc-900/80">
                      <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">{item.query}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{item.userBranch}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400">{item.topScore.toFixed(3)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
