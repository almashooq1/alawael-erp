'use strict';

/**
 * W749 — WhatsAppContactGroup.summarizeGroups pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises the read-only contact-groups stats roll-up via the helper attached
 * to module.exports (the global mongoose mock can't run custom statics).
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W749 WhatsAppContactGroup — summarizeGroups', () => {
  it('aggregates totals, per-tag member distribution, and the largest group', () => {
    const groups = [
      { _id: 'a', name: 'Parents', tags: ['parents', 'vip'], members: [{}, {}, {}] },
      { _id: 'b', name: 'Staff', tags: ['staff'], members: [{}, {}] },
      { _id: 'c', name: 'Empty', tags: ['parents'], members: [] },
    ];
    const s = Group.summarizeGroups(groups);
    expect(s.totalGroups).toBe(3);
    expect(s.totalMembers).toBe(5);
    // tag member-count = sum of memberCount of groups carrying that tag
    expect(s.byTag).toEqual({ parents: 3, vip: 3, staff: 2 });
    expect(s.largest).toEqual({ id: 'a', name: 'Parents', memberCount: 3 });
  });

  it('returns an empty summary for nullish / empty input', () => {
    const s = Group.summarizeGroups(null);
    expect(s).toEqual({ totalGroups: 0, totalMembers: 0, byTag: {}, largest: null });
  });

  it('is robust to groups missing members/tags arrays', () => {
    const s = Group.summarizeGroups([{ _id: 'x', name: 'X' }]);
    expect(s.totalMembers).toBe(0);
    expect(s.byTag).toEqual({});
    expect(s.largest).toEqual({ id: 'x', name: 'X', memberCount: 0 });
  });

  it('ignores non-string / empty tags without crashing', () => {
    const s = Group.summarizeGroups([
      { _id: 'y', name: 'Y', tags: ['', null, 7, 'ok'], members: [{}] },
    ]);
    expect(s.byTag).toEqual({ ok: 1 });
  });
});
