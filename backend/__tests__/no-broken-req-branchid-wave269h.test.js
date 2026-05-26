'use strict';

/**
 * no-broken-req-branchid-wave269h.test.js — Wave 269h.
 *
 * Drift guard preventing regression of the `req.branchId` anti-pattern
 * eliminated across W269 → W269g (7 commits, 40 route-occurrences).
 *
 * The canonical branch scope is `req.branchScope.branchId` (set by
 * `requireBranchAccess` middleware). `req.branchId` is NEVER set by
 * any middleware in this codebase — it was an 11-month-old hallucination
 * documented in a misleading comment in routes/hr/hr-performance.routes.js.
 *
 * Every appearance of `req.branchId` in route or service code is
 * therefore a bug (either security — cross-branch list leak when
 * fallback is undefined — or data integrity — new docs created with
 * branchId=undefined). The fix is `effectiveBranchScope(req)` from
 * backend/middleware/assertBranchMatch.js.
 *
 * This guard FAILS if any backend/routes/ or backend/services/ file
 * contains `req.branchId` in active code. Comments + the helper file
 * itself + this test are explicitly allowed.
 *
 * Future agents: if you need a branch reference in a route or service,
 *   const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
 *   const branchId = effectiveBranchScope(req);   // null or 'restricted-branch-A'
 *
 * Or for write paths that need branch enforcement:
 *   const { enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');
 *   await enforceBeneficiaryBranch(req, beneficiaryId);   // throws 403 on cross-branch
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_GLOBS = [
  'routes/**/*.js',
  'services/**/*.js',
  'domains/**/routes/**/*.js',
  'domains/**/services/**/*.js',
];

// Files explicitly allowed to mention `req.branchId` (e.g. the helper
// itself that comments WHY it doesn't use it). Anchor on relative-to-
// backend path so directory shuffles don't silently break the
// exemption.
const EXEMPT_PATHS = new Set([
  // Helper documents the anti-pattern in its docstring.
  'middleware/assertBranchMatch.js',
  // This file (referenced via __filename — JSDoc mentions the pattern).
  '__tests__/no-broken-req-branchid-wave269h.test.js',
]);

// Strip JS comments — both block /* */ and line // — so a comment
// like `// req.branchId was the old anti-pattern` doesn't trip the
// guard. Robust enough for the codebase's style; not a full lexer.
function stripJsComments(src) {
  return (
    src
      // /* ... */ blocks (multiline)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // // ... to end of line
      .replace(/\/\/[^\n\r]*/g, '')
  );
}

function findAllScanFiles() {
  const seen = new Set();
  for (const pattern of SCAN_GLOBS) {
    const matches = glob.sync(pattern, { cwd: REPO_ROOT, nodir: true });
    for (const m of matches) seen.add(m.replace(/\\/g, '/'));
  }
  return Array.from(seen).sort();
}

describe('W269h — req.branchId anti-pattern drift guard', () => {
  test('no backend/routes or backend/services file contains active req.branchId', () => {
    const offenders = [];
    const files = findAllScanFiles();
    for (const rel of files) {
      if (EXEMPT_PATHS.has(rel)) continue;
      const abs = path.join(REPO_ROOT, rel);
      const src = fs.readFileSync(abs, 'utf8');
      const stripped = stripJsComments(src);
      // Match `req.branchId` as a word-boundary token — don't trigger
      // on `req.branchIds` (plural; legitimate query-array case) or
      // `req.branchScope.branchId` (the canonical path).
      const matches = stripped.match(/\breq\.branchId\b/g);
      if (matches && matches.length > 0) {
        offenders.push({
          file: rel,
          count: matches.length,
        });
      }
    }
    if (offenders.length > 0) {
      const lines = offenders
        .map(o => `  - ${o.file} (${o.count} occurrence${o.count === 1 ? '' : 's'})`)
        .join('\n');
      throw new Error(
        `W269h: ${offenders.length} file(s) still contain the broken \`req.branchId\` pattern.\n` +
          'Replace with `effectiveBranchScope(req)` from middleware/assertBranchMatch.js.\n' +
          'Affected files:\n' +
          lines
      );
    }
    expect(offenders).toEqual([]);
  });

  test('the canonical helper file exists and exports the expected surface', () => {
    const helperPath = path.join(REPO_ROOT, 'middleware/assertBranchMatch.js');
    expect(fs.existsSync(helperPath)).toBe(true);
    const helper = require('../middleware/assertBranchMatch');
    expect(typeof helper.assertBranchMatch).toBe('function');
    expect(typeof helper.effectiveBranchScope).toBe('function');
    expect(typeof helper.enforceBeneficiaryBranch).toBe('function');
    expect(typeof helper.assertBranchIdsAllowed).toBe('function');
  });

  test('drift-guard sanity: the comment-stripper correctly preserves req.branchId in code while removing it from comments', () => {
    const sample = `
      // comment line with req.branchId — should be stripped
      /* block comment with req.branchId — also stripped */
      const branchId = effectiveBranchScope(req);
      // another req.branchId mention
    `;
    const stripped = stripJsComments(sample);
    expect(stripped.match(/\breq\.branchId\b/g)).toBeNull();

    const sampleWithReal = `
      // req.branchId in comment — ignored
      const x = req.branchId; // real use — caught
    `;
    const strippedReal = stripJsComments(sampleWithReal);
    expect(strippedReal.match(/\breq\.branchId\b/g)).toHaveLength(1);
  });
});
