#!/usr/bin/env node
/**
 * scripts/_test_embed.ts
 *
 * Verification script for Jina Embeddings v3.
 * Embeds one short test string and prints status, raw response body snippet, and vector length.
 * Must confirm vector length is EXACTLY 768.
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

async function main() {
  console.log('🧪 VERIFYING JINA EMBEDDINGS V3 (768-dim)...');

  const apiKey = process.env.JINA_API_KEY || '';
  if (!apiKey) {
    console.error('❌ JINA_API_KEY is missing from .env.local');
    process.exit(1);
  }

  console.log(`🔑 JINA_API_KEY present: YES (${apiKey.slice(0, 10)}...)`);

  const url = 'https://api.jina.ai/v1/embeddings';
  const body = JSON.stringify({
    model: 'jina-embeddings-v3',
    task: 'retrieval.passage',
    dimensions: 768,
    input: ['Test Jina embedding for VJIT Study Portal'],
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body,
  });

  const rawText = await res.text();
  console.log(`\n📥 HTTP Status: ${res.status} ${res.statusText}`);
  console.log(`📄 Raw Body Snippet: ${rawText.slice(0, 350)}\n`);

  if (!res.ok) {
    console.error('❌ Jina embedding request failed!');
    process.exit(1);
  }

  const data = JSON.parse(rawText);
  const vector = data.data?.[0]?.embedding;

  if (!vector || !Array.isArray(vector)) {
    console.error('❌ Vector missing in response!');
    process.exit(1);
  }

  console.log(`📊 Returned Vector Length: ${vector.length}`);
  if (vector.length === 768) {
    console.log('✅ PASS: Vector length is EXACTLY 768!');
  } else {
    console.error(`❌ FAIL: Expected 768 dimensions, got ${vector.length}`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
