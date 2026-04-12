/**
 * Unit Tests — scheduleOptimizer.service.js
 * Schedule optimization helpers — mock only logger
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const sched = require('../../services/ai/scheduleOptimizer.service');

// Constants are not exported — tested indirectly via functions

// ═══════════════════════════════════════
//  initializeSpecialistSlots
// ═══════════════════════════════════════
describe('initializeSpecialistSlots', () => {
  const makeSpecialist = (overrides = {}) => ({
    _id: 'sp1',
    name: 'أحمد',
    specialties: ['pt'],
    max_caseload: 20,
    current_caseload: 5,
    availability: [0, 1, 2, 3, 4],
    ...overrides,
  });

  it('creates slots for 5 working days', () => {
    const slots = sched.initializeSpecialistSlots(
      [makeSpecialist()],
      '2025-06-15', // Sunday
      { start: 8, end: 16 }
    );
    // 8 hours = 480 min, session+break=60min → 8 slots per day × 5 days = 40
    expect(slots.length).toBe(40);
  });

  it('each slot has correct shape', () => {
    const slots = sched.initializeSpecialistSlots([makeSpecialist()], '2025-06-15', {
      start: 8,
      end: 16,
    });
    const s = slots[0];
    expect(s).toHaveProperty('specialist_id');
    expect(s).toHaveProperty('specialist_name');
    expect(s).toHaveProperty('specialties');
    expect(s).toHaveProperty('date');
    expect(s).toHaveProperty('day_of_week');
    expect(s).toHaveProperty('start_time');
    expect(s).toHaveProperty('end_time');
    expect(s).toHaveProperty('is_morning');
    expect(s).toHaveProperty('available');
    expect(s).toHaveProperty('score');
    expect(s.available).toBe(true);
    expect(s.score).toBe(50);
  });

  it('marks morning vs afternoon', () => {
    const slots = sched.initializeSpecialistSlots([makeSpecialist()], '2025-06-15', {
      start: 8,
      end: 16,
    });
    const morningSlots = slots.filter(s => s.is_morning);
    const afternoonSlots = slots.filter(s => !s.is_morning);
    expect(morningSlots.length).toBeGreaterThan(0);
    expect(afternoonSlots.length).toBeGreaterThan(0);
  });

  it('skips specialist at max caseload', () => {
    const slots = sched.initializeSpecialistSlots(
      [makeSpecialist({ current_caseload: 20, max_caseload: 20 })],
      '2025-06-15',
      { start_hour: 8, end_hour: 16 }
    );
    expect(slots.length).toBe(0);
  });

  it('respects availability (only some days)', () => {
    const slots = sched.initializeSpecialistSlots(
      [makeSpecialist({ availability: [0, 1] })], // Sunday + Monday
      '2025-06-15',
      { start: 8, end: 16 }
    );
    // 2 days × 8 slots = 16
    expect(slots.length).toBe(16);
  });

  it('empty specialists returns empty', () => {
    const slots = sched.initializeSpecialistSlots([], '2025-06-15', { start: 8, end: 16 });
    expect(slots).toEqual([]);
  });
});

// ═══════════════════════════════════════
//  calculateBeneficiaryNeeds
// ═══════════════════════════════════════
describe('calculateBeneficiaryNeeds', () => {
  it('maps beneficiary data with defaults', () => {
    const bens = [{ _id: 'b1', name: 'سارة', disability_severity: 'moderate' }];
    const r = sched.calculateBeneficiaryNeeds(bens);
    expect(r).toHaveLength(1);
    expect(r[0].beneficiary).toBe(bens[0]);
    expect(r[0].sessions_per_week).toBe(3); // default
    expect(r[0].priority_score).toBeGreaterThan(0);
  });

  it('uses active_plan sessions_per_week if available', () => {
    const bens = [{ _id: 'b1', active_plan: { sessions_per_week: 5 } }];
    const r = sched.calculateBeneficiaryNeeds(bens);
    expect(r[0].sessions_per_week).toBe(5);
  });

  it('severe disability gets higher priority', () => {
    const bens = [
      { _id: 'b1', disability_severity: 'mild' },
      { _id: 'b2', disability_severity: 'severe' },
    ];
    const r = sched.calculateBeneficiaryNeeds(bens);
    const mild = r.find(n => n.beneficiary._id === 'b1');
    const severe = r.find(n => n.beneficiary._id === 'b2');
    expect(severe.priority_score).toBeGreaterThan(mild.priority_score);
  });

  it('new beneficiary gets +15 priority', () => {
    const bens = [
      { _id: 'b1', disability_severity: 'moderate', status: 'active' },
      { _id: 'b2', disability_severity: 'moderate', status: 'new' },
    ];
    const r = sched.calculateBeneficiaryNeeds(bens);
    const existing = r.find(n => n.beneficiary._id === 'b1');
    const newBen = r.find(n => n.beneficiary._id === 'b2');
    expect(newBen.priority_score).toBe(existing.priority_score + 15);
  });
});

// ═══════════════════════════════════════
//  prioritizeBeneficiaries
// ═══════════════════════════════════════
describe('prioritizeBeneficiaries', () => {
  it('sorts descending by priority_score', () => {
    const needs = [{ priority_score: 50 }, { priority_score: 85 }, { priority_score: 60 }];
    const r = sched.prioritizeBeneficiaries(needs);
    expect(r[0].priority_score).toBe(85);
    expect(r[2].priority_score).toBe(50);
  });

  it('empty array returns empty', () => {
    expect(sched.prioritizeBeneficiaries([])).toEqual([]);
  });
});

// ═══════════════════════════════════════
//  satisfiesConstraints
// ═══════════════════════════════════════
describe('satisfiesConstraints', () => {
  it('allows first session', () => {
    const bene = { _id: 'b1' };
    const slot = { date: '2025-06-15', start_time: '09:00' };
    expect(sched.satisfiesConstraints(bene, slot, [], {})).toBe(true);
  });

  it('allows second session same day (max=2)', () => {
    const bene = { _id: 'b1' };
    const slot = { date: '2025-06-15', start_time: '11:00' };
    const existingSched = [{ beneficiary_id: 'b1', date: '2025-06-15', start_time: '09:00' }];
    expect(sched.satisfiesConstraints(bene, slot, existingSched, {})).toBe(true);
  });

  it('blocks third session same day (max=2)', () => {
    const bene = { _id: 'b1' };
    const slot = { date: '2025-06-15', start_time: '14:00' };
    const existingSched = [
      { beneficiary_id: 'b1', date: '2025-06-15', start_time: '09:00' },
      { beneficiary_id: 'b1', date: '2025-06-15', start_time: '11:00' },
    ];
    expect(sched.satisfiesConstraints(bene, slot, existingSched, {})).toBe(false);
  });

  it('respects custom max_sessions_per_day', () => {
    const bene = { _id: 'b1' };
    const slot = { date: '2025-06-15', start_time: '14:00' };
    const existingSched = [
      { beneficiary_id: 'b1', date: '2025-06-15', start_time: '09:00' },
      { beneficiary_id: 'b1', date: '2025-06-15', start_time: '11:00' },
    ];
    expect(sched.satisfiesConstraints(bene, slot, existingSched, { max_sessions_per_day: 3 })).toBe(
      true
    );
  });

  it('blocks same time conflict', () => {
    const bene = { _id: 'b1' };
    const slot = { date: '2025-06-15', start_time: '09:00' };
    const existingSched = [{ beneficiary_id: 'b1', date: '2025-06-15', start_time: '09:00' }];
    expect(sched.satisfiesConstraints(bene, slot, existingSched, {})).toBe(false);
  });
});

// ═══════════════════════════════════════
//  calculateStats
// ═══════════════════════════════════════
describe('calculateStats', () => {
  it('counts scheduled vs unscheduled', () => {
    const schedule = [
      { beneficiary_id: 'b1', specialist_id: 'sp1' },
      { beneficiary_id: 'b1', specialist_id: 'sp1' },
      { type: 'unscheduled_warning', beneficiary_id: 'b2' },
    ];
    const needs = [
      { beneficiary: { _id: 'b1' }, sessions_per_week: 2 },
      { beneficiary: { _id: 'b2' }, sessions_per_week: 1 },
    ];
    const r = sched.calculateStats(schedule, needs);
    expect(r.total_scheduled).toBe(2);
    expect(r.total_unscheduled).toBeGreaterThanOrEqual(0);
    expect(r.total_beneficiaries).toBe(2);
  });

  it('returns specialist utilization', () => {
    const schedule = [
      { specialist_id: 'sp1', date: '2025-06-15' },
      { specialist_id: 'sp1', date: '2025-06-16' },
    ];
    const needs = [{ beneficiary: { _id: 'b1' }, sessions_per_week: 2 }];
    const r = sched.calculateStats(schedule, needs);
    expect(r.specialist_utilization).toBeDefined();
  });
});

// ═══════════════════════════════════════
//  calculateOptimizationScore
// ═══════════════════════════════════════
describe('calculateOptimizationScore', () => {
  it('returns avg score / 100', () => {
    const schedule = [{ score: 80 }, { score: 60 }];
    const r = sched.calculateOptimizationScore(schedule);
    expect(r).toBeCloseTo(0.7, 1);
  });

  it('filters out warnings', () => {
    const schedule = [{ score: 80 }, { type: 'unscheduled_warning', score: 0 }];
    const r = sched.calculateOptimizationScore(schedule);
    expect(r).toBeCloseTo(0.8, 1);
  });

  it('empty schedule returns 0', () => {
    expect(sched.calculateOptimizationScore([])).toBe(0);
  });
});

// ═══════════════════════════════════════
//  generateScheduleSummaryAr
// ═══════════════════════════════════════
describe('generateScheduleSummaryAr', () => {
  it('excellent score >=0.8', () => {
    const r = sched.generateScheduleSummaryAr({
      stats: { total_scheduled: 10, total_unscheduled: 0, total_beneficiaries: 5 },
      optimization_score: 0.85,
    });
    expect(r).toContain('ممتاز');
  });

  it('good score >=0.6', () => {
    const r = sched.generateScheduleSummaryAr({
      stats: { total_scheduled: 8, total_unscheduled: 2, total_beneficiaries: 5 },
      optimization_score: 0.65,
    });
    expect(r).toContain('جيد');
  });

  it('acceptable score >=0.4', () => {
    const r = sched.generateScheduleSummaryAr({
      stats: { total_scheduled: 5, total_unscheduled: 5, total_beneficiaries: 5 },
      optimization_score: 0.45,
    });
    expect(r).toContain('مقبول');
  });

  it('needs improvement <0.4', () => {
    const r = sched.generateScheduleSummaryAr({
      stats: { total_scheduled: 2, total_unscheduled: 8, total_beneficiaries: 5 },
      optimization_score: 0.2,
    });
    expect(r).toContain('يحتاج تحسين');
  });
});

// ═══════════════════════════════════════
//  optimizeWeeklySchedule (integration)
// ═══════════════════════════════════════
describe('optimizeWeeklySchedule', () => {
  it('produces a full result', () => {
    const result = sched.optimizeWeeklySchedule({
      branchId: 'br1',
      weekStart: '2025-06-15',
      beneficiaries: [
        {
          _id: 'b1',
          name: 'أحمد',
          disability_severity: 'moderate',
          plan: { sessions_per_week: 2 },
        },
      ],
      specialists: [
        {
          _id: 'sp1',
          name: 'خالد',
          specialties: ['pt'],
          maxCaseload: 20,
          currentCaseload: 0,
          availability: [0, 1, 2, 3, 4],
        },
      ],
      existingAppointments: [],
      constraints: {},
      workingHours: { start: 8, end: 16 },
    });
    expect(result).toHaveProperty('schedule');
    expect(result).toHaveProperty('stats');
    expect(result).toHaveProperty('optimization_score');
    expect(result).toHaveProperty('suggestions');
    expect(Array.isArray(result.schedule)).toBe(true);
    expect(result.stats.total_beneficiaries).toBe(1);
  });
});
