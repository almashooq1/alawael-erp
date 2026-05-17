// Fix lines where the migration script left a truncated formatDate/formatDateTime call
// immediately followed by the correct complete call on the next line.
//
// Pattern A (JSX):
//   <TableCell>{formatDateTime(s.expiresAt        <- truncated, no ) or >
//   <TableCell>{formatDateTime(s.expiresAt)}</TableCell>    <- correct
//
// Pattern B (string):
//   تformatDateTime(activated.expiresAt           <- Arabic char prefix + truncated
//   {formatDateTime(activated.expiresAt)}         <- correct

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

// A line is "truncated" if it contains formatDate/formatDateTime( but has no
// matching ) for it on the same line.
function isTruncatedCall(line) {
  const match = line.match(/formatDate(?:Time)?\(/g);
  if (!match) return false;
  // Count unmatched open parens for the last occurrence
  const idx = line.lastIndexOf('formatDate');
  const after = line.slice(idx);
  let depth = 0;
  for (const ch of after) {
    if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth === 0) return false; }
  }
  return depth > 0;
}

let totalFixed = 0;

for (const file of files) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }

  const lines = content.split('\n');
  const newLines = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isTruncatedCall(line) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      // Next line should have the complete version of the same call
      const fnMatch = line.match(/formatDate(?:Time)?/);
      if (fnMatch && nextLine.includes(fnMatch[0] + '(')) {
        console.log(`  Removed: ${path.relative(SRC, file)}:${i + 1}: ${line.trimEnd()}`);
        changed = true;
        totalFixed++;
        continue; // skip this corrupted line
      }
    }

    newLines.push(line);
  }

  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'), 'utf8');
  }
}

console.log(`\nDone: removed ${totalFixed} corrupted lines across ${SRC}.`);
