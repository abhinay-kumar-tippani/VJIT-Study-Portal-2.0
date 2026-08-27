/**
 * lib/rag/rateLimiter.ts
 *
 * Sliding 60-second token-bucket & request-count rate limiter for Gemini APIs.
 * Proactively paces embed calls (TPM) and vision calls (RPM) to prevent HTTP 429 errors.
 */

const getEnvInt = (key: string, defaultVal: number): number => {
  const val = process.env[key];
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
};

export const EMBED_TPM_BUDGET = getEnvInt('EMBED_TPM_BUDGET', 25000);
export const EMBED_BATCH_SIZE = getEnvInt('EMBED_BATCH_SIZE', 20);
export const VISION_RPM_BUDGET = getEnvInt('EMBED_RPM_BUDGET', 10);

interface TokenEntry {
  timestamp: number;
  tokens: number;
}

interface RequestEntry {
  timestamp: number;
  requests: number;
}

const windowHistory: TokenEntry[] = [];
const requestHistory: RequestEntry[] = [];

/**
 * Removes entries older than 60 seconds from the sliding window.
 */
function cleanWindow() {
  const cutoff = Date.now() - 60000;
  while (windowHistory.length > 0 && windowHistory[0].timestamp < cutoff) {
    windowHistory.shift();
  }
  while (requestHistory.length > 0 && requestHistory[0].timestamp < cutoff) {
    requestHistory.shift();
  }
}

/**
 * Returns total tokens consumed within the rolling 60-second window.
 */
export function getRunningTokensThisMinute(): number {
  cleanWindow();
  return windowHistory.reduce((sum, entry) => sum + entry.tokens, 0);
}

/**
 * Returns total requests made within the rolling 60-second window.
 */
export function getRunningRequestsThisMinute(): number {
  cleanWindow();
  return requestHistory.reduce((sum, entry) => sum + entry.requests, 0);
}

/**
 * Estimates token count for a text string (~4 characters per token).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimates token count for an array of text chunks.
 */
export function estimateBatchTokens(texts: string[]): number {
  return texts.reduce((sum, text) => sum + estimateTokens(text), 0);
}

/**
 * Proactively paces embed calls. If adding estimatedTokens exceeds EMBED_TPM_BUDGET,
 * sleeps until the 60-second window clears enough token capacity.
 */
export async function acquireTokenBudget(estimatedTokens: number): Promise<void> {
  const budget = getEnvInt('EMBED_TPM_BUDGET', 25000);

  while (true) {
    cleanWindow();
    const currentUsage = getRunningTokensThisMinute();

    if (currentUsage + estimatedTokens <= budget) {
      windowHistory.push({
        timestamp: Date.now(),
        tokens: estimatedTokens,
      });
      return;
    }

    // Window full — calculate sleep time until the oldest entry expires
    const oldestTimestamp = windowHistory[0]?.timestamp ?? Date.now();
    const waitMs = Math.max(1000, 60000 - (Date.now() - oldestTimestamp) + 500);

    console.log(
      `       ⏳ Rate Limiter: Window tokens (${currentUsage.toLocaleString()} + ${estimatedTokens.toLocaleString()}) exceed budget (${budget.toLocaleString()} TPM). Sleeping ${(waitMs / 1000).toFixed(1)}s…`
    );

    await new Promise((r) => setTimeout(r, waitMs));
  }
}

/**
 * Proactively paces RPM-limited calls (e.g. Gemini Vision transcription).
 * If adding requestCount exceeds VISION_RPM_BUDGET (default 10), sleeps until capacity is available.
 */
export async function acquireRpmBudget(requestCount: number = 1): Promise<void> {
  const budget = getEnvInt('EMBED_RPM_BUDGET', 10);

  while (true) {
    cleanWindow();
    const currentRequests = getRunningRequestsThisMinute();

    if (currentRequests + requestCount <= budget) {
      requestHistory.push({
        timestamp: Date.now(),
        requests: requestCount,
      });
      return;
    }

    // RPM Window full — sleep until oldest request expires
    const oldestTimestamp = requestHistory[0]?.timestamp ?? Date.now();
    const waitMs = Math.max(1000, 60000 - (Date.now() - oldestTimestamp) + 500);

    console.log(
      `       ⏳ RPM Rate Limiter: Requests this minute (${currentRequests}/${budget} RPM). Sleeping ${(waitMs / 1000).toFixed(1)}s for budget clearance…`
    );

    await new Promise((r) => setTimeout(r, waitMs));
  }
}
