'use strict';

/**
 * W385 — behavioral verification continuation (5 more wires, builds on W384).
 *
 * W384 covered 4 wires with easy mocks (no mongoose chains). W385 extends
 * coverage to 5 wires that DO go through mongoose by exploiting jest.setup.js's
 * generic mongoose mock (which has working findByIdAndUpdate + create + lean
 * implementations) plus targeted per-test overrides via jest.spyOn(mongoose,
 * 'model') when the generic mock doesn't return the right shape.
 *
 * Wires covered (in addition to W384's 4):
 *   - care-plans.ACTIVATED   → CarePlansService.activatePlan
 *   - care-plans.COMPLETED   → CarePlansService.completePlan
 *   - goals.ACHIEVED         → GoalService.achieveGoal (via repository.updateById stub)
 *   - behavior.INCIDENT_RECORDED → BehaviorService.createRecord
 *   - behavior.PLAN_UPDATED  → BehaviorService.createPlan
 *
 * Combined W384+W385 covers 9 of the 14 wires from ADR-027 reconciliation.
 *
 * Remaining 5 (defer to W386+):
 *   - episodes.phase_transitioned + closed (need custom document instance methods)
 *   - assessments.completed (need findByIdAndUpdate w/ specific shape)
 *   - quality.audit_completed + corrective_action_required (need chain mocks)
 *
 * Pattern matches W384: capture emit() via .on() listener, assert (a) eventType
 * matches the canonical contract string and (b) payload keys exactly match the
 * contract's envelope.
 */

const mongoose = require('mongoose');
const contracts = require('../events/contracts/dddEventContracts');

function envelopeKeysFor(group, key) {
  return Object.keys(contracts.DDD_CONTRACTS[group][key].payload).sort();
}

// ─── 1) W380 care-plans.ACTIVATED ──────────────────────────────────────────

describe('W385 — CarePlansService.activatePlan emits careplan.activated', () => {
  let svc;
  const fakePlan = {
    _id: 'plan-1',
    beneficiaryId: 'bene-1',
    episodeId: 'episode-1',
    goals: ['g1', 'g2', 'g3'],
    status: 'active',
    activatedDate: new Date('2026-05-25'),
  };

  beforeEach(() => {
    // Spy on mongoose.model('UnifiedCarePlan') to return a tailored stub.
    // The service does: mongoose.model('UnifiedCarePlan').findByIdAndUpdate(...).lean()
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'UnifiedCarePlan') {
        return {
          findByIdAndUpdate: jest.fn(() => ({
            lean: () => Promise.resolve({ ...fakePlan }),
          })),
        };
      }
      return {}; // safe fallback for other model lookups
    });

    const { CarePlansService } = require('../domains/care-plans/services/CarePlansService');
    svc = new CarePlansService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits careplan.activated with canonical envelope', async () => {
    const captured = [];
    svc.on('careplan.activated', p => captured.push(p));

    await svc.activatePlan('plan-1');

    expect(captured).toHaveLength(1);
    const payload = captured[0];

    const expectedKeys = envelopeKeysFor('care-plans', 'ACTIVATED'); // [beneficiaryId, episodeId, goalCount, planId]
    expect(Object.keys(payload).sort()).toEqual(expectedKeys);
    expect(payload.planId).toBe('plan-1');
    expect(payload.beneficiaryId).toBe('bene-1');
    expect(payload.episodeId).toBe('episode-1');
    expect(payload.goalCount).toBe(3);
  });

  it('careplan.completed emits with achievementRate from outcomeRating', async () => {
    const fakeCompleted = {
      _id: 'plan-1',
      beneficiaryId: 'bene-1',
      status: 'completed',
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'UnifiedCarePlan') {
        return {
          findByIdAndUpdate: jest.fn(() => ({
            lean: () => Promise.resolve({ ...fakeCompleted }),
          })),
        };
      }
      return {};
    });

    const { CarePlansService } = require('../domains/care-plans/services/CarePlansService');
    svc = new CarePlansService();

    const captured = [];
    svc.on('careplan.completed', p => captured.push(p));

    await svc.completePlan('plan-1', { summary: 'Done', outcomeRating: 87 });

    expect(captured).toHaveLength(1);
    const payload = captured[0];

    const expectedKeys = envelopeKeysFor('care-plans', 'COMPLETED'); // [achievementRate, beneficiaryId, planId]
    expect(Object.keys(payload).sort()).toEqual(expectedKeys);
    expect(payload.planId).toBe('plan-1');
    expect(payload.achievementRate).toBe(87);
  });
});

// ─── 2) W380 goals.ACHIEVED via repository stub ────────────────────────────

