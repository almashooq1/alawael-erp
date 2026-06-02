'use strict';

/**
 * W752 — WhatsAppContactGroup diffMembers pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises diffMembers via the helper attached to module.exports — backs the
 * CSV-import dry-run preview (new vs already-present members).
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W752 WhatsAppContactGroup — diffMembers', () => {
  it('splits incoming members into new vs already-present by phone', () => {
    const existing = [{ phone: '966500000001' }, { phone: '966500000002' }];
    const incoming = [
      { phone: '966500000002', displayName: 'Dup' },
      { phone: '966500000003', displayName: 'New' },
    ];
    const d = Group.diffMembers(existing, incoming);
    expect(d.addCount).toBe(1);
    expect(d.duplicateCount).toBe(1);
    expect(d.toAdd.map(m => m.phone)).toEqual(['966500000003']);
    expect(d.duplicates.map(m => m.phone)).toEqual(['966500000002']);
  });

  it('normalizes phones on both sides before comparing', () => {
    const d = Group.diffMembers([{ phone: '+966 50 000 0001' }], [{ phone: '966500000001' }]);
    expect(d.addCount).toBe(0);
    expect(d.duplicateCount).toBe(1);
  });

  it('de-dupes the incoming set itself before diffing', () => {
    const d = Group.diffMembers([], [{ phone: '966500000005' }, { phone: '966500000005' }]);
    expect(d.addCount).toBe(1);
  });

  it('treats everything as new against empty / nullish existing', () => {
    const incoming = [{ phone: '966500000006' }, { phone: '966500000007' }];
    expect(Group.diffMembers(null, incoming).addCount).toBe(2);
    expect(Group.diffMembers([], incoming).duplicateCount).toBe(0);
  });

  it('returns an empty diff for empty / nullish incoming', () => {
    const d = Group.diffMembers([{ phone: '966500000001' }], null);
    expect(d).toEqual({ toAdd: [], duplicates: [], addCount: 0, duplicateCount: 0 });
  });
});
