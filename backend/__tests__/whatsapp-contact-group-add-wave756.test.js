'use strict';

/**
 * W756 — WhatsAppContactGroup addMembers pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises addMembers via the helper attached to module.exports — backs the
 * bulk-add route (add members from a plain phone list).
 */

const Group = require('../models/WhatsAppContactGroup');

const EXISTING = [
  { phone: '966500000001', displayName: 'A' },
  { phone: '966500000002', displayName: 'B' },
];

describe('W756 WhatsAppContactGroup — addMembers', () => {
  it('adds new phones and de-dupes against existing', () => {
    const r = Group.addMembers(EXISTING, ['966500000003', '966500000002']);
    expect(r.addedCount).toBe(1);
    expect(r.duplicateCount).toBe(1);
    expect(r.merged.map(m => m.phone)).toContain('966500000003');
  });

  it('accepts object entries and normalizes phones', () => {
    const r = Group.addMembers(EXISTING, [{ phone: '+966 50 000 0009', displayName: 'C' }]);
    expect(r.addedCount).toBe(1);
    const added = r.merged.find(m => m.phone === '966500000009');
    expect(added.displayName).toBe('C');
  });

  it('counts invalid entries (no digits) separately', () => {
    const r = Group.addMembers(EXISTING, ['abc', '', '966500000007']);
    expect(r.invalidCount).toBe(2);
    expect(r.addedCount).toBe(1);
  });

  it('de-dupes within the incoming list (last wins)', () => {
    const r = Group.addMembers([], ['966500000005', '966500000005']);
    expect(r.addedCount).toBe(1);
    expect(r.merged).toHaveLength(1);
  });

  it('is robust to empty / nullish inputs', () => {
    expect(Group.addMembers(null, ['966500000001']).merged).toHaveLength(1);
    expect(Group.addMembers(EXISTING, null).addedCount).toBe(0);
    expect(Group.addMembers(EXISTING, []).merged).toHaveLength(2);
  });
});
