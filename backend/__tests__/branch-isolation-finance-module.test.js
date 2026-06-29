/**
 * Cross-branch isolation guard for routes/finance-module.routes.js (W269 class).
 *
 * `requireBranchAccess` does NOT auto-filter `:id`/list lookups. The Invoice,
 * Payment and InsuranceClaim models are branch-scoped (`branch_id` required),
 * but the list `find` queries and every `:id` read/mutation queried by `_id`
 * alone — so a restricted branch-A user could LIST and read/modify branch-B's
 * invoices, payments and insurance claims (amounts, beneficiary PII, VAT
 * numbers) by guessing an ObjectId. Fixed by spreading the existing snake-mapped
 * `branchScopeSnake(req)` helper into all of them.
 *
 * (ChartOfAccount/JournalEntry are intentionally NOT scoped here — accounts are
 * org-level; see the finance follow-up for journal-entry integrity.)
 *
 * Static source guard.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/finance-module.routes.js'),
  'utf8'
);

describe('finance-module branch isolation', () => {
  test('snake-mapped branchScopeSnake helper exists', () => {
    expect(SRC).toMatch(/const branchScopeSnake = req =>/);
    expect(SRC).toMatch(/branch_id: bf\.branchId/);
  });

  test('never reads req.branchId (always undefined — W269h class)', () => {
    expect(SRC).not.toMatch(/req\.branchId/);
  });

  test('branchScopeSnake applied broadly (lists + by-id reads + mutations)', () => {
    const count = (SRC.match(/branchScopeSnake\(req\)/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(18);
  });

  test('no bare Invoice/Payment/InsuranceClaim :id query without scope', () => {
    // every by-id query was rewritten multi-line with ...branchScopeSnake(req);
    // a single-line {_id: req.params.id, deleted_at: null} for these models is a regression.
    expect(SRC).not.toMatch(/Invoice\.findOne\(\{ _id: req\.params\.id, deleted_at: null \}\)/);
    expect(SRC).not.toMatch(/Payment\.findOne\(\{ _id: req\.params\.id, deleted_at: null \}\)/);
    expect(SRC).not.toMatch(
      /InsuranceClaim\.findOne\(\{ _id: req\.params\.id, deleted_at: null \}\)/
    );
  });

  test('invoice/payment/claim list filters carry the branch scope', () => {
    // each list builds `const filter = { deleted_at: null, ...branchScopeSnake(req) }`
    const scopedFilters = (
      SRC.match(/const filter = \{ deleted_at: null, \.\.\.branchScopeSnake\(req\) \}/g) || []
    ).length;
    expect(scopedFilters).toBeGreaterThanOrEqual(3);
  });
});
