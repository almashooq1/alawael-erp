'use strict';

/**
 * W476 drift guard — Gender routing policy (Phase E Cultural Intelligence).
 *
 * Locks: routeAssignment (ALLOW/WARN/BLOCK) + effectiveStrictness +
 * rankCandidates + activity-type classification + mahram override.
 */

const lib = require('../intelligence/gender-routing.lib');

describe('W476 — module surface', () => {
  it('exports public API', () => {
    expect(typeof lib.routeAssignment).toBe('function');
    expect(typeof lib.effectiveStrictness).toBe('function');
    expect(typeof lib.rankCandidates).toBe('function');
  });

  it('exposes constants', () => {
    expect(lib.ALLOWED_GENDERS).toEqual(['male', 'female', 'no_preference']);
    expect(lib.STRICTNESS_LEVELS).toEqual(['strict', 'preferred', 'flexible']);
    expect(Array.isArray(lib.INTIMATE_ACTIVITIES)).toBe(true);
    expect(Array.isArray(lib.PASSIVE_ACTIVITIES)).toBe(true);
  });

  it('module is frozen', () => {
    expect(Object.isFrozen(lib)).toBe(true);
  });
});

describe('W476 — effectiveStrictness', () => {
  it('escalates flexible to preferred for intimate activity', () => {
    expect(lib.effectiveStrictness('flexible', 'pt_physical_exam')).toBe('preferred');
  });

  it('escalates preferred to strict for intimate activity', () => {
    expect(lib.effectiveStrictness('preferred', 'pt_physical_exam')).toBe('strict');
  });

  it('keeps strict at strict for intimate', () => {
    expect(lib.effectiveStrictness('strict', 'slp_oral_motor')).toBe('strict');
  });

  it('relaxes strict to preferred for passive activity', () => {
    expect(lib.effectiveStrictness('strict', 'group_game')).toBe('preferred');
  });

  it('relaxes preferred to flexible for passive', () => {
    expect(lib.effectiveStrictness('preferred', 'classroom')).toBe('flexible');
  });

  it('keeps neutral activity strictness unchanged', () => {
    expect(lib.effectiveStrictness('preferred', 'unknown_activity')).toBe('preferred');
  });

  it('defaults to preferred when no base strictness', () => {
    expect(lib.effectiveStrictness(undefined, 'unknown_activity')).toBe('preferred');
  });
});

describe('W476 — routeAssignment (basic match cases)', () => {
  it('ALLOWs when no preference + not female-only', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'no_preference' },
      therapistGender: 'male',
      activityCode: 'classroom',
    });
    expect(r.decision).toBe('ALLOW');
    expect(r.reasonCode).toBe('NO_PREFERENCE');
  });

  it('ALLOWs when preference matches', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'preferred' },
      therapistGender: 'female',
      activityCode: 'pt_physical_exam',
    });
    expect(r.decision).toBe('ALLOW');
    expect(r.reasonCode).toBe('GENDER_MATCH');
  });

  it('BLOCKs invalid therapist gender', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female' },
      therapistGender: 'unknown',
      activityCode: 'classroom',
    });
    expect(r.decision).toBe('BLOCK');
    expect(r.reasonCode).toBe('INVALID_THERAPIST_GENDER');
  });
});

describe('W476 — routeAssignment (strictness escalation)', () => {
  it('BLOCKs strict mismatch (no mahram)', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'strict' },
      therapistGender: 'male',
      activityCode: 'pt_physical_exam',
    });
    expect(r.decision).toBe('BLOCK');
    expect(r.reasonCode).toBe('STRICT_GENDER_MISMATCH');
  });

  it('WARNs strict mismatch with mahram present', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: {
        therapistGenderPreference: 'female',
        strictness: 'strict',
        mahramRequired: true,
      },
      therapistGender: 'male',
      activityCode: 'pt_manual_therapy',
      mahramPresent: true,
    });
    expect(r.decision).toBe('WARN');
    expect(r.reasonCode).toBe('STRICT_MISMATCH_WITH_MAHRAM');
  });

  it('WARNs preferred soft mismatch', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'preferred' },
      therapistGender: 'male',
      activityCode: 'parent_meeting', // passive → relaxed to flexible
    });
    // Activity 'parent_meeting' is passive → preferred relaxed to flexible
    // → ALLOW
    expect(r.decision).toBe('ALLOW');
    expect(r.reasonCode).toBe('FLEXIBLE_MISMATCH');
  });

  it('preferred mismatch in neutral activity → WARN', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'preferred' },
      therapistGender: 'male',
      activityCode: 'aerobic_pt', // neutral, not in intimate or passive
    });
    expect(r.decision).toBe('WARN');
    expect(r.reasonCode).toBe('SOFT_GENDER_MISMATCH');
  });

  it('intimate activity escalates preferred to strict → BLOCK', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'preferred' },
      therapistGender: 'male',
      activityCode: 'gynecology',
    });
    expect(r.decision).toBe('BLOCK');
  });
});

