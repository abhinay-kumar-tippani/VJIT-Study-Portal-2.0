import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { contents, apiKey: clientApiKey } = await req.json();

    const activeKey = clientApiKey || process.env.GEMINI_API_KEY;

    if (!activeKey || !activeKey.trim()) {
      return NextResponse.json(
        {
          error:
            'No Gemini API key found. Please activate JARVIS by entering your free API key in settings or adding GEMINI_API_KEY to your environment variables.',
        },
        { status: 400 }
      );
    }

    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json(
        { error: 'Invalid message payload' },
        { status: 400 }
      );
    }

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': activeKey.trim(),
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Gemini API Proxy Error]', data);
      const apiMessage = data.error?.message || response.statusText;
      return NextResponse.json(
        { error: `Gemini API Error (${response.status}): ${apiMessage}` },
        { status: response.status }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json(
        { error: 'Gemini returned an empty response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('[JARVIS Chat API Error]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
