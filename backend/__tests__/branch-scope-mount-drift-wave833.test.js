'use strict';

/**
 * branch-scope-mount-drift-wave833.test.js — W833.
 *
 * Generalises the W832 IDOR finding into a CI drift guard.
 *
 * THE BUG CLASS: a route file calls a branch-isolation helper that depends on
 * `req.branchScope` — `branchFilter(req)`, `assertBranchMatch(req, …)`, or
 * `enforceBeneficiaryBranch(req, …)` — but the file never mounts
 * `requireBranchAccess` (the ONLY middleware that populates `req.branchScope`).
 * There is no global `requireBranchAccess` in app.js / server.js, and the
 * canonical convention in this codebase is to mount it inside each route file
 * (seizure-log, safeguarding, leave-requests, voice-log, …). When it is
 * missing, every isolation helper short-circuits to a NO-OP and a restricted
 * caller can read/modify another branch's data by guessing an ObjectId.
 *
 * Confirmed instances this guard was born from:
 *   - iq-assessments (W832)  — fixed: mounted requireBranchAccess.
 *   - beneficiary-lifecycle  — fixed (W833): mounted requireBranchAccess in the
 *     factory (bootstrap mounts authenticate→loadMfaActor→router, no branch).
 *   - equity / stories / assessmentRecommendation / rehab-licenses — fixed
 *     (W833 sweep): all mount requireBranchAccess now (auth runs first, either
 *     in-file or via dualMountAuth which always applies `authenticate`).
 *
 * Static analysis only (reads source as text; never loads mongoose).
 *
 * Ratchet-down pattern (W269h / W340 lineage):
 *   (1) NEW offenders not in the baseline fail the build.
 *   (2) STALE baseline entries (now guarded, or no longer using the helpers)
 *       fail the build — forcing removal from the baseline in the same commit
 *       that fixes the route.
 *
 * KNOWN_UNGUARDED_ROUTES are documented, pre-existing gaps awaiting per-route
 * remediation. Each needs intent confirmation (is the route branch-scoped or
 * deliberately org-wide?) before mounting requireBranchAccess — that is why
 * they are baselined here rather than auto-fixed in one sweep.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_ROOT = path.join(__dirname, '..', 'routes');

// Helpers whose behaviour is a NO-OP (silent isolation bypass) unless
// req.branchScope has been populated by requireBranchAccess.
const SCOPE_DEPENDENT_HELPER =
  /assertBranchMatch\(\s*req|enforceBeneficiaryBranch\(\s*req|branchFilter\(\s*req\s*\)/;
const MOUNTS_GUARD = /requireBranchAccess/;

// Pre-existing unguarded routes (snapshot 2026-06-04, after W832 iq-assessments
// + W833 beneficiary-lifecycle were fixed). Ratchet DOWN only — never add.
// Remediation: confirm the route is branch-scoped, then mount
// `router.use(requireBranchAccess)` (auth runs first at mount, so req.user is
// present) and delete the entry here.
const KNOWN_UNGUARDED_ROUTES = new Set([
  // W834 closed purchasing.routes.js — baseline intentionally empty. Add entries
  // only for documented pre-existing gaps awaiting per-route remediation.
]);

function walkJs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function relRouteKey(file) {
  return path.relative(ROUTES_ROOT, file).replace(/\\/g, '/');
}

function collectUnguarded() {
  const offenders = [];
  for (const file of walkJs(ROUTES_ROOT)) {
    const src = fs.readFileSync(file, 'utf8');
    if (SCOPE_DEPENDENT_HELPER.test(src) && !MOUNTS_GUARD.test(src)) {
      offenders.push(relRouteKey(file));
    }
  }
  return offenders;
}

describe('W833 — branch-scope mount drift guard', () => {
  it('no NEW route uses a scope-dependent helper without mounting requireBranchAccess', () => {
    const offenders = collectUnguarded();
    const newOnes = offenders.filter(f => !KNOWN_UNGUARDED_ROUTES.has(f));
    if (newOnes.length > 0) {
      throw new Error(
        `Found ${newOnes.length} route file(s) that call branchFilter/assertBranchMatch/\n` +
          `enforceBeneficiaryBranch (which need req.branchScope) but never mount\n` +
          `requireBranchAccess — so the isolation check is a SILENT NO-OP (cross-branch\n` +
          `IDOR, same class as W832 iq-assessments):\n` +
          newOnes.map(f => `  - routes/${f}`).join('\n') +
          `\n\nFix: add \`router.use(requireBranchAccess)\` after authenticate (req.user is\n` +
          `set by the mount-level authenticate before the router runs). Do NOT add to\n` +
          `KNOWN_UNGUARDED_ROUTES.`
      );
    }
  });

  it('every KNOWN_UNGUARDED_ROUTES entry is still unguarded (ratchet-down)', () => {
    const offenders = new Set(collectUnguarded());
    const stale = [...KNOWN_UNGUARDED_ROUTES].filter(f => !offenders.has(f));
    if (stale.length > 0) {
      throw new Error(
        `${stale.length} KNOWN_UNGUARDED_ROUTES entry/entries are now guarded (or no\n` +
          `longer use the helpers). Remove them from the baseline in the SAME commit\n` +
          `that fixed them:\n` +
          stale.map(f => `  - ${f}`).join('\n')
      );
    }
  });

  it('iq-assessments + beneficiary-lifecycle are NOT in the unguarded set (W832/W833 fixes hold)', () => {
    const offenders = new Set(collectUnguarded());
    expect(offenders.has('iq-assessments.routes.js')).toBe(false);
    expect(offenders.has('beneficiary-lifecycle.routes.js')).toBe(false);
  });
});
