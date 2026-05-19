/**
 * no-utf8-bom.test.js — drift guard.
 *
 * Mirror of backend/__tests__/no-utf8-bom.test.js (added 2026-05-19).
 *
 * History: 7 frontend source files shipped with UTF-8 BOMs (EF BB BF).
 * One of them — src/services/kpiDashboard.service.js — silently broke
 * its auto-generated meta-test for an unknown stretch because the BOM
 * bytes pushed the literal `import` keyword off column 0 and broke
 * the assertion `/^import\s+/gm`. All 7 were stripped in a single
 * commit; this guard prevents the next IDE that defaults to "UTF-8
 * with BOM" from quietly putting us back where we started.
 *
 * Scope: scans `frontend/src/` for .js/.jsx/.ts/.tsx files. Skips
 * `node_modules`, `build`, `coverage`, `.git`. Fails CI with a precise
 * file list + a POSIX sed one-liner for the fix.
 */

const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.resolve(__dirname, '..');
const SCAN_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const EXCLUDE_DIRS = new Set(['node_modules', 'build', 'coverage', '.git']);

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

describe('no UTF-8 BOM in frontend source files', () => {
  test('no .js/.jsx/.ts/.tsx file under frontend/src starts with EF BB BF', () => {
    const all = walk(SRC_ROOT, []);
    const offenders = all.filter(hasBom).map(p => path.relative(SRC_ROOT, p));
    if (offenders.length > 0) {
      const list = offenders.slice(0, 20).join('\n  ');
      const more = offenders.length > 20 ? `\n  ...and ${offenders.length - 20} more` : '';
      throw new Error(
        `Found ${offenders.length} BOM-prefixed source file(s) under frontend/src/:\n  ${list}${more}\n` +
          `Fix: run  \`find . -type f \\( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' \\) | xargs -I{} sed -i '1s/^\\xEF\\xBB\\xBF//' {}\``
      );
    }
    expect(offenders).toEqual([]);
  });
});
