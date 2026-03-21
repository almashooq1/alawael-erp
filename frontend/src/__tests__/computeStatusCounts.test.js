/**
 * Tests for computeStatusCounts utility
 * @module computeStatusCounts.test
 *
 * Covers:
 * - Non-array guard returns { _total: 0 }
 * - Empty array returns { _total: 0 }
 * - Default field = 'status'
 * - Custom field parameter
 * - Optional statuses whitelist (pre-seeded keys)
 * - Open-ended counting (no whitelist)
 * - Items with undefined/null field values
 * - _total accuracy across all scenarios
 */

import computeStatusCounts from '../utils/computeStatusCounts';

describe('computeStatusCounts', () => {
  // ─── Guard: non-array inputs ────────────────────────
  describe('non-array input guard', () => {
    it.each([null, undefined, 42, 'string', {}, true])('returns { _total: 0 } for %p', input => {
      expect(computeStatusCounts(input)).toEqual({ _total: 0 });
    });
  });

  // ─── Empty array ────────────────────────────────────
  it('returns { _total: 0 } for empty array', () => {
    expect(computeStatusCounts([])).toEqual({ _total: 0 });
  });

  // ─── Default field "status" ─────────────────────────
  describe('default field "status"', () => {
    const items = [
      { status: 'active' },
      { status: 'active' },
      { status: 'pending' },
      { status: 'inactive' },
    ];

    it('counts all distinct values when no whitelist given', () => {
      const result = computeStatusCounts(items);
      expect(result.active).toBe(2);
      expect(result.pending).toBe(1);
      expect(result.inactive).toBe(1);
      expect(result._total).toBe(4);
    });

    it('counts only whitelisted statuses', () => {
      const result = computeStatusCounts(items, 'status', ['active', 'pending']);
      expect(result.active).toBe(2);
      expect(result.pending).toBe(1);
      expect(result.inactive).toBeUndefined();
      expect(result._total).toBe(4);
    });

    it('pre-seeds whitelisted keys to 0 even when absent', () => {
      const result = computeStatusCounts([], 'status', ['active', 'closed']);
      expect(result.active).toBe(0);
      expect(result.closed).toBe(0);
      expect(result._total).toBe(0);
    });
  });

  // ─── Custom field ───────────────────────────────────
  describe('custom field parameter', () => {
    const items = [
      { type: 'income' },
      { type: 'expense' },
      { type: 'income' },
      { type: 'transfer' },
    ];

    it('groups by custom field name', () => {
      const result = computeStatusCounts(items, 'type');
      expect(result.income).toBe(2);
      expect(result.expense).toBe(1);
      expect(result.transfer).toBe(1);
      expect(result._total).toBe(4);
    });

    it('custom field with whitelist', () => {
      const result = computeStatusCounts(items, 'type', ['income', 'expense']);
      expect(result.income).toBe(2);
      expect(result.expense).toBe(1);
      expect(result.transfer).toBeUndefined();
      expect(result._total).toBe(4);
    });
  });

  // ─── Edge cases ─────────────────────────────────────
  describe('edge cases', () => {
    it('handles items with undefined field values', () => {
      const items = [{ status: 'active' }, { name: 'no status' }, {}];
      const result = computeStatusCounts(items);
      expect(result.active).toBe(1);
      expect(result.undefined).toBe(2);
      expect(result._total).toBe(3);
    });

    it('handles items with null field values', () => {
      const items = [{ status: null }, { status: 'ok' }];
      const result = computeStatusCounts(items);
      expect(result.null).toBe(1);
      expect(result.ok).toBe(1);
      expect(result._total).toBe(2);
    });

    it('does not count undefined values when whitelist is provided', () => {
      const items = [{ status: 'active' }, { name: 'no status' }];
      const result = computeStatusCounts(items, 'status', ['active']);
      expect(result.active).toBe(1);
      // _total still counts every item
      expect(result._total).toBe(2);
    });

    it('handles large arrays efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        status: i % 3 === 0 ? 'a' : i % 3 === 1 ? 'b' : 'c',
      }));
      const result = computeStatusCounts(items, 'status', ['a', 'b', 'c']);
      expect(result.a + result.b + result.c).toBe(10000);
      expect(result._total).toBe(10000);
    });

    it('handles single item', () => {
      const result = computeStatusCounts([{ status: 'solo' }]);
      expect(result.solo).toBe(1);
      expect(result._total).toBe(1);
    });
  });
});
