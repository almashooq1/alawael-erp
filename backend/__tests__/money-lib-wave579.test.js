'use strict';

/**
 * W579 — money.lib canonical helper (audit #5, Money-Type Migration Phase 1).
 * Verifies exact SAR↔halalas conversion incl. classic float-trap values.
 */

const {
  toHalalas,
  toSar,
  formatSar,
  sumHalalas,
  applyPercent,
  deriveHalalas,
} = require('../intelligence/money.lib');

describe('money.lib', () => {
  describe('toHalalas', () => {
    it('converts whole and fractional SAR exactly', () => {
      expect(toHalalas(0)).toBe(0);
      expect(toHalalas(1)).toBe(100);
      expect(toHalalas(19.99)).toBe(1999);
      expect(toHalalas(100.5)).toBe(10050);
      expect(toHalalas(0.01)).toBe(1);
    });

    it('handles known float traps', () => {
      // 0.1 + 0.2 === 0.30000000000000004 in float; via halalas it is exact.
      expect(toHalalas(0.1) + toHalalas(0.2)).toBe(toHalalas(0.3));
      expect(toHalalas(0.07 * 100)).toBe(toHalalas(7)); // 0.07*100 = 7.000000000000001
    });

    it('accepts numeric strings', () => {
      expect(toHalalas('250.75')).toBe(25075);
    });

    it('treats null/undefined/empty as 0', () => {
      expect(toHalalas(null)).toBe(0);
      expect(toHalalas(undefined)).toBe(0);
      expect(toHalalas('')).toBe(0);
    });

    it('throws on non-numeric input', () => {
      expect(() => toHalalas('abc')).toThrow(/finite/);
      expect(() => toHalalas(NaN)).toThrow(/finite/);
      expect(() => toHalalas(Infinity)).toThrow(/finite/);
    });

    it('handles negative amounts (refunds/credits)', () => {
      expect(toHalalas(-19.99)).toBe(-1999);
    });
  });

  describe('toSar / formatSar', () => {
    it('round-trips losslessly', () => {
      for (const sar of [0, 1, 19.99, 100.5, 0.01, 12345.67, -50.25]) {
        expect(toSar(toHalalas(sar))).toBe(sar);
      }
    });

    it('formats a fixed 2-decimal SAR string', () => {
      expect(formatSar(1999)).toBe('19.99');
      expect(formatSar(100)).toBe('1.00');
      expect(formatSar(0)).toBe('0.00');
      expect(formatSar(5)).toBe('0.05');
    });

    it('rejects non-integer halalas', () => {
      expect(() => toSar(19.99)).toThrow(/integer/);
      expect(() => formatSar(19.5)).toThrow(/integer/);
    });
  });

  describe('sumHalalas', () => {
    it('sums exactly and ignores nullish', () => {
      expect(sumHalalas([1999, 100, 1])).toBe(2100);
      expect(sumHalalas([1999, null, 100, undefined])).toBe(2099);
      expect(sumHalalas([])).toBe(0);
      expect(sumHalalas(null)).toBe(0);
    });

    it('a sum of many 0.01 amounts stays exact (float would drift)', () => {
      const cents = Array.from({ length: 10000 }, () => toHalalas(0.01));
      expect(sumHalalas(cents)).toBe(10000); // 100.00 SAR exactly
    });

    it('throws on non-integer entry', () => {
      expect(() => sumHalalas([100, 19.99])).toThrow(/non-integer/);
    });
  });

  describe('deriveHalalas (dual-write helper)', () => {
    it('mirrors each named float field to an integer-halalas sibling', () => {
      const doc = { amount: 19.99, refund_amount: 5 };
      deriveHalalas(doc, ['amount', 'refund_amount']);
      expect(doc.amount_halalas).toBe(1999);
      expect(doc.refund_amount_halalas).toBe(500);
    });

    it('derives missing/null fields to 0', () => {
      const doc = { amount: 10 };
      deriveHalalas(doc, ['amount', 'refund_amount']);
      expect(doc.amount_halalas).toBe(1000);
      expect(doc.refund_amount_halalas).toBe(0);
    });

    it('is a no-op on bad input', () => {
      expect(deriveHalalas(null, ['x'])).toBe(null);
      const d = {};
      expect(deriveHalalas(d, 'notarray')).toBe(d);
    });

    it('handles dot-path fields nested in sub-objects', () => {
      const doc = { summary: { totalAllowances: 19.99, netPayable: 100 }, top: 5 };
      deriveHalalas(doc, ['summary.totalAllowances', 'summary.netPayable', 'top']);
      expect(doc.summary.totalAllowances_halalas).toBe(1999);
      expect(doc.summary.netPayable_halalas).toBe(10000);
      expect(doc.top_halalas).toBe(500);
    });

    it('derives 0 for a missing leaf under an existing parent', () => {
      const doc = { summary: { totalAllowances: 50 } };
      deriveHalalas(doc, ['summary.totalAllowances', 'summary.missing']);
      expect(doc.summary.missing_halalas).toBe(0);
    });

    it('safely skips a dot-path whose parent is absent', () => {
      const doc = { other: 1 };
      expect(() => deriveHalalas(doc, ['summary.totalAllowances'])).not.toThrow();
      expect(doc.summary).toBeUndefined();
    });

    it('skips empty/non-string field entries', () => {
      const doc = { amount: 10 };
      deriveHalalas(doc, ['', null, 'amount']);
      expect(doc.amount_halalas).toBe(1000);
    });
  });

  describe('applyPercent (VAT)', () => {
    it('computes 15% VAT to the halala', () => {
      // 100.00 SAR base → 15.00 VAT
      expect(applyPercent(toHalalas(100), 15)).toBe(toHalalas(15));
      // 19.99 SAR base → 2.9985 → rounds to 3.00 (300 halalas)
      expect(applyPercent(toHalalas(19.99), 15)).toBe(300);
    });

    it('rejects bad inputs', () => {
      expect(() => applyPercent(19.99, 15)).toThrow(/integer/);
      expect(() => applyPercent(1999, 'x')).toThrow(/finite/);
    });
  });
});
