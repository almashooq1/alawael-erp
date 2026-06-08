/**
 * no-req-user-branch-snake-wave942.test.js — M-naming bug-class drift guard
 *
 * WHY (AUTHZ_REMEDIATION_BACKLOG M-naming): branch tenancy has 4 field spellings
 * (canonical `branchId` + legacy `branch_id` / `branch` / `branch_code`). The
 * dangerous slice is the REQUEST side: routes that scope/stamp via
 * `req.user.branch_id` or `req.user.branch` read a field that is NEVER populated
 * — the JWT carries `branchId` and the W930 enrichment sets `req.user.branchId`,
 * NOT the snake/bare forms. So `filter.branch_id = req.user.branch_id` filters by
 * `undefined` (no scope → potential cross-branch read) and
 * `{ branch_id: req.user.branch_id }` on create stamps `undefined` (orphaned,
 * un-scoped doc). This is the SAME class as the `req.branchId` bug the W269h
 * guard catches — but W269h matches only the `req.branchId` token, so the
 * `req.user.branch_id` / `req.user.branch` variant is currently UN-guarded
 * (telehealth.routes ×11, referral.routes, communication/files-module writes, …).
 *
 * This guard baselines the current consumer-layer files that read these
 * never-populated fields and (W325c/W340 ratchet): (a) any NEW file fails CI,
 * (b) a baselined file that is FIXED must be pruned (stale → fail). The fix is
 * `effectiveBranchScope(req)` / `req.user.branchId` (+ the W651 `branchScopeSnake`
 * adapter when the MODEL field is genuinely snake_case, e.g. finance Invoice).
 * Infra middleware that manages these fields (branchScope.middleware, advancedAuth)
 * and _archived dead code are out of scope. Pure source scan, no DB/boot.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
// Consumer layer where the orphaning bug manifests (NOT middleware infra).
const SCAN_DIRS = ['routes', 'services', 'controllers', 'domains'];
const SKIP_DIRS = new Set([
  '__tests__',
  'tests',
  'node_modules',
  '_archived',
  '_archive',
  '_backups',
  'coverage',
]);

// `req.user.branch_id` (snake, never populated) and bare `req.user.branch`
// (\b excludes `branchId` and `branch_id` from the bare pattern; the snake
// pattern matches `branch_id` explicitly).
const PATTERNS = [/req\.user\??\.branch_id\b/, /req\.user\??\.branch\b/];

// W991 — the canonical-first idiom `req.user.branchId || req.user.branch_id`
// (and `... || req.user.branch`) is SAFE: branchId (the W930-enriched field) is
// read FIRST, so the snake/bare token is dead fallback weight — it can only be
// reached when branchId is falsy, in which case the snake form (also never
// populated) is falsy too, so the `|| null` default wins. Strip the idiom before
// danger-matching so the guard flags only STANDALONE never-populated reads. A
// standalone `req.user.branch_id` elsewhere in the same file is NOT stripped (the
// idiom regex requires the `branchId ||` prefix) → still caught. Self-tested below.
const SAFE_IDIOM = /req\.user\??\.branchId\s*(?:\|\||\?\?)\s*req\.user\??\.branch(?:_id)?\b/g;

// Baseline (2026-06-05 → ratcheted to EMPTY 2026-06-08, W991). Every consumer file
// that once read the never-populated snake/bare branch field is now either FIXED or
// recognized as the canonical-first safe idiom (excluded by SAFE_IDIOM). Any NEW
// standalone read fails CI — including one introduced into the 3 HR files below,
// which baselining could no longer have caught. Fix history (ratchet-DOWN trail):
//   W946: files-module + communication-module CREATE stamps; telehealth all-11
//         read/stamp sites → telehealthBranchFilter / effectiveBranchScope (12→9).
//   W973: smart-assessment (13 stamps) + hr-module (POST /leaves) + reports-analytics
//         (inert fallback) + referral (5 sites + test) + ai-analytics (7 leak+spoof
//         sites + test) (→ 12→4).
//   W990: beneficiary-transfers — Direction A field-drift fix (schema *Id→bare so
//         transfers persist; GET / scope → effectiveBranchScope) (→ 12→3).
//   W991: the 3 HR files (employee-admin / hr-change-requests / hr-inbox) read
//         `req.user.branchId || req.user.branch_id` — the canonical-first SAFE idiom
//         (branchId primary; snake = dead fallback). The SAFE_IDIOM strip now
//         excludes it, so they're no longer flagged and the baseline is EMPTY.
const BASELINE = new Set([]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

function fileReadsSnakeBranch(src) {
  // Remove the canonical-first safe idiom; danger-match only the residual.
  const residual = src.replace(SAFE_IDIOM, '');
  return PATTERNS.some(re => re.test(residual));
}

function scan() {
  const found = new Set();
  for (const sub of SCAN_DIRS) {
    for (const file of walk(path.join(BACKEND_ROOT, sub))) {
      let src;
      try {
        src = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      if (fileReadsSnakeBranch(src)) {
        found.add(path.relative(BACKEND_ROOT, file).split(path.sep).join('/'));
      }
    }
  }
  return found;
}

describe('M-naming — no consumer reads the never-populated req.user.branch_id / req.user.branch', () => {
  it('self-test: pattern DETECTS the snake/bare forms but NOT canonical branchId', () => {
    expect(fileReadsSnakeBranch('filter.branch_id = req.user.branch_id;')).toBe(true);
    expect(fileReadsSnakeBranch('const b = req.user.branch;')).toBe(true);
    expect(fileReadsSnakeBranch('const b = req.user?.branch_id || null;')).toBe(true); // snake PRIMARY
    // canonical — must NOT match
    expect(fileReadsSnakeBranch('const b = req.user.branchId;')).toBe(false);
    expect(fileReadsSnakeBranch('const b = effectiveBranchScope(req);')).toBe(false);
  });

  it('self-test (W991): canonical-first idiom is SAFE, but a standalone snake read still flags', () => {
    // SAFE — branchId primary, snake/bare = dead fallback
    expect(fileReadsSnakeBranch('const b = req.user.branchId || req.user.branch_id || null;')).toBe(
      false
    );
    expect(fileReadsSnakeBranch('const b = req.user?.branchId || req.user?.branch_id;')).toBe(
      false
    );
    expect(fileReadsSnakeBranch('const b = req.user.branchId ?? req.user.branch;')).toBe(false);
    // CRITICAL: an idiom present does NOT mask a separate standalone never-populated read
    expect(
      fileReadsSnakeBranch(
        'const a = req.user.branchId || req.user.branch_id; filter.b = req.user.branch_id;'
      )
    ).toBe(true);
  });

  it('the set of consumer files reading snake/bare branch == baseline (no growth, ratchet-down)', () => {
    const found = scan();
    const novel = [...found].filter(f => !BASELINE.has(f)).sort();
    const stale = [...BASELINE].filter(f => !found.has(f)).sort();
    // NEW file with the bug → fail (caps growth)
    expect(novel).toEqual([]);
    // a baselined file that was fixed → prune it from BASELINE in the same commit
    expect(stale).toEqual([]);
  });
});

module.exports = { fileReadsSnakeBranch, scan, BASELINE };
