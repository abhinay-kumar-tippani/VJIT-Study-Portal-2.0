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

    // Prioritize environment variable first (pasted by developer in .env.local),
    // then fallback to client-supplied override (entered in settings UI)
    const activeKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || apiKey;

    if (!activeKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add it to your environment or settings.' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(activeKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
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
