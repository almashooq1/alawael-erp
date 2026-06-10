'use strict';

/**
 * hr-extensions-branch-isolation-wave1154.test.js — W269 static drift guard.
 *
 * routes/hr/hr-extensions.routes.js is LIVE (app.js → /api/v1/hr/{documents,goals,
 * vacancies,saudi-compliance/snapshot}) and was a cross-branch leak: it listed
 * EmployeeDocument (passports/iqamas/contracts — sensitive PII), EmployeeGoal and
 * Vacancy with NO branch filter, and soft-deleted/patched them by id with no
 * ownership check, mounted with `authenticate` only. (The W1142 generic guard
 * missed it because it keys on `:id`, not `:employeeId`.)
 *
 * Fix: hrBranchScope plugin on EmployeeDocument + EmployeeGoal (Vacancy already had
 * branchId) + router.use(requireBranchAccess) + listScope() on the 3 lists +
 * guardDocBranch() on the id/mutation routes + branch-scoped snapshot aggregates.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-extensions-branch-isolation-wave1154.test.js
 */

const fs = require('fs');
const path = require('path');

const HR_DIR = path.join(__dirname, '..', 'models', 'HR');
const ROUTER = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'hr', 'hr-extensions.routes.js'),
  'utf-8'
);

describe('W269 — hr-extensions enforces cross-branch isolation', () => {
  test('imports the W269 helpers + populates req.branchScope', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(ROUTER).toMatch(/require\(['"]\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('defines listScope + guardDocBranch helpers', () => {
    expect(ROUTER).toMatch(/function listScope\(req/);
    expect(ROUTER).toMatch(/function guardDocBranch\(req, res, docBranchId/);
  });

  test('every list query is branch-scoped (documents + goals + vacancies)', () => {
    const lists = ROUTER.match(/\.\.\.listScope\(req/g) || [];
    expect(lists.length).toBeGreaterThanOrEqual(3);
  });

  test('every id / mutation route asserts ownership (>= 6 guardDocBranch calls)', () => {
    const calls = ROUTER.match(/guardDocBranch\(req, res,/g) || [];
    // document delete + goal check-in + goal patch + vacancy get + applicant add + applicant stage
    expect(calls.length).toBeGreaterThanOrEqual(6);
  });

  test('the saudi-compliance snapshot scopes its aggregates by branch', () => {
    expect(ROUTER).toMatch(/effectiveBranchScope\(req\)/);
    expect(ROUTER).toMatch(/\.\.\.empBf/);
    expect(ROUTER).toMatch(/\.\.\.docBf/);
  });
});

describe('W269 — EmployeeDocument + EmployeeGoal carry the hrBranchScope plugin', () => {
  test.each(['EmployeeDocument.js', 'EmployeeGoal.js'])('%s applies hrBranchScope.plugin', file => {
    const src = fs.readFileSync(path.join(HR_DIR, file), 'utf-8');
    expect(src).toMatch(/\.plugin\(require\(['"]\.\/hrBranchScope\.plugin['"]\)/);
  });
});
