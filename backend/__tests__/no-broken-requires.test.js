/**
 * no-broken-requires.test.js — drift guard.
 *
 * Walks every `.js` source file under `backend/` (excluding
 * `node_modules`, `_archived`, `coverage`, `logs`, `backups`, `data`,
 * `uploads`) and resolves every literal `require('../...')` /
 * `require('./...')` against the filesystem. If any path doesn't
 * resolve to a real file, the test fails loudly with the offending
 * file + import target, so a future PR adding a typo'd or stale
 * require gets caught at CI time instead of becoming yet another
 * silent no-op.
 *
 * Comment-stripping: block + line comments are removed first so a
 * `require(...)` reference sitting inside JSDoc doesn't false-match.
 *
 * Known-false-positive allowlist:
 *   - `scripts/migrations/secure-routes.js` — the literal `require(...)`
 *     strings in this file are *templates* the migration inserts into
 *     target route files at runtime; resolved correctly from the
 *     route's POV (one level up), not from the migration's.
 *   - `tests/unit/check_app.root.test.js` — legacy auto-generated
 *     stub outside the canonical __tests__/ directory; never run.
 *
 * Why this isn't a blanket `module-resolution` linter rule: only
 * relative paths are checked. Bare-package imports like
 * `require('mongoose')` or `require('@scope/lib')` rely on
 * `node_modules` resolution and aren't this test's business.
 *
 * History: this guard landed after a 2026-04-28 cleanup that found
 * 503 broken require statements across 18 files (most wrapped in
 * try/catch so prod ran with silently-disabled features). See
 * `docs/sprints/SESSION_2026_04_28.md` for the cleanup ledger.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');

// Directories whose `.js` files are excluded from the scan.
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '_archived',
  'coverage',
  'logs',
  'backups',
  'data',
  'uploads',
  '.jest-cache',
  '.git',
]);

// Files that the scanner reports but whose "broken requires" are
// known false positives. Each entry must include a one-line reason
// so the next maintainer doesn't strip a real bug.
const FALSE_POSITIVE_ALLOWLIST = new Set([
  // String templates the migration inserts into target route files.
  // Paths resolve correctly from the route's directory, not from the
  // migration script's directory.
  path.join('scripts', 'migrations', 'secure-routes.js'),
  // Legacy auto-generated test stub outside __tests__/.
  path.join('tests', 'unit', 'check_app.root.test.js'),
]);

// Per-(file, target) allow-list for legitimately-optional dynamic loads.
// Use this when a *single* require inside a try/catch block intentionally
// targets a module that may or may not exist at runtime (graceful feature
// degradation), and you do NOT want to disable the broken-require check
// for the *whole file* — only for that specific call site. Key format:
// "<relative-file-from-backend>::<require-target>" (POSIX separator).
//
// Each entry needs a one-line "why" comment.
const OPTIONAL_REQUIRES_ALLOWLIST = new Set([
  // app.js wires two optional features with explicit try/catch +
  // "/* optional */" comments. Both degrade gracefully when missing:
  //   - anchorLedger commits HIGH-sensitivity care-plan attestations
  //     to the blockchain audit chain
  //   - BeneficiaryFile registers an optional file-model for care-plan
  //     attachments
  // P1 work to implement real backing modules; until then the
  // require() targets are allowed to miss.
  //
  // Was three entries — `auditLog.service` shipped 2026-05-19 (commit
  // adding services/auditLog.service.js) and was removed from this
  // list. The broken-requires guard now actively verifies that file
  // continues to exist.
  'app.js::./services/anchorLedger.service',
  'app.js::./models/BeneficiaryFile',
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function findRelativeRequires(src) {
  // Match `require('./foo')` or `require('../foo/bar')`. Ignore
  // bare-package and absolute-path imports.
  const out = [];
  const re = /require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function targetResolves(fromFile, target) {
  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, target);
  const candidates = [
    resolved,
    `${resolved}.js`,
    `${resolved}.json`,
    path.join(resolved, 'index.js'),
  ];
  for (const c of candidates) {
    try {
      const stat = fs.statSync(c);
      if (stat.isFile()) return true;
      // A bare directory match (no index.js) doesn't count — Node
      // wouldn't resolve it either.
    } catch {
      // not found, try next candidate
    }
  }
  return false;
}

describe('no broken `require(...)` paths in backend source', () => {
  const allFiles = walk(BACKEND_ROOT);

  it('finds at least 100 .js files (sanity)', () => {
    expect(allFiles.length).toBeGreaterThan(100);
  });

  it('every relative require resolves to a real file', () => {
    const broken = [];
    for (const file of allFiles) {
      const relFromBackend = path.relative(BACKEND_ROOT, file);
      if (FALSE_POSITIVE_ALLOWLIST.has(relFromBackend)) continue;
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      const relPosix = relFromBackend.replace(/\\/g, '/');
      for (const target of findRelativeRequires(src)) {
        if (OPTIONAL_REQUIRES_ALLOWLIST.has(`${relPosix}::${target}`)) continue;
        if (!targetResolves(file, target)) {
          broken.push({ file: relPosix, target });
        }
      }
    }
    if (broken.length > 0) {
      const lines = broken
        .slice(0, 30)
        .map(b => `  ${b.file}  ->  ${b.target}`)
        .join('\n');
      const overflow = broken.length > 30 ? `\n  ... and ${broken.length - 30} more` : '';
      throw new Error(
        `Found ${broken.length} broken relative require(...) target(s):\n${lines}${overflow}\n\n` +
          `If a path is intentionally never resolvable (e.g. a string template a script generates), ` +
          `add the file to FALSE_POSITIVE_ALLOWLIST in this test with a one-line reason.`
      );
    }
    expect(broken).toEqual([]);
  });
});
