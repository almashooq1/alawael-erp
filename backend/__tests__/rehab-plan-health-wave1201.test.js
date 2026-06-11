'use strict';

/**
 * rehab-plan-health-wave1201.test.js — unit tests for the READ-ONLY per-beneficiary
 * Rehabilitation Plan Health service (services/rehabPlanHealth.service.js) + a
 * static guard for its live route (domains/goals/routes/rehab-plan-health.routes.js).
 *
 * Pure logic — no DB. Requiring the service must NOT open a connection.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/rehab-plan-health-wave1201.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  gradeRehabPlanHealth,
  buildGoalSignal,
  PLAN_HEALTH_GRADES,
  ACTIVE_PLAN_STATUSES,
} = require('../services/rehabPlanHealth.service');

const review = (over = {}) => ({
  onTrackRatio: 1,
  holisticVerdict: 'continue_plan',
  dischargeReadiness: { ready: false },
  triggers: [],
  ...over,
});

describe('rehab-plan-health — gradeRehabPlanHealth (pure)', () => {
  test('requires service WITHOUT opening a DB connection + grade list', () => {
    expect(typeof gradeRehabPlanHealth).toBe('function');
    expect(PLAN_HEALTH_GRADES).toContain('ON_TRACK');
    expect(PLAN_HEALTH_GRADES).toContain('AT_RISK');
    expect(ACTIVE_PLAN_STATUSES).toContain('active');
  });

  test('no plan → NO_PLAN, composite null, no actions', () => {
    const g = gradeRehabPlanHealth({ hasPlan: false });
    expect(g.grade).toBe('NO_PLAN');
    expect(g.composite).toBeNull();
    expect(g.actions).toEqual([]);
  });

  test('plan but zero goals → NO_DATA', () => {
    expect(gradeRehabPlanHealth({ hasPlan: true, goalCount: 0 }).grade).toBe('NO_DATA');
  });

  test('strong progress + complete thread + no overdue → ON_TRACK', () => {
    const g = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 4,
      review: review({ onTrackRatio: 0.9 }),
      threadSummary: { total: 4, completeCount: 4 },
      reviewOverdueDays: 0,
    });
    expect(g.grade).toBe('ON_TRACK');
    expect(g.composite).toBeGreaterThanOrEqual(90);
    expect(g.actions).toHaveLength(0);
  });

  test('holistic new_plan → AT_RISK with P1 goal_progress action', () => {
    const g = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 3,
      review: review({ holisticVerdict: 'new_plan', onTrackRatio: 0.3 }),
      threadSummary: { total: 3, completeCount: 1 },
    });
    expect(g.grade).toBe('AT_RISK');
    expect(g.actions[0].priority).toBe('P1');
    expect(g.actions.some(a => a.dimension === 'goal_progress')).toBe(true);
  });

  test('safety trigger → AT_RISK + P1 safety action first', () => {
    const g = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 2,
      review: review({ triggers: [{ kind: 'safety' }] }),
      threadSummary: { total: 2, completeCount: 2 },
    });
    expect(g.grade).toBe('AT_RISK');
    expect(g.actions[0].dimension).toBe('safety');
    expect(g.signals.safety).toBe(true);
    expect(g.composite).toBeLessThan(100); // safety penalty applied
  });

  test('review overdue ≥14d → AT_RISK (critical); 1–13d → NEEDS_ATTENTION', () => {
    const crit = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 2,
      review: review(),
      threadSummary: { total: 2, completeCount: 2 },
      reviewOverdueDays: 20,
    });
    expect(crit.grade).toBe('AT_RISK');
    expect(crit.actions.find(a => a.dimension === 'review_cadence').priority).toBe('P1');

    const warn = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 2,
      review: review(),
      threadSummary: { total: 2, completeCount: 2 },
      reviewOverdueDays: 5,
    });
    expect(warn.grade).toBe('NEEDS_ATTENTION');
    expect(warn.actions.find(a => a.dimension === 'review_cadence').priority).toBe('P2');
  });

  test('holistic revise_plan → NEEDS_ATTENTION', () => {
    const g = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 3,
      review: review({ holisticVerdict: 'revise_plan', onTrackRatio: 0.8 }),
      threadSummary: { total: 3, completeCount: 3 },
    });
    expect(g.grade).toBe('NEEDS_ATTENTION');
  });

  test('discharge readiness (and not at-risk) → DISCHARGE_READY + P3 action', () => {
    const g = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 4,
      review: review({ onTrackRatio: 0.95, dischargeReadiness: { ready: true } }),
      threadSummary: { total: 4, completeCount: 4 },
      reviewOverdueDays: 0,
    });
    expect(g.grade).toBe('DISCHARGE_READY');
    expect(g.actions.some(a => a.dimension === 'discharge' && a.priority === 'P3')).toBe(true);
  });

  test('incomplete golden thread (<60%) → NEEDS_ATTENTION + golden_thread action', () => {
    const g = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 5,
      review: review({ onTrackRatio: 0.8 }),
      threadSummary: { total: 5, completeCount: 2 }, // 40%
    });
    expect(g.grade).toBe('NEEDS_ATTENTION');
    expect(g.actions.some(a => a.dimension === 'golden_thread')).toBe(true);
    expect(g.signals.threadCompletePct).toBe(40);
  });

  test('actions ordered P1 → P2 → P3', () => {
    const g = gradeRehabPlanHealth({
      hasPlan: true,
      goalCount: 4,
      review: review({
        holisticVerdict: 'revise_plan', // P2
        onTrackRatio: 0.5,
        triggers: [{ kind: 'safety' }], // P1
        dischargeReadiness: { ready: true }, // P3 (but at-risk due to safety)
      }),
      threadSummary: { total: 4, completeCount: 1 },
      reviewOverdueDays: 3, // P2
    });
    const prios = g.actions.map(a => a.priority);
    expect(prios[0]).toBe('P1');
    expect([...prios].sort()).toEqual(prios); // already non-decreasing
  });
});

describe('rehab-plan-health — buildGoalSignal (pure)', () => {
  test('maps progressHistory → measureSeries + target.value → targetValue', () => {
    const sig = buildGoalSignal({
      _id: 'g1',
      target: { value: 80 },
      progressHistory: [
        { recordedAt: '2026-01-01', value: 10 },
        { recordedAt: '2026-02-01', value: 25 },
        { value: null }, // dropped (no numeric value)
      ],
    });
    expect(sig.goalId).toBe('g1');
    expect(sig.targetValue).toBe(80);
    expect(sig.measureSeries).toHaveLength(2);
    expect(sig.measureSeries[0]).toEqual({ date: '2026-01-01', value: 10 });
  });

  test('empty/missing fields degrade to empty series + undefined target', () => {
    const sig = buildGoalSignal({});
    expect(sig.measureSeries).toEqual([]);
    expect(sig.targetValue).toBeUndefined();
    expect(sig.safetyEventLinked).toBe(false);
  });
});

describe('rehab-plan-health route (W1201) — static guard', () => {
  const ROUTE_SRC = fs.readFileSync(
    path.join(__dirname, '..', 'domains', 'goals', 'routes', 'rehab-plan-health.routes.js'),
    'utf-8'
  );
  const INDEX_SRC = fs.readFileSync(
    path.join(__dirname, '..', 'domains', 'goals', 'routes', 'index.routes.js'),
    'utf-8'
  );

  test('route file loads without throwing', () => {
    expect(() => require('../domains/goals/routes/rehab-plan-health.routes')).not.toThrow();
  });
  test('declares GET /rehab-plan-health/:beneficiaryId + mounted in goals index', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/rehab-plan-health\/:beneficiaryId['"]/);
    expect(INDEX_SRC).toMatch(/require\(\s*['"]\.\/rehab-plan-health\.routes['"]\s*\)/);
  });
  test('W269 beneficiary-branch isolation (enforceBeneficiaryBranch) + ObjectId validation', () => {
    expect(ROUTE_SRC).toMatch(/enforceBeneficiaryBranch\(\s*req\s*,\s*beneficiaryId\s*\)/);
    expect(ROUTE_SRC).toMatch(/isValidObjectId\(\s*beneficiaryId\s*\)/);
    expect(ROUTE_SRC).not.toMatch(/req\.branchId/);
  });
  test('READ-ONLY — no mutation in the route', () => {
    expect(ROUTE_SRC).not.toMatch(
      /\.(save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|findOneAndUpdate)\(/
    );
  });
  test('delegates to assembleBeneficiaryPlanHealth', () => {
    expect(ROUTE_SRC).toMatch(/assembleBeneficiaryPlanHealth\(/);
  });
});
