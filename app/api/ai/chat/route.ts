import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/ai/chat
 * Server-side endpoint to interact with Google's Gemini models.
 * Bypasses all browser-side CORS issues, network proxying blocks,
 * and SDK dependency weight from client-side bundles.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, apiKey } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // ─── Key Prioritization ──────────────────────────────────────────
    // Prioritize client-supplied override (explicitly entered in Settings UI) first.
    // If empty, fall back to server-side env variables (GEMINI_API_KEY / GOOGLE_API_KEY).
    const rawKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const activeKey = (rawKey ?? '').trim();

    if (!activeKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add it to your environment or settings.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(activeKey);
    
    let modelName = 'gemini-1.5-flash';
    let result;

    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent(prompt);
    } catch (firstErr: any) {
      const errMsg = String(firstErr.message || '').toLowerCase();
      // Catch model 404 or unsupported method errors
      if (
        errMsg.includes('not found') || 
        errMsg.includes('unsupported') || 
        errMsg.includes('404') ||
        errMsg.includes('model')
      ) {
        try {
          console.warn(`[AI Proxy] Model ${modelName} returned 404/unsupported. Falling back to gemini-pro...`);
          modelName = 'gemini-pro';
          const fallbackModel = genAI.getGenerativeModel({ model: modelName });
          result = await fallbackModel.generateContent(prompt);
        } catch (secondErr: any) {
          const secondMsg = String(secondErr.message || '').toLowerCase();
          if (
            secondMsg.includes('not found') || 
            secondMsg.includes('unsupported') || 
            secondMsg.includes('404') ||
            secondMsg.includes('api key')
          ) {
            return NextResponse.json(
              {
                error: `⚠️ Invalid or Restricted API Key!

Your API key returned a 404 error for both Gemini models. This means the key you provided is invalid, restricted, or expired.

To fix this immediately:
1️⃣ Go to Google AI Studio: https://aistudio.google.com
2️⃣ Click "Get API Key" and generate a free API Key in a new project.
3️⃣ Copy the key EXACTLY (it starts with "AIzaSy...") without copying any extra spaces.
4️⃣ Paste it in the Study Assistant Settings panel ⚙️ in the bottom right corner and click Save!`,
              },
              { status: 400 }
            );
          }
          throw secondErr;
        }
      } else {
        throw firstErr;
      }
    }

    const response = await result.response;
    const responseText = response.text();

    return NextResponse.json({ text: responseText });
  } catch (err: any) {
    console.error('[server-ai-chat-error]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate response from Gemini API.' },
      { status: 500 }
    );
  }
}
