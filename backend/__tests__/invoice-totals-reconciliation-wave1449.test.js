'use strict';

/**
 * W1449 — invoice totals reconciliation guard.
 *
 * BUG (pre-fix): the FinanceInvoice pre('save') hook stored ROUNDED VAT on each line
 * but accumulated the UNROUNDED per-line VAT into the header (`vatTotal += vat`), so
 * `header.vat_amount = round(Σ unrounded)` while the persisted lines summed to
 * `Σ round(...)`. These differ by ±0.01 per rounding boundary, so the invoice header
 * total did NOT reconcile to the sum of its line items — a ZATCA Phase-2 UBL
 * validation breaker (and the wrong total flowed into the QR TLV + journal entry).
 *
 * FIX: `computeInvoiceTotals` rounds each line first, then sums the rounded line
 * values for the header, guaranteeing header tax/total === Σ line tax/total and
 * total === taxable + vat.
 */

const { computeInvoiceTotals } = require('../intelligence/invoice-money.lib');

const round2 = n => Math.round(n * 100) / 100;
const sum = (lines, k) => round2(lines.reduce((s, l) => s + l[k], 0));

describe('W1449 computeInvoiceTotals reconciliation', () => {
  test('header tax/total reconcile to the sum of the line items (the ZATCA invariant)', () => {
    // 3 identical lines that hit a .x15 rounding boundary — the exact shape that
    // exposed the bug: each line VAT 1.515 → rounds to 1.52; Σ rounded = 4.56,
    // but round(Σ unrounded 4.545) = 4.55.
    const doc = {
      paid_amount: 0,
      lines: [
        { quantity: 1, unit_price: 10.1, vat_rate: 15 },
        { quantity: 1, unit_price: 10.1, vat_rate: 15 },
        { quantity: 1, unit_price: 10.1, vat_rate: 15 },
      ],
    };

    computeInvoiceTotals(doc);

    // Each line rounded independently.
    doc.lines.forEach(l => {
      expect(l.vat_amount).toBeCloseTo(1.52, 5);
      expect(l.total_amount).toBeCloseTo(11.62, 5);
      // line total reconciles to its own taxable + vat
      expect(l.total_amount).toBeCloseTo(round2(l.taxable_amount + l.vat_amount), 5);
    });

    // Header == Σ lines (the property the old code violated: it gave 4.55 / 34.85).
    expect(doc.vat_amount).toBeCloseTo(4.56, 5);
    expect(doc.total_amount).toBeCloseTo(34.86, 5);
    expect(doc.vat_amount).toBeCloseTo(sum(doc.lines, 'vat_amount'), 5);
    expect(doc.total_amount).toBeCloseTo(sum(doc.lines, 'total_amount'), 5);

    // Document invariant: total === taxable + vat.
    expect(doc.total_amount).toBeCloseTo(round2(doc.taxable_amount + doc.vat_amount), 5);
  });

  test('reconciles with per-line discounts', () => {
    const doc = {
      paid_amount: 0,
      lines: [
        { quantity: 2, unit_price: 33.33, vat_rate: 15, discount_percentage: 10 },
        { quantity: 1, unit_price: 99.99, vat_rate: 15 },
      ],
    };

    computeInvoiceTotals(doc);

    expect(doc.vat_amount).toBeCloseTo(sum(doc.lines, 'vat_amount'), 5);
    expect(doc.total_amount).toBeCloseTo(sum(doc.lines, 'total_amount'), 5);
    expect(doc.total_amount).toBeCloseTo(round2(doc.taxable_amount + doc.vat_amount), 5);
  });

  test('balance_due = total_amount - paid_amount', () => {
    const doc = {
      paid_amount: 10,
      lines: [{ quantity: 1, unit_price: 100, vat_rate: 15 }],
    };
    computeInvoiceTotals(doc);
    expect(doc.total_amount).toBeCloseTo(115, 5);
    expect(doc.balance_due).toBeCloseTo(105, 5);
  });

  test('is idempotent — recomputing a computed doc yields the same totals', () => {
    const mk = () => ({
      paid_amount: 0,
      lines: [
        { quantity: 1, unit_price: 10.1, vat_rate: 15 },
        { quantity: 3, unit_price: 7.77, vat_rate: 15 },
      ],
    });
    const once = computeInvoiceTotals(mk());
    const twice = computeInvoiceTotals(JSON.parse(JSON.stringify(once)));
    expect(twice.vat_amount).toBeCloseTo(once.vat_amount, 5);
    expect(twice.total_amount).toBeCloseTo(once.total_amount, 5);
  });

  test('no-ops on a doc with no lines', () => {
    const doc = { lines: [] };
    expect(() => computeInvoiceTotals(doc)).not.toThrow();
    expect(doc.total_amount).toBeUndefined();
  });
});
