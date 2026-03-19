const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full));
    } else if (entry.name.endsWith('.test.js')) {
      results.push(full);
    }
  }
  return results;
}

const testDir = path.join(__dirname, 'backend', '__tests__');
const files = walkDir(testDir);

const missing = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /jest\.mock\(['"]\.\.\/middleware\/auth['"],\s*\(\)\s*=>\s*[\({]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const startIdx = match.index + match[0].length - 1;
    let depth = 1;
    let i = startIdx + 1;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '{' || ch === '(') depth++;
      else if (ch === '}' || ch === ')') depth--;
      i++;
    }
    const mockBlock = content.substring(match.index, i + 2);
    if (!mockBlock.includes('authorizeRole')) {
      const rel = path.relative(testDir, file);
      missing.push(rel);
      break;
    }
  }
}

const output = [];
output.push('Files with jest.mock("../middleware/auth") but MISSING authorizeRole:');
output.push('Count: ' + missing.length);
missing.forEach(f => output.push(' - ' + f));
fs.writeFileSync(path.join(__dirname, '_auth_check_result.txt'), output.join('\n'), 'utf8');
console.log('Done. Results written to _auth_check_result.txt');
