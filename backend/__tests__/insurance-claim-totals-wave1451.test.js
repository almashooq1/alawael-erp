'use strict';

/**
 * W1451 — insurance-claim total reconciliation guard.
 *
 * BUG (pre-fix): the InsuranceClaim pre('save') hook recomputed total_approved from
 * items on every save, silently zeroing an explicit lump-sum total set by
 * processClaimResponse(id, [], totalApproved) — losing approved revenue.
 *
 * FIX: reconcileClaimTotals derives totals from items only when items changed, and
 * always derives total_rejected from the two header totals.
 */

const { reconcileClaimTotals } = require('../intelligence/insurance-claim-money.lib');

describe('W1451 reconcileClaimTotals', () => {
  test('derives totals from items when items changed (itemized response / new claim)', () => {
    const doc = {
      total_claimed: 0,
      total_approved: 0,
      items: [
        { claimed_amount: 100, approved_amount: 80 },
        { claimed_amount: 50, approved_amount: 50 },
      ],
    };
    reconcileClaimTotals(doc, true);
    expect(doc.total_claimed).toBe(150);
    expect(doc.total_approved).toBe(130);
    expect(doc.total_rejected).toBe(20);
  });

  test('preserves an explicit lump-sum total_approved when items did NOT change', () => {
    const doc = {
      total_claimed: 5000,
      total_approved: 5000, // lump-sum set by processClaimResponse, no per-item amounts
      items: [
        { claimed_amount: 2500, approved_amount: 0 },
        { claimed_amount: 2500, approved_amount: 0 },
      ],
    };
    reconcileClaimTotals(doc, false); // items unchanged
    expect(doc.total_approved).toBe(5000); // NOT overwritten to 0
    expect(doc.total_claimed).toBe(5000);
    expect(doc.total_rejected).toBe(0); // 5000 - 5000, kept consistent
  });

  test('total_rejected is always the difference of the two header totals', () => {
    const doc = { total_claimed: 1000, total_approved: 600, items: [] };
    reconcileClaimTotals(doc, false);
    expect(doc.total_rejected).toBe(400);
  });

  test('no items + itemsChanged → leaves totals, still derives rejected', () => {
    const doc = { total_claimed: 300, total_approved: 200 };
    reconcileClaimTotals(doc, true);
    expect(doc.total_claimed).toBe(300);
    expect(doc.total_approved).toBe(200);
    expect(doc.total_rejected).toBe(100);
  });
});
