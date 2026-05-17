// Scan for and fix lines corrupted by the migration script.
// Corruption pattern: a line ends with an unclosed call like:
//   `formatDateTime(s.expiresAt`   <- missing ) and rest of expression
// followed on the next line by the "correct" replacement:
//   `<TableCell>{formatDateTime(s.expiresAt)}</TableCell>`
//
// Fix: remove the corrupted line, keep only the correct one.

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

// Matches a line that has an unclosed formatDate/formatDateTime call
// (i.e., has `formatDate(` or `formatDateTime(` but no closing `)` after it on same line)
// excluding function definitions, arrow functions, etc.
const BROKEN_LINE_RE = /formatDate(?:Time)?\([^)]*$/;

let totalFixed = 0;

for (const file of files) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

  const lines = content.split('\n');
  const newLines = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comment lines, function declarations, arrow functions with multiline bodies
    if (/^\s*\/\/|function\s+\w|=>\s*$/.test(line)) {
      newLines.push(line);
      continue;
    }

    if (BROKEN_LINE_RE.test(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      // Check if next line has a complete version of the same call
      const fnName = line.match(/formatDate(?:Time)?/)[0];
      if (nextLine.includes(fnName + '(') && nextLine.includes(')')) {
        // The current line is corrupt, skip it
        console.log(`Removed corrupt line in ${path.relative(SRC, file)}:${i + 1}: ${line.trim()}`);
        changed = true;
        totalFixed++;
        // Don't push this line; the next iteration will push the correct next line
        continue;
      }
    }

    newLines.push(line);
  }

  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'), 'utf8');
  }
}

console.log(`\nDone: removed ${totalFixed} corrupted lines.`);
