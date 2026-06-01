/**
 * W745 — full 4-tier urgency breakdown in WhatsApp conversation analytics.
 *
 * Before W745, getAnalytics emitted only `criticalCount`, so the queue
 * dashboard could not size the high / medium / low urgency tiers. The pure
 * `urgencyCountAccumulators()` helper produces the $group accumulators for all
 * four tiers; this test locks its shape (statics can't be exercised under the
 * global mongoose mock, so the helper is attached to module.exports).
 */
'use strict';

const { urgencyCountAccumulators } = require('../models/WhatsAppConversation');

describe('W745 — urgencyCountAccumulators', () => {
  test('emits one counting accumulator per urgency tier', () => {
    const acc = urgencyCountAccumulators();
    expect(Object.keys(acc).sort()).toEqual(
      ['criticalCount', 'highCount', 'lowCount', 'mediumCount'].sort()
    );
  });

  test('each accumulator counts its own urgencyLevel via $sum/$cond', () => {
    const acc = urgencyCountAccumulators();
    for (const [key, level] of [
      ['criticalCount', 'critical'],
      ['highCount', 'high'],
      ['mediumCount', 'medium'],
      ['lowCount', 'low'],
    ]) {
      expect(acc[key]).toEqual({ $sum: { $cond: [{ $eq: ['$urgencyLevel', level] }, 1, 0] } });
    }
  });

  test('preserves the pre-W745 criticalCount expression exactly', () => {
    expect(urgencyCountAccumulators().criticalCount).toEqual({
      $sum: { $cond: [{ $eq: ['$urgencyLevel', 'critical'] }, 1, 0] },
    });
  });

  test('returns a fresh object each call (no shared mutable state)', () => {
    expect(urgencyCountAccumulators()).not.toBe(urgencyCountAccumulators());
  });
});
