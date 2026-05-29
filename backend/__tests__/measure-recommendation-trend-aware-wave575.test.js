'use strict';

/**
 * measure-recommendation-trend-aware-wave575.test.js — W575 pure-core.
 *
 * The recommendation engine now factors the LAST administration's clinical
 * trajectory into priority (W575): a declining trend — or a severe/critical
 * last result — raises a measure's priority, and can promote an otherwise
 * up-to-date measure to an EARLY reassessment (a worsening beneficiary
 * shouldn't wait out the full cadence). This is the data-driven "intelligence"
 * that works WITHOUT relying on the sparsely-coded disability.type/ICD fields
 * (the W571 finding: real beneficiaries largely lack structured coding, but
 * once a measure is administered its trend/severity IS available).
 */

const { rankMeasures, _scoreCandidate, reassessmentStatus } = require('../services/measureRecommendation.service');

const NOW = Date.UTC(2026, 4, 29);
const daysAgo = n => NOW - n * 86400000;

const cand = (code, interval = 90) => ({
  code,
  name: code,
  purpose: 'outcome',
  evidenceLevel: 'level_1',
  reassessment: { standardIntervalDays: interval },
});

describe('W575 — clinical-urgency promotes priority', () => {
  test('a recently-administered measure that is DECLINING is still surfaced (medium, not not_now)', () => {
    const ranked = rankMeasures({
      candidates: [cand('PEDSQL')],
      latestByCode: { PEDSQL: { lastDate: daysAgo(10), trend: 'declining', severity: 'moderate' } },
      administrableCodes: ['PEDSQL'],
      now: NOW,
    });
    const r = ranked[0];
    expect(r.reassessment.status).toBe('current'); // recently administered
    expect(r.priority).toBe('medium'); // but declining → promoted from not_now
    expect(r.reasons_ar.some(x => x.includes('تدهور'))).toBe(true);
  });

  test('a recently-administered SEVERE result is surfaced at low priority', () => {
    const ranked = rankMeasures({
      candidates: [cand('SDQ')],
      latestByCode: { SDQ: { lastDate: daysAgo(5), trend: 'stable', severity: 'severe' } },
      administrableCodes: [],
      now: NOW,
    });
    expect(ranked[0].reassessment.status).toBe('current');
    expect(ranked[0].priority).toBe('low');
  });

  test('a recently-administered STABLE/normal measure stays not_now', () => {
    const ranked = rankMeasures({
      candidates: [cand('PEDSQL')],
      latestByCode: { PEDSQL: { lastDate: daysAgo(10), trend: 'stable', severity: 'normal' } },
      administrableCodes: ['PEDSQL'],
      now: NOW,
    });
    expect(ranked[0].priority).toBe('not_now');
  });

  test('declining trend adds score on top of an overdue measure', () => {
    const base = _scoreCandidate(cand('X'), { status: 'overdue', dueInDays: -10 }, false, {});
    const declining = _scoreCandidate(
      cand('X'),
      { status: 'overdue', dueInDays: -10 },
      false,
      { trend: 'declining' },
    );
    expect(declining.score).toBeGreaterThan(base.score);
    expect(declining.score - base.score).toBe(18);
  });

  test('declining > severe in priority weight (worsening trajectory dominates)', () => {
    const declining = _scoreCandidate(cand('X'), { status: 'current', dueInDays: 60 }, false, { trend: 'declining' });
    const severe = _scoreCandidate(cand('X'), { status: 'current', dueInDays: 60 }, false, { severity: 'critical' });
    expect(declining.priority).toBe('medium');
    expect(severe.priority).toBe('low');
  });

  test('no clinical signal → behaves exactly as before (regression guard)', () => {
    const withSig = _scoreCandidate(cand('X'), { status: 'never', dueInDays: null }, true, {});
    expect(withSig.priority).toBe('high'); // unchanged baseline
    expect(reassessmentStatus(null, 90, NOW).status).toBe('never');
  });
});
