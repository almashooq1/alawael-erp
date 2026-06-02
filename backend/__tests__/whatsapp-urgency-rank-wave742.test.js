/**
 * W742 — urgency→rank mapping for the WhatsApp conversation list sort.
 *
 * The GET /conversations list is paginated, so it must sort in the DB. The
 * `urgencyLevel` string enum sorts lexically (critical, high, low, medium),
 * mis-ranking `low` above `medium`/`high`. A stored numeric `urgencyRank`
 * (higher = more urgent), kept in sync by model hooks, fixes the DB sort.
 * This locks the single source-of-truth mapping.
 */
'use strict';

const { urgencyRankFor } = require('../models/WhatsAppConversation');

describe('W742 — urgencyRankFor mapping', () => {
  test('ranks critical highest, low lowest', () => {
    expect(urgencyRankFor('critical')).toBeGreaterThan(urgencyRankFor('high'));
    expect(urgencyRankFor('high')).toBeGreaterThan(urgencyRankFor('medium'));
    expect(urgencyRankFor('medium')).toBeGreaterThan(urgencyRankFor('low'));
  });

  test('descending numeric sort yields the correct urgency order', () => {
    const levels = ['low', 'critical', 'medium', 'high'];
    const ordered = levels.slice().sort((a, b) => urgencyRankFor(b) - urgencyRankFor(a));
    expect(ordered).toEqual(['critical', 'high', 'medium', 'low']);
  });

  test('unknown / missing levels sink below all known ranks', () => {
    expect(urgencyRankFor('weird')).toBe(0);
    expect(urgencyRankFor(undefined)).toBe(0);
    expect(urgencyRankFor('weird')).toBeLessThan(urgencyRankFor('low'));
  });
});