describe('W476 — routeAssignment (female-only sessions)', () => {
  it('BLOCKs male therapist when female-only requested + no mahram', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { femaleOnlySessions: true },
      therapistGender: 'male',
      activityCode: 'classroom',
    });
    expect(r.decision).toBe('BLOCK');
    expect(r.reasonCode).toBe('FEMALE_ONLY_REQUESTED');
  });

  it('WARNs male therapist + female-only requested + mahram present', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { femaleOnlySessions: true },
      therapistGender: 'male',
      activityCode: 'classroom',
      mahramPresent: true,
    });
    expect(r.decision).toBe('WARN');
    expect(r.reasonCode).toBe('MALE_THERAPIST_WITH_MAHRAM');
  });

  it('ALLOWs female therapist when female-only requested', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { femaleOnlySessions: true, therapistGenderPreference: 'female' },
      therapistGender: 'female',
      activityCode: 'pt_physical_exam',
    });
    expect(r.decision).toBe('ALLOW');
  });
});

describe('W476 — routeAssignment (flexible strictness)', () => {
  it('ALLOWs mismatch with flexible strictness', () => {
    const r = lib.routeAssignment({
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'flexible' },
      therapistGender: 'male',
      activityCode: 'group_game',
    });
    expect(r.decision).toBe('ALLOW');
    expect(r.reasonCode).toBe('FLEXIBLE_MISMATCH');
  });
});

describe('W476 — every result carries bilingual reason + effectiveStrictness', () => {
  const cases = [
    {
      beneficiaryPrefs: { therapistGenderPreference: 'female', strictness: 'strict' },
      therapistGender: 'male',
      activityCode: 'pt_physical_exam',
    },
    {
      beneficiaryPrefs: { therapistGenderPreference: 'no_preference' },
      therapistGender: 'female',
      activityCode: 'classroom',
    },
    {
      beneficiaryPrefs: { femaleOnlySessions: true },
      therapistGender: 'male',
      activityCode: 'group_game',
    },
  ];
  for (const c of cases) {
    it(`carries bilingual reason + effectiveStrictness for ${c.beneficiaryPrefs.therapistGenderPreference || 'female_only'}`, () => {
      const r = lib.routeAssignment(c);
      expect(typeof r.reasonAr).toBe('string');
      expect(typeof r.reasonEn).toBe('string');
      expect(typeof r.effectiveStrictness).toBe('string');
    });
  }
});

describe('W476 — rankCandidates', () => {
  const beneficiaryPrefs = { therapistGenderPreference: 'female', strictness: 'preferred' };

  it('ranks ALLOW before WARN', () => {
    const candidates = [
      { id: 'm1', gender: 'male' },
      { id: 'f1', gender: 'female' },
    ];
    const ranked = lib.rankCandidates(beneficiaryPrefs, candidates, 'aerobic_pt');
    expect(ranked[0].decision).toBe('ALLOW');
    expect(ranked[1].decision).toBe('WARN');
  });

  it('excludes BLOCK candidates', () => {
    const beneficiaryPrefsStrict = {
      therapistGenderPreference: 'female',
      strictness: 'strict',
    };
    const candidates = [
      { id: 'm1', gender: 'male' },
      { id: 'f1', gender: 'female' },
    ];
    const ranked = lib.rankCandidates(beneficiaryPrefsStrict, candidates, 'pt_physical_exam');
    expect(ranked).toHaveLength(1);
    expect(ranked[0].candidate.id).toBe('f1');
  });

  it('returns empty for no candidates', () => {
    expect(lib.rankCandidates(beneficiaryPrefs, [], 'classroom')).toEqual([]);
  });
});

describe('W476 — activity catalogs', () => {
  it('INTIMATE_ACTIVITIES has ≥7 entries including OT + SLP + PT modalities', () => {
    expect(lib.INTIMATE_ACTIVITIES.length).toBeGreaterThanOrEqual(7);
    expect(lib.INTIMATE_ACTIVITIES).toContain('pt_physical_exam');
    expect(lib.INTIMATE_ACTIVITIES).toContain('ot_dressing_task');
    expect(lib.INTIMATE_ACTIVITIES).toContain('slp_oral_motor');
  });

  it('PASSIVE_ACTIVITIES includes group + classroom + remote', () => {
    expect(lib.PASSIVE_ACTIVITIES).toContain('group_game');
    expect(lib.PASSIVE_ACTIVITIES).toContain('classroom');
    expect(lib.PASSIVE_ACTIVITIES).toContain('remote_consultation');
  });
});
