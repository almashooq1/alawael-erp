/**
 * wave117-schedule-optimizer-v2.test.js — Wave 117 / P3.5.
 *
 * Tests for scheduleOptimizerV2.service.js — risk-aware enrichment
 * of v1 schedule output.
 */

'use strict';

const v2 = require('../services/ai/scheduleOptimizerV2.service');

// Mock no-show service surface (Wave 115 shape).
function mockNoShowService(overrides = {}) {
  return {
    extractFeatures: (appointment, history) => {
      const noShowCount = (history || []).filter(h => h.status === 'NO_SHOW').length;
      const total = (history || []).length;
      return {
        noShowRate90d: total > 0 ? noShowCount / total : 0.1,
        cancellationRate90d: 0,
        recentStreak: 0,
        daysSinceLastAttended: 0.2,
        rescheduleCount: 0,
        isFirstAppointment: total === 0,
        earlyOrLateHour: 0,
        hasInsuranceApproval: false,
        branchBaseline: 0.1,
      };
    },
    scoreFromFeatures: features => {
      // Simple weighted sum mirroring v1's logic so tests are
      // deterministic.
      return Math.min(
        1,
        (features.noShowRate90d || 0) * 0.8 + (features.branchBaseline || 0) * 0.2
      );
    },
    ...overrides,
  };
}

// Build a minimal v1 result with N scheduled appointments.
function buildV1Result(items = []) {
  return {
    schedule: items,
    stats: { scheduled: items.filter(i => i.type === 'appointment').length },
    optimization_score: 0.7,
    suggestions: [],
  };
}

// ─── 1. Risk penalty helper ─────────────────────────────────────

describe('scheduleOptimizerV2 — _riskPenalty', () => {
  test('low risk produces small penalty', () => {
    expect(v2._riskPenalty(0.1)).toBe(3);
    expect(v2._riskPenalty(0.2)).toBe(6);
  });
  test('critical risk hits the cap', () => {
    expect(v2._riskPenalty(0.9)).toBe(27);
    expect(v2._riskPenalty(1.0)).toBe(30);
  });
  test('clamps non-numeric input to 0', () => {
    expect(v2._riskPenalty('boom')).toBe(0);
    expect(v2._riskPenalty(null)).toBe(0);
    expect(v2._riskPenalty(undefined)).toBe(0);
  });
});

// ─── 2. Slot stability bonus ─────────────────────────────────────

describe('scheduleOptimizerV2 — _slotStabilityBonus', () => {
  test('mid-morning slots get max bonus (8)', () => {
    expect(v2._slotStabilityBonus(9)).toBe(8);
    expect(v2._slotStabilityBonus(10)).toBe(8);
    expect(v2._slotStabilityBonus(11)).toBe(8);
  });
  test('early or late slots get zero bonus', () => {
    expect(v2._slotStabilityBonus(7)).toBe(0);
    expect(v2._slotStabilityBonus(8)).toBe(0);
    expect(v2._slotStabilityBonus(16)).toBe(0);
    expect(v2._slotStabilityBonus(17)).toBe(0);
  });
  test('invalid hour returns 0', () => {
    expect(v2._slotStabilityBonus(NaN)).toBe(0);
    expect(v2._slotStabilityBonus(null)).toBe(0);
  });
});

// ─── 3. _scoreSlotRisk ──────────────────────────────────────────

