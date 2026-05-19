/**
 * wave140-progress-prediction-routes.test.js — Wave 140 / P3.3 admin surface.
 *
 * Tests for the new HTTP route factory only — backend service was
 * already verified in Wave 118 tests.
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { createProgressPredictionRouter } = require('../routes/progress-prediction.routes');

function fakeGovernance(allowedPerms = ['ai.progress.read']) {
  return {
    hasPermission: (_role, code) => allowedPerms.includes(code),
  };
}

function buildPredictionModel(seed = []) {
  const store = seed.slice();
  return {
    find(q = {}) {
      let arr = store.filter(r => {
        if (q.prediction_type && r.prediction_type !== q.prediction_type) return false;
        if (q.status && r.status !== q.status) return false;
        if (q.beneficiary_id && String(r.beneficiary_id) !== String(q.beneficiary_id)) return false;
        if (q.branch_id && String(r.branch_id) !== String(q.branch_id)) return false;
        return true;
      });
      const chain = {
        sort(spec) {
          const k = Object.keys(spec || {})[0];
          if (k) {
            const dir = spec[k];
            arr = arr
              .slice()
              .sort(
                (a, b) =>
                  ((a[k] ? new Date(a[k]).getTime() : 0) - (b[k] ? new Date(b[k]).getTime() : 0)) *
                  dir
              );
          }
          return chain;
        },
        limit(n) {
          arr = arr.slice(0, n);
          return chain;
        },
        lean: async () => arr.map(r => ({ ...r })),
        then: resolve => resolve(arr.map(r => ({ ...r }))),
      };
      return chain;
    },
  };
}

function buildModelConfigModel(seed = null) {
  return {
    findOne(_q) {
      return {
        lean: async () => (seed ? { ...seed } : null),
        then: resolve => resolve(seed ? { ...seed } : null),
      };
    },
  };
}

function buildApp({ predictionModel, modelConfigModel, governance, user }) {
  const app = express();
  app.use(express.json());
  if (user) {
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
  }
  const router = createProgressPredictionRouter({
    predictionModel,
    modelConfigModel,
    governance,
    logger: { warn: () => {}, info: () => {} },
  });
  app.use('/api/v1/ai/progress', router);
  return app;
}

// ─── 1. Factory guards ─────────────────────────────────────────────

describe('createProgressPredictionRouter — factory guards', () => {
  test('throws when predictionModel missing', () => {
    expect(() =>
      createProgressPredictionRouter({
        modelConfigModel: buildModelConfigModel(),
        governance: fakeGovernance(),
      })
    ).toThrow(/predictionModel/);
  });

  test('throws when modelConfigModel missing', () => {
    expect(() =>
      createProgressPredictionRouter({
        predictionModel: buildPredictionModel(),
        governance: fakeGovernance(),
      })
    ).toThrow(/modelConfigModel/);
  });

  test('throws when governance missing', () => {
    expect(() =>
      createProgressPredictionRouter({
        predictionModel: buildPredictionModel(),
        modelConfigModel: buildModelConfigModel(),
      })
    ).toThrow(/governance/);
  });
});

// ─── 2. /accuracy ──────────────────────────────────────────────────

describe('GET /accuracy', () => {
  test('returns 401 when actor has no userId', async () => {
    const app = buildApp({
      predictionModel: buildPredictionModel(),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
    });
    const res = await request(app).get('/api/v1/ai/progress/accuracy');
    expect(res.status).toBe(401);
  });

  test('returns 403 when actor lacks ai.progress.read', async () => {
    const app = buildApp({
      predictionModel: buildPredictionModel(),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance([]),
      user: { id: 'u1', role: 'therapist' },
    });
    const res = await request(app).get('/api/v1/ai/progress/accuracy');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('PERMISSION_DENIED');
  });

  test('returns null accuracy when AiModelConfig has no row', async () => {
    const app = buildApp({
      predictionModel: buildPredictionModel(),
      modelConfigModel: buildModelConfigModel(null),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/accuracy');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accuracy).toBeNull();
    expect(res.body.data.trainingDataCount).toBe(0);
  });

  test('returns accuracy from AiModelConfig when populated', async () => {
    const app = buildApp({
      predictionModel: buildPredictionModel(),
      modelConfigModel: buildModelConfigModel({
        model_name: 'progress_predictor',
        accuracy_score: 0.82,
        training_data_count: 247,
        last_evaluated_at: new Date('2026-05-18'),
        model_version: 'rule_based_v1',
      }),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/accuracy');
    expect(res.status).toBe(200);
    expect(res.body.data.accuracy).toBe(0.82);
    expect(res.body.data.trainingDataCount).toBe(247);
    expect(res.body.data.modelVersion).toBe('rule_based_v1');
  });
});

// ─── 3. /recent ────────────────────────────────────────────────────

describe('GET /recent', () => {
  test('returns prediction summaries sorted by predictionDate desc', async () => {
    const seed = [
      {
        _id: 'p-old',
        prediction_type: 'progress',
        beneficiary_id: 'b1',
        branch_id: 'br-1',
        prediction_date: new Date('2026-05-10'),
        target_date: new Date('2026-06-10'),
        predicted_value: 0.6,
        actual_value: 0.55,
        deviation: -0.05,
        confidence: 0.5,
        model_version: 'rule_based_v1',
        status: 'expired',
        validated_at: new Date('2026-06-10'),
        prediction_scope: 'monthly',
      },
      {
        _id: 'p-new',
        prediction_type: 'progress',
        beneficiary_id: 'b2',
        branch_id: 'br-1',
        prediction_date: new Date('2026-05-15'),
        target_date: new Date('2026-06-15'),
        predicted_value: 0.7,
        actual_value: null,
        deviation: null,
        confidence: 0.6,
        model_version: 'rule_based_v1',
        status: 'active',
        validated_at: null,
        prediction_scope: 'monthly',
      },
    ];
    const app = buildApp({
      predictionModel: buildPredictionModel(seed),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'branch_manager' },
    });
    const res = await request(app).get('/api/v1/ai/progress/recent');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].id).toBe('p-new');
    expect(res.body.data.items[1].id).toBe('p-old');
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.validated).toBe(1); // p-old has actual_value
    expect(res.body.data.accurate).toBe(1); // |0.6 - 0.55| = 0.05 < 0.15
    expect(res.body.data.accuracyOnSample).toBe(1);
  });

  test('returns within-tolerance accuracy fraction', async () => {
    const seed = [
      // Within tolerance
      {
        _id: 'good',
        prediction_type: 'progress',
        predicted_value: 0.5,
        actual_value: 0.6,
        status: 'expired',
        prediction_date: new Date(),
      },
      // Outside tolerance
      {
        _id: 'bad',
        prediction_type: 'progress',
        predicted_value: 0.5,
        actual_value: 0.9,
        status: 'expired',
        prediction_date: new Date(),
      },
      // Not yet validated
      {
        _id: 'pending',
        prediction_type: 'progress',
        predicted_value: 0.5,
        actual_value: null,
        status: 'active',
        prediction_date: new Date(),
      },
    ];
    const app = buildApp({
      predictionModel: buildPredictionModel(seed),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/recent');
    expect(res.body.data.validated).toBe(2);
    expect(res.body.data.accurate).toBe(1);
    expect(res.body.data.accuracyOnSample).toBe(0.5);
  });

  test('respects status filter', async () => {
    const seed = [
      {
        _id: 'a',
        prediction_type: 'progress',
        status: 'active',
        prediction_date: new Date(),
        predicted_value: 0.5,
      },
      {
        _id: 'b',
        prediction_type: 'progress',
        status: 'expired',
        prediction_date: new Date(),
        predicted_value: 0.5,
      },
    ];
    const app = buildApp({
      predictionModel: buildPredictionModel(seed),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/recent?status=active');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].status).toBe('active');
  });

  test('respects limit param', async () => {
    const seed = Array.from({ length: 30 }, (_, i) => ({
      _id: `p${i}`,
      prediction_type: 'progress',
      prediction_date: new Date(2026, 4, i + 1),
      predicted_value: 0.5,
      status: 'active',
    }));
    const app = buildApp({
      predictionModel: buildPredictionModel(seed),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/recent?limit=5');
    expect(res.body.data.items).toHaveLength(5);
    expect(res.body.data.limit).toBe(5);
  });

  test('clamps limit to 200 max', async () => {
    const app = buildApp({
      predictionModel: buildPredictionModel(),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/recent?limit=99999');
    expect(res.body.data.limit).toBe(200);
  });

  test('filters by beneficiaryId + branchId', async () => {
    const seed = [
      {
        _id: 'match',
        prediction_type: 'progress',
        beneficiary_id: 'b1',
        branch_id: 'br1',
        prediction_date: new Date(),
        predicted_value: 0.5,
      },
      {
        _id: 'diff-ben',
        prediction_type: 'progress',
        beneficiary_id: 'b2',
        branch_id: 'br1',
        prediction_date: new Date(),
        predicted_value: 0.5,
      },
      {
        _id: 'diff-branch',
        prediction_type: 'progress',
        beneficiary_id: 'b1',
        branch_id: 'br2',
        prediction_date: new Date(),
        predicted_value: 0.5,
      },
    ];
    const app = buildApp({
      predictionModel: buildPredictionModel(seed),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/recent?beneficiaryId=b1&branchId=br1');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe('match');
  });

  test('hides diagnostic features_used from the wire response', async () => {
    const seed = [
      {
        _id: 'p1',
        prediction_type: 'progress',
        prediction_date: new Date(),
        predicted_value: 0.5,
        features_used: { secret_diagnosis: 'autism' }, // should be stripped
        prediction_details: { internal: 'leak-me' },
      },
    ];
    const app = buildApp({
      predictionModel: buildPredictionModel(seed),
      modelConfigModel: buildModelConfigModel(),
      governance: fakeGovernance(),
      user: { id: 'u1', role: 'auditor' },
    });
    const res = await request(app).get('/api/v1/ai/progress/recent');
    expect(res.body.data.items[0]).not.toHaveProperty('features_used');
    expect(res.body.data.items[0]).not.toHaveProperty('prediction_details');
  });
});
