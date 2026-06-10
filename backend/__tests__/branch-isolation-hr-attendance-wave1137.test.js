'use strict';

/**
 * branch-isolation-hr-attendance-wave1137.test.js — W269 static drift guard.
 *
 * routes/hr-attendance.routes.js exposed manager/HR routes keyed by `:employeeId`
 * or `:recordId` that called AttendanceEngine (branch-UNAWARE — queries by
 * employeeId only) with NO branch check → any branch-A manager could read/mutate
 * ANY employee's attendance across branches (records, monthly-report, shift,
 * manual check-in, and record update/approve/reject). requireBranchAccess was
 * mounted but only blocks explicit ?branchId spoofing, so it was a no-op here.
 *
 * Fix: a reusable `enforceEmployeeBranch(req, employeeId)` helper (the HR analogue
 * of enforceBeneficiaryBranch — verifies the employee's branch_id against the
 * caller's scope) gates the employee-keyed routes; record-keyed routes resolve the
 * record's owning employee first (guardRecordBranch). Behavioral counterpart:
 * hr-attendance-branch-isolation-behavioral-wave1137.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/branch-isolation-hr-attendance-wave1137.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTER = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'hr-attendance.routes.js'),
  'utf-8'
);
const MW = fs.readFileSync(
  path.join(__dirname, '..', 'middleware', 'assertBranchMatch.js'),
  'utf-8'
);

describe('W269 — hr-attendance routes gate employee/record access by branch', () => {
  test('imports the reusable enforceEmployeeBranch helper', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/enforceEmployeeBranch/);
  });

  test('defines guardEmployeeBranch + guardRecordBranch (send 403/404 + signal denial)', () => {
    expect(ROUTER).toMatch(/async function guardEmployeeBranch\(req, res, employeeId\)/);
    expect(ROUTER).toMatch(/async function guardRecordBranch\(req, res, recordId\)/);
    // guardRecordBranch resolves the owning employee before the branch check
    expect(ROUTER).toMatch(/advanced_attendance\.model/);
    expect(ROUTER).toMatch(/\.select\('employeeId'\)/);
  });

  test('every :employeeId manager route is gated (>= 4 guardEmployeeBranch calls)', () => {
    const calls = ROUTER.match(/guardEmployeeBranch\(req, res, req\.params\.employeeId\)/g) || [];
    // records + monthly-report + shift + manual check-in
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });

  test('every :recordId mutation route is gated (>= 3 guardRecordBranch calls)', () => {
    const calls = ROUTER.match(/guardRecordBranch\(req, res, req\.params\.recordId\)/g) || [];
    // update + approve + reject
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  test('each guard call early-returns on denial (no fall-through to the engine)', () => {
    const guarded =
      ROUTER.match(/if \(await guard(Employee|Record)Branch\([^)]*\)\) return;/g) || [];
    expect(guarded.length).toBeGreaterThanOrEqual(7);
  });
});

describe('W269 — enforceEmployeeBranch helper (middleware/assertBranchMatch.js)', () => {
  test('is exported alongside enforceBeneficiaryBranch', () => {
    expect(MW).toMatch(/enforceEmployeeBranch,/);
    expect(MW).toMatch(/async function enforceEmployeeBranch\(req, employeeId\)/);
  });

  test('no-ops for cross-branch / unscoped callers (test ergonomics)', () => {
    expect(MW).toMatch(
      /if \(!req \|\| !req\.branchScope \|\| !req\.branchScope\.restricted\) \{\s*return;/
    );
  });

  test('loads Employee, reads branch_id (snake) with branchId fallback, asserts match', () => {
    expect(MW).toMatch(/mongoose\.model\('Employee'\)/);
    expect(MW).toMatch(/\.select\('branch_id branchId'\)/);
    expect(MW).toMatch(/assertBranchMatch\(req, emp\.branch_id \|\| emp\.branchId, 'employee'\)/);
  });

  test('fails closed (503) when the Employee model is unavailable', () => {
    expect(MW).toMatch(/Employee model unavailable/);
  });
});
