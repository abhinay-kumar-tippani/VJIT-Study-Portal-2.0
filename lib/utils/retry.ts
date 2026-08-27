/**
 * lib/utils/retry.ts
 * Production-grade retry utility for Google Gemini API and RAG pipelines.
 */

export interface RetryOptions {
  label?: string;
  maxTransientAttempts?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  onQuota?: (waitSec: number, attempt: number) => void;
  onTransient?: (waitSec: number, attempt: number, err: any) => void;
}

/**
 * Parse Google's RetryInfo.retryDelay or retry message to determine wait time in seconds.
 * Returns 60 seconds if unparseable.
 */
export function parseRetryDelay(err: any): number {
  const details = err?.details || err?.error?.details || [];
  if (Array.isArray(details)) {
    for (const d of details) {
      if (d?.retryDelay) {
        if (typeof d.retryDelay === 'string') {
          const val = parseFloat(d.retryDelay);
          if (!isNaN(val) && val > 0) return Math.ceil(val);
        } else if (typeof d.retryDelay === 'number' && d.retryDelay > 0) {
          return Math.ceil(d.retryDelay);
        } else if (d.retryDelay?.seconds) {
          const val = parseFloat(d.retryDelay.seconds);
          if (!isNaN(val) && val > 0) return Math.ceil(val);
        }
      }
    }
  }

  const msg = err?.message || err?.error?.message || String(err || '');
  const match = msg.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0) return Math.ceil(val);
  }

  return 60;
}

/** Detect HTTP 429 / RESOURCE_EXHAUSTED / Quota Exceeded errors */
export function isQuotaError(err: any): boolean {
  const status = err?.status || err?.code || err?.error?.code || err?.error?.status;
  if (status === 429 || status === 'RESOURCE_EXHAUSTED') return true;

  const msg = (err?.message || err?.error?.message || String(err || '')).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit')
  );
}

/** Detect fatal errors (invalid key, bad request, auth error, permission denied, missing model) */
export function isFatalError(err: any): boolean {
  if (isQuotaError(err)) return false;

  const status = err?.status || err?.code || err?.error?.code || err?.error?.status;
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 'INVALID_ARGUMENT' ||
    status === 'UNAUTHENTICATED' ||
    status === 'PERMISSION_DENIED' ||
    status === 'NOT_FOUND'
  ) {
    return true;
  }

  const msg = (err?.message || err?.error?.message || String(err || '')).toLowerCase();
  return (
    msg.includes('invalid api key') ||
    msg.includes('invalid key format') ||
    msg.includes('unauthenticated') ||
    msg.includes('permission_denied') ||
    msg.includes('not found') ||
    msg.includes('is no longer available') ||
    msg.includes('not supported')
  );
}

/** Detect transient server and network errors */
export function isTransientError(err: any): boolean {
  const status = err?.status || err?.code || err?.error?.code || err?.error?.status;
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 'UNAVAILABLE' ||
    status === 'INTERNAL'
  ) {
    return true;
  }

  const code = (err?.code || err?.cause?.code || '').toString().toUpperCase();
  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE', 'ECONNREFUSED', 'FETCH_ERROR'].includes(code)) {
    return true;
  }

  const msg = (err?.message || err?.error?.message || String(err || '')).toLowerCase();
  return (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed') ||
    msg.includes('network error')
  );
}

/**
 * Execute an async operation with automated retry for quota exhaustion and transient errors.
 * - Quota errors (429): Retries indefinitely with Google RetryInfo or 60s fallback.
 * - Transient errors (500, 502, 503, 504, network): Exponential backoff with jitter up to maxBackoffMs.
 * - Fatal errors (400, 401, 403, 404): Throws immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    label = 'Gemini API',
    maxTransientAttempts = 20,
    initialBackoffMs = 2000,
    maxBackoffMs = 60000,
    onQuota,
    onTransient,
  } = options;

  let transientAttempts = 0;
  let quotaAttempts = 0;

  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      if (isQuotaError(err)) {
        quotaAttempts++;
        const waitSec = parseRetryDelay(err);

        if (onQuota) {
          onQuota(waitSec, quotaAttempts);
        } else {
          console.log(`\n⏳ Gemini quota reached (${label}).`);
          console.log(`   Waiting ${waitSec} seconds...`);
          console.log(`   Retrying...\n`);
        }

        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      if (isFatalError(err)) {
        throw err;
      }

      transientAttempts++;
      if (transientAttempts > maxTransientAttempts) {
        throw err;
      }

      const baseMs = Math.min(initialBackoffMs * Math.pow(2, transientAttempts - 1), maxBackoffMs);
      const jitterMs = Math.floor(Math.random() * 1000);
      const delayMs = Math.min(baseMs + jitterMs, maxBackoffMs);
      const waitSec = Math.ceil(delayMs / 1000);

      if (onTransient) {
        onTransient(waitSec, transientAttempts, err);
      } else {
        console.log(`\n⚠️ Transient error (${label}, attempt ${transientAttempts}): ${err.message || err}`);
        console.log(`   Waiting ${waitSec}s before retrying...\n`);
      }

      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
