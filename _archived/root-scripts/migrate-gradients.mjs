/**
 * R42 Migration Script — Gradient strings → palette constants.
 *
 * Replaces hardcoded 'linear-gradient(135deg, …)' strings with
 * imports from 'theme/palette'.
 *
 * Usage:  node migrate-gradients.mjs
 * (run from the project root — same level as package.json)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC = path.join(__dirname, 'frontend', 'src');

/* ─── gradient map: literal string → palette key ─── */
const GRADIENT_MAP = [
  // Top 4 brand gradients (138 total occurrences)
  [`'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'`, 'gradients.primary'],
  [`'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'`, 'gradients.warning'],
  [`'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'`, 'gradients.info'],
  [`'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'`, 'gradients.success'],
  // Smaller gradients
  [`'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'`, 'gradients.accent'],
  [`'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)'`, 'gradients.ocean'],
  [`'linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)'`, 'gradients.orange'],
  [`'linear-gradient(135deg, #f5af19 0%, #f12711 100%)'`, 'gradients.fire'],
  [`'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)'`, 'gradients.greenStatus'],
  [`'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'`, 'gradients.orangeStatus'],
  [`'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)'`, 'gradients.redStatus'],
  [`'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'`, 'gradients.subtle'],
];

/* ─── helpers ─── */
function getAllFiles(dir, exts = ['.js', '.jsx']) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_archive' || entry.name === 'node_modules') continue;
      results = results.concat(getAllFiles(full, exts));
    } else if (exts.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Derive the correct import path for 'theme/palette' given a file's location.
 * Files under src/ can use absolute imports (jsconfig baseUrl = "src").
 */
function getImportLine() {
  return `import { gradients } from 'theme/palette';`;
}

/* ─── main ─── */
const files = getAllFiles(SRC);
let totalReplacements = 0;
let totalFiles = 0;
const report = [];

for (const filePath of files) {
  // Skip palette.js itself and educationTheme.js (already migrated)
  const rel = path.relative(SRC, filePath).replace(/\\/g, '/');
  if (rel === 'theme/palette.js' || rel === 'theme/educationTheme.js') continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let replacements = 0;

  for (const [literal, replacement] of GRADIENT_MAP) {
    let count = 0;
    while (content.includes(literal)) {
      content = content.replace(literal, replacement);
      count++;
    }
    replacements += count;
  }

  if (replacements > 0) {
    // Add import if not already present
    const importLine = getImportLine();
    if (!content.includes(importLine) && !content.includes("from 'theme/palette'")) {
      // Insert after last existing import (find last "import … from …;" line)
      const lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*import\s/.test(lines[i])) {
          // Walk forward to find the end of a multi-line import
          let j = i;
          while (j < lines.length && !lines[j].includes(';')) j++;
          lastImportIdx = j;
        }
      }
      if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, importLine);
      } else {
        // No imports? Prepend.
        lines.unshift(importLine);
      }
      content = lines.join('\n');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    totalReplacements += replacements;
    totalFiles++;
    report.push(`  ✅ ${rel}: ${replacements} replacement(s)`);
  }
}

console.log(`\n━━━ Gradient Migration Report ━━━`);
console.log(`Files modified: ${totalFiles}`);
console.log(`Replacements:   ${totalReplacements}`);
console.log(`\nDetails:`);
report.forEach(r => console.log(r));
console.log(`\nDone.\n`);
