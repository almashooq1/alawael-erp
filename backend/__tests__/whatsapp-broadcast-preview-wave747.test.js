'use strict';

/**
 * W747 — WhatsAppContactGroup.partitionByEligibility pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises the read-only broadcast-preview partition logic via the helper
 * attached to module.exports (global mongoose mock can't run statics).
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W747 WhatsAppContactGroup — partitionByEligibility', () => {
  it('routes allowed phones to eligible and others to blocked, carrying reasons', () => {
    const members = [
      { phone: '966500000001', displayName: 'A' },
      { phone: '+966 500000002', displayName: 'B' },
      { phone: '966500000003', displayName: 'C' },
    ];
    const map = {
      966500000001: { allowed: true, reason: 'opted_in' },
      966500000002: { allowed: true, reason: 'in_service_window' },
      966500000003: { allowed: false, reason: 'opted_out' },
    };
    const { eligible, blocked, total } = Group.partitionByEligibility(members, map);
    expect(total).toBe(3);
    expect(eligible.map(m => m.phone)).toEqual(['966500000001', '966500000002']);
    expect(eligible[1].reason).toBe('in_service_window');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toBe('opted_out');
  });

  it('fails closed: a member with no map entry is blocked with reason "unknown"', () => {
    const { eligible, blocked } = Group.partitionByEligibility([{ phone: '966500000009' }], {});
    expect(eligible).toHaveLength(0);
    expect(blocked[0].reason).toBe('unknown');
  });

  it('blocks members with no valid phone (reason no_phone)', () => {
    const { blocked } = Group.partitionByEligibility([{ phone: 'abc', displayName: 'X' }], {});
    expect(blocked[0].reason).toBe('no_phone');
    expect(blocked[0].phone).toBe('');
  });

  it('normalizes phones before map lookup (+ and spaces ignored)', () => {
    const map = { 966500000001: { allowed: true, reason: 'opted_in' } };
    const { eligible } = Group.partitionByEligibility([{ phone: '+966 500-000-001' }], map);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].phone).toBe('966500000001');
  });

  it('returns empty partitions for nullish / non-array members', () => {
    expect(Group.partitionByEligibility(null, {})).toEqual({ eligible: [], blocked: [], total: 0 });
    expect(Group.partitionByEligibility(undefined)).toEqual({
      eligible: [],
      blocked: [],
      total: 0,
    });
  });
});
