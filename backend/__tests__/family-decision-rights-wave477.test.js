'use strict';

/**
 * W477 drift guard — Family decision-rights structure.
 *
 * Locks the multi-generational family decision ladder per v3 §9.2.
 */

const lib = require('../intelligence/family-decision-rights.lib');

describe('W477 — module surface', () => {
  it('exports public API', () => {
    expect(typeof lib.requiredConsultations).toBe('function');
    expect(typeof lib.isConsultationComplete).toBe('function');
    expect(typeof lib.primaryDecisionMaker).toBe('function');
  });

  it('exposes 6 DECISION_CATEGORIES + DEFAULT_CONSULTATIONS + ROLE_RANK', () => {
    expect(lib.DECISION_CATEGORIES).toEqual([
      'routine',
      'minor',
      'standard',
      'major',
      'critical',
      'irreversible',
    ]);
    expect(lib.DEFAULT_CONSULTATIONS).toBeDefined();
    expect(lib.ROLE_RANK).toBeDefined();
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });

  it('escalating categories: more consultations at higher tiers', () => {
    expect(lib.DEFAULT_CONSULTATIONS.routine.length).toBeLessThan(
      lib.DEFAULT_CONSULTATIONS.irreversible.length
    );
  });

  it('irreversible includes tribal_elder + guardian_court_appointed', () => {
    expect(lib.DEFAULT_CONSULTATIONS.irreversible).toContain('tribal_elder');
    expect(lib.DEFAULT_CONSULTATIONS.irreversible).toContain('guardian_court_appointed');
  });
});

describe('W477 — requiredConsultations', () => {
  it('returns empty for unknown category', () => {
    const r = lib.requiredConsultations('unknown_category');
    expect(r.required).toEqual([]);
    expect(r.reasonAr).toMatch(/غير معروفة/);
  });

  it('routine requires only primary_caregiver', () => {
    const r = lib.requiredConsultations('routine', { familyType: 'extended' });
    expect(r.required).toEqual(['primary_caregiver']);
  });

  it('standard requires primary + father (extended family)', () => {
    const r = lib.requiredConsultations('standard', { familyType: 'extended' });
    expect(r.required).toContain('primary_caregiver');
    expect(r.required).toContain('father');
  });

  it('critical requires primary + father + mother + grandfather_paternal (extended)', () => {
    const r = lib.requiredConsultations('critical', { familyType: 'extended' });
    expect(r.required).toContain('primary_caregiver');
    expect(r.required).toContain('father');
    expect(r.required).toContain('mother');
    expect(r.required).toContain('grandfather_paternal');
  });

  it('nuclear family DROPS grandfather + tribal consultations', () => {
    const r = lib.requiredConsultations('critical', { familyType: 'nuclear' });
    expect(r.required).not.toContain('grandfather_paternal');
    expect(r.required).not.toContain('tribal_elder');
  });

  it('single_parent + no father in decisionMakers → father not required', () => {
    const r = lib.requiredConsultations('standard', {
      familyType: 'single_parent',
      decisionMakers: [{ relationship: 'mother' }],
    });
    expect(r.required).not.toContain('father');
  });

  it('guardian_only family → primary_caregiver + guardian_court_appointed only', () => {
    const r = lib.requiredConsultations('critical', { familyType: 'guardian_only' });
    expect(r.required).toEqual(['primary_caregiver', 'guardian_court_appointed']);
  });

  it('tribal family adds tribal_elder for standard+', () => {
    const r = lib.requiredConsultations('major', { familyType: 'tribal' });
    expect(r.required).toContain('tribal_elder');
  });

  it('per-family consultRequired overrides add to required', () => {
    const r = lib.requiredConsultations('standard', {
      familyType: 'extended',
      decisionMakers: [{ relationship: 'uncle_paternal', consultRequired: true }],
    });
    expect(r.required).toContain('uncle_paternal');
  });

  it('decisionMakers in profile but not consultRequired → recommended', () => {
    const r = lib.requiredConsultations('routine', {
      familyType: 'extended',
      decisionMakers: [{ relationship: 'aunt', consultRequired: false }],
    });
    expect(r.recommended).toContain('aunt');
    expect(r.required).not.toContain('aunt');
  });

  it('includes bilingual reason', () => {
    const r = lib.requiredConsultations('major', { familyType: 'extended' });
    expect(typeof r.reasonAr).toBe('string');
    expect(typeof r.reasonEn).toBe('string');
  });
});

