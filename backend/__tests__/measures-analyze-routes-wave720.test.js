'use strict';

/**
 * measures-analyze-routes-wave720.test.js — W720.
 *
 * Route-LAYER behavioral coverage for the W720 measures-analyze surface
 * (GET /:code/capabilities + POST /:code/analyze). Boots a minimal Express
 * app with auth/branch middleware mocked and the Measure catalog model
 * faked via mongoose.model, so it isolates the ROUTE's own behavior while
 * exercising the REAL pure analyze() facade underneath:
 *   • missing raw → 400 before any analysis
 *   • unknown code → 404
 *   • happy path (BERG) → 200 fused result
 *   • capabilities endpoint reports governance + scorability
 *   • proprietary instrument → blocked:true, scoring:null
 *
 * jest.mock factory vars are `mock`-prefixed per the hoisting rule.
 */

jest.unmock('mongoose');

const mockState = { user: { _id: 'u1', role: 'therapist', branchId: 'b1' } };

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockState.user;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

// Fake Measure catalog — keyed by code.
const CATALOG = {
  BERG: {
    code: 'BERG',
    name: 'Berg Balance Scale',
    name_ar: 'مقياس بيرغ للتوازن',
    purpose: 'severity',
    scoringDirection: 'higher_better',
  },
  'CARS-2': {
    code: 'CARS-2',
    name: 'CARS-2',
    name_ar: 'مقياس تقدير التوحد',
    purpose: 'diagnostic',
    scoringDirection: 'higher_better',
  },
};

let modelSpy;
function installModelSpy() {
  modelSpy = jest.spyOn(mongoose, 'model').mockImplementation(name => {
    if (name === 'Measure') {
      return {
        findOne: q => ({ lean: async () => CATALOG[q.code] || null }),
      };
    }
    throw new Error(`unexpected model ${name}`);
  });
}
afterAll(() => modelSpy && modelSpy.mockRestore());

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/measures', require('../routes/measures-analyze.routes'));
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
  return app;
}
const app = buildApp();

beforeEach(() => {
  mockState.user = { _id: 'u1', role: 'therapist', branchId: 'b1' };
  installModelSpy();
});

describe('W720 — POST /:code/analyze', () => {
  test('missing raw → 400', async () => {
    const res = await request(app).post('/api/v1/measures/BERG/analyze').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('unknown code → 404', async () => {
    const res = await request(app)
      .post('/api/v1/measures/NOPE/analyze')
      .send({ raw: [1, 2, 3] });
    expect(res.status).toBe(404);
  });

  test('happy path (BERG full score) → 200 fused result', async () => {
    const res = await request(app)
      .post('/api/v1/measures/BERG/analyze')
      .send({ raw: Array(14).fill(4), previous: 40, trajectory: 'linear_improvement' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.blocked).toBe(false);
    expect(d.scoring.value).toBe(56);
    expect(d.trajectory).toBe('SUSTAINED_IMPROVEMENT');
    expect(d.narrative.headline.ar.length).toBeGreaterThan(0);
  });

  test('proprietary instrument blocked → scoring null', async () => {
    const res = await request(app)
      .post('/api/v1/measures/CARS-2/analyze')
      .send({ raw: [1, 2, 3] });
    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(true);
    expect(res.body.data.scoring).toBeNull();
  });
});

describe('W720 — GET /:code/capabilities', () => {
  test('reports governance + scorability for BERG', async () => {
    const res = await request(app).get('/api/v1/measures/BERG/capabilities');
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe('BERG');
    expect(res.body.data.digitization.allowed).toBe(true);
    expect(typeof res.body.data.scorable).toBe('boolean');
  });

  test('unknown code → 404', async () => {
    const res = await request(app).get('/api/v1/measures/NOPE/capabilities');
    expect(res.status).toBe(404);
  });
});
