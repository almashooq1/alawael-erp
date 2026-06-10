'use strict';

/**
 * branch-isolation-hr-domain-wave1140.test.js — W269 static drift guard.
 *
 * domains/hr/routes/hr.routes.js is LIVE (dualMountAuth at /api/hr + /api/v1/hr)
 * and was a second cross-branch IDOR surface alongside hr-attendance:
 *   - GET /employees trusted `?branchId` (spoof → other branch's employees)
 *   - employees/:id (getById/profile/PUT/deactivate) had NO branch check → any
 *     authed user could read/update/DEACTIVATE any employee across branches
 *   - leaves/employee/:employeeId + balance + attendance/employee/:employeeId →
 *     cross-branch read leak; leaves/:id approve/reject/cancel → cross-branch write
 * dualMountAuth applies only `authenticate`, so requireBranchAccess was absent.
 *
 * Fix: router.use(requireBranchAccess) + effectiveBranchScope on the list (anti-
 * spoof) + guardEmployeeBranch (enforceEmployeeBranch) on every employee-keyed
 * route + guardLeaveBranch (LeaveRequest.branchId + assertBranchMatch) on the
 * leave-id mutations. Behavioral counterpart: hr-domain-branch-isolation-
 * behavioral-wave1140.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/branch-isolation-hr-domain-wave1140.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTER = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'hr', 'routes', 'hr.routes.js'),
  'utf-8'
);

describe('W269 — domains/hr routes enforce cross-branch isolation', () => {
  test('populates req.branchScope (dualMountAuth omits requireBranchAccess)', () => {
    expect(ROUTER).toMatch(
      /require\(['"]\.\.\/\.\.\/\.\.\/middleware\/branchScope\.middleware['"]\)/
    );
    expect(ROUTER).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('imports the W269 helpers (effectiveBranchScope + enforceEmployeeBranch + assertBranchMatch)', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/effectiveBranchScope/);
    expect(ROUTER).toMatch(/enforceEmployeeBranch/);
  });

  test('GET /employees ignores ?branchId spoof (uses effectiveBranchScope, not req.query.branchId)', () => {
    expect(ROUTER).toMatch(/branchId: effectiveBranchScope\(req\)/);
    expect(ROUTER).not.toMatch(/branchId: branchId \|\| req\.user\?\.branchId/);
  });

  test('defines both guard helpers', () => {
    expect(ROUTER).toMatch(/async function guardEmployeeBranch\(req, res, employeeId\)/);
    expect(ROUTER).toMatch(/async function guardLeaveBranch\(req, res, leaveId\)/);
  });

  test('every employee-keyed route is gated (>= 7 guardEmployeeBranch calls)', () => {
    const calls =
      ROUTER.match(/guardEmployeeBranch\(req, res, req\.params\.(id|employeeId)\)/g) || [];
    // employees/:id ×4 (getById, profile, PUT, deactivate) + leaves/employee + balance + attendance/employee
    expect(calls.length).toBeGreaterThanOrEqual(7);
  });

  test('every leave-id mutation is gated (>= 3 guardLeaveBranch calls)', () => {
    const calls = ROUTER.match(/guardLeaveBranch\(req, res, req\.params\.id\)/g) || [];
    // approve + reject + cancel
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  test('guardLeaveBranch checks the LeaveRequest branchId', () => {
    expect(ROUTER).toMatch(/mongoose\.model\('LeaveRequest'\)/);
    expect(ROUTER).toMatch(/assertBranchMatch\(req, lv\.branchId, 'leave request'\)/);
  });
});
