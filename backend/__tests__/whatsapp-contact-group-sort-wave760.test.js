'use strict';

/**
 * W760 — WhatsAppContactGroup sortMembers pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises sortMembers via the helper attached to module.exports — backs the
 * GET JSON members-listing route (with optional sort).
 */

const Group = require('../models/WhatsAppContactGroup');

const MEMBERS = [
  { phone: '966500000003', displayName: 'Charlie' },
  { phone: '966500000001', displayName: 'Alice' },
  { phone: '966500000002', displayName: null },
];

describe('W760 WhatsAppContactGroup — sortMembers', () => {
  it('sorts by phone by default', () => {
    const out = Group.sortMembers(MEMBERS);
    expect(out.map(m => m.phone)).toEqual(['966500000001', '966500000002', '966500000003']);
  });

  it('sorts by displayName with blanks last', () => {
    const out = Group.sortMembers(MEMBERS, 'name');
    expect(out[0].displayName).toBe('Alice');
    expect(out[1].displayName).toBe('Charlie');
    expect(out[2].displayName).toBeNull();
  });

  it('does not mutate the input list', () => {
    const copy = MEMBERS.slice();
    Group.sortMembers(MEMBERS, 'name');
    expect(MEMBERS).toEqual(copy);
  });

  it('returns a new array', () => {
    const out = Group.sortMembers(MEMBERS);
    expect(out).not.toBe(MEMBERS);
  });

  it('is robust to nullish input', () => {
    expect(Group.sortMembers(null)).toEqual([]);
    expect(Group.sortMembers(undefined, 'name')).toEqual([]);
  });
});
