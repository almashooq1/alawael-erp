'use strict';

/**
 * finance-approvals-branch-isolation-wave1163.test.js — W269 static drift guard.
 *
 * routes/finance-approvals.routes.js (LIVE /api/finance/approvals) gated only by
 * role: /pending trusted ?branchId (spoof) and the :expenseId routes (view / approve
 * / reject / PAY an expense-approval chain) loaded by a bare id with NO branch check
 * → a branch-restricted user could view + APPROVE + PAY ANY branch's expenses
 * (financial authorization IDOR). ExpenseApprovalChain carries a (nullable) branchId,
 * so the fix is route-layer: pin /pending to the caller's branch + assert ownership
 * on every :expenseId route.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/finance-approvals-branch-isolation-wave1163.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTER = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'finance-approvals.routes.js'),
  'utf-8'
);

describe('W269 — finance-approvals routes isolate by branch', () => {
  test('mounts requireBranchAccess + imports the W269 helpers', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(ROUTER).toMatch(/require\(['"]\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('defines loadChainInBranch (getStatus + assertBranchMatch, null-branch allowed)', () => {
    expect(ROUTER).toMatch(/async function loadChainInBranch\(req, res, expenseId\)/);
    expect(ROUTER).toMatch(/assertBranchMatch\(req, rec\.branchId, 'expense approval'\)/);
    expect(ROUTER).toMatch(/if \(rec\.branchId != null\)/);
  });

  test('/pending pins the branch via effectiveBranchScope (no ?branchId spoof)', () => {
    expect(ROUTER).toMatch(/branchId: effectiveBranchScope\(req\)/);
    expect(ROUTER).not.toMatch(/branchId: req\.query\.branchId \|\| null/);
  });

  test('every :expenseId route asserts ownership (>= 4 loadChainInBranch calls)', () => {
    const calls = ROUTER.match(/loadChainInBranch\(req, res, req\.params\.expenseId\)/g) || [];
    // getStatus + approve + reject + pay
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });
});
