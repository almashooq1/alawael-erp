/**
 * Integrity guards for the last two inventory bug-hunt follow-ups (2026-06-29):
 *
 *  #5 — PO receive (`POST /purchase-orders/:id/receive`) never validated
 *       `quantity_received` (a missing/NaN/≤0 value corrupts stock into NaN
 *       forever) and never deduped `received_items` (sending the same item_id
 *       twice double-counted). It also recomputed quantity_before from the
 *       already-mutated on-hand.
 *  #6 — `approveStockCount()` applied each reconciliation in its own write (no
 *       session → partial-apply on mid-loop failure), wrote NO adjustment ledger
 *       entry for the corrections, and never computed `discrepancyValue`.
 *
 * Static source guards (sessions/transactions can't run on standalone MMS).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTES = fs.readFileSync(
  path.join(__dirname, '../routes/inventory-module.routes.js'),
  'utf8'
);
const SVC = fs.readFileSync(
  path.join(__dirname, '../services/inventory/inventory-enhanced.service.js'),
  'utf8'
);

describe('inventory #5 — PO receive validation + dedup', () => {
  test('rejects a non-finite / non-positive received quantity', () => {
    expect(ROUTES).toMatch(/Number\.isFinite\(qtyR\)\s*\|\|\s*qtyR <= 0/);
    expect(ROUTES).toMatch(/كمية مستلمة غير صالحة/);
  });
  test('rejects duplicate item_id lines in one receive payload', () => {
    expect(ROUTES).toMatch(/seenItems/);
    expect(ROUTES).toMatch(/صنف مكرر في طلب الاستلام/);
  });
  test('records quantity_before from the pre-mutation on-hand', () => {
    expect(ROUTES).toMatch(/const beforeQty = item\.quantity_on_hand/);
    expect(ROUTES).toMatch(/quantity_before: beforeQty/);
  });
});

describe('inventory #6 — approveStockCount atomicity + audit + discrepancyValue', () => {
  const block = SVC.slice(SVC.indexOf('async approveStockCount('), SVC.indexOf('async createItem('));

  test('runs inside a session/transaction', () => {
    expect(block).toMatch(/startTransaction\(\)/);
    expect(block).toMatch(/commitTransaction\(\)/);
    expect(block).toMatch(/abortTransaction\(\)/);
  });
  test('writes an `adjust` ledger entry per corrected item (audit trail)', () => {
    expect(block).toMatch(/transactionType: 'adjust'/);
    expect(block).toMatch(/quantityBefore: before/);
    expect(block).toMatch(/quantity: delta/);
  });
  test('computes + persists discrepancyValue', () => {
    expect(block).toMatch(/discrepancyValue \+= Math\.abs\(delta\)/);
    expect(block).toMatch(/discrepancyValue }/);
  });
});