describe('scheduleOptimizerV2 — _scoreSlotRisk', () => {
  test('returns score + band + interventions for a typical slot', () => {
    const slot = {
      beneficiary_id: 'b1',
      date: '2026-05-25',
      start_time: '10:00',
      score: 70,
    };
    const history = Array.from({ length: 10 }, (_, i) => ({
      _id: `a-${i}`,
      date: new Date(Date.now() - (i + 1) * 24 * 3600 * 1000),
      status: i % 3 === 0 ? 'NO_SHOW' : 'COMPLETED',
    }));
    const r = v2._scoreSlotRisk({
      slot,
      history,
      noShowService: mockNoShowService(),
      now: new Date(),
    });
    expect(r).not.toBeNull();
    expect(typeof r.score).toBe('number');
    expect(['low', 'medium', 'high', 'critical']).toContain(r.band);
    expect(Array.isArray(r.interventions)).toBe(true);
    expect(r.interventions.length).toBeGreaterThanOrEqual(1);
  });

  test('returns null when noShowService is missing', () => {
    const r = v2._scoreSlotRisk({
      slot: { date: '2026-05-25', start_time: '10:00' },
      history: [],
      noShowService: null,
      now: new Date(),
    });
    expect(r).toBeNull();
  });

  test('returns null when extractFeatures throws', () => {
    const r = v2._scoreSlotRisk({
      slot: { date: '2026-05-25', start_time: '10:00' },
      history: [],
      noShowService: {
        extractFeatures: () => {
          throw new Error('boom');
        },
        scoreFromFeatures: () => 0.5,
      },
      now: new Date(),
    });
    expect(r).toBeNull();
  });

  test('returns null when scoreFromFeatures throws', () => {
    const r = v2._scoreSlotRisk({
      slot: { date: '2026-05-25', start_time: '10:00' },
      history: [],
      noShowService: {
        extractFeatures: () => ({}),
        scoreFromFeatures: () => {
          throw new Error('boom');
        },
      },
      now: new Date(),
    });
    expect(r).toBeNull();
  });

  test('low-history yields low band by default', () => {
    const r = v2._scoreSlotRisk({
      slot: { date: '2026-05-25', start_time: '10:00' },
      history: [],
      noShowService: mockNoShowService(),
      now: new Date(),
    });
    expect(r.band).toBe('low');
  });

  test('all-no-show history yields critical band', () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      _id: `a-${i}`,
      date: new Date(Date.now() - (i + 1) * 24 * 3600 * 1000),
      status: 'NO_SHOW',
    }));
    const r = v2._scoreSlotRisk({
      slot: { date: '2026-05-25', start_time: '10:00' },
      history,
      noShowService: mockNoShowService(),
      now: new Date(),
    });
    expect(['high', 'critical']).toContain(r.band);
  });
});

// ─── 4. enrichScheduleWithRisk ──────────────────────────────────

describe('scheduleOptimizerV2 — enrichScheduleWithRisk', () => {
  test('adds no_show_score + band + interventions to each appointment', () => {
    const v1Result = buildV1Result([
      {
        type: 'appointment',
        beneficiary_id: 'b1',
        beneficiary_name: 'مستفيد ١',
        date: '2026-05-25',
        start_time: '10:00',
        score: 70,
      },
      {
        type: 'appointment',
        beneficiary_id: 'b2',
        beneficiary_name: 'مستفيد ٢',
        date: '2026-05-26',
        start_time: '14:00',
        score: 60,
      },
    ]);
    const r = v2.enrichScheduleWithRisk({
      v1Result,
      historyByBeneficiary: { b1: [], b2: [] },
      noShowService: mockNoShowService(),
    });
    expect(r.ok).toBe(true);
    expect(r.v2Result.schedule).toHaveLength(2);
    for (const item of r.v2Result.schedule) {
      expect(typeof item.no_show_score).toBe('number');
      expect(['low', 'medium', 'high', 'critical']).toContain(item.no_show_band);
      expect(Array.isArray(item.recommended_interventions)).toBe(true);
    }
  });

  test('non-appointment entries (unscheduled_warning) pass through untouched', () => {
    const v1Result = buildV1Result([
      {
        type: 'unscheduled_warning',
        beneficiary_id: 'b3',
        missing: 2,
      },
    ]);
    const r = v2.enrichScheduleWithRisk({
      v1Result,
      historyByBeneficiary: {},
      noShowService: mockNoShowService(),
    });
    expect(r.ok).toBe(true);
    expect(r.v2Result.schedule[0]).toEqual(v1Result.schedule[0]);
  });

  test('marks no_show_band="unknown" when noShowService is missing', () => {
    const v1Result = buildV1Result([
      {
        type: 'appointment',
        beneficiary_id: 'b1',
        date: '2026-05-25',
        start_time: '10:00',
        score: 70,
      },
    ]);
    const r = v2.enrichScheduleWithRisk({
      v1Result,
      historyByBeneficiary: {},
      noShowService: null,
    });
    expect(r.v2Result.schedule[0].no_show_band).toBe('unknown');
    expect(r.v2Result.schedule[0].no_show_score).toBeNull();
    expect(r.v2Result.schedule[0].recommended_interventions).toEqual([]);
  });

  test('returns reason when v1Result is missing or malformed', () => {
    const r1 = v2.enrichScheduleWithRisk({});
    expect(r1.ok).toBe(false);
    expect(r1.reason).toBe('V1_RESULT_REQUIRED');
    const r2 = v2.enrichScheduleWithRisk({ v1Result: { foo: 'bar' } });
    expect(r2.ok).toBe(false);
  });
});

// ─── 5. _computeComparison ──────────────────────────────────────

