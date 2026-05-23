'use strict';
/**
 * risk-sweep-triggered-reviews.test.js — Wave 291
 *
 * Verifies GET /api/risk-sweep/triggered-reviews:
 *   - tier-1 read; branchId scoped from req.user.
 *   - filters PlanReviews by reviewType=CRITICAL within `days` window.
 *   - joins beneficiary identity + nearest AiAlert (±5min).
 *   - drops cross-branch reviews (defense-in-depth).
 *   - 503 when PlanReview model not registered.
 */

jest.unmock('mongoose');

const express = require('express');
const request = require('supertest');

describe('W291 — GET /triggered-reviews', () => {
  const NOW = new Date('2026-05-23T10:00:00Z');
  let restoreModel;

  function installModelStubs(stubs) {
    const mongoose = require('mongoose');
    const orig = mongoose.model.bind(mongoose);
    mongoose.model = function (name, schema) {
      if (stubs && Object.prototype.hasOwnProperty.call(stubs, name)) {
        const stub = stubs[name];
        if (stub === null) {
          const err = new Error(`MissingSchemaError: ${name}`);
          err.name = 'MissingSchemaError';
          throw err;
        }
        return stub;
      }
      return orig(name, schema);
    };
    restoreModel = () => {
      mongoose.model = orig;
    };
  }

  afterEach(() => {
    if (restoreModel) {
      restoreModel();
      restoreModel = null;
    }
  });

  function setupApp({ mfaTier = 1, branchId = 'br1', wired = true, stubs } = {}) {
    jest.resetModules();
    jest.doMock('../middleware/auth', () => ({
      authenticate: (req, _res, next) => {
        req.user = { _id: 'u1', branchId };
        next();
      },
    }));
    jest.doMock('../middleware/requireMfaTier', () => ({
      attachMfaActor: (req, _res, next) => {
        req.mfaActor = { userId: 'u1', tier: mfaTier };
        next();
      },
      requireMfaTier: required => (req, res, next) => {
        if (!req.mfaActor || req.mfaActor.tier < required)
          return res.status(403).json({ success: false, code: 'MFA_TIER_REQUIRED', required });
        return next();
      },
    }));
    jest.doMock('../models/RiskSnapshot', () => ({}));

    installModelStubs(stubs || {});

    const router = require('../routes/risk-sweep.routes');
    const app = express();
    app.use(express.json());
    if (wired) app._riskSweeperService = {};
    app.use('/api/risk-sweep', router);
    return app;
  }

  function planReviewStub(reviews) {
    return {
      find: () => ({
        sort: () => ({
          limit: () => ({
            select: () => ({ lean: async () => reviews }),
          }),
        }),
      }),
    };
  }

  function beneficiaryStub(bens) {
    return {
      find: filter => ({
        select: () => ({
          lean: async () => {
            const ids = (filter && filter._id && filter._id.$in) || [];
            const branchId = filter && filter.branchId;
            return bens.filter(
              b => ids.map(String).includes(String(b._id)) && (!branchId || b.branchId === branchId)
            );
          },
        }),
      }),
    };
  }

  function aiAlertStub(alerts) {
    return {
      find: () => ({
        select: () => ({ lean: async () => alerts }),
      }),
    };
  }

  test('503 when PlanReview model missing', async () => {
    const app = setupApp({ stubs: { PlanReview: null } });
    const res = await request(app).get('/api/risk-sweep/triggered-reviews');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('PLAN_REVIEW_MODEL_NOT_REGISTERED');
  });

  test('returns items joined to beneficiary + nearest AiAlert', async () => {
    const review = {
      _id: 'pr1',
      carePlan: 'cp1',
      beneficiary: 'b1',
      reviewDate: NOW,
      nextReviewDate: new Date(NOW.getTime() + 7 * 86400000),
      summary: 'مراجعة عاجلة',
      createdAt: NOW,
    };
    const alert = {
      _id: 'a1',
      target_id: 'b1',
      severity: 'critical',
      data: {
        code: 'RISK_TIER_ESCALATED',
        score: 78,
        tier: 'high',
        sweepRunId: 'sweep-2026-05-23',
      },
      createdAt: new Date(NOW.getTime() - 30_000), // 30s before review
    };
    const ben = { _id: 'b1', branchId: 'br1', firstName: 'سارة', lastName: 'الأحمد' };

    const app = setupApp({
      stubs: {
        PlanReview: planReviewStub([review]),
        Beneficiary: beneficiaryStub([ben]),
        AiAlert: aiAlertStub([alert]),
      },
    });
    const res = await request(app).get('/api/risk-sweep/triggered-reviews?days=14');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.windowDays).toBe(14);
    const item = res.body.items[0];
    expect(item.planReviewId).toBe('pr1');
    expect(item.beneficiaryName).toBe('سارة الأحمد');
    expect(item.linkedAlert.alertId).toBe('a1');
    expect(item.linkedAlert.sweepRunId).toBe('sweep-2026-05-23');
    expect(item.linkedAlert.score).toBe(78);
  });

  test('drops cross-branch reviews', async () => {
    const review = {
      _id: 'pr2',
      carePlan: 'cp2',
      beneficiary: 'b2',
      reviewDate: NOW,
      nextReviewDate: NOW,
      summary: 'x',
      createdAt: NOW,
    };
    // Beneficiary belongs to br2, actor is br1 → filter must remove it.
    const ben = { _id: 'b2', branchId: 'br2', firstName: 'X' };
    const app = setupApp({
      branchId: 'br1',
      stubs: {
        PlanReview: planReviewStub([review]),
        Beneficiary: beneficiaryStub([ben]),
        AiAlert: aiAlertStub([]),
      },
    });
    const res = await request(app).get('/api/risk-sweep/triggered-reviews');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  test('alert outside ±5min window is not linked', async () => {
    const review = {
      _id: 'pr3',
      carePlan: 'cp3',
      beneficiary: 'b3',
      reviewDate: NOW,
      nextReviewDate: NOW,
      summary: 'x',
      createdAt: NOW,
    };
    const farAlert = {
      _id: 'a-far',
      target_id: 'b3',
      severity: 'warning',
      data: { code: 'RISK_TIER_ESCALATED', score: 50, tier: 'high' },
      createdAt: new Date(NOW.getTime() - 30 * 60_000), // 30 minutes earlier
    };
    const ben = { _id: 'b3', branchId: 'br1', fullName: 'علي' };
    const app = setupApp({
      stubs: {
        PlanReview: planReviewStub([review]),
        Beneficiary: beneficiaryStub([ben]),
        AiAlert: aiAlertStub([farAlert]),
      },
    });
    const res = await request(app).get('/api/risk-sweep/triggered-reviews');
    expect(res.status).toBe(200);
    expect(res.body.items[0].linkedAlert).toBeNull();
  });

  test('tier-1 actor cannot peek other branch via query', async () => {
    const app = setupApp({
      mfaTier: 1,
      branchId: 'br1',
      stubs: {
        PlanReview: planReviewStub([]),
        Beneficiary: beneficiaryStub([]),
        AiAlert: aiAlertStub([]),
      },
    });
    const res = await request(app).get('/api/risk-sweep/triggered-reviews?branchId=br2');
    expect(res.status).toBe(200);
    expect(res.body.branchId).toBe('br1');
  });
});
