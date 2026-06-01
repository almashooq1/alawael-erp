'use strict';

/**
 * W746 — WhatsAppContactGroup pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * The global mongoose mock (jest.setup.js) returns a generic model without the
 * custom statics, so we exercise only the pure helpers attached to
 * module.exports: normalizePhone, normalizeMember, dedupeMembers,
 * groupScopedFilter, listScopedFilter.
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W746 WhatsAppContactGroup — normalizePhone', () => {
  it('strips +, spaces, dashes and parentheses to digits-only', () => {
    expect(Group.normalizePhone('+966 51-234 5678')).toBe('966512345678');
    expect(Group.normalizePhone('(966) 5123-45678')).toBe('966512345678');
  });

  it('returns empty string for nullish / non-digit input', () => {
    expect(Group.normalizePhone(null)).toBe('');
    expect(Group.normalizePhone(undefined)).toBe('');
    expect(Group.normalizePhone('abc')).toBe('');
  });
});

describe('W746 WhatsAppContactGroup — normalizeMember', () => {
  it('normalizes phone and trims display name, defaulting links to null', () => {
    expect(Group.normalizeMember({ phone: '+966 512345678', displayName: '  أم محمد  ' })).toEqual({
      phone: '966512345678',
      displayName: 'أم محمد',
      beneficiaryId: null,
      familyMemberId: null,
    });
  });

  it('returns null when the phone has no digits', () => {
    expect(Group.normalizeMember({ phone: 'no-digits' })).toBeNull();
    expect(Group.normalizeMember(null)).toBeNull();
  });

  it('preserves beneficiaryId / familyMemberId links when supplied', () => {
    const m = Group.normalizeMember({
      phone: '966500000001',
      beneficiaryId: 'b1',
      familyMemberId: 'f1',
    });
    expect(m.beneficiaryId).toBe('b1');
    expect(m.familyMemberId).toBe('f1');
  });
});

describe('W746 WhatsAppContactGroup — dedupeMembers', () => {
  it('dedupes by normalized phone, last-wins, and drops invalid rows', () => {
    const out = Group.dedupeMembers([
      { phone: '+966 512345678', displayName: 'First' },
      { phone: '966512345678', displayName: 'Updated' },
      { phone: 'invalid' },
      { phone: '966500000002' },
    ]);
    expect(out).toHaveLength(2);
    const first = out.find(m => m.phone === '966512345678');
    expect(first.displayName).toBe('Updated');
  });

  it('returns [] for nullish / non-array input', () => {
    expect(Group.dedupeMembers(null)).toEqual([]);
    expect(Group.dedupeMembers(undefined)).toEqual([]);
  });
});

describe('W746 WhatsAppContactGroup — groupScopedFilter (W269 isolation)', () => {
  it('always pins isDeleted:false and adds organizationId when present', () => {
    expect(Group.groupScopedFilter('g1', 'org9')).toEqual({
      _id: 'g1',
      isDeleted: false,
      organizationId: 'org9',
    });
  });

  it('omits organizationId for cross-branch (no-org) callers', () => {
    expect(Group.groupScopedFilter('g1')).toEqual({ _id: 'g1', isDeleted: false });
  });
});

describe('W746 WhatsAppContactGroup — listScopedFilter', () => {
  it('pins isDeleted:false and scopes to org', () => {
    expect(Group.listScopedFilter('org9')).toEqual({ isDeleted: false, organizationId: 'org9' });
  });

  it('adds case-insensitive name regex when search supplied', () => {
    const f = Group.listScopedFilter('org9', { search: ' نطق ' });
    expect(f.name).toEqual({ $regex: 'نطق', $options: 'i' });
  });

  it('filters by tag when supplied', () => {
    expect(Group.listScopedFilter('org9', { tag: 'VIP' }).tags).toBe('VIP');
  });

  it('returns a fresh object each call (no shared mutation)', () => {
    const a = Group.listScopedFilter('org9');
    const b = Group.listScopedFilter('org9');
    expect(a).not.toBe(b);
  });
});
