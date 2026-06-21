'use strict';

/**
 * beneficiary-journey-score-scheduler-wave0.test.js — Wave 0 (Phase 4).
 *
 * Tests for the score-driven auto-transition scheduler.
 */

const mongoose = require('mongoose');
const {
  createBeneficiaryJourneyScoreScheduler,
  DEFAULTS,
  SCHEDULER_KEY,
} = require('../intelligence/beneficiary-journey-score.scheduler');
const schedulerRegistry = require('../intelligence/scheduler-registry');

jest.mock('../services/beneficiaryJourneyScore.service', () => {
  const actual = jest.requireActual('../services/beneficiaryJourneyScore.service');
  return {
    ...actual,
    computeAndSaveJourneyScore: jest.fn(),
    previewJourneyScore: jest.fn(),
  };
});

const {
  computeAndSaveJourneyScore,
  previewJourneyScore,
} = require('../services/beneficiaryJourneyScore.service');

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

function makeModels(beneficiaries = []) {
  const journeyScoreDocs = [];
  const transitionDocs = [];

  const beneficiaryModel = {
    find: jest.fn(() => ({
      select: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(beneficiaries),
      })),
    })),
    findById: jest.fn(id => ({
      lean: jest
        .fn()
        .mockResolvedValue(beneficiaries.find(b => String(b._id) === String(id)) || null),
    })),
  };

  const journeyScoreModel = {
    findOneAndUpdate: jest.fn(async (_filter, update) => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...update };
      journeyScoreDocs.push(doc);
      return doc;
    }),
    findOne: jest.fn(() => ({
      select: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(null),
      })),
    })),
    updateOne: jest.fn(async () => ({})),
  };

  const transitionLog = {
    findOne: jest.fn(async () => null),
    create: jest.fn(async data => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...data };
      transitionDocs.push(doc);
      return doc;
    }),
  };

  return { beneficiaryModel, journeyScoreModel, transitionLog, journeyScoreDocs, transitionDocs };
}

function makeLifecycleService() {
  return {
    requestTransition: jest.fn(async ({ transitionId }) => ({
      ok: true,
      transitionRecord: { _id: new mongoose.Types.ObjectId(), transitionId },
    })),
  };
}

function bene(_idSeed, progress, sessions = 10, riskFlags = []) {
  return {
    _id: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    status: 'active',
    progress,
    sessions,
    riskFlags,
  };
}

function scoreDoc(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    score: 88,
    recommendation: 'discharge',
    confidence: 0.9,
    rationaleAr: '',
    rationaleEn: '',
    signals: {},
    computedAt: FIXED_NOW,
    computedBy: 'test',
    ...overrides,
  };
}

