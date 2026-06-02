'use strict';

/**
 * W758 — WhatsAppContactGroup renameMember pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises renameMember via the helper attached to module.exports — backs the
 * PATCH member route (rename a single member by phone).
 */

const Group = require('../models/WhatsAppContactGroup');

const MEMBERS = [
  { phone: '966500000001', displayName: 'Old A' },
  { phone: '966500000002', displayName: 'B' },
];

describe('W758 WhatsAppContactGroup — renameMember', () => {
  it('updates the matching member displayName', () => {
    const r = Group.renameMember(MEMBERS, '966500000001', 'New A');
    expect(r.updated).toBe(true);
    expect(r.members.find(m => m.phone === '966500000001').displayName).toBe('New A');
    expect(r.members.find(m => m.phone === '966500000002').displayName).toBe('B');
  });

  it('normalizes the phone before matching', () => {
    const r = Group.renameMember(MEMBERS, '+966 50 000 0002', 'Bee');
    expect(r.updated).toBe(true);
    expect(r.members.find(m => m.phone === '966500000002').displayName).toBe('Bee');
  });

  it('clears the name when given a blank value', () => {
    const r = Group.renameMember(MEMBERS, '966500000001', '   ');
    expect(r.updated).toBe(true);
    expect(r.members.find(m => m.phone === '966500000001').displayName).toBeNull();
  });

  it('reports updated:false when the phone is absent', () => {
    const r = Group.renameMember(MEMBERS, '966599999999', 'X');
    expect(r.updated).toBe(false);
    expect(r.members).toHaveLength(2);
  });

  it('is robust to empty / nullish inputs', () => {
    expect(Group.renameMember(null, '966500000001', 'X').updated).toBe(false);
    expect(Group.renameMember(MEMBERS, '', 'X').updated).toBe(false);
  });
});
