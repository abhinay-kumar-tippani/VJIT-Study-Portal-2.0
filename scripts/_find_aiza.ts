#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('AIza')) {
        console.log(`FOUND 'AIza' in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('AIza')) {
            console.log(`  Line ${idx + 1}: ${l.trim()}`);
          }
        });
      }
    }
  }
}

scanDir(process.cwd());
