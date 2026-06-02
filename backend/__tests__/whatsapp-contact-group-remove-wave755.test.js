'use strict';

/**
 * W755 — WhatsAppContactGroup removeMembers pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises removeMembers via the helper attached to module.exports — backs the
 * bulk-remove route (drop members by phone list).
 */

const Group = require('../models/WhatsAppContactGroup');

const MEMBERS = [
  { phone: '966500000001', displayName: 'A' },
  { phone: '966500000002', displayName: 'B' },
  { phone: '966500000003', displayName: 'C' },
];

describe('W755 WhatsAppContactGroup — removeMembers', () => {
  it('drops matching members and keeps the rest', () => {
    const r = Group.removeMembers(MEMBERS, ['966500000002']);
    expect(r.removedCount).toBe(1);
    expect(r.remaining.map(m => m.phone)).toEqual(['966500000001', '966500000003']);
  });

  it('normalizes phones before matching', () => {
    const r = Group.removeMembers(MEMBERS, ['+966 50 000 0001']);
    expect(r.removedCount).toBe(1);
    expect(r.remaining.map(m => m.phone)).toEqual(['966500000002', '966500000003']);
  });

  it('counts requested phones that are not present', () => {
    const r = Group.removeMembers(MEMBERS, ['966500000002', '966599999999']);
    expect(r.removedCount).toBe(1);
    expect(r.notFoundCount).toBe(1);
  });

  it('removes a phone at most once even if requested twice', () => {
    const r = Group.removeMembers(MEMBERS, ['966500000001', '966500000001']);
    expect(r.removedCount).toBe(1);
    expect(r.notFoundCount).toBe(0);
  });

  it('is robust to empty / nullish inputs', () => {
    expect(Group.removeMembers(null, ['966500000001']).remaining).toEqual([]);
    expect(Group.removeMembers(MEMBERS, null).removedCount).toBe(0);
    expect(Group.removeMembers(MEMBERS, []).remaining).toHaveLength(3);
  });
});
