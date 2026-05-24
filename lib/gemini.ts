import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Creates a Gemini client from a user-supplied API key (stored in localStorage).
 * Only used client-side.
 */
export function createGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}
