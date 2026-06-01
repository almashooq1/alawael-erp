'use strict';

/**
 * W759 — WhatsAppContactGroup findMember pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises findMember via the helper attached to module.exports — backs the
 * GET single-member route (fetch one member by phone).
 */

const Group = require('../models/WhatsAppContactGroup');

const MEMBERS = [
  { phone: '966500000001', displayName: 'A' },
  { phone: '966500000002', displayName: 'B' },
];

describe('W759 WhatsAppContactGroup — findMember', () => {
  it('returns the matching member', () => {
    const m = Group.findMember(MEMBERS, '966500000001');
    expect(m).not.toBeNull();
    expect(m.displayName).toBe('A');
  });

  it('normalizes the phone before matching', () => {
    const m = Group.findMember(MEMBERS, '+966 50 000 0002');
    expect(m).not.toBeNull();
    expect(m.phone).toBe('966500000002');
  });

  it('returns null when the phone is absent', () => {
    expect(Group.findMember(MEMBERS, '966599999999')).toBeNull();
  });

  it('returns null for a blank target', () => {
    expect(Group.findMember(MEMBERS, '   ')).toBeNull();
  });

  it('is robust to nullish member lists', () => {
    expect(Group.findMember(null, '966500000001')).toBeNull();
    expect(Group.findMember(undefined, '966500000001')).toBeNull();
  });
});
