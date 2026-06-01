'use strict';

/**
 * W753 — WhatsAppContactGroup searchMembers pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises searchMembers via the helper attached to module.exports — backs the
 * read-only in-group member search route.
 */

const Group = require('../models/WhatsAppContactGroup');

const MEMBERS = [
  { phone: '966500000001', displayName: 'Ahmed Ali' },
  { phone: '966500000002', displayName: 'Sara Omar' },
  { phone: '966512345678', displayName: 'Ahmed Hassan' },
];

describe('W753 WhatsAppContactGroup — searchMembers', () => {
  it('returns all members for a blank / nullish query', () => {
    expect(Group.searchMembers(MEMBERS, '')).toHaveLength(3);
    expect(Group.searchMembers(MEMBERS, '   ')).toHaveLength(3);
    expect(Group.searchMembers(MEMBERS, null)).toHaveLength(3);
  });

  it('matches by displayName case-insensitively', () => {
    const r = Group.searchMembers(MEMBERS, 'ahmed');
    expect(r.map(m => m.phone)).toEqual(['966500000001', '966512345678']);
  });

  it('matches by phone digits, ignoring punctuation in the query', () => {
    const r = Group.searchMembers(MEMBERS, '+966 51 234');
    expect(r.map(m => m.phone)).toEqual(['966512345678']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(Group.searchMembers(MEMBERS, 'zzz')).toEqual([]);
  });

  it('is robust to missing / nullish member list', () => {
    expect(Group.searchMembers(null, 'a')).toEqual([]);
    expect(Group.searchMembers([{ phone: '966500000009' }], 'a')).toEqual([]);
  });
});