describe('BeneficiaryJourneyScore scheduler', () => {
  beforeEach(() => {
    schedulerRegistry._reset();
    computeAndSaveJourneyScore.mockReset();
    previewJourneyScore.mockReset();
  });

  test('runOnce scores every active beneficiary and counts recommendations', async () => {
    const beneficiaries = [bene('b1', 50, 10), bene('b2', 50, 10)];
    const models = makeModels(beneficiaries);
    computeAndSaveJourneyScore.mockResolvedValue(
      scoreDoc({ recommendation: 'continue', score: 50 })
    );
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce();

    expect(summary.scanned).toBe(2);
    expect(summary.scored).toBe(2);
    expect(computeAndSaveJourneyScore).toHaveBeenCalledTimes(2);
    expect(summary.autoRequested).toBe(0);
    expect(lifecycleService.requestTransition).not.toHaveBeenCalled();
  });

  test('auto-requests a transition when recommendation and confidence threshold are met', async () => {
    const beneficiaries = [bene('b1', 90, 40)];
    const models = makeModels(beneficiaries);
    computeAndSaveJourneyScore.mockResolvedValue(
      scoreDoc({ recommendation: 'discharge', confidence: 0.9 })
    );
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce({ minConfidence: 0.8 });

    expect(summary.autoRequested).toBe(1);
    expect(lifecycleService.requestTransition).toHaveBeenCalledTimes(1);
    const call = lifecycleService.requestTransition.mock.calls[0][0];
    expect(call.transitionId).toBe('discharge');
    expect(call.actor.userId).toBe('system:journey-score-scheduler');
    expect(models.journeyScoreModel.updateOne).toHaveBeenCalled();
  });

  test('publishes auto_requested event when notification env gate is enabled', async () => {
    const previousEnv = process.env.BENEFICIARY_AUTO_TRANSITION_NOTIFY_ENABLED;
    process.env.BENEFICIARY_AUTO_TRANSITION_NOTIFY_ENABLED = 'true';

    try {
      const beneficiaries = [bene('b1', 90, 40)];
      const models = makeModels(beneficiaries);
      computeAndSaveJourneyScore.mockResolvedValue(
        scoreDoc({ recommendation: 'discharge', confidence: 0.9 })
      );
      const lifecycleService = makeLifecycleService();
      const publish = jest.fn(async () => {});
      const integrationBus = { publish };

      const scheduler = createBeneficiaryJourneyScoreScheduler({
        ...models,
        lifecycleService,
        integrationBus,
        logger: { warn: () => {}, info: () => {} },
        now: () => FIXED_NOW,
      });

      const summary = await scheduler.runOnce({ minConfidence: 0.8 });

      expect(summary.autoRequested).toBe(1);
      expect(publish).toHaveBeenCalledTimes(1);
      expect(publish).toHaveBeenCalledWith(
        'beneficiary',
        'lifecycle.auto_requested',
        expect.objectContaining({
          beneficiaryId: beneficiaries[0]._id,
          branchId: beneficiaries[0].branchId,
          transitionId: 'discharge',
          transitionRecordId: expect.anything(),
          score: 88,
          confidence: 0.9,
        }),
        expect.objectContaining({ aggregateType: 'Beneficiary' })
      );
    } finally {
      process.env.BENEFICIARY_AUTO_TRANSITION_NOTIFY_ENABLED = previousEnv;
    }
  });

  test('skips auto-request when confidence is below the threshold', async () => {
    const beneficiaries = [bene('b1', 90, 40)];
    const models = makeModels(beneficiaries);
    computeAndSaveJourneyScore.mockResolvedValue(
      scoreDoc({ recommendation: 'discharge', confidence: 0.5 })
    );
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce({ minConfidence: 0.8 });

    expect(summary.autoRequested).toBe(0);
    expect(lifecycleService.requestTransition).not.toHaveBeenCalled();
  });

  test('skips auto-request when a pending/approved transition already exists', async () => {
    const beneficiaries = [bene('b1', 90, 40)];
    const models = makeModels(beneficiaries);
    models.transitionLog.findOne = jest.fn(async () => ({ _id: new mongoose.Types.ObjectId() }));
    computeAndSaveJourneyScore.mockResolvedValue(
      scoreDoc({ recommendation: 'discharge', confidence: 1 })
    );
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce();

    expect(summary.skippedDuplicate).toBe(1);
    expect(summary.autoRequested).toBe(0);
    expect(lifecycleService.requestTransition).not.toHaveBeenCalled();
  });

  test('does not auto-request for intensive_support or review recommendations', async () => {
    const beneficiaries = [bene('b1', 20, 20, ['risk1', 'risk2'])];
    const models = makeModels(beneficiaries);
    computeAndSaveJourneyScore.mockResolvedValue(
      scoreDoc({ recommendation: 'intensive_support', confidence: 1 })
    );
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce({ minConfidence: 0 });

    expect(summary.recommendations.intensive_support).toBe(1);
    expect(summary.autoRequested).toBe(0);
    expect(lifecycleService.requestTransition).not.toHaveBeenCalled();
  });

  test('counts per-beneficiary errors and continues', async () => {
    const beneficiaries = [bene('b1', 90, 40), bene('b2', 50, 10)];
    const models = makeModels(beneficiaries);
    computeAndSaveJourneyScore.mockRejectedValue(new Error('DB down'));
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce();

    expect(summary.scanned).toBe(2);
    expect(summary.errors).toBe(2);
    expect(lifecycleService.requestTransition).not.toHaveBeenCalled();
  });

  test('start/stop registers with scheduler registry and can be stopped', () => {
    const beneficiaries = [bene('b1', 50, 10)];
    const models = makeModels(beneficiaries);
    const lifecycleService = makeLifecycleService();
    const stopSpy = jest.fn();
    const cron = {
      schedule: jest.fn(() => ({ stop: stopSpy })),
    };

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    scheduler.start({ cron, schedule: '0 */6 * * *' });
    expect(cron.schedule).toHaveBeenCalledWith('0 */6 * * *', expect.any(Function));
    expect(schedulerRegistry.get(SCHEDULER_KEY)).toBeTruthy();

    scheduler.stop();
    expect(stopSpy).toHaveBeenCalled();
  });

  test('uses node-cron schedule expression defaults', () => {
    expect(DEFAULTS.schedule).toBe('0 */6 * * *');
  });

  test('dryRun returns proposed transitions without persisting or requesting', async () => {
    const beneficiaries = [bene('b1', 90, 40)];
    const models = makeModels(beneficiaries);
    previewJourneyScore.mockResolvedValue(
      scoreDoc({ recommendation: 'discharge', confidence: 0.9 })
    );
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce({ dryRun: true, minConfidence: 0.8 });

    expect(summary.proposed.length).toBe(1);
    expect(summary.proposed[0]).toMatchObject({
      transitionId: 'discharge',
      action: 'would-request',
    });
    expect(computeAndSaveJourneyScore).not.toHaveBeenCalled();
    expect(lifecycleService.requestTransition).not.toHaveBeenCalled();
  });

  test('damping skips auto-request when recommendation is unchanged within cooldown', async () => {
    const beneficiaries = [bene('b1', 90, 40)];
    const models = makeModels(beneficiaries);
    models.journeyScoreModel.findOne = jest.fn(() => ({
      select: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({
          score: 92,
          recommendation: 'discharge',
          lastAutoRequestedAt: FIXED_NOW,
          lastAutoTransitionId: 'discharge',
        }),
      })),
    }));
    computeAndSaveJourneyScore.mockResolvedValue(
      scoreDoc({ recommendation: 'discharge', confidence: 1, score: 92 })
    );
    const lifecycleService = makeLifecycleService();

    const scheduler = createBeneficiaryJourneyScoreScheduler({
      ...models,
      lifecycleService,
      logger: { warn: () => {}, info: () => {} },
      now: () => FIXED_NOW,
    });

    const summary = await scheduler.runOnce({ minConfidence: 0.8, cooldownDays: 7 });

    expect(summary.damped).toBe(1);
    expect(summary.autoRequested).toBe(0);
    expect(lifecycleService.requestTransition).not.toHaveBeenCalled();
  });
});
