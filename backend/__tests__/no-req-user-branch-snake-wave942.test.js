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

// Baseline (2026-06-05): consumer files currently reading the never-populated
// snake/bare branch field. Ratchet DOWN as each adopts effectiveBranchScope(req).
const BASELINE = new Set([
  'routes/ai-analytics.routes.js',
  'routes/beneficiary-transfers.routes.js',
  // 'routes/communication-module.routes.js' — FIXED W946 (InternalMessage +
  //   ContactDirectory CREATE stamps now use effectiveBranchScope(req)).
  // 'routes/files-module.routes.js' — FIXED W946 (both CREATE stamps now use
  //   effectiveBranchScope(req)); pruned from baseline (ratchet-down).
  'routes/hr/employee-admin.routes.js',
  'routes/hr/hr-change-requests.routes.js',
  'routes/hr/hr-inbox.routes.js',
  // 'routes/hr-module.routes.js' — FIXED W973: POST /leaves branch stamp now uses
  //   effectiveBranchScope(req) (was req.user.branch_id → undefined on a required field).
  'routes/referral.routes.js',
  // 'routes/reports-analytics-module.routes.js' — FIXED W973: inert never-populated
  //   fallback swapped to scopedBranch (C3a already forces the real branch at the caller).
  // 'routes/smart-assessment-engine.routes.js' — FIXED W973: 13 assessment CREATE
  //   stamps now use effectiveBranchScope(req); reads already scoped (W907).
  // 'routes/telehealth.routes.js' — FIXED W946: all 11 req.user.branch sites now
  //   use telehealthBranchFilter(req) (lists) / effectiveBranchScope(req) (values
  //   + stamps); proven by the branchId-only-user cases in the W871 test (9/9).
]);

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
  return PATTERNS.some(re => re.test(src));
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
    expect(fileReadsSnakeBranch('const b = req.user?.branch_id || null;')).toBe(true);
    // canonical — must NOT match
    expect(fileReadsSnakeBranch('const b = req.user.branchId;')).toBe(false);
    expect(fileReadsSnakeBranch('const b = effectiveBranchScope(req);')).toBe(false);
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
