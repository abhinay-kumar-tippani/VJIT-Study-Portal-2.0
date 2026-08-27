import fs from 'fs';
import path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

async function inspectCitations() {
  const { connectDB } = await import('../lib/db');
  await connectDB();

  const { retrieveChunks } = await import('../lib/rag/retrieve');
  const { GoogleGenAI } = await import('@google/genai');
  const { VJIT_SYSTEM_INSTRUCTION, buildRAGPrompt } = await import('../lib/rag/prompt');

  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY missing');
    process.exit(1);
  }

  const frozenPath = path.resolve(process.cwd(), 'eval', 'questions.frozen.json');
  const questions = JSON.parse(fs.readFileSync(frozenPath, 'utf-8'));

  const ai = new GoogleGenAI({ apiKey });

  // Sample 3 questions
  const sampleIndices = [0, 1, 2];

  console.log('===================================================================');
  console.log('🔍 INSPECTING CITATION DETECTION LOGIC ON 3 SAMPLE EVAL QUESTIONS');
  console.log('===================================================================\n');

  for (const idx of sampleIndices) {
    const q = questions[idx];
    console.log(`\n─────────────────────────────────────────────────────────────────`);
    console.log(`❓ QUESTION [${idx + 1}]: "${q.question}"`);
    console.log(`📁 Expected File Name: "${q.expectedFileName}"`);
    console.log(`📌 Subject: ${q.subject}`);

    const retRes = await retrieveChunks({
      query: q.question,
      subject: q.subject,
      mode: 'vector',
      limit: 5,
      applyThreshold: false,
    });

    const promptText = buildRAGPrompt(retRes.chunks, q.question);
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: promptText,
      config: {
        systemInstruction: VJIT_SYSTEM_INSTRUCTION,
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    });

    const rawAnswer = res.text ?? '';
    const lowerAnswer = rawAnswer.toLowerCase();
    const lowerExpectedFile = q.expectedFileName.toLowerCase();
    const lowerExpectedBase = lowerExpectedFile.replace(/\.[^/.]+$/, '');

    const matchExactFile = lowerAnswer.includes(lowerExpectedFile);
    const matchBaseFile = lowerAnswer.includes(lowerExpectedBase);
    const matchPageWord = lowerAnswer.includes('page');
    const matchBasedOnWord = lowerAnswer.includes('based on');

    const isCitedOldLogic = matchExactFile || matchBaseFile || matchPageWord || matchBasedOnWord;
    const isCitedStrictLogic = matchExactFile || matchBaseFile;

    console.log('\n📝 RAW MODEL ANSWER:');
    console.log('-----------------------------------------------------------------');
    console.log(rawAnswer);
    console.log('-----------------------------------------------------------------');

    console.log('\n🔍 CITATION MATCHING BREAKDOWN:');
    console.log(`  1. Includes Exact File Name ("${q.expectedFileName}"): ${matchExactFile ? '✅ YES' : '❌ NO'}`);
    console.log(`  2. Includes Base File Name ("${lowerExpectedBase}"): ${matchBaseFile ? '✅ YES' : '❌ NO'}`);
    console.log(`  3. Includes generic word "page": ${matchPageWord ? '⚠️ YES' : '❌ NO'}`);
    console.log(`  4. Includes generic phrase "based on": ${matchBasedOnWord ? '⚠️ YES' : '❌ NO'}`);
    console.log(`  ---------------------------------------------------------------`);
    console.log(`  RESULT (Old Logic): ${isCitedOldLogic ? '✅ CITED (TRUE)' : '❌ NOT CITED'}`);
    console.log(`  RESULT (Strict File Logic): ${isCitedStrictLogic ? '✅ CITED (TRUE)' : '❌ NOT CITED'}`);
  }
}

inspectCitations().catch((err) => {
  console.error('Error during citation inspection:', err);
  process.exit(1);
});
