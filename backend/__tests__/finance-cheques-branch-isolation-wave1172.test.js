'use strict';

/**
 * finance-cheques-branch-isolation-wave1172.test.js — W269 static drift guard.
 *
 * routes/finance-cheques.routes.js (LIVE) was role-gated only: the list had DEAD
 * branch code (`filter.branch_id` on a non-existent field) + trusted ?branchId, and
 * the :id routes (view + 6 lifecycle mutations: deposit/clear/bounce/cancel/hold/
 * release) loaded by a bare id with NO branch check → cross-branch cheque IDOR. Cheque
 * had no branch field, so W269 adds a (nullable) branchId DERIVED FROM relatedInvoice
 * (→ Invoice.branchId). Best-effort: standalone / expense-only cheques stay null =
 * org-level (allowNull), so isolation is partial-by-design — but the invoice-linked
 * cheque IDOR is closed.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/finance-cheques-branch-isolation-wave1172.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTER = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'finance-cheques.routes.js'),
  'utf-8'
);
const MODEL = fs.readFileSync(path.join(__dirname, '..', 'models', 'Cheque.js'), 'utf-8');

describe('W269 — finance-cheques routes isolate by branch', () => {
  test('mounts requireBranchAccess + imports the W269 helpers', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(ROUTER).toMatch(/require\(['"]\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('defines chequeListScope + loadChequeInBranch (null-branch allowed)', () => {
    expect(ROUTER).toMatch(/function chequeListScope\(req\)/);
    expect(ROUTER).toMatch(/async function loadChequeInBranch\(req, res, id\)/);
    expect(ROUTER).toMatch(/assertBranchMatch\(req, doc\.branchId, 'cheque'\)/);
  });

  test('the list uses chequeListScope and drops the dead branch_id filter', () => {
    expect(ROUTER).toMatch(/\.\.\.chequeListScope\(req\)/);
    expect(ROUTER).not.toMatch(/filter\.branch_id = req\.query\.branchId/);
  });

  test('every :id route asserts ownership (>= 7 loadChequeInBranch calls)', () => {
    const calls = ROUTER.match(/loadChequeInBranch\(req, res, req\.params\.id\)/g) || [];
    // GET/:id + deposit + clear + bounce + cancel + hold + release
    expect(calls.length).toBeGreaterThanOrEqual(7);
  });
});

describe('W269 — Cheque carries a branchId derived from the related invoice', () => {
  test('schema declares branchId + derives it from relatedInvoice on validate', () => {
    expect(MODEL).toMatch(/branchId: \{ type: mongoose\.Schema\.Types\.ObjectId, ref: 'Branch'/);
    expect(MODEL).toMatch(/chequeSchema\.pre\('validate'/);
    expect(MODEL).toMatch(/this\.relatedInvoice/);
    expect(MODEL).toMatch(/mongoose\.model\('Invoice'\)/);
  });
});
