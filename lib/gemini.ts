import { GoogleGenAI } from '@google/genai';

/**
 * Creates a Gemini client from a user-supplied API key (stored in localStorage).
 * Only used client-side or in server utilities.
 */
export function createGeminiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}
