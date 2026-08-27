#!/usr/bin/env node
/**
 * scripts/_test_gemini.ts
 *
 * Diagnostic probe for Gemini embedding models.
 * 1. Calls embedContent for 'text-embedding-004' and 'gemini-embedding-001' with x-goog-api-key header.
 *    Prints status, raw response body, and vector length on success.
 * 2. Fetches models.list and prints every model where supportedGenerationMethods includes 'embedContent'.
 */

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

const apiKey = process.env.GEMINI_API_KEY || '';

async function runDiagnostic() {
  console.log(`\n====================================================================`);
  console.log(`🔍 GEMINI EMBEDDING DIAGNOSTIC PROBE`);
  console.log(`KEY PREFIX: "${apiKey.slice(0, 10)}..." (Length: ${apiKey.length})`);
  console.log(`====================================================================\n`);

  // Part 1: Test embedContent for text-embedding-004 and gemini-embedding-001
  const modelsToTest = ['text-embedding-004', 'gemini-embedding-001'];

  for (const modelName of modelsToTest) {
    console.log(`--- [Part 1] Testing embedContent for model: '${modelName}' ---`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent`;
    const body = JSON.stringify({
      model: `models/${modelName}`,
      content: { parts: [{ text: 'Test embedding query for diagnostic audit' }] },
      outputDimensionality: 768,
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body,
      });

      const rawText = await res.text();
      console.log(`HTTP STATUS: ${res.status} ${res.statusText}`);
      console.log(`RAW BODY:\n${rawText}\n`);

      if (res.ok) {
        try {
          const parsed = JSON.parse(rawText);
          const vector = parsed.embedding?.values || parsed.embeddings?.[0]?.values;
          if (vector && Array.isArray(vector)) {
            console.log(`✅ SUCCESS! Vector Length: ${vector.length}\n`);
          } else {
            console.log(`⚠️ Vector field missing in 200 response.\n`);
          }
        } catch {
          console.log(`⚠️ Could not parse JSON response.\n`);
        }
      }
    } catch (err: any) {
      console.error(`ERROR probing '${modelName}':`, err.message, '\n');
    }
  }

  // Part 2: Fetch models.list and filter models supporting embedContent
  console.log(`--- [Part 2] Models supporting 'embedContent' from models.list ---`);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!res.ok) {
      console.log(`models.list HTTP STATUS: ${res.status} ${res.statusText}`);
      const errText = await res.text();
      console.log(`RAW BODY: ${errText}`);
    } else {
      const data = await res.json();
      const models = data.models || [];
      const embedModels = models.filter((m: any) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('embedContent')
      );

      console.log(`Found ${embedModels.length} model(s) supporting 'embedContent':`);
      embedModels.forEach((m: any) => {
        console.log(`  - Name: "${m.name}" | Display: "${m.displayName || 'N/A'}" | Methods: [${m.supportedGenerationMethods.join(', ')}]`);
      });
      console.log('');
    }
  } catch (err: any) {
    console.error('Error fetching models.list:', err.message);
  }

  console.log(`====================================================================\n`);
}

runDiagnostic();