describe('W385 — GoalService.achieveGoal emits goal.achieved', () => {
  it('emits via repository.updateById stub (no mongoose mock needed)', async () => {
    // GoalService class isn't exported separately; access through the
    // domain singleton after initialize().
    const goalsDomain = require('../domains/goals');
    if (typeof goalsDomain.initialize === 'function' && !goalsDomain._initialized) {
      await goalsDomain.initialize();
    }
    const svc = goalsDomain.goalService;
    expect(svc).toBeTruthy();

    // Swap in a repository stub for this test
    const originalRepo = svc.repository;
    svc.repository = {
      updateById: jest.fn(async (id, update) => ({
        _id: id,
        ...update,
        beneficiaryId: 'bene-1',
        domain: 'communication',
        // simulate model methods absent — service shouldn't need them
      })),
      // _invalidateCache calls — provide no-op chain via BaseService inherits
    };

    const captured = [];
    const handler = p => captured.push(p);
    svc.on('goal.achieved', handler);

    try {
      await svc.achieveGoal('goal-1', 'user-1');

      expect(captured).toHaveLength(1);
      const payload = captured[0];

      const expectedKeys = envelopeKeysFor('goals', 'ACHIEVED'); // [achievementDate, beneficiaryId, goalId, goalType]
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.goalId).toBe('goal-1');
      expect(payload.beneficiaryId).toBe('bene-1');
      expect(payload.goalType).toBe('communication');
      expect(payload.achievementDate).toBeDefined();
    } finally {
      svc.off('goal.achieved', handler);
      svc.repository = originalRepo;
    }
  });
});

// ─── 3) W380 behavior.INCIDENT_RECORDED ───────────────────────────────────

describe('W385 — BehaviorService emits canonical events', () => {
  let svc;

  beforeAll(() => {
    const { behaviorService } = require('../domains/behavior/services/BehaviorService');
    svc = behaviorService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('createRecord emits behavior.incident_recorded with canonical envelope', async () => {
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorRecord') {
        return {
          create: jest.fn(async data => ({
            _id: 'record-1',
            ...data,
          })),
        };
      }
      return {};
    });

    const captured = [];
    const handler = p => captured.push(p);
    svc.on('behavior.incident_recorded', handler);

    try {
      await svc.createRecord({
        beneficiaryId: 'bene-1',
        behavior: { severity: 'moderate', topography: 'verbal_aggression' },
      });

      expect(captured).toHaveLength(1);
      const payload = captured[0];

      // STRICT envelope check per BEHAVIOR_EVENTS.INCIDENT_RECORDED contract:
      // {recordId, beneficiaryId, behaviorType, severity}
      // W385 discovered the original W380 wire emitted {recordId, beneficiaryId,
      // severity, occurredAt} — missing behaviorType + extra occurredAt. Fixed
      // in same commit.
      const expectedKeys = envelopeKeysFor('behavior', 'INCIDENT_RECORDED');
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.recordId).toBe('record-1');
      expect(payload.beneficiaryId).toBe('bene-1');
      expect(payload.behaviorType).toBe('verbal_aggression');
      expect(payload.severity).toBe('moderate');
    } finally {
      svc.off('behavior.incident_recorded', handler);
    }
  });

  it('createPlan emits behavior.plan_updated with strategies array', async () => {
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorPlan') {
        return {
          create: jest.fn(async data => ({
            _id: 'plan-1',
            ...data,
            strategies: data.strategies || ['praise-reward', 'redirect'],
          })),
        };
      }
      return {};
    });

    const captured = [];
    const handler = p => captured.push(p);
    svc.on('behavior.plan_updated', handler);

    try {
      await svc.createPlan({
        beneficiaryId: 'bene-2',
        strategies: ['praise-reward', 'redirect'],
      });

      expect(captured).toHaveLength(1);
      const payload = captured[0];

      const expectedKeys = envelopeKeysFor('behavior', 'PLAN_UPDATED'); // [beneficiaryId, planId, strategies]
      expect(Object.keys(payload).sort()).toEqual(expectedKeys);
      expect(payload.planId).toBe('plan-1');
      expect(payload.beneficiaryId).toBe('bene-2');
      expect(Array.isArray(payload.strategies)).toBe(true);
      expect(payload.strategies).toEqual(['praise-reward', 'redirect']);
    } finally {
      svc.off('behavior.plan_updated', handler);
    }
  });
});

// ─── 4) Sanity ─────────────────────────────────────────────────────────────

describe('W385 — sanity: all 5 contracts tested are registered', () => {
  it('contracts still exist (catches accidental removal in future commits)', () => {
    expect(contracts.DDD_CONTRACTS['care-plans'].ACTIVATED).toBeDefined();
    expect(contracts.DDD_CONTRACTS['care-plans'].COMPLETED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.goals.ACHIEVED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.behavior.INCIDENT_RECORDED).toBeDefined();
    expect(contracts.DDD_CONTRACTS.behavior.PLAN_UPDATED).toBeDefined();
  });
});
