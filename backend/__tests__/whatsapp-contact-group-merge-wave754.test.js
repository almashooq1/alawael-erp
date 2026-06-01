'use strict';

/**
 * W754 — WhatsAppContactGroup mergeMembers pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises mergeMembers via the helper attached to module.exports — backs the
 * group-merge route (fold one group's members into another).
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W754 WhatsAppContactGroup — mergeMembers', () => {
  it('appends only the new members and de-dupes by phone', () => {
    const target = [{ phone: '966500000001' }, { phone: '966500000002' }];
    const source = [{ phone: '966500000002' }, { phone: '966500000003' }];
    const r = Group.mergeMembers(target, source);
    expect(r.addCount).toBe(1);
    expect(r.duplicateCount).toBe(1);
    expect(r.merged.map(m => m.phone).sort()).toEqual([
      '966500000001',
      '966500000002',
      '966500000003',
    ]);
  });

  it('keeps the target version on conflict (target wins)', () => {
    const target = [{ phone: '966500000001', displayName: 'Target' }];
    const source = [{ phone: '966500000001', displayName: 'Source' }];
    const r = Group.mergeMembers(target, source);
    expect(r.addCount).toBe(0);
    expect(r.merged).toHaveLength(1);
    expect(r.merged[0].displayName).toBe('Target');
  });

  it('normalizes phones across both sides before de-duping', () => {
    const r = Group.mergeMembers([{ phone: '+966 50 000 0001' }], [{ phone: '966500000001' }]);
    expect(r.addCount).toBe(0);
    expect(r.merged).toHaveLength(1);
  });

  it('is robust to empty / nullish inputs', () => {
    expect(Group.mergeMembers(null, [{ phone: '966500000009' }]).addCount).toBe(1);
    expect(Group.mergeMembers([{ phone: '966500000009' }], null).merged).toHaveLength(1);
    expect(Group.mergeMembers(null, null).merged).toEqual([]);
  });
});
