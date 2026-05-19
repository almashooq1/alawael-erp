/**
 * no-utf8-bom.test.js — no source file starts with a UTF-8 BOM (EF BB BF).
 *
 * Why this guard exists: 2026-05-19 a 13-line frontend service file
 * (frontend/src/services/kpiDashboard.service.js) was silently failing
 * its auto-generated meta-test because the BOM bytes pushed the literal
 * `import` keyword off column 0, breaking `/^import\s+/gm`. A repo-wide
 * scan at the same time turned up 36 BOM-prefixed source files (29
 * backend + 7 frontend). All were stripped in the same commit.
 *
 * BOMs in `.js` / `.ts` / `.tsx` / `.jsx` files serve no purpose: Node
 * and bundlers accept files with or without one, the bytes are silent
 * in the editor, and they trip up line-anchored regex / file-shape
 * assertions. They also pollute cross-platform diffs.
 *
 * This test scans the backend tree (excluding node_modules / _archived /
 * coverage / dist) and fails CI if any new BOM-prefixed source file
 * lands. Frontend has its own scope and is covered separately.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SCAN_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx']);
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '_archived',
  'coverage',
  'dist',
  'build',
  '.jest-cache',
  '.git',
]);

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

function hasBom(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(3);
    const n = fs.readSync(fd, buf, 0, 3, 0);
    return n === 3 && buf.equals(BOM);
  } finally {
    fs.closeSync(fd);
  }
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

describe('no UTF-8 BOM in backend source files', () => {
  it('no .js/.cjs/.mjs/.ts/.tsx/.jsx file under backend/ starts with EF BB BF', () => {
    const all = walk(BACKEND_ROOT, []);
    const offenders = all.filter(hasBom).map(p => path.relative(BACKEND_ROOT, p));
    if (offenders.length > 0) {
      const list = offenders.slice(0, 20).join('\n  ');
      const more = offenders.length > 20 ? `\n  ...and ${offenders.length - 20} more` : '';
      throw new Error(
        `Found ${offenders.length} BOM-prefixed source file(s):\n  ${list}${more}\n` +
          `Fix: run  \`find . -type f \\( -name '*.js' -o -name '*.ts' -o -name '*.tsx' \\) | xargs -I{} sed -i '1s/^\\xEF\\xBB\\xBF//' {}\`  (POSIX)`
      );
    }
    expect(offenders).toEqual([]);
  });
});
