'use strict';

/**
 * beneficiary-lifecycle-auto-run-preview-wave0.test.js — Wave 0 (Phase 4).
 *
 * HTTP-layer tests for POST /api/v1/beneficiary-lifecycle/auto-run/preview.
 */

const express = require('express');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

jest.mock('../intelligence/beneficiary-journey-score.scheduler', () => ({
  createBeneficiaryJourneyScoreScheduler: jest.fn(),
  DEFAULTS: { schedule: '0 */6 * * *' },
  SCHEDULER_KEY: 'beneficiary-journey-score',
}));

const {
  createBeneficiaryJourneyScoreScheduler,
} = require('../intelligence/beneficiary-journey-score.scheduler');

function makeGovernance({ allowedPermissions = null } = {}) {
  return {
    hasPermission: jest.fn((role, code) => {
      if (allowedPermissions === null) return true;
      return allowedPermissions.includes(code);
    }),
  };
}

function makeApp({ governance, userId = 'U-1', role = 'branch_manager' } = {}) {
  const gov = governance || makeGovernance();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) {
      req.user = { id: userId, role };
    }
    next();
  });
  app.use(
    '/api/v1/beneficiary-lifecycle',
    createBeneficiaryLifecycleRouter({
      service: { requestTransition: jest.fn() },
      governance: gov,
      logger: { warn: () => {}, info: () => {} },
    })
  );
  return { app, gov };
}

describe('POST /api/v1/beneficiary-lifecycle/auto-run/preview', () => {
  beforeEach(() => {
    createBeneficiaryJourneyScoreScheduler.mockReset();
  });

  test('happy path returns proposed summary without writing', async () => {
    const { app } = makeApp();
    createBeneficiaryJourneyScoreScheduler.mockReturnValue({
      runOnce: jest.fn().mockResolvedValue({
        scanned: 5,
        scored: 5,
        proposed: [
          {
            beneficiaryId: 'b-1',
            transitionId: 'discharge',
            action: 'would-request',
            score: 88,
            confidence: 0.9,
          },
        ],
      }),
    });

    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/auto-run/preview')
      .send({ limit: 10, minConfidence: 0.85 });

    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.data.scanned).toBe(5);
    expect(r.body.data.proposed).toHaveLength(1);
    expect(createBeneficiaryJourneyScoreScheduler).toHaveBeenCalled();
    const runCall =
      createBeneficiaryJourneyScoreScheduler.mock.results[0].value.runOnce.mock.calls[0][0];
    expect(runCall.dryRun).toBe(true);
    expect(runCall.limit).toBe(10);
    expect(runCall.minConfidence).toBe(0.85);
  });

  test('permission denied → 403', async () => {
    const { app } = makeApp({
      governance: makeGovernance({ allowedPermissions: [] }),
    });

    const r = await request(app).post('/api/v1/beneficiary-lifecycle/auto-run/preview').send({});

    expect(r.status).toBe(403);
    expect(r.body.reason).toBe('PERMISSION_DENIED');
    expect(createBeneficiaryJourneyScoreScheduler).not.toHaveBeenCalled();
  });
});
