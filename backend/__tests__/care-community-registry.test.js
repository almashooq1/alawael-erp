'use strict';

/**
 * care-community-registry.test.js — Phase 17 Commit 4 (4.0.86).
 */

const registry = require('../config/care/community.registry');

describe('Community registry — sanity', () => {
  it('validate() passes', () => {
    expect(() => registry.validate()).not.toThrow();
    expect(registry.validate()).toBe(true);
  });

  it('all taxonomies are frozen', () => {
    for (const t of [
      registry.PARTNER_CATEGORIES,
      registry.PARTNER_STATUSES,
      registry.LINKAGE_TYPES,
      registry.LINKAGE_STATUSES,
      registry.LINKAGE_PURPOSES,
    ]) {
      expect(Object.isFrozen(t)).toBe(true);
    }
  });

  it('has ≥ 10 partner categories + 3 partner statuses', () => {
    expect(registry.PARTNER_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    expect(registry.PARTNER_STATUSES.length).toBeGreaterThanOrEqual(3);
  });

  it('has exactly 4 linkage types + 4 linkage statuses', () => {
    expect(registry.LINKAGE_TYPES).toEqual(['ongoing', 'one_time', 'referral', 'collaboration']);
    expect(registry.LINKAGE_STATUSES).toEqual(['active', 'paused', 'ended', 'cancelled']);
  });

  it('all vocabularies are unique', () => {
    for (const arr of [
      registry.PARTNER_CATEGORIES,
      registry.PARTNER_STATUSES,
      registry.LINKAGE_TYPES,
      registry.LINKAGE_STATUSES,
      registry.LINKAGE_PURPOSES,
    ]) {
      expect(new Set(arr).size).toBe(arr.length);
    }
  });
});

describe('Community registry — helpers', () => {
  it('isValidPartnerCategory recognises known categories', () => {
    expect(registry.isValidPartnerCategory('school')).toBe(true);
    expect(registry.isValidPartnerCategory('mosque')).toBe(true);
    expect(registry.isValidPartnerCategory('bogus_category')).toBe(false);
  });

  it('isValidLinkageType recognises known types', () => {
    expect(registry.isValidLinkageType('ongoing')).toBe(true);
    expect(registry.isValidLinkageType('referral')).toBe(true);
    expect(registry.isValidLinkageType('bogus_type')).toBe(false);
  });
});

describe('Community registry — guarantees', () => {
  it('core partner categories present', () => {
    for (const c of ['school', 'mosque', 'charity', 'govt_agency', 'hospital', 'employer']) {
      expect(registry.PARTNER_CATEGORIES).toContain(c);
    }
  });

  it('core linkage purposes present', () => {
    for (const p of ['education', 'medical_treatment', 'financial_support', 'counseling']) {
      expect(registry.LINKAGE_PURPOSES).toContain(p);
    }
  });

  it('partner statuses include at minimum active + inactive', () => {
    expect(registry.PARTNER_STATUSES).toContain('active');
    expect(registry.PARTNER_STATUSES).toContain('inactive');
  });
});
