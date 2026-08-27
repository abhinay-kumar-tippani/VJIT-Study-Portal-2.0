#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

(function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eq = trimmed.indexOf('=');
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        process.env[key] = val;
      }
    }
  }
})();

async function main() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Testing GEMINI_API_KEY:', key ? `${key.slice(0, 10)}...` : 'MISSING');

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });

  const testModels = ['text-embedding-004', 'embedding-001', 'gemini-embedding-001'];

  for (const m of testModels) {
    try {
      const res = await ai.models.embedContent({
        model: m,
        contents: 'Test embedding query',
      });
      console.log(`✅ Model '${m}' SUCCESS! Length: ${res.embedding?.values?.length}`);
      break;
    } catch (err: any) {
      console.error(`❌ Model '${m}' FAILED: ${err.message}`);
    }
  }
}

main();
