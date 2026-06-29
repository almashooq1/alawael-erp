/**
 * Cross-branch isolation guard for routes/inventory-module.routes.js (W269 class).
 *
 * `requireBranchAccess` does NOT auto-filter `:id` lookups — every item /
 * purchase-order / transaction handler queried by `_id` alone, so a restricted
 * user from branch A could read, update, delete, APPROVE, and RECEIVE branch B's
 * items + POs by guessing an ObjectId. These models use snake_case `branch_id`
 * while branchFilter() returns camelCase {branchId}, so the fix maps it via a
 * `branchScope(req)` helper spread into every query / list / create.
 *
 * Static source guard (the route uses sessions/transactions that standalone
 * MongoMemoryServer can't run).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/inventory-module.routes.js'),
  'utf8'
);

describe('inventory-module branch isolation', () => {
  test('imports branchFilter + defines a snake-mapped branchScope helper', () => {
    expect(SRC).toMatch(/requireBranchAccess, branchFilter/);
    expect(SRC).toMatch(/function branchScope\(req\)/);
    expect(SRC).toMatch(/branch_id: f\.branchId/);
  });

  test('never reads req.branchId (always undefined — W269h class)', () => {
    expect(SRC).not.toMatch(/req\.branchId/);
  });

  test('branchScope is applied broadly (every :id query + list + create)', () => {
    const count = (SRC.match(/branchScope\(req\)/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(16);
  });

  test('the only bare {_id: req.params.id} query is the transaction read', () => {
    const bare = SRC.match(/findOne\(\{ _id: req\.params\.id, deleted_at: null \}\)/g) || [];
    expect(bare.length).toBeLessThanOrEqual(1);
  });

  test('transaction read is scoped via the linked item branch', () => {
    expect(SRC).toMatch(/txn\.item_id\.branch_id/);
  });

  test('lists ignore a client branch_id for restricted users', () => {
    expect(SRC).toMatch(/branch_id && !scope\.branch_id/);
  });

  test('create paths pin branch via branchScope spread (anti cross-branch create)', () => {
    expect(SRC).toMatch(/\.\.\.req\.body,\s*\.\.\.branchScope\(req\)/);
  });

  test('PO approve/receive/submit/delete queries are branch-scoped', () => {
    // each privileged PO mutation must carry branchScope in its filter
    expect(SRC).toMatch(/status: 'pending_approval', \.\.\.branchScope\(req\)/); // approve
    expect(SRC).toMatch(/status: 'draft', \.\.\.branchScope\(req\)/); // submit
    expect(SRC).toMatch(/'approved', 'sent', 'partial'\] \},\s*\.\.\.branchScope\(req\)/); // receive
  });
});
