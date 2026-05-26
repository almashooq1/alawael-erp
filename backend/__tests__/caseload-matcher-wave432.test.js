/**
 * caseload-matcher-wave432.test.js — Wave 432 (Phase E4 — Caseload Matcher V2).
 *
 * Pure-math drift guard for intelligence/caseload-matcher.lib.js.
 *
 * The matcher scores therapist candidates against a beneficiary's needs
 * with a HARD GATE on specialty (clinical safety > load balancing) and
 * weighted soft factors: load (30%) + history (20%) + language (15%) +
 * proximity (15%) + gender (10%) + experience (10%).
 *
 * Pairs with W352 therapistWorkload.service.js (which reports CURRENT load;
 * this lib SCORES the right therapist for a new assignment).
 */

'use strict';

const {
  scoreCandidate,
  rankCandidates,
  topCandidates,
  FACTOR_WEIGHTS,
  EXPERIENCE_SATURATION_YEARS,
  _loadFactor,
  _experienceFactor,
  _languageFactor,
  _proximityFactor,
  _genderFactor,
  _historyFactor,
  _specialtyCovers,
} = require('../intelligence/caseload-matcher.lib');

// ──────────────────────────────────────────────────────────────────
//  1. Factor weights sanity
// ──────────────────────────────────────────────────────────────────

