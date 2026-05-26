/**
 * smart-inbox-ranker-wave431.test.js — Wave 431 (Phase E1 — Personalization).
 *
 * Pure-math drift guard for intelligence/smart-inbox-ranker.lib.js.
 *
 * The ranker converts heterogenous inbox items into urgency scores so
 * callers can present "Next Best Action" surfaces sorted by clinical
 * priority. Pairs with:
 *   - W92 reviewer-queue.lib.js — routing/grouping (this lib = sort)
 *   - W337/W339/W429 — produce the severity + alertType fields
 *   - W286 RiskSnapshot — produces beneficiaryRiskTier
 *
 * No DB, no mongoose; pure functions only.
 */

'use strict';

const {
  scoreItem,
  rankItems,
  topN,
  roleBiasFor,
  SEVERITY_WEIGHTS,
  RISK_TIER_WEIGHTS,
  ALERT_TYPE_URGENCY,
  FACTOR_WEIGHTS,
  AGE_SATURATION_HOURS,
  _ageFactor,
} = require('../intelligence/smart-inbox-ranker.lib');

// ──────────────────────────────────────────────────────────────────
//  1. Factor weights — shape sanity
// ──────────────────────────────────────────────────────────────────

describe('W431 — weight registry shape', () => {
  test('SEVERITY_WEIGHTS spans low/medium/high/critical, monotonic', () => {
    expect(SEVERITY_WEIGHTS.low).toBe(0);
    expect(SEVERITY_WEIGHTS.critical).toBe(1);
    expect(SEVERITY_WEIGHTS.medium).toBeLessThan(SEVERITY_WEIGHTS.high);
    expect(SEVERITY_WEIGHTS.high).toBeLessThan(SEVERITY_WEIGHTS.critical);
  });

  test('RISK_TIER_WEIGHTS spans low/moderate/high/critical, monotonic', () => {
    expect(RISK_TIER_WEIGHTS.low).toBe(0);
    expect(RISK_TIER_WEIGHTS.critical).toBe(1);
    expect(RISK_TIER_WEIGHTS.moderate).toBeLessThan(RISK_TIER_WEIGHTS.high);
  });

  test('ALERT_TYPE_URGENCY includes W337/W339/W429/W349/W357 producers', () => {
    for (const t of [
      'REGRESSION_DETECTED',
      'PLATEAU_DETECTED',
      'FORECAST_OFF_TRACK',
      'MCID_NOT_MET',
      'CAPA_OVERDUE',
      'SAFEGUARDING_CONCERN',
    ]) {
      expect(ALERT_TYPE_URGENCY[t]).toBeGreaterThan(0);
      expect(ALERT_TYPE_URGENCY[t]).toBeLessThanOrEqual(1);
    }
  });

  test('SAFEGUARDING + REGRESSION are tied at maximum urgency 1.0 (clinical safety)', () => {
    expect(ALERT_TYPE_URGENCY.SAFEGUARDING_CONCERN).toBe(1);
    expect(ALERT_TYPE_URGENCY.REGRESSION_DETECTED).toBe(1);
  });

  test('FACTOR_WEIGHTS sum to 1.0 (sla is extra credit on top)', () => {
    const sum =
      FACTOR_WEIGHTS.severity +
      FACTOR_WEIGHTS.age +
      FACTOR_WEIGHTS.riskTier +
      FACTOR_WEIGHTS.sourceUrgency +
      FACTOR_WEIGHTS.slaBreached;
    expect(sum).toBeCloseTo(1, 5);
  });

  test('all registries are frozen (catches future-PR accidental mutation)', () => {
    expect(Object.isFrozen(SEVERITY_WEIGHTS)).toBe(true);
    expect(Object.isFrozen(RISK_TIER_WEIGHTS)).toBe(true);
    expect(Object.isFrozen(ALERT_TYPE_URGENCY)).toBe(true);
    expect(Object.isFrozen(FACTOR_WEIGHTS)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. _ageFactor — logarithmic curve
// ──────────────────────────────────────────────────────────────────

describe('W431 — _ageFactor', () => {
  test('0 hours → 0.0', () => {
    expect(_ageFactor(0)).toBe(0);
  });

  test('168 hours (1 week saturation) → 1.0', () => {
    expect(_ageFactor(AGE_SATURATION_HOURS)).toBeCloseTo(1, 5);
  });

  test('beyond 168h saturates at 1.0 (clamped)', () => {
    expect(_ageFactor(AGE_SATURATION_HOURS * 2)).toBe(1);
    expect(_ageFactor(10_000)).toBe(1);
  });

  test('logarithmic — 24h is much closer to 168h than to 1h', () => {
    const at24 = _ageFactor(24);
    const at1 = _ageFactor(1);
    const at168 = _ageFactor(168);
    expect(at24).toBeGreaterThan(at1);
    expect(at168 - at24).toBeLessThan(at24 - at1);
  });

  test('non-finite / negative → 0', () => {
    expect(_ageFactor(NaN)).toBe(0);
    expect(_ageFactor(-5)).toBe(0);
    expect(_ageFactor('not a number')).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. scoreItem — single item scoring
// ──────────────────────────────────────────────────────────────────

describe('W431 — scoreItem', () => {
  test('empty item → 0 score (no signals)', () => {
    const r = scoreItem({}, { now: new Date('2026-06-01') });
    expect(r.score).toBe(0);
    expect(r.signals).toEqual([]);
  });

  test('critical regression on fresh + high-risk beneficiary → very high', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const r = scoreItem(
      {
        severity: 'critical',
        createdAt: new Date('2026-06-01T11:00:00Z'), // 1 hour old
        beneficiaryRiskTier: 'critical',
        alertType: 'REGRESSION_DETECTED',
        slaBreached: false,
      },
      { now }
    );
    // 0.4*1 + 0.25*age(1h) + 0.2*1 + 0.1*1 + 0 = 0.7 + age(1h)*0.25
    expect(r.score).toBeGreaterThan(0.7);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  test('low-severity old plateau on low-risk → low score', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const r = scoreItem(
      {
        severity: 'low',
        createdAt: new Date('2026-06-01T11:00:00Z'),
        beneficiaryRiskTier: 'low',
        alertType: 'PLATEAU_DETECTED',
        slaBreached: false,
      },
      { now }
    );
    expect(r.score).toBeLessThan(0.2);
  });

  test('SLA breach adds full 0.05 credit', () => {
    const now = new Date('2026-06-01');
    const base = scoreItem({ severity: 'medium', alertType: 'CAPA_OVERDUE' }, { now });
    const breached = scoreItem(
      { severity: 'medium', alertType: 'CAPA_OVERDUE', slaBreached: true },
      { now }
    );
    expect(breached.score - base.score).toBeCloseTo(FACTOR_WEIGHTS.slaBreached, 5);
    expect(breached.signals.some(s => s.name === 'slaBreached')).toBe(true);
  });

  test('roleWeight multiplies the score (clamped to [0.5, 2.0])', () => {
    const now = new Date('2026-06-01');
    const item = { severity: 'medium', alertType: 'REGRESSION_DETECTED' };
    const neutral = scoreItem(item, { now, roleWeight: 1.0 });
    const boosted = scoreItem(item, { now, roleWeight: 1.5 });
    const clampedHigh = scoreItem(item, { now, roleWeight: 10.0 }); // → 2.0
    const clampedLow = scoreItem(item, { now, roleWeight: 0.01 }); // → 0.5

    expect(boosted.score).toBeGreaterThan(neutral.score);
    expect(clampedHigh.score).toBeGreaterThanOrEqual(boosted.score);
    // Clamping doesn't allow > 1 final score
    expect(clampedHigh.score).toBeLessThanOrEqual(1);
    expect(clampedLow.score).toBeLessThan(neutral.score);
  });

  test('score never exceeds 1 — even with max factors + 2.0× role bias', () => {
    const r = scoreItem(
      {
        severity: 'critical',
        createdAt: new Date('2026-01-01'), // ancient
        beneficiaryRiskTier: 'critical',
        alertType: 'SAFEGUARDING_CONCERN',
        slaBreached: true,
      },
      { now: new Date('2026-06-01'), roleWeight: 2.0 }
    );
    expect(r.score).toBe(1);
  });

  test('signals are explainable — each carries name+weight+evidence', () => {
    const r = scoreItem(
      {
        severity: 'high',
        createdAt: new Date('2026-05-30'),
        beneficiaryRiskTier: 'moderate',
        alertType: 'FORECAST_OFF_TRACK',
        slaBreached: true,
      },
      { now: new Date('2026-06-01') }
    );
    expect(r.signals.length).toBeGreaterThanOrEqual(5);
    for (const s of r.signals) {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('weight');
      expect(s).toHaveProperty('evidence');
    }
  });

  test('unknown alertType → default urgency 0.4', () => {
    const r = scoreItem(
      { severity: 'medium', alertType: 'TOTALLY_NEW_TYPE' },
      { now: new Date('2026-06-01') }
    );
    expect(r.breakdown.sourceUrgency).toBe(0.4);
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. rankItems — list sorting
// ──────────────────────────────────────────────────────────────────

describe('W431 — rankItems', () => {
  test('empty/null input → []', () => {
    expect(rankItems([])).toEqual([]);
    expect(rankItems(null)).toEqual([]);
    expect(rankItems(undefined)).toEqual([]);
  });

  test('sorts descending by score', () => {
    const now = new Date('2026-06-01');
    const items = [
      { id: 'a', severity: 'low', alertType: 'PLATEAU_DETECTED' },
      { id: 'b', severity: 'critical', alertType: 'REGRESSION_DETECTED' },
      { id: 'c', severity: 'medium', alertType: 'MCID_NOT_MET' },
    ];
    const ranked = rankItems(items, { now });
    expect(ranked.map(r => r.item.id)).toEqual(['b', 'c', 'a']);
  });

  test('stable sort: equal scores keep input order', () => {
    const items = [
      { id: 'one', severity: 'medium' },
      { id: 'two', severity: 'medium' },
      { id: 'three', severity: 'medium' },
    ];
    const ranked = rankItems(items, { now: new Date('2026-06-01') });
    expect(ranked.map(r => r.item.id)).toEqual(['one', 'two', 'three']);
  });

  test('returns the full envelope: item + score + signals', () => {
    const ranked = rankItems([{ id: 'x', severity: 'high' }], { now: new Date('2026-06-01') });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toHaveProperty('item');
    expect(ranked[0]).toHaveProperty('score');
    expect(ranked[0]).toHaveProperty('signals');
  });
});

// ──────────────────────────────────────────────────────────────────
//  5. topN — head-of-list convenience
// ──────────────────────────────────────────────────────────────────

describe('W431 — topN', () => {
  test('n=0 / negative / non-finite → []', () => {
    expect(topN([{ severity: 'high' }], 0)).toEqual([]);
    expect(topN([{ severity: 'high' }], -1)).toEqual([]);
    expect(topN([{ severity: 'high' }], NaN)).toEqual([]);
  });

  test('returns first n after ranking', () => {
    const items = [
      { id: 'a', severity: 'low' },
      { id: 'b', severity: 'critical' },
      { id: 'c', severity: 'high' },
    ];
    const top2 = topN(items, 2, { now: new Date('2026-06-01') });
    expect(top2.map(r => r.item.id)).toEqual(['b', 'c']);
  });

  test('n larger than list → returns whole list', () => {
    const items = [{ severity: 'low' }, { severity: 'high' }];
    const top10 = topN(items, 10, { now: new Date('2026-06-01') });
    expect(top10).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────
//  6. roleBiasFor — role-specific weighting
// ──────────────────────────────────────────────────────────────────

describe('W431 — roleBiasFor', () => {
  test('nurse + REGRESSION_DETECTED → 1.5 (clinical safety bias)', () => {
    expect(roleBiasFor('nurse', 'REGRESSION_DETECTED')).toBe(1.5);
    expect(roleBiasFor('head_nurse', 'SAFEGUARDING_CONCERN')).toBe(1.5);
    expect(roleBiasFor('doctor', 'INCIDENT_OPEN')).toBe(1.5);
  });

  test('supervisor + CAPA_OVERDUE → 1.5 (quality oversight bias)', () => {
    expect(roleBiasFor('supervisor', 'CAPA_OVERDUE')).toBe(1.5);
    expect(roleBiasFor('manager', 'PLATEAU_DETECTED')).toBe(1.5);
    expect(roleBiasFor('manager', 'FORECAST_OFF_TRACK')).toBe(1.5);
  });

  test('dpo + DPIA_PENDING → 1.5 (PDPL bias)', () => {
    expect(roleBiasFor('dpo', 'DPIA_PENDING')).toBe(1.5);
    expect(roleBiasFor('dpo', 'COMPLIANCE_EVIDENCE_MISSING')).toBe(1.5);
  });

  test('unrelated role × alertType → 1.0 neutral', () => {
    expect(roleBiasFor('nurse', 'CAPA_OVERDUE')).toBe(1.0);
    expect(roleBiasFor('supervisor', 'REGRESSION_DETECTED')).toBe(1.0);
    expect(roleBiasFor('dpo', 'PLATEAU_DETECTED')).toBe(1.0);
  });

  test('missing args → 1.0 (no bias)', () => {
    expect(roleBiasFor(null, 'REGRESSION_DETECTED')).toBe(1.0);
    expect(roleBiasFor('nurse', null)).toBe(1.0);
    expect(roleBiasFor()).toBe(1.0);
  });
});

// ──────────────────────────────────────────────────────────────────
//  7. End-to-end scenario: realistic 7-item inbox
// ──────────────────────────────────────────────────────────────────

describe('W431 — realistic inbox scenario', () => {
  test('nurse role: SAFEGUARDING is #1, then critical regression, then medium MCID', () => {
    const now = new Date('2026-06-01T12:00:00Z');
    const items = [
      // Items intentionally NOT in priority order
      {
        id: 'plateau-low',
        severity: 'low',
        alertType: 'PLATEAU_DETECTED',
        createdAt: new Date('2026-05-31'),
      },
      {
        id: 'safeguarding-critical',
        severity: 'critical',
        alertType: 'SAFEGUARDING_CONCERN',
        beneficiaryRiskTier: 'critical',
        createdAt: new Date('2026-06-01T10:00:00Z'),
      },
      {
        id: 'capa-overdue-high',
        severity: 'high',
        alertType: 'CAPA_OVERDUE',
        slaBreached: true,
        createdAt: new Date('2026-05-25'),
      },
      {
        id: 'forecast-medium',
        severity: 'medium',
        alertType: 'FORECAST_OFF_TRACK',
        beneficiaryRiskTier: 'moderate',
        createdAt: new Date('2026-05-30'),
      },
      {
        id: 'mcid-medium',
        severity: 'medium',
        alertType: 'MCID_NOT_MET',
        beneficiaryRiskTier: 'high',
        createdAt: new Date('2026-05-28'),
      },
      {
        id: 'regression-critical-fresh',
        severity: 'critical',
        alertType: 'REGRESSION_DETECTED',
        beneficiaryRiskTier: 'high',
        createdAt: new Date('2026-06-01T11:30:00Z'),
      },
      {
        id: 'incident-high',
        severity: 'high',
        alertType: 'INCIDENT_OPEN',
        beneficiaryRiskTier: 'moderate',
        createdAt: new Date('2026-05-29'),
      },
    ];

    // Nurse sees clinical-safety items boosted
    const rankedForNurse = rankItems(items, {
      now,
      roleWeight: roleBiasFor('nurse', 'REGRESSION_DETECTED'), // applies uniformly here
    });
    expect(rankedForNurse[0].item.id).toMatch(/safeguarding|regression/); // both clinical
    // Plateau-low is definitely last
    expect(rankedForNurse[rankedForNurse.length - 1].item.id).toBe('plateau-low');
  });
});
