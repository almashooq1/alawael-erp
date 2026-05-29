'use strict';

/**
 * measure-recommendation-wave561.test.js — W561 pure-core unit tests.
 *
 * The recommendation ranking core is intentionally PURE (no Mongoose, no
 * DB, no clock — `now` injected) so the prioritization logic can be locked
 * down deterministically here. Pairs with the behavioral test W562 which
 * exercises the DB orchestrator against MongoMemoryServer.
 *
 * Covers:
 *   • reassessmentStatus — never / overdue / due_soon / current + no-interval
 *   • normalizeBeneficiary — age-from-DOB, disability.type, ICD-10 fallback
 *   • _scoreCandidate — priority bands + bilingual reasons + administrable boost
 *   • rankMeasures — full ranking, sorting, ties
 */

const {
  rankMeasures,
  reassessmentStatus,
  normalizeBeneficiary,
  _scoreCandidate,
} = require('../services/measureRecommendation.service');

const NOW = Date.UTC(2026, 4, 29); // 2026-05-29
const daysAgo = n => NOW - n * 86400000;

describe('W561 — reassessmentStatus', () => {
  test('no prior administration → never', () => {
    const r = reassessmentStatus(null, 90, NOW);
    expect(r.status).toBe('never');
    expect(r.daysSinceLast).toBeNull();
  });

  test('past the standard interval → overdue with negative dueInDays', () => {
    const r = reassessmentStatus(daysAgo(200), 90, NOW);
    expect(r.status).toBe('overdue');
    expect(r.daysSinceLast).toBe(200);
    expect(r.dueInDays).toBe(-110);
  });

  test('within the due-soon window → due_soon', () => {
    const r = reassessmentStatus(daysAgo(80), 90, NOW);
    expect(r.status).toBe('due_soon');
    expect(r.dueInDays).toBe(10);
  });

  test('recently administered → current', () => {
    const r = reassessmentStatus(daysAgo(30), 90, NOW);
    expect(r.status).toBe('current');
    expect(r.dueInDays).toBe(60);
  });

  test('no interval declared → current (cannot be overdue)', () => {
    const r = reassessmentStatus(daysAgo(500), null, NOW);
    expect(r.status).toBe('current');
    expect(r.dueInDays).toBeNull();
  });
});

describe('W561 — normalizeBeneficiary', () => {
  test('derives ageMonths from dateOfBirth against an injected reference date', () => {
    const ben = {
      dateOfBirth: '2024-05-29',
      _ageReferenceDate: '2026-05-29',
      disability: { type: 'autism', conditions: ['F84.0'] },
    };
    const n = normalizeBeneficiary(ben);
    expect(n.ageMonths).toBe(24);
    expect(n.disabilityType).toBe('autism');
    expect(n.icd10).toEqual(['F84.0']);
  });

  test('prefers explicit ageMonths and icd10 fields when present', () => {
    const n = normalizeBeneficiary({ ageMonths: 40, icd10: ['G80.1'], category: 'physical' });
    expect(n.ageMonths).toBe(40);
    expect(n.icd10).toEqual(['G80.1']);
    expect(n.disabilityType).toBe('physical');
  });

  test('handles missing data gracefully', () => {
    const n = normalizeBeneficiary({});
    expect(n.ageMonths).toBeNull();
    expect(n.disabilityType).toBeNull();
    expect(n.icd10).toEqual([]);
  });
});

describe('W561 — _scoreCandidate priority bands', () => {
  const cand = {
    code: 'X',
    purpose: 'screening',
    evidenceLevel: 'level_1',
    targetPopulation: ['all'],
  };

  test('never-administered screening + administrable → high priority', () => {
    const r = _scoreCandidate(cand, { status: 'never', dueInDays: null }, true);
    expect(r.priority).toBe('high');
    expect(r.reasons_ar.some(x => x.includes('لم يُطبَّق'))).toBe(true);
    expect(r.reasons.join(' ')).toMatch(/digitally/i);
  });

  test('current measure is never recommended now', () => {
    const r = _scoreCandidate(cand, { status: 'current', dueInDays: 60 }, true);
    expect(r.priority).toBe('not_now');
  });

  test('overdue scales priority by how overdue it is', () => {
    const slight = _scoreCandidate(cand, { status: 'overdue', dueInDays: -2 }, false);
    const severe = _scoreCandidate(cand, { status: 'overdue', dueInDays: -120 }, false);
    expect(severe.score).toBeGreaterThan(slight.score);
  });
});

describe('W561 — rankMeasures', () => {
  const candidates = [
    {
      code: 'M-CHAT-R',
      name: 'MCHAT',
      purpose: 'screening',
      evidenceLevel: 'level_1',
      reassessment: { standardIntervalDays: 90 },
    },
    {
      code: 'PEDSQL',
      name: 'PedsQL',
      purpose: 'outcome',
      evidenceLevel: 'level_1',
      reassessment: { standardIntervalDays: 90 },
    },
    { code: 'BERG', name: 'Berg', purpose: 'outcome', reassessment: { standardIntervalDays: 30 } },
  ];

  test('ranks never-administered + administrable above current', () => {
    const ranked = rankMeasures({
      candidates,
      latestByCode: {
        PEDSQL: { lastDate: daysAgo(10), severity: 'normal' }, // current
      },
      administrableCodes: ['M-CHAT-R', 'PEDSQL'],
      now: NOW,
    });
    expect(ranked[0].measureCode).toBe('M-CHAT-R'); // never + administrable + screening
    const pedsql = ranked.find(r => r.measureCode === 'PEDSQL');
    expect(pedsql.priority).toBe('not_now');
    expect(pedsql.reassessment.status).toBe('current');
  });

  test('an overdue measure outranks a never-administered non-administrable one when sufficiently overdue', () => {
    const ranked = rankMeasures({
      candidates,
      latestByCode: { BERG: { lastDate: daysAgo(400) } }, // wildly overdue
      administrableCodes: [], // none administrable
      now: NOW,
    });
    const berg = ranked.find(r => r.measureCode === 'BERG');
    expect(berg.reassessment.status).toBe('overdue');
    expect(berg.priority).toBe('high');
  });

  test('every recommendation carries bilingual reasons + a priority label', () => {
    const ranked = rankMeasures({ candidates, administrableCodes: ['M-CHAT-R'], now: NOW });
    for (const r of ranked) {
      expect(Array.isArray(r.reasons)).toBe(true);
      expect(Array.isArray(r.reasons_ar)).toBe(true);
      expect(r.reasons.length).toBe(r.reasons_ar.length);
      expect(typeof r.priorityLabel_ar).toBe('string');
    }
  });

  test('output is sorted by descending score', () => {
    const ranked = rankMeasures({ candidates, administrableCodes: ['M-CHAT-R'], now: NOW });
    const scores = ranked.map(r => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
