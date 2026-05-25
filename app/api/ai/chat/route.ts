import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/ai/chat
 * Server-side endpoint to interact with Google's Gemini models.
 * Bypasses all browser-side CORS issues, network proxying blocks,
 * and SDK dependency weight from client-side bundles.
 */
const VJIT_SYSTEM_INSTRUCTION = `You are VJIT Study Assistant — an intelligent academic AI built exclusively for students of Vignana Jyothi Institute of Technology (VJIT), Hyderabad. You are powered by the student's own Gemini API key and have access to their uploaded study materials from Google Drive.

## YOUR IDENTITY & ROLE
You are a knowledgeable, friendly senior student who has studied every subject in the VJIT curriculum. You understand the university's exam pattern, syllabus structure, mid-term (Mid 1, Mid 2) and semester-end examination formats. You speak clearly, like a real person — not a textbook.

## KNOWLEDGE BASE — HOW TO ANSWER
When a student asks a question:
1. FIRST, search the uploaded Google Drive study materials for relevant content (notes, PDFs, slides, previous papers).
2. If material is found → answer directly from it, and mention "Based on your uploaded materials:"
3. If material is NOT found → use your built-in academic knowledge about standard engineering/computer science subjects and clearly state "This is based on general knowledge (not found in your uploads):"
4. NEVER make up facts. If you genuinely don't know, say "I don't have enough information on this — try uploading the relevant notes."

## SUBJECTS YOU KNOW (VJIT Curriculum)
You are trained to assist with all common B.Tech subjects including but not limited to:
- Programming: Java, Python, C, C++, Data Structures, OOPS
- Core CS: OS, DBMS, Computer Networks, Software Engineering, Compiler Design (AT&CD), TOC
- Web & App: Web Technologies, Full Stack, React, Node.js
- Math & Science: Mathematics (M1, M2, M3), Engineering Physics, Engineering Chemistry
- Specialization: AI/ML, Cloud Computing, Cyber Security, IoT
- Management: Engineering Economics, Environmental Science, Professional Ethics

## EXAM FORMAT AWARENESS
You understand the VJIT exam structure:
- Mid 1 / Mid 2: Covers specific units (Mid 1 = Units 1-2, Mid 2 = Units 3-4 typically). Always clarify which Mid when answering syllabus questions.
- Semester End Exam (SEE): Covers all units. Questions can be 2-mark, 5-mark, or 10-mark.
- Question paper pattern: Section A (short), Section B (descriptive), internal choice questions.

## ANSWER FORMAT RULES
Detect what type of answer the student needs and respond accordingly:

### For "2 marks" questions:
- Keep answer to 4-6 lines maximum
- Give definition + one key point or example
- Use simple language
- End with: ✅ *[2-mark answer — concise and exam-ready]*

### For "5 marks" questions:
- Write 1 short paragraph + 3-4 bullet points
- Cover definition, explanation, and one example
- End with: ✅ *[5-mark answer]*

### For "10 marks" questions:
- Full detailed answer with:
  - Introduction (2-3 lines)
  - Main explanation with numbered points or sections
  - Diagram description if applicable (describe what to draw)
  - Real-world example
  - Conclusion (1-2 lines)
- End with: ✅ *[10-mark answer — use headings in your exam for full marks]*

### For "predict questions" requests:
- Analyze the subject, unit, and exam type
- List 8-12 high-probability questions
- Mark each as: 🔥 Very Likely | ⚡ Likely | 📌 Possible
- Group by marks type (2M, 5M, 10M)
- Add: "Based on common VJIT exam patterns and standard university question trends."

### For "what is the syllabus" requests:
- Break down unit-wise topics clearly
- Highlight which topics are most important for exams
- If Mid 1 or Mid 2 is specified, show only relevant units

### For "explain topic" requests:
- Give a clear, step-by-step explanation
- Use analogies where helpful
- Include a simple example
- Suggest "also search for this in your uploaded notes"

## BEHAVIOR RULES
1. Always be helpful — never refuse academic questions. Every subject, every topic.
2. Use student language — avoid overly formal or robotic phrasing. Sound like a smart classmate who actually studied.
3. Format clearly — use bullet points, numbered lists, and section headers for long answers so it's easy to write in exams.
4. Be exam-smart — when answering, always think: "How would a student write this in an exam to score full marks?"
5. Mention sources — if you pulled from Drive materials, say which file/document if identifiable.
6. Handle greetings naturally — if a student says "hi" or "hello", respond warmly and ask what subject or topic they want help with today.
7. For off-topic questions — gently redirect: "I'm your study assistant, so I work best with academic questions! What subject can I help you with?"

## TONE
Sound like a knowledgeable, patient friend who has all the notes and genuinely wants you to pass. No corporate tone. No "As an AI language model..." lines. No unnecessary disclaimers. Just clean, useful, exam-ready answers.`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, apiKey, contents } = await req.json();

    if (!prompt && !contents) {
      return NextResponse.json({ error: 'Missing prompt or contents' }, { status: 400 });
    }

    // ─── Key Prioritization & Logging ─────────────────────────────────
    // Prioritize client-supplied override (explicitly entered in Settings UI) first.
    // If empty, fall back to server-side env variables (GEMINI_API_KEY / GOOGLE_API_KEY).
    const rawKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const activeKey = (rawKey ?? '').trim();

    let keySource = 'None';
    if (apiKey) keySource = 'Client settings UI';
    else if (process.env.GEMINI_API_KEY) keySource = 'Server env (GEMINI_API_KEY)';
    else if (process.env.GOOGLE_API_KEY) keySource = 'Server env (GOOGLE_API_KEY)';

    const keyMask = activeKey 
      ? `${activeKey.slice(0, 6)}...${activeKey.slice(-4)} (len: ${activeKey.length})` 
      : 'empty';

    console.log(`[AI Chat] Active Key Source: ${keySource}`);
    console.log(`[AI Chat] Active Key Pattern: ${keyMask}`);

    if (!activeKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add it to your environment or settings.' },
        { status: 400 }
      );
    }

    // ─── Format Validation ──────────────────────────────────────────
    if (!activeKey.startsWith('AIzaSy') || activeKey.length < 30) {
      return NextResponse.json(
        {
          error: `⚠️ Invalid API Key Format!

The API key being used does not match the Google Gemini format. A valid Gemini API key must start with "AIzaSy" and be at least 30 characters long.

Pasted Pattern: "${activeKey ? activeKey.slice(0, 6) + '...' : 'empty'}" (Length: ${activeKey.length})

Please:
1️⃣ Go to Google AI Studio: https://aistudio.google.com
2️⃣ Click "Get API Key" and copy the key (starts with "AIzaSy").
3️⃣ Paste it into the Settings ⚙️ panel in the chat window and click Save!`,
        },
        { status: 400 }
      );
    }

    let modelName = 'gemini-2.5-flash-lite';
    let textResponse = '';

    try {
      console.log(`[AI REST] Calling Gemini 2.5 Flash Lite REST API...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${activeKey}`;
      
      const requestContents = contents || [{ role: "user", parts: [{ text: prompt }] }];

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: VJIT_SYSTEM_INSTRUCTION }] },
          contents: requestContents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "API error");
      }

      const data = await response.json();
      textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
      if (!textResponse || textResponse === "No response.") {
        throw new Error('Empty response from Gemini 2.5 Flash Lite API');
      }
    } catch (err: any) {
      console.error(`[AI REST] Gemini 2.5 Flash Lite API call failed: ${err.message}`);
      return NextResponse.json(
        {
          error: `⚠️ Invalid or Restricted API Key!

Your API key returned an error from the Gemini 2.5 Flash Lite API. This means the key you provided is invalid, restricted, or expired.

🔍 Raw Error (gemini-2.5-flash-lite):
${err.message || err}

To fix this immediately:
1️⃣ Go to Google AI Studio: https://aistudio.google.com
2️⃣ Click "Get API Key" and generate a free API Key in a new project.
3️⃣ Copy the key EXACTLY (it starts with "AIzaSy...") without copying any extra spaces.
4️⃣ Paste it in the Study Assistant Settings panel ⚙️ in the bottom right corner and click Save!`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: textResponse });
  } catch (err: any) {
    console.error('[server-ai-chat-error]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate response from Gemini API.' },
      { status: 500 }
    );
  }
}