describe('W432 — FACTOR_WEIGHTS', () => {
  test('sum to 1.0', () => {
    const sum = Object.values(FACTOR_WEIGHTS).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  test('frozen registry', () => {
    expect(Object.isFrozen(FACTOR_WEIGHTS)).toBe(true);
  });

  test('load is the heaviest factor (30%) — load balancing dominates ties', () => {
    expect(FACTOR_WEIGHTS.currentLoad).toBe(0.3);
    expect(FACTOR_WEIGHTS.currentLoad).toBeGreaterThanOrEqual(
      FACTOR_WEIGHTS.historyWithBeneficiary
    );
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. Internal factor helpers
// ──────────────────────────────────────────────────────────────────

describe('W432 — _loadFactor', () => {
  test('empty caseload → 1.0', () => {
    expect(_loadFactor(0, 25)).toBe(1);
  });

  test('full caseload → 0.0', () => {
    expect(_loadFactor(25, 25)).toBe(0);
  });

  test('overload clamped at 0', () => {
    expect(_loadFactor(50, 25)).toBe(0);
  });

  test('half load → 0.5', () => {
    expect(_loadFactor(12.5, 25)).toBe(0.5);
  });

  test('invalid input → neutral 0.5', () => {
    expect(_loadFactor(NaN, 25)).toBe(0.5);
    expect(_loadFactor(10, 0)).toBe(0.5);
    expect(_loadFactor(10, -5)).toBe(0.5);
  });
});

describe('W432 — _experienceFactor', () => {
  test('0 years → 0', () => {
    expect(_experienceFactor(0)).toBe(0);
  });

  test('saturation at 10 years → 1.0', () => {
    expect(_experienceFactor(EXPERIENCE_SATURATION_YEARS)).toBeCloseTo(1, 5);
  });

  test('beyond 10y stays 1.0 (clamped)', () => {
    expect(_experienceFactor(30)).toBe(1);
  });

  test('negative / non-finite → 0', () => {
    expect(_experienceFactor(-5)).toBe(0);
    expect(_experienceFactor(NaN)).toBe(0);
  });
});

describe('W432 — _languageFactor', () => {
  test('primary preference match → 1.0', () => {
    expect(_languageFactor(['ar', 'en'], ['ar'], 'ar')).toBe(1);
  });

  test('partial overlap (no primary preference) → 0.5', () => {
    expect(_languageFactor(['ar', 'en'], ['ar', 'ur'])).toBe(0.5);
  });

  test('no overlap → 0', () => {
    expect(_languageFactor(['en'], ['ar', 'ur'])).toBe(0);
  });

  test('empty lists → 0', () => {
    expect(_languageFactor([], ['ar'])).toBe(0);
    expect(_languageFactor(['ar'], [])).toBe(0);
  });

  test('primary preference NOT in therapist list but overlap exists → 0.5', () => {
    // primary=ur not in therapist; therapist has 'ar' which IS in beneficiary list
    expect(_languageFactor(['ar', 'en'], ['ar', 'ur'], 'ur')).toBe(0.5);
  });
});

describe('W432 — _proximityFactor', () => {
  test('same branch → 1.0', () => {
    expect(_proximityFactor({ branchId: 'b1' }, { branchId: 'b1' })).toBe(1);
  });

  test('different branch but same region → 0.5', () => {
    expect(
      _proximityFactor({ branchId: 'b1', regionId: 'r1' }, { branchId: 'b2', regionId: 'r1' })
    ).toBe(0.5);
  });

  test('different branch + different region → 0.2', () => {
    expect(
      _proximityFactor({ branchId: 'b1', regionId: 'r1' }, { branchId: 'b2', regionId: 'r2' })
    ).toBe(0.2);
  });

  test('missing branch → 0', () => {
    expect(_proximityFactor({}, { branchId: 'b1' })).toBe(0);
    expect(_proximityFactor({ branchId: 'b1' }, {})).toBe(0);
  });
});

describe('W432 — _genderFactor', () => {
  test('match preferred → 1.0', () => {
    expect(_genderFactor({ gender: 'female' }, { therapistGenderPreference: 'female' })).toBe(1);
  });

  test('mismatch preferred → 0.0', () => {
    expect(_genderFactor({ gender: 'male' }, { therapistGenderPreference: 'female' })).toBe(0);
  });

  test('no_preference → 0.5 neutral', () => {
    expect(_genderFactor({ gender: 'male' }, { therapistGenderPreference: 'no_preference' })).toBe(
      0.5
    );
    expect(_genderFactor({ gender: 'male' }, { therapistGenderPreference: 'any' })).toBe(0.5);
  });

  test('no preference declared → 0.5 neutral', () => {
    expect(_genderFactor({ gender: 'male' }, {})).toBe(0.5);
  });

  test('therapist gender unknown → 0.5 neutral', () => {
    expect(_genderFactor({}, { therapistGenderPreference: 'female' })).toBe(0.5);
  });
});

describe('W432 — _historyFactor', () => {
  test('≥3 prior sessions → 1.0', () => {
    expect(_historyFactor(3)).toBe(1);
    expect(_historyFactor(10)).toBe(1);
  });

  test('1-2 prior sessions → 0.6', () => {
    expect(_historyFactor(1)).toBe(0.6);
    expect(_historyFactor(2)).toBe(0.6);
  });

  test('0 prior → 0.0', () => {
    expect(_historyFactor(0)).toBe(0);
  });

  test('non-finite → 0', () => {
    expect(_historyFactor(NaN)).toBe(0);
  });
});

describe('W432 — _specialtyCovers', () => {
  test('single required specialty in therapist list → true', () => {
    expect(_specialtyCovers(['speech_therapy', 'aac'], 'speech_therapy')).toBe(true);
  });

  test('array of required, any match → true', () => {
    expect(_specialtyCovers(['speech_therapy'], ['ot', 'speech_therapy'])).toBe(true);
  });

  test('no match → false', () => {
    expect(_specialtyCovers(['ot'], 'speech_therapy')).toBe(false);
  });

  test('empty therapist specialties → false', () => {
    expect(_specialtyCovers([], 'speech_therapy')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. scoreCandidate — full scoring
// ──────────────────────────────────────────────────────────────────

describe('W432 — scoreCandidate', () => {
  test('specialty mismatch → excluded:SPECIALTY_MISMATCH, score=0', () => {
    const r = scoreCandidate({ specialties: ['ot'] }, { requiredSpecialty: 'speech_therapy' });
    expect(r.score).toBe(0);
    expect(r.excluded).toBe('SPECIALTY_MISMATCH');
    expect(r.signals).toEqual([]);
  });

  test('perfect match on every factor → score ≈ 1.0', () => {
    const r = scoreCandidate(
      {
        specialties: ['speech_therapy'],
        languages: ['ar'],
        gender: 'female',
        branchId: 'b1',
        currentLoad: 0,
        experienceYears: 15,
        priorSessionsWithBeneficiary180d: 5,
      },
      {
        requiredSpecialty: 'speech_therapy',
        languages: ['ar'],
        primaryLanguage: 'ar',
        therapistGenderPreference: 'female',
        branchId: 'b1',
      }
    );
    expect(r.score).toBeCloseTo(1, 2);
    expect(r.excluded).toBeUndefined();
  });

  test('full-load therapist with all other factors strong → score = 1 - 0.3 (load contribution lost)', () => {
    const r = scoreCandidate(
      {
        specialties: ['speech_therapy'],
        languages: ['ar'],
        gender: 'female',
        branchId: 'b1',
        currentLoad: 25,
        experienceYears: 15,
        priorSessionsWithBeneficiary180d: 5,
      },
      {
        requiredSpecialty: 'speech_therapy',
        languages: ['ar'],
        primaryLanguage: 'ar',
        therapistGenderPreference: 'female',
        branchId: 'b1',
      }
    );
    expect(r.score).toBeCloseTo(0.7, 1);
  });

  test('signals are explainable: only fired factors included', () => {
    const r = scoreCandidate(
      {
        specialties: ['speech_therapy'],
        languages: ['ar'],
        branchId: 'b1',
        currentLoad: 5,
      },
      {
        requiredSpecialty: 'speech_therapy',
        languages: ['ar'],
        primaryLanguage: 'ar',
        branchId: 'b1',
      }
    );
    // No gender preference + no history + no experience years → those signals absent
    const names = r.signals.map(s => s.name);
    expect(names).toContain('currentLoad');
    expect(names).toContain('languageMatch');
    expect(names).toContain('branchProximity');
    expect(names).not.toContain('historyWithBeneficiary');
    expect(names).not.toContain('experienceYears');
  });

  test('breakdown carries each factor’s raw value', () => {
    const r = scoreCandidate(
      {
        specialties: ['ot'],
        currentLoad: 10,
        experienceYears: 5,
      },
      { requiredSpecialty: 'ot' },
      { maxLoad: 20 }
    );
    expect(r.breakdown).toEqual(
      expect.objectContaining({
        load: 0.5,
        history: 0,
        language: 0,
        proximity: 0,
        gender: 0.5,
        experience: expect.any(Number),
      })
    );
  });

  test('custom maxLoad respected', () => {
    const r1 = scoreCandidate(
      { specialties: ['ot'], currentLoad: 10 },
      { requiredSpecialty: 'ot' },
      { maxLoad: 10 }
    );
    const r2 = scoreCandidate(
      { specialties: ['ot'], currentLoad: 10 },
      { requiredSpecialty: 'ot' },
      { maxLoad: 50 }
    );
    expect(r2.breakdown.load).toBeGreaterThan(r1.breakdown.load);
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. rankCandidates — filters excluded + sorts
// ──────────────────────────────────────────────────────────────────

describe('W432 — rankCandidates', () => {
  test('empty / null input → []', () => {
    expect(rankCandidates([], {})).toEqual([]);
    expect(rankCandidates(null, {})).toEqual([]);
  });

  test('specialty-mismatched candidates filtered OUT (clinical safety)', () => {
    const beneficiary = { requiredSpecialty: 'speech_therapy' };
    const therapists = [
      { id: 't1', specialties: ['ot'] }, // excluded
      { id: 't2', specialties: ['speech_therapy'] }, // included
      { id: 't3', specialties: ['physio'] }, // excluded
    ];
    const ranked = rankCandidates(therapists, beneficiary);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].therapist.id).toBe('t2');
  });

  test('sorted DESC by score', () => {
    const beneficiary = {
      requiredSpecialty: 'speech_therapy',
      languages: ['ar'],
      branchId: 'b1',
    };
    const therapists = [
      // Heavy load, far branch
      {
        id: 'a',
        specialties: ['speech_therapy'],
        languages: ['ar'],
        branchId: 'b9',
        currentLoad: 22,
      },
      // Light load, same branch
      {
        id: 'b',
        specialties: ['speech_therapy'],
        languages: ['ar'],
        branchId: 'b1',
        currentLoad: 2,
      },
      // Medium
      {
        id: 'c',
        specialties: ['speech_therapy'],
        languages: ['ar'],
        branchId: 'b1',
        currentLoad: 12,
      },
    ];
    const ranked = rankCandidates(therapists, beneficiary);
    expect(ranked.map(r => r.therapist.id)).toEqual(['b', 'c', 'a']);
  });

  test('stable sort: equal scores keep input order', () => {
    const beneficiary = { requiredSpecialty: 'speech_therapy' };
    const therapists = [
      { id: 'x', specialties: ['speech_therapy'] },
      { id: 'y', specialties: ['speech_therapy'] },
      { id: 'z', specialties: ['speech_therapy'] },
    ];
    const ranked = rankCandidates(therapists, beneficiary);
    expect(ranked.map(r => r.therapist.id)).toEqual(['x', 'y', 'z']);
  });
});

// ──────────────────────────────────────────────────────────────────
//  5. topCandidates
// ──────────────────────────────────────────────────────────────────

describe('W432 — topCandidates', () => {
  test('n=0 / negative / non-finite → []', () => {
    expect(topCandidates([{ specialties: ['ot'] }], { requiredSpecialty: 'ot' }, 0)).toEqual([]);
    expect(topCandidates([{ specialties: ['ot'] }], { requiredSpecialty: 'ot' }, -1)).toEqual([]);
  });

  test('returns first n after ranking', () => {
    const beneficiary = { requiredSpecialty: 'ot' };
    const therapists = [
      { id: 'a', specialties: ['ot'], currentLoad: 20 },
      { id: 'b', specialties: ['ot'], currentLoad: 5 },
      { id: 'c', specialties: ['ot'], currentLoad: 10 },
    ];
    const top2 = topCandidates(therapists, beneficiary, 2);
    expect(top2.map(r => r.therapist.id)).toEqual(['b', 'c']);
  });
});

// ──────────────────────────────────────────────────────────────────
//  6. End-to-end realistic scenario
// ──────────────────────────────────────────────────────────────────

describe('W432 — realistic 5-candidate match scenario', () => {
  test('continuity therapist wins over fresher higher-experience peer', () => {
    const beneficiary = {
      requiredSpecialty: 'speech_therapy',
      languages: ['ar'],
      primaryLanguage: 'ar',
      therapistGenderPreference: 'female',
      branchId: 'b1',
    };
    const therapists = [
      {
        id: 'continuity',
        specialties: ['speech_therapy'],
        languages: ['ar'],
        gender: 'female',
        branchId: 'b1',
        currentLoad: 8,
        experienceYears: 3,
        priorSessionsWithBeneficiary180d: 5, // strong continuity
      },
      {
        id: 'senior-fresh',
        specialties: ['speech_therapy'],
        languages: ['ar'],
        gender: 'female',
        branchId: 'b1',
        currentLoad: 8,
        experienceYears: 15, // senior
        priorSessionsWithBeneficiary180d: 0, // no continuity
      },
      {
        id: 'junior-other-branch',
        specialties: ['speech_therapy'],
        languages: ['ar'],
        gender: 'female',
        branchId: 'b2',
        currentLoad: 3,
        experienceYears: 2,
      },
      {
        id: 'ot-excluded',
        specialties: ['ot'], // specialty mismatch
      },
      {
        id: 'lang-mismatch',
        specialties: ['speech_therapy'],
        languages: ['en'],
        gender: 'female',
        branchId: 'b1',
        currentLoad: 4,
      },
    ];

    const ranked = rankCandidates(therapists, beneficiary);
    // 4 included (1 excluded for specialty mismatch)
    expect(ranked).toHaveLength(4);
    // Continuity wins: history(20%) + perfect match elsewhere beats senior-no-history
    expect(ranked[0].therapist.id).toBe('continuity');
  });
});
