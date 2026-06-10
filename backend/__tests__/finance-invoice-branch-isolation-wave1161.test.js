'use strict';

/**
 * finance-invoice-branch-isolation-wave1161.test.js — W269 static drift guard.
 *
 * routes/financeOperations.routes.js mounts requireBranchAccess but its invoice
 * routes passed only the id/query to financeOpsService — req.branchScope was never
 * used → a branch-restricted user could list/read/update/cancel/pay ANY branch's
 * invoices (financial PII). Invoice carries branchId (W651 denorm from beneficiary),
 * so the fix is route-layer: pin the list filter to the caller's branch + assert
 * branch ownership on every invoice :id route.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/finance-invoice-branch-isolation-wave1161.test.js
 */

const fs = require('fs');
const path = require('path');

const ROUTER = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'financeOperations.routes.js'),
  'utf-8'
);
const SERVICE = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'financeOperations.service.js'),
  'utf-8'
);

describe('W269 — financeOperations invoice routes isolate by branch', () => {
  test('imports assertBranchMatch + effectiveBranchScope', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/effectiveBranchScope/);
  });

  test('defines loadInvoiceInBranch (getInvoice + assertBranchMatch on branchId)', () => {
    expect(ROUTER).toMatch(/async function loadInvoiceInBranch\(req, id\)/);
    expect(ROUTER).toMatch(/assertBranchMatch\(req, inv\.branchId, 'invoice'\)/);
  });

  test('the invoice list pins the branch filter via effectiveBranchScope', () => {
    expect(ROUTER).toMatch(
      /listInvoices\(\{ \.\.\.req\.query, branchId: effectiveBranchScope\(req\) \}\)/
    );
  });

  test('every invoice id route asserts ownership (>= 4 loadInvoiceInBranch calls)', () => {
    const calls = ROUTER.match(/loadInvoiceInBranch\(req, req\.params\.id\)/g) || [];
    // GET/:id + PUT/:id + cancel + pay
    expect(calls.length).toBeGreaterThanOrEqual(4);
  });

  test('financeOpsService.listInvoices honours the branchId filter', () => {
    expect(SERVICE).toMatch(/if \(query\.branchId\) filter\.branchId = query\.branchId;/);
  });
});
