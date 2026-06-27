'use strict';

/**
 * W1463 — atomic numbering wave guard.
 *
 * Replaces racy `countDocuments()+1` numbering (duplicate id / E11000 under concurrent
 * creation) with the atomic `counter.nextSequence()` across 8 sites, PRESERVING each
 * existing human-facing format. Covers: the new counter definitions, the seed-migration
 * max-extraction logic (the correctness-critical part — a wrong max → prod collisions),
 * and a static drift check that the sites no longer use countDocuments()+1 numbering.
 */

const fs = require('fs');
const path = require('path');
const { COUNTER_DEFINITIONS, nextSequence } = require('../database/utils/counter');
const { computeMaxima, SOURCES } = require('../scripts/seed-numbering-counters');

describe('W1463 counter definitions + primitive', () => {
  test('nextSequence is exported', () => {
    expect(typeof nextSequence).toBe('function');
  });

  test.each([
    ['journal_entry', 'never'],
    ['helpdesk_ticket', 'never'],
    ['insurance_claim', 'yearly'],
    ['finance_invoice', 'yearly'],
    ['inv_purchase_order', 'yearly'],
    ['inv_stock_count', 'yearly'],
    ['inv_item', 'never'],
    ['inv_supplier', 'never'],
  ])('definition %s exists with resetOn=%s and startAt 1', (name, resetOn) => {
    const def = COUNTER_DEFINITIONS[name];
    expect(def).toBeTruthy();
    expect(def.resetOn).toBe(resetOn);
    expect(def.startAt).toBe(1);
  });
});

describe('W1463 seed computeMaxima (the collision-prevention logic)', () => {
  const src = name => SOURCES.find(s => s.counter === name);

  test('non-yearly: overall max across padded values', () => {
    const r = computeMaxima(['JE-001', 'JE-047', 'JE-009', 'garbage', null], src('journal_entry'));
    expect(r).toEqual({ '*': 47 });
  });

  test('yearly: max PER YEAR (so each year-scoped counter is seeded correctly)', () => {
    const r = computeMaxima(
      ['INV-2025-0000010', 'INV-2026-0000003', 'INV-2026-0000041', 'INV-2025-0000002'],
      src('finance_invoice')
    );
    expect(r).toEqual({ '2025': 10, '2026': 41 });
  });

  test('ignores values that do not match the format', () => {
    const r = computeMaxima(['HD-00005', 'TKT-99', 'HD-bad', 'HD-00012'], src('helpdesk_ticket'));
    expect(r).toEqual({ '*': 12 });
  });

  test('empty / no matches → empty (counter left at startAt)', () => {
    expect(computeMaxima([], src('inv_item'))).toEqual({});
    expect(computeMaxima(['nope'], src('inv_supplier'))).toEqual({});
  });

  test('every SOURCE regex round-trips its own format', () => {
    const samples = {
      journal_entry: 'JE-007',
      helpdesk_ticket: 'HD-00007',
      insurance_claim: 'CLM-2026-000007',
      finance_invoice: 'INV-2026-0000007',
      inv_purchase_order: 'PO-2026-0007',
      inv_stock_count: 'SC-2026-007',
      inv_item: 'ITM-0007',
      inv_supplier: 'SUP-007',
    };
    for (const s of SOURCES) {
      const r = computeMaxima([samples[s.counter]], s);
      const max = Math.max(...Object.values(r));
      expect(max).toBe(7);
    }
  });
});

describe('W1463 sites no longer use countDocuments()+1 numbering', () => {
  const reads = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  test.each([
    ['models/JournalEntry.js', /nextSequence\('journal_entry'\)/, /JE-\$\{String\(seq\)/],
    ['models/HelpDesk.js', /nextSequence\('helpdesk_ticket'\)/, /HD-\$\{String\(seq\)/],
    ['models/finance/InsuranceClaim.js', /nextSequence\('insurance_claim'\)/, /CLM-\$\{year\}-\$\{String\(seq\)/],
    ['models/finance/Invoice.js', /nextSequence\('finance_invoice'\)/, /INV-\$\{year\}-\$\{String\(seq\)/],
  ])('%s uses nextSequence + preserves its format', (file, usesSeq, keepsFormat) => {
    const src = reads(file);
    expect(src).toMatch(usesSeq);
    expect(src).toMatch(keepsFormat);
  });

  test('inventory service uses nextSequence for all four ids', () => {
    const src = reads('services/inventory/inventory-enhanced.service.js');
    ['inv_purchase_order', 'inv_stock_count', 'inv_item', 'inv_supplier'].forEach(c =>
      expect(src).toMatch(new RegExp(`nextSequence\\('${c}'\\)`))
    );
  });
});
