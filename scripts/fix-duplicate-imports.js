// Fix duplicate `import { ... } from 'utils/dateUtils'` lines across frontend/src
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC = path.join(__dirname, '..', 'frontend', 'src');

const files = glob.sync('**/*.{js,jsx,ts,tsx}', { cwd: SRC, absolute: true });

let fixed = 0;

for (const file of files) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

  // Find all import lines for utils/dateUtils
  const importRegex = /^import\s+\{([^}]+)\}\s+from\s+['"]utils\/dateUtils['"]\s*;?\s*$/gm;
  const matches = [...content.matchAll(importRegex)];

  if (matches.length < 2) continue; // nothing to fix

  // Collect all unique named imports (preserving aliases)
  const allNames = new Set();
  for (const m of matches) {
    m[1].split(',').forEach(n => {
      const trimmed = n.trim();
      if (trimmed) allNames.add(trimmed);
    });
  }

  // Build merged import line
  const merged = `import { ${[...allNames].join(', ')} } from 'utils/dateUtils';`;

  // Remove all existing dateUtils import lines, insert merged at position of first one
  let firstIndex = null;
  let result = content;

  // Replace all occurrences: keep first slot, remove rest
  const lines = result.split('\n');
  let newLines = [];
  let inserted = false;

  for (const line of lines) {
    if (/^import\s+\{[^}]+\}\s+from\s+['"]utils\/dateUtils['"]/.test(line)) {
      if (!inserted) {
        newLines.push(merged);
        inserted = true;
      }
      // else skip (duplicate)
    } else {
      newLines.push(line);
    }
  }

  const newContent = newLines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed:', path.relative(SRC, file));
    fixed++;
  }
}

console.log(`\nDone: ${fixed} files fixed.`);
