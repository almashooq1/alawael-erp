'use strict';

/**
 * Wave 206 — assessmentRecommendation routes HTTP-surface tests.
 *
 * Covers POST /recommend (dry-run, no DB). The /accept endpoint
 * requires Mongoose models registered against a real DB and is
 * exercised in the integration suite.
 *
 * Verifies:
 *   1. Valid body → 200 + bundle shape
 *   2. Invalid body → 400 with reasons
 *   3. Empty scores → 400
 *   4. Engine version is propagated
 *   5. Refiner client can be injected via __setAnthropicClient hook
 *   6. refine=false skips the LLM call entirely
 */

const express = require('express');
const request = require('supertest');

const router = require('../routes/assessmentRecommendation.routes');

function makeApp() {
  const app = express();
  app.use(express.json());
  // Stub req.user — the route reads it for therapistId fallback
  app.use((req, _res, next) => {
    req.user = { _id: '5f9d88a8b9b3b3001f5e3a3a' };
    next();
  });
  app.use('/', router);
  return app;
}

describe('Wave 206 — assessmentRecommendation routes (HTTP surface)', () => {
  afterEach(() => {
    router.__setAnthropicClient(null);
  });

  describe('POST /recommend', () => {
    test('valid body → 200 + bundle', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({
          beneficiary: { age: 8, indications: ['G80'] },
          scores: [{ measureKey: 'GMFCS', level: 3 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.engineVersion).toBe('w206.1');
      expect(res.body.data.suggestedGoals.length).toBeGreaterThan(0);
      expect(res.body.data.suggestedPrograms.length).toBeGreaterThan(0);
      expect(res.body.data.refinedByLlm).toBe(false);
    });

    test('missing body → 400', async () => {
      const app = makeApp();
      const res = await request(app).post('/recommend').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    test('invalid measureKey → 400', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({
          beneficiary: { age: 8 },
          scores: [{ measureKey: 'NOPE', level: 1 }],
        });
      expect(res.status).toBe(400);
      expect(res.body.details.some(d => d.includes('NOPE'))).toBe(true);
    });

    test('empty scores → 400', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({ beneficiary: { age: 5 }, scores: [] });
      expect(res.status).toBe(400);
    });

    test('age out of range → 400', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({
          beneficiary: { age: 200 },
          scores: [{ measureKey: 'GMFCS', level: 1 }],
        });
      expect(res.status).toBe(400);
    });

    test('multi-measure bundle returns combined goals + programs', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({
          beneficiary: { age: 6, indications: ['F84.0'] },
          scores: [
            { measureKey: 'CARS2', totalScore: 48, form: 'ST' },
            { measureKey: 'Vineland3', standardScore: 60 },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.data.overallConfidence).toBe('high');
      // Multiple domains covered
      expect(res.body.data.beneficiaryProfile.primaryDomains.length).toBeGreaterThan(1);
    });

    test('refiner injected via __setAnthropicClient is applied', async () => {
      const llmModule = require('../services/assessmentRecommendationLlm.service');

      // Pre-build a refined response with the exact ids the refiner will assign
      const inputGoals = require('../services/assessmentRecommendationEngine.service').recommend({
        beneficiary: { age: 6, indications: ['F84.0'] },
        scores: [{ measureKey: 'CARS2', totalScore: 48, form: 'ST' }],
      }).suggestedGoals;
      const withIds = llmModule._internals.attachIds(inputGoals);
      const refinedGoals = withIds.map(g => ({
        id: g._id,
        title: `LLM_${g.title}`,
        specific: 'spec-refined',
        measurable: 'meas-refined',
        achievable: 'ach-refined',
        relevant: 'rel-refined',
      }));

      const fakeClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{ type: 'text', text: JSON.stringify({ goals: refinedGoals }) }],
          }),
        },
      };
      router.__setAnthropicClient(fakeClient);

      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({
          beneficiary: { age: 6, indications: ['F84.0'] },
          scores: [{ measureKey: 'CARS2', totalScore: 48, form: 'ST' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.refinedByLlm).toBe(true);
      expect(res.body.data.suggestedGoals[0].title).toMatch(/^LLM_/);
      expect(fakeClient.messages.create).toHaveBeenCalledTimes(1);
    });

    test('refine=false bypasses the LLM even when refiner is configured', async () => {
      const fakeClient = {
        messages: {
          create: jest.fn().mockRejectedValue(new Error('should not be called')),
        },
      };
      router.__setAnthropicClient(fakeClient);

      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({
          beneficiary: { age: 6, indications: ['F84.0'] },
          scores: [{ measureKey: 'CARS2', totalScore: 48, form: 'ST' }],
          refine: false,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.refinedByLlm).toBe(false);
      expect(fakeClient.messages.create).not.toHaveBeenCalled();
    });

    test('LLM fail → response still returns deterministic goals', async () => {
      const fakeClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'garbage not json' }],
          }),
        },
      };
      router.__setAnthropicClient(fakeClient);

      const app = makeApp();
      const res = await request(app)
        .post('/recommend')
        .send({
          beneficiary: { age: 8, indications: ['G80'] },
          scores: [{ measureKey: 'GMFCS', level: 3 }],
        });
      expect(res.status).toBe(200);
      expect(res.body.data.suggestedGoals.length).toBeGreaterThan(0);
      // No refinedByLlm true (parse failure → identity goals)
      expect(res.body.data.suggestedGoals[0].refinedByLlm).toBeUndefined();
    });
  });

  describe('POST /recommend/accept', () => {
    test('missing beneficiaryId → 400', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/recommend/accept')
        .send({ acceptedGoals: [{}] });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/beneficiaryId/);
    });

    test('empty acceptedGoals → 400', async () => {
      const app = makeApp();
      const res = await request(app).post('/recommend/accept').send({
        beneficiaryId: '5f9d88a8b9b3b3001f5e3a3a',
        acceptedGoals: [],
      });
      expect(res.status).toBe(400);
    });

    test('invalid beneficiaryId → 400', async () => {
      const app = makeApp();
      const res = await request(app)
        .post('/recommend/accept')
        .send({ beneficiaryId: 'not-an-objectid', acceptedGoals: [{}] });
      expect(res.status).toBe(400);
    });
  });
});
