'use strict';

/**
 * hr-route-branch-isolation-guard-wave1142.test.js — W269 anti-regression guard.
 *
 * The per-file guards (wave1133/1137/1141) lock the SPECIFIC HR surfaces this
 * session hardened. This guard is the GENERIC backstop: it scans EVERY HR route
 * file and fails CI when a file that takes an employee/record id param carries NO
 * branch-isolation signal at all — catching a NEW unscoped HR route before it
 * ships (the W269h pattern, applied to the HR surface).
 *
 * Signal detection is BROAD on purpose: HR uses several valid scoping patterns —
 * the W269 helpers (requireBranchAccess/enforceEmployeeBranch/assertBranchMatch/
 * branchFilter/effectiveBranchScope), the payroll-style employee-FK filter, and
 * employee-admin's custom `req.user.branchId`/`branch_id` filtering. A file with
 * ANY of these is considered branch-aware (no false positive); a file with ZERO is
 * flagged.
 *
 * Ratchet-down (W325c/W340 lineage): files that are employee-keyed but legitimately
 * un-gated TODAY (admin/compliance-role-gated, pending a per-file W269 audit) live
 * in KNOWN_UNGATED. Two assertions: (1) a NEW ungated file fails; (2) a STALE
 * baseline entry that has since gained a branch signal fails — forcing its removal
 * in the same commit as the fix.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-route-branch-isolation-guard-wave1142.test.js
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');

// Employee-keyed but legitimately un-gated TODAY — tracked backlog, NOT a green
// light. EMPTY since W1143 gated hr-copilot + hr-compliance. Keep the mechanism so
// a FUTURE legitimately-ungated file can be tracked here; the stale-baseline test
// forces removal the moment an entry gains a branch signal.
const KNOWN_UNGATED = new Set([]);

// Surfaces hardened this arc — locked against a protection-removing regression.
const MUST_HAVE_REQUIRE_BRANCH_ACCESS = [
  'routes/hr/hr-modules.routes.js',
  'routes/hr-attendance.routes.js',
  'domains/hr/routes/hr.routes.js',
  'routes/hr/hr-copilot.routes.js', // W1143
  'routes/hr-compliance.routes.js', // W1143
];

const PARAM_RE = /:employeeId|:recordId|\/employees\/:id|\/employee\/:|:payrollId|:leaveId/;
const SIGNAL_RE =
  /branch_id|branchId|branchFilter|requireBranchAccess|effectiveBranchScope|enforceEmployeeBranch|assertBranchMatch|branchScope|assertPayrollEmployeeInScope|loadOwnedRequest/;

function listHrRouteFiles() {
  const out = [];
  const add = rel => {
    if (fs.existsSync(path.join(BACKEND, rel))) out.push(rel);
  };
  // routes/hr/*.routes.js + domains/hr/routes/*.routes.js
  for (const dir of ['routes/hr', 'domains/hr/routes']) {
    const abs = path.join(BACKEND, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (f.endsWith('.routes.js')) out.push(`${dir}/${f}`);
    }
  }
  // routes/*hr*.routes.js (top-level HR routers, any case)
  for (const f of fs.readdirSync(path.join(BACKEND, 'routes'))) {
    if (/hr/i.test(f) && f.endsWith('.routes.js')) out.push(`routes/${f}`);
  }
  // explicit core HR transactional surfaces that aren't named *hr*
  add('routes/leave-requests.routes.js');
  add('routes/payroll.routes.js');
  return [...new Set(out)];
}

const HR_FILES = listHrRouteFiles();
const read = rel => fs.readFileSync(path.join(BACKEND, rel), 'utf-8');

describe('W269 — no HR route handles an employee/record id without branch awareness', () => {
  test('discovers a non-trivial HR route surface', () => {
    expect(HR_FILES.length).toBeGreaterThanOrEqual(10);
  });

  test('every employee/record-keyed HR route file is branch-aware (or explicitly baselined)', () => {
    const offenders = [];
    for (const rel of HR_FILES) {
      const src = read(rel);
      if (PARAM_RE.test(src) && !SIGNAL_RE.test(src) && !KNOWN_UNGATED.has(rel)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('KNOWN_UNGATED entries still exist and still lack a branch signal (ratchet-down)', () => {
    const stale = [];
    for (const rel of KNOWN_UNGATED) {
      if (!fs.existsSync(path.join(BACKEND, rel))) {
        stale.push(`${rel} (deleted — remove from baseline)`);
        continue;
      }
      if (SIGNAL_RE.test(read(rel))) {
        stale.push(`${rel} (now branch-aware — remove from baseline)`);
      }
    }
    expect(stale).toEqual([]);
  });
});

describe('W269 — hardened surfaces keep requireBranchAccess (regression lock)', () => {
  test.each(MUST_HAVE_REQUIRE_BRANCH_ACCESS)('%s still mounts requireBranchAccess', rel => {
    expect(read(rel)).toMatch(/requireBranchAccess/);
  });
});
