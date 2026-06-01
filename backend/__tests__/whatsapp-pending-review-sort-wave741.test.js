/**
 * W741 — staff pending-review queue urgency ordering.
 *
 * `WhatsAppConversation.findPendingReview` previously sorted on the
 * `urgencyLevel` string enum with `.sort({ urgencyLevel: 1 })`, which orders
 * LEXICALLY: critical, high, low, medium — wrongly ranking `low` above
 * `medium` and `high`. The pure `sortPendingReview` helper now ranks by true
 * urgency, ties broken by most-recent activity. This locks that contract.
 */
'use strict';

const { sortPendingReview } = require('../models/WhatsAppConversation');

describe('W741 — pending-review queue urgency ordering', () => {
  test('ranks by true urgency (critical→high→medium→low), not lexically', () => {
    const t = (d) => new Date(d);
    const rows = [
      { _id: 'low-1', urgencyLevel: 'low', lastMessageAt: t('2026-01-03') },
      { _id: 'crit-1', urgencyLevel: 'critical', lastMessageAt: t('2026-01-01') },
      { _id: 'med-old', urgencyLevel: 'medium', lastMessageAt: t('2026-01-02') },
      { _id: 'high-1', urgencyLevel: 'high', lastMessageAt: t('2026-01-01') },
      { _id: 'med-new', urgencyLevel: 'medium', lastMessageAt: t('2026-01-05') },
    ];

    const out = sortPendingReview(rows);

    // critical, high, then the two mediums by recency (new before old), then low.
    expect(out.map((r) => r._id)).toEqual(['crit-1', 'high-1', 'med-new', 'med-old', 'low-1']);
  });

  test('does not mutate the input array', () => {
    const rows = [
      { _id: 'a', urgencyLevel: 'low', lastMessageAt: new Date('2026-01-01') },
      { _id: 'b', urgencyLevel: 'critical', lastMessageAt: new Date('2026-01-01') },
    ];
    const before = rows.map((r) => r._id);
    sortPendingReview(rows);
    expect(rows.map((r) => r._id)).toEqual(before);
  });

  test('tolerates empty / missing input and unknown urgency values', () => {
    expect(sortPendingReview()).toEqual([]);
    expect(sortPendingReview([])).toEqual([]);
    const rows = [
      { _id: 'known', urgencyLevel: 'high', lastMessageAt: new Date('2026-01-01') },
      { _id: 'unknown', urgencyLevel: 'weird', lastMessageAt: new Date('2026-01-02') },
    ];
    // Unknown urgency sinks below all known ranks.
    expect(sortPendingReview(rows).map((r) => r._id)).toEqual(['known', 'unknown']);
  });
});