describe('W477 — isConsultationComplete', () => {
  it('complete=true when all required obtained', () => {
    const r = lib.isConsultationComplete('standard', { familyType: 'extended' }, [
      'primary_caregiver',
      'father',
    ]);
    expect(r.complete).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('complete=false + lists missing roles', () => {
    const r = lib.isConsultationComplete('critical', { familyType: 'extended' }, [
      'primary_caregiver',
      'father',
    ]);
    expect(r.complete).toBe(false);
    expect(r.missing).toContain('mother');
    expect(r.missing).toContain('grandfather_paternal');
  });

  it('reports invalid input', () => {
    const r = lib.isConsultationComplete('routine', {}, null);
    expect(r.complete).toBe(false);
    expect(r.missing).toContain('INVALID_INPUT');
  });

  it('counts obtained + required correctly', () => {
    const r = lib.isConsultationComplete('major', { familyType: 'extended' }, [
      'primary_caregiver',
    ]);
    expect(r.obtainedCount).toBe(1);
    expect(r.requiredCount).toBe(3);
  });
});

describe('W477 — primaryDecisionMaker', () => {
  it('court-appointed guardian wins', () => {
    const r = lib.primaryDecisionMaker({
      decisionMakers: [{ relationship: 'father' }, { relationship: 'guardian_court_appointed' }],
    });
    expect(r.role).toBe('guardian_court_appointed');
  });

  it('father is primary for extended family minor', () => {
    const r = lib.primaryDecisionMaker({
      familyType: 'extended',
      decisionMakers: [{ relationship: 'father' }, { relationship: 'mother' }],
    });
    expect(r.role).toBe('father');
  });

  it('mother is primary for single-parent (no father)', () => {
    const r = lib.primaryDecisionMaker({
      familyType: 'single_parent',
      decisionMakers: [{ relationship: 'mother' }],
    });
    expect(r.role).toBe('mother');
  });

  it('spouse is primary for adult beneficiary', () => {
    const r = lib.primaryDecisionMaker({
      decisionMakers: [{ relationship: 'spouse' }],
    });
    expect(r.role).toBe('spouse');
  });

  it('guardian_only family → primary_caregiver', () => {
    const r = lib.primaryDecisionMaker({ familyType: 'guardian_only', decisionMakers: [] });
    expect(r.role).toBe('primary_caregiver');
  });

  it('falls back to primary_caregiver default', () => {
    const r = lib.primaryDecisionMaker({ decisionMakers: [] });
    expect(r.role).toBe('primary_caregiver');
  });

  it('every result carries bilingual reason', () => {
    const r = lib.primaryDecisionMaker({ decisionMakers: [{ relationship: 'father' }] });
    expect(typeof r.reasonAr).toBe('string');
    expect(typeof r.reasonEn).toBe('string');
  });
});

describe('W477 — ROLE_RANK structure', () => {
  it('father + primary_caregiver + spouse + guardian rank as primary (1)', () => {
    expect(lib.ROLE_RANK.father).toBe(1);
    expect(lib.ROLE_RANK.primary_caregiver).toBe(1);
    expect(lib.ROLE_RANK.spouse).toBe(1);
    expect(lib.ROLE_RANK.guardian_court_appointed).toBe(1);
  });

  it('extended family roles rank higher (lower priority)', () => {
    expect(lib.ROLE_RANK.grandfather_paternal).toBeGreaterThan(2);
    expect(lib.ROLE_RANK.tribal_elder).toBeGreaterThan(lib.ROLE_RANK.grandfather_paternal);
  });
});
