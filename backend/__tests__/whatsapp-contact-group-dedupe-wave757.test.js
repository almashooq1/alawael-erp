'use strict';

/**
 * W757 — WhatsAppContactGroup dedupeReport pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises dedupeReport via the helper attached to module.exports — backs the
 * dedupe route (collapse duplicate members within a group).
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W757 WhatsAppContactGroup — dedupeReport', () => {
  it('collapses duplicate phones and counts removals', () => {
    const r = Group.dedupeReport([
      { phone: '966500000001', displayName: 'A' },
      { phone: '966500000001', displayName: 'A2' },
      { phone: '966500000002', displayName: 'B' },
    ]);
    expect(r.removedCount).toBe(1);
    expect(r.deduped).toHaveLength(2);
  });

  it('treats differently-formatted phones as the same', () => {
    const r = Group.dedupeReport([{ phone: '966500000001' }, { phone: '+966 50 000 0001' }]);
    expect(r.removedCount).toBe(1);
    expect(r.deduped).toHaveLength(1);
  });

  it('last entry wins on conflict', () => {
    const r = Group.dedupeReport([
      { phone: '966500000001', displayName: 'old' },
      { phone: '966500000001', displayName: 'new' },
    ]);
    expect(r.deduped[0].displayName).toBe('new');
  });

  it('reports zero removals for an already-clean list', () => {
    const r = Group.dedupeReport([{ phone: '966500000001' }, { phone: '966500000002' }]);
    expect(r.removedCount).toBe(0);
    expect(r.deduped).toHaveLength(2);
  });

  it('is robust to empty / nullish inputs', () => {
    expect(Group.dedupeReport(null).removedCount).toBe(0);
    expect(Group.dedupeReport([]).deduped).toEqual([]);
  });
});
