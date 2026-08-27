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

async function testJinaReranker() {
  const apiKey = (process.env.JINA_API_KEY || '').trim();
  console.log(`🔑 JINA_API_KEY present: ${apiKey ? 'YES (' + apiKey.substring(0, 6) + '...)' : 'NO'}`);

  const endpoint = 'https://api.jina.ai/v1/rerank';
  const query = 'What is object-oriented programming in Java?';
  const documents = [
    'The Java virtual machine executes bytecode on target systems.',
    'Object-oriented programming (OOP) is a paradigm based on concepts like classes, objects, inheritance, encapsulation, and polymorphism.',
    'Database management systems handle structured storage using relational schemas and SQL queries.',
    'Java classes can instantiate multiple objects that hold state and behavior through methods.',
    'Artificial Intelligence includes search algorithms, logic rules, and machine learning models.',
  ];

  console.log('\n📤 Sending request to Jina Reranker v2 API...');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Query: "${query}"`);
  console.log(`Documents count: ${documents.length}`);

  const payload = {
    model: 'jina-reranker-v2-base-multilingual',
    query,
    documents,
    top_n: 5,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const startTime = Date.now();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const durationMs = Date.now() - startTime;
  console.log(`\n📥 Raw Response Status: ${res.status} ${res.statusText} (${durationMs}ms)`);

  const rawText = await res.text();
  console.log('\n📄 Raw Response Body:');
  console.log(rawText);

  if (res.ok) {
    const data = JSON.parse(rawText);
    console.log('\n📊 Parsed Returned Score Order:');
    (data.results || []).forEach((item: any, rank: number) => {
      console.log(
        `  Rank #${rank + 1}: Document index [${item.index}] (Score: ${item.relevance_score.toFixed(4)}) -> "${documents[item.index]}"`
      );
    });
  } else {
    console.error(`❌ Request failed with HTTP ${res.status}`);
  }
}

testJinaReranker().catch((err) => {
  console.error('❌ Error during Jina rerank test:', err);
  process.exit(1);
});
