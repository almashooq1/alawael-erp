// Fix dateUtils imports that were incorrectly inserted inside multi-line import blocks
// by the migration script.
//
// Problem pattern:
//   import {                          <- opening of existing multi-line import
//   import { formatDate ... } from 'utils/dateUtils';  <- wrongly inserted here
//     foo,
//     bar,
//   } from '...';
//
// Fix: move the dateUtils import to BEFORE the enclosing multi-line import block.

const fs = require('fs');
const path = require('path');

function getAllFiles(dir, exts, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'build', 'coverage', '.git'].includes(entry.name)) continue;
      getAllFiles(full, exts, results);
    } else if (exts.some(e => full.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const SRC = path.join(__dirname, '..', 'frontend', 'src');
const files = getAllFiles(SRC, ['.js', '.jsx', '.ts', '.tsx']);

const DATEUTILS_RE = /^import\s+\{[^}]+\}\s+from\s+'utils\/dateUtils'\s*;?\s*$/;

let fixed = 0;

for (const file of files) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

  const lines = content.split('\n');
  let changed = false;

  // Find all dateUtils import line indices
  for (let i = 0; i < lines.length; i++) {
    if (!DATEUTILS_RE.test(lines[i])) continue;

    // Check if the previous line is just `import {` (opening of a multi-line import)
    if (i > 0 && /^\s*import\s*\{\s*$/.test(lines[i - 1])) {
      // Find the start of the enclosing multi-line import block
      // We need to go backwards to find the `import {` line
      const dateutilsLine = lines[i];

      // Remove the dateUtils import from its current position
      lines.splice(i, 1);

      // Now `i-1` is the `import {` line. We need to insert BEFORE it.
      lines.splice(i - 1, 0, dateutilsLine);

      changed = true;
      console.log(`Fixed (moved before block): ${path.relative(SRC, file)} line ${i + 1}`);
      // Re-check this position (in case there are multiple)
      i = i - 1; // step back to re-examine
    }
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    fixed++;
  }
}

console.log(`\nDone: ${fixed} files fixed.`);
