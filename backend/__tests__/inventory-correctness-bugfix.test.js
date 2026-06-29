/**
 * Inventory correctness/integrity bug-fixes — static regression guard.
 *
 * Locks five verified defects in the inventory domain so they cannot silently
 * regress (the service uses mongoose sessions/transactions that standalone
 * MongoMemoryServer can't run, so these are source-shape assertions per the
 * repo's drift-guard convention):
 *
 *  #1 P0 — getTotalStock() / getReorderAlerts() crashed on Mongoose 9 because
 *          `mongoose.Types.ObjectId(itemId)` was called without `new`.
 *  #2 P1 — POST /transactions spread `...rest` LAST into the InventoryTransaction
 *          ctor → client could forge quantity_before/after, created_by, branch_id.
 *  #3 P1 — adjust() logged quantityBefore:0 + quantity=absolute-new (not the delta).
 *  #4 P1 — transfer() had no rollback if the receive leg failed after issue
 *          committed (stock loss); route never passed performedBy.
 *  #8 P2 — getReorderAlerts() compared raw on-hand (ignored reserved) to reorderPoint.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SVC = fs.readFileSync(
  path.join(__dirname, '../services/inventory/inventory-enhanced.service.js'),
  'utf8'
);
const ENH_ROUTES = fs.readFileSync(
  path.join(__dirname, '../routes/inventory-enhanced.routes.js'),
  'utf8'
);
const MOD_ROUTES = fs.readFileSync(
  path.join(__dirname, '../routes/inventory-module.routes.js'),
  'utf8'
);

describe('inventory bugfix #1 — Mongoose 9 ObjectId construction', () => {
  test('getTotalStock $match uses `new mongoose.Types.ObjectId`', () => {
    expect(SVC).toMatch(/new mongoose\.Types\.ObjectId\(itemId\)/);
  });
  test('no bare `mongoose.Types.ObjectId(itemId)` (would throw on v9)', () => {
    expect(SVC).not.toMatch(/(?<!new )mongoose\.Types\.ObjectId\(itemId\)/);
  });
});

describe('inventory bugfix #2 — POST /transactions mass-assignment', () => {
  test('InventoryTransaction ctor no longer spreads `...rest`', () => {
    expect(MOD_ROUTES).not.toMatch(/\.\.\.rest,/);
  });
  test('branch_id is taken from the item, not client body', () => {
    expect(MOD_ROUTES).not.toMatch(/rest\.branch_id/);
    expect(MOD_ROUTES).toMatch(/branch_id: item\.branch_id/);
  });
  test('quantity is validated finite > 0 (no NaN stock corruption)', () => {
    expect(MOD_ROUTES).toMatch(/Number\.isFinite\(qty\)/);
  });
});

describe('inventory bugfix #3 — adjust() ledger correctness', () => {
  test('records the signed delta, not the absolute new quantity', () => {
    expect(SVC).toMatch(/quantity: newQuantity - before/);
  });
  test('records the real prior quantity as quantityBefore (not 0)', () => {
    expect(SVC).toMatch(/quantityBefore: before/);
    expect(SVC).not.toMatch(/quantityBefore: 0,/);
  });
  test('adjust runs inside a session/transaction', () => {
    const adjustBlock = SVC.slice(SVC.indexOf('async adjust('), SVC.indexOf('async getStockLevels('));
    expect(adjustBlock).toMatch(/startTransaction\(\)/);
    expect(adjustBlock).toMatch(/commitTransaction\(\)/);
  });
});

describe('inventory bugfix #4 — transfer() atomicity + performedBy', () => {
  test('transfer compensates (returns stock to source) if receive leg fails', () => {
    const transferBlock = SVC.slice(SVC.indexOf('async transfer('), SVC.indexOf('async adjust('));
    expect(transferBlock).toMatch(/catch/);
    expect(transferBlock).toMatch(/تعويض تحويل فاشل/);
  });
  test('transfer route passes performedBy (req.user._id)', () => {
    expect(ENH_ROUTES).toMatch(/svc\.transfer\([\s\S]*?req\.user\._id[\s\S]*?\)/);
  });
});

describe('inventory bugfix #8 — reorder considers reserved stock', () => {
  test('getReorderAlerts compares AVAILABLE (on-hand minus reserved)', () => {
    expect(SVC).toMatch(/totalOnHand - \(totalReserved/);
    expect(SVC).toMatch(/available <= item\.reorderPoint/);
  });
});