describe('scheduleOptimizerV2 — _computeComparison', () => {
  test('empty appointments → both scores equal v1 + counts zero', () => {
    const c = v2._computeComparison({
      v1Result: { optimization_score: 0.8 },
      enriched: [],
    });
    expect(c.v1Score).toBe(0.8);
    expect(c.v2RiskAwareScore).toBe(0.8);
    expect(c.expectedAttended).toBe(0);
    expect(c.highRiskCount).toBe(0);
  });

  test('expectedAttended ≈ totalScheduled when all risks are low', () => {
    const enriched = [
      {
        type: 'appointment',
        score: 70,
        start_time: '10:00',
        no_show_score: 0.05,
        no_show_band: 'low',
      },
      {
        type: 'appointment',
        score: 70,
        start_time: '10:00',
        no_show_score: 0.05,
        no_show_band: 'low',
      },
    ];
    const c = v2._computeComparison({
      v1Result: { optimization_score: 0.8 },
      enriched,
    });
    expect(c.expectedAttended).toBeCloseTo(1.9, 1);
    expect(c.expectedLost).toBeCloseTo(0.1, 1);
    expect(c.highRiskCount).toBe(0);
  });

  test('high risk → expected attended drops + flags counted', () => {
    const enriched = [
      {
        type: 'appointment',
        score: 70,
        start_time: '10:00',
        no_show_score: 0.8,
        no_show_band: 'critical',
      },
      {
        type: 'appointment',
        score: 70,
        start_time: '10:00',
        no_show_score: 0.6,
        no_show_band: 'high',
      },
    ];
    const c = v2._computeComparison({
      v1Result: { optimization_score: 0.8 },
      enriched,
    });
    expect(c.criticalRiskCount).toBe(1);
    expect(c.highRiskCount).toBe(1);
    expect(c.expectedAttended).toBeLessThan(1.5);
    expect(c.v2RiskAwareScore).toBeLessThan(c.v1Score);
  });
});

// ─── 6. Swap suggestions ────────────────────────────────────────

describe('scheduleOptimizerV2 — _findSwapSuggestions', () => {
  test('proposes swap when high-risk in mid-morning + low-risk in early/late', () => {
    const enriched = [
      {
        type: 'appointment',
        beneficiary_id: 'b-high',
        beneficiary_name: 'مرتفع',
        date: '2026-05-25',
        start_time: '10:00',
        no_show_score: 0.8,
        no_show_band: 'critical',
      },
      {
        type: 'appointment',
        beneficiary_id: 'b-low',
        beneficiary_name: 'منخفض',
        date: '2026-05-25',
        start_time: '15:00',
        no_show_score: 0.05,
        no_show_band: 'low',
      },
    ];
    const swaps = v2._findSwapSuggestions({ enriched });
    expect(swaps.length).toBe(1);
    expect(swaps[0].from.beneficiary_id).toBe('b-high');
    expect(swaps[0].to.beneficiary_id).toBe('b-low');
    expect(swaps[0].expectedDelta).toBeGreaterThan(0);
  });

  test('no swap proposed when beneficiaries are on different days', () => {
    const enriched = [
      {
        type: 'appointment',
        beneficiary_id: 'b-high',
        date: '2026-05-25',
        start_time: '10:00',
        no_show_score: 0.8,
        no_show_band: 'critical',
      },
      {
        type: 'appointment',
        beneficiary_id: 'b-low',
        date: '2026-05-26', // DIFFERENT DAY
        start_time: '15:00',
        no_show_score: 0.05,
        no_show_band: 'low',
      },
    ];
    const swaps = v2._findSwapSuggestions({ enriched });
    expect(swaps).toHaveLength(0);
  });

  test('no swap when there are no high-risk slots in mid-morning', () => {
    const enriched = [
      {
        type: 'appointment',
        beneficiary_id: 'b1',
        date: '2026-05-25',
        start_time: '15:00',
        no_show_score: 0.8,
        no_show_band: 'critical',
      },
      {
        type: 'appointment',
        beneficiary_id: 'b2',
        date: '2026-05-25',
        start_time: '15:30',
        no_show_score: 0.05,
        no_show_band: 'low',
      },
    ];
    const swaps = v2._findSwapSuggestions({ enriched });
    expect(swaps).toHaveLength(0);
  });

  test('caps at maxSuggestions', () => {
    const date = '2026-05-25';
    const enriched = [];
    // 3 high-risk in mid-morning + 3 low-risk in evening
    for (let i = 0; i < 3; i++) {
      enriched.push({
        type: 'appointment',
        beneficiary_id: `h${i}`,
        date,
        start_time: `1${i}:00`,
        no_show_score: 0.8,
        no_show_band: 'critical',
      });
      enriched.push({
        type: 'appointment',
        beneficiary_id: `l${i}`,
        date,
        start_time: '15:00',
        no_show_score: 0.05,
        no_show_band: 'low',
      });
    }
    const swaps = v2._findSwapSuggestions({ enriched, maxSuggestions: 2 });
    expect(swaps.length).toBe(2);
  });
});
