'use strict';

/**
 * no-branchid-query-override-wave1619.test.js — Wave 1619.
 *
 * Drift guard for the `?branchId=` OVERRIDE IDOR class (W1573+, 137 sites /
 * 57 files swept 2026-07-01).
 *
 * The bug shape: a handler correctly scopes with `branchFilter(req)` /
 * `effectiveBranchScope(req)`, then DEFEATS its own guard by unconditionally
 * copying a client-supplied branch id over it —
 *
 *     const filter = { ...branchFilter(req) };
 *     if (req.query.branchId) filter.branchId = req.query.branchId;   // ← IDOR
 *
 * For a branch-restricted caller `branchFilter(req)` already pinned
 * `filter.branchId` to their own branch; the unconditional reassignment lets
 * them spoof ANY branch via `?branchId=<foreign>`. The guard was PRESENT but
 * DEFEATED — exactly the class the parallel agent burned down across 57 files.
 *
 * Canonical safe forms (both accepted by this guard):
 *   (a) inline negation      if (!filter.branchId && mongoose.isValidObjectId(req.query.branchId)) filter.branchId = req.query.branchId;
 *   (b) enclosing validation  if (req.query.branchId) { if (!isValidObjectId(...)) return 400; assertBranchMatch(req, req.query.branchId, ...); filter.branchId = req.query.branchId; }
 *
 * This guard FAILS if any `backend/routes` / `backend/services` / DDD-domain
 * file assigns `<obj>.branchId = req.(query|body).branchId` WITHOUT a branch
 * guard token (`isValidObjectId` / `assertBranchMatch` / `assertBranchIdsAllowed`
 * / `effectiveBranchScope` / `!<obj>.branchId`) within the 12 lines preceding
 * the assignment. Validated clean on the 2026-07-02 tree: 136 override sites,
 * all guarded, 0 unguarded → baseline is empty.
 *
 * Future agents: never write a bare `filter.branchId = req.query.branchId`.
 * Gate it on `!filter.branchId && mongoose.isValidObjectId(req.query.branchId)`
 * (HQ/cross-branch roles then still steer via ?branchId=; restricted callers
 * keep their pinned branch), or validate + assertBranchMatch before assigning.
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

// Assignment of a client-supplied branch id over a query/filter object.
const OVERRIDE_RE = /\b([a-zA-Z_$][\w$]*)\.branchId\s*=\s*req\.(?:query|body)\.branchId\b/;
// Any branch-scoping guard token that legitimises the override.
const GUARD_RE =
  /isValidObjectId|isValid\(|assertBranchMatch|assertBranchIdsAllowed|effectiveBranchScope|!\s*[\w.$]*\.?branchId/;
const WINDOW = 12;

// Files/sites explicitly allowed (empty — the 2026-07-02 sweep left zero).
// If a future refactor legitimately needs an entry, add `'rel/path.js:LINE'`
// with a comment WHY, and remove it the moment the code changes (assertion 2
// ratchets stale entries out).
const KNOWN_UNGUARDED_BASELINE = new Set([]);

// Replace /* */ blocks with equivalent blank space so line numbers survive.
function stripBlock(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}
function stripLine(l) {
  return l.replace(/\/\/.*$/, '');
}

function findAllScanFiles() {
  const seen = new Set();
  for (const pattern of SCAN_GLOBS) {
    for (const m of glob.sync(pattern, { cwd: REPO_ROOT, nodir: true })) {
      seen.add(m.replace(/\\/g, '/'));
    }
  }
  return Array.from(seen).sort();
}

function scanFile(rel) {
  const abs = path.join(REPO_ROOT, rel);
  const lines = stripBlock(fs.readFileSync(abs, 'utf8')).split('\n').map(stripLine);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (OVERRIDE_RE.test(lines[i])) {
      const guarded = GUARD_RE.test(lines.slice(Math.max(0, i - WINDOW), i + 1).join('\n'));
      hits.push({ line: i + 1, guarded, text: lines[i].trim() });
    }
  }
  return hits;
}

describe('W1619 — ?branchId= override IDOR drift guard', () => {
  test('no route/service assigns req.(query|body).branchId over a filter without a branch guard', () => {
    const offenders = [];
    for (const rel of findAllScanFiles()) {
      if (rel.includes('no-branchid-query-override-wave1619')) continue;
      for (const h of scanFile(rel)) {
        if (!h.guarded && !KNOWN_UNGUARDED_BASELINE.has(`${rel}:${h.line}`)) {
          offenders.push(`  - ${rel}:${h.line}  ${h.text}`);
        }
      }
    }
    if (offenders.length) {
      throw new Error(
        `W1619: ${offenders.length} unconditional \`branchId = req.(query|body).branchId\` override(s) found.\n` +
          'This defeats branchFilter(req)/effectiveBranchScope — a restricted caller can spoof ?branchId=<foreign>.\n' +
          'Gate on `!<obj>.branchId && mongoose.isValidObjectId(req.query.branchId)` or validate + assertBranchMatch first.\n' +
          offenders.join('\n')
      );
    }
    expect(offenders).toEqual([]);
  });

  test('ratchet: every KNOWN_UNGUARDED_BASELINE entry still resolves to a real unguarded site', () => {
    for (const entry of KNOWN_UNGUARDED_BASELINE) {
      const [rel, lineStr] = entry.split(':');
      const abs = path.join(REPO_ROOT, rel);
      expect(fs.existsSync(abs)).toBe(true);
      const stillUnguarded = scanFile(rel).some(h => h.line === Number(lineStr) && !h.guarded);
      expect(stillUnguarded).toBe(true); // fails → prune the fixed entry from the baseline
    }
  });

  test('detector sanity: bare override is caught, guarded forms are not', () => {
    const write = (name, content) => {
      const fp = path.join(REPO_ROOT, name);
      fs.writeFileSync(fp, content);
      return fp;
    };
    const tmp = '__tests__/.w1619-detector-fixture.js';
    // Bare override → unguarded
    const p = write(tmp, 'const filter = {};\nif (req.query.branchId) filter.branchId = req.query.branchId;\n');
    try {
      const bare = scanFile(tmp);
      expect(bare.length).toBe(1);
      expect(bare[0].guarded).toBe(false);

      // Inline negation guard → guarded
      write(tmp, 'const filter = { ...branchFilter(req) };\nif (!filter.branchId && mongoose.isValidObjectId(req.query.branchId)) filter.branchId = req.query.branchId;\n');
      expect(scanFile(tmp)[0].guarded).toBe(true);

      // Enclosing assertBranchMatch block (guard ~6 lines up) → guarded
      write(tmp, [
        'const filter = { ...branchFilter(req) };',
        'if (req.query.branchId) {',
        '  if (!mongoose.isValidObjectId(req.query.branchId)) return res.status(400).end();',
        '  assertBranchMatch(req, req.query.branchId, "list");',
        '  filter.scope = "branch";',
        '  filter.branchId = req.query.branchId;',
        '}',
      ].join('\n'));
      expect(scanFile(tmp)[0].guarded).toBe(true);

      // Commented-out override → not detected at all
      write(tmp, 'const filter = {};\n// filter.branchId = req.query.branchId;\n');
      expect(scanFile(tmp).length).toBe(0);
    } finally {
      fs.unlinkSync(p);
    }
  });
});
