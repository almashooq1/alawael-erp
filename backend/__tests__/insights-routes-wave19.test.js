/**
 * insights-routes-wave19.test.js — Wave 19.
 *
 * Exercises the HTTP shape of `insights.routes.js` against a stubbed
 * InsightsService. We don't touch Mongo — the service is replaced by
 * an in-memory fake whose return values mirror the documented
 * { ok, reason } contract.
 *
 * Coverage:
 *   • Status code mapping (404 / 401 / 400 / 413 / 422 / 200)
 *   • Query-param filter passthrough on GET /
 *   • Sentinel values like includeExpired=true vs default
 *   • POST /:id/confirm/dismiss/note/resolve idempotency contract
 *   • GET /scoreboard returns rows array
 */

'use strict';

const express = require('express');
const request = require('supertest');

const { createInsightsRouter } = require('../routes/insights.routes');

function buildApp({ insightsStub, insightModelStub }) {
  const app = express();
  app.use(express.json());
  // Stub auth middleware — every request appears as actor "u1".
  app.use((req, _res, next) => {
    req.user = { id: 'u1', role: 'manager' };
    next();
  });
  app.use(
    '/api/v1/insights',
    createInsightsRouter({ insights: insightsStub, insightModel: insightModelStub })
  );
  return app;
}

function chainableThenable(value) {
  // Mimic `Model.find(...).sort(...).limit(...).lean()` AND
  // `await Model.find(...)` patterns.
  const promise = Promise.resolve(value);
  return {
    sort: () => chainableThenable(value),
    limit: () => chainableThenable(value),
    lean: () => Promise.resolve(value),
    then: (...args) => promise.then(...args),
    catch: (...args) => promise.catch(...args),
  };
}

// ─── GET / (list) ─────────────────────────────────────────────

describe('GET /api/v1/insights — list', () => {
  test('passes filters through to Mongo query', async () => {
    const seenFilters = [];
    const insightModelStub = {
      find: filter => {
        seenFilters.push(filter);
        return chainableThenable([{ _id: 'i1', kind: 'anomaly', severity: 'high' }]);
      },
    };
    const insightsStub = { confirmInsight: () => {} };
    const app = buildApp({ insightsStub, insightModelStub });

    const res = await request(app)
      .get('/api/v1/insights')
      .query({ kind: 'anomaly', severity: 'high', branchId: 'b1', limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.insights).toHaveLength(1);
    expect(seenFilters[0].kind).toBe('anomaly');
    expect(seenFilters[0].severity).toBe('high');
    expect(seenFilters[0].branchId).toBe('b1');
    // expiresAt $or applied by default
    expect(seenFilters[0].$or).toBeTruthy();
  });

  test('drops bogus filter values silently', async () => {
    const seenFilters = [];
    const insightModelStub = {
      find: filter => {
        seenFilters.push(filter);
        return chainableThenable([]);
      },
    };
    const insightsStub = { confirmInsight: () => {} };
    const app = buildApp({ insightsStub, insightModelStub });

    await request(app)
      .get('/api/v1/insights')
      .query({ kind: 'not-real', severity: 'banana', state: 'wat' });

    // Default `state` filter present, bogus values absent.
    expect(seenFilters[0].kind).toBeUndefined();
    expect(seenFilters[0].severity).toBeUndefined();
    expect(seenFilters[0].state).toEqual({ $in: ['active', 'confirmed'] });
  });

  test('includeExpired=true skips the expiresAt $or filter', async () => {
    const seenFilters = [];
    const insightModelStub = {
      find: filter => {
        seenFilters.push(filter);
        return chainableThenable([]);
      },
    };
    const insightsStub = { confirmInsight: () => {} };
    const app = buildApp({ insightsStub, insightModelStub });

    await request(app).get('/api/v1/insights').query({ includeExpired: 'true' });
    expect(seenFilters[0].$or).toBeUndefined();
  });

  test('clamps limit to 1..200', async () => {
    const seenLimits = [];
    const insightModelStub = {
      find: () => ({
        sort: () => ({
          limit: n => {
            seenLimits.push(n);
            return { lean: () => Promise.resolve([]) };
          },
        }),
      }),
    };
    const insightsStub = { confirmInsight: () => {} };
    const app = buildApp({ insightsStub, insightModelStub });

    await request(app).get('/api/v1/insights').query({ limit: 5000 });
    await request(app).get('/api/v1/insights').query({ limit: -10 });

    expect(seenLimits[0]).toBe(200); // 5000 clamped down
    expect(seenLimits[1]).toBe(1); // -10 clamped up to floor of 1
  });
});

// ─── GET /:id ──────────────────────────────────────────────────

describe('GET /api/v1/insights/:id', () => {
  test('200 with insight when found', async () => {
    const insightModelStub = {
      findById: () => ({ lean: () => Promise.resolve({ _id: 'i1', kind: 'care-gap' }) }),
    };
    const app = buildApp({ insightsStub: { confirmInsight: () => {} }, insightModelStub });
    const res = await request(app).get('/api/v1/insights/i1');
    expect(res.status).toBe(200);
    expect(res.body.data.insight._id).toBe('i1');
  });

  test('404 when not found', async () => {
    const insightModelStub = {
      findById: () => ({ lean: () => Promise.resolve(null) }),
    };
    const app = buildApp({ insightsStub: { confirmInsight: () => {} }, insightModelStub });
    const res = await request(app).get('/api/v1/insights/missing');
    expect(res.status).toBe(404);
  });
});

// ─── POST /:id/confirm ────────────────────────────────────────

describe('POST /api/v1/insights/:id/confirm', () => {
  test('200 on success', async () => {
    const calls = [];
    const insightsStub = {
      confirmInsight: args => {
        calls.push(args);
        return Promise.resolve({ ok: true, insight: { _id: args.insightId } });
      },
    };
    const app = buildApp({ insightsStub });
    const res = await request(app).post('/api/v1/insights/i1/confirm');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(calls[0].actor.userId).toBe('u1');
  });

  test('404 when service returns NOT_FOUND', async () => {
    const insightsStub = {
      confirmInsight: () => Promise.resolve({ ok: false, reason: 'NOT_FOUND' }),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app).post('/api/v1/insights/i1/confirm');
    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('NOT_FOUND');
  });
});

// ─── POST /:id/dismiss ────────────────────────────────────────

describe('POST /api/v1/insights/:id/dismiss', () => {
  test('200 on valid reasonCode', async () => {
    const calls = [];
    const insightsStub = {
      confirmInsight: () => {},
      dismissInsight: args => {
        calls.push(args);
        return Promise.resolve({ ok: true, insight: { _id: args.insightId } });
      },
    };
    const app = buildApp({ insightsStub });
    const res = await request(app)
      .post('/api/v1/insights/i1/dismiss')
      .send({ reasonCode: 'noise', note: 'too aggressive' });
    expect(res.status).toBe(200);
    expect(calls[0].reasonCode).toBe('noise');
    expect(calls[0].note).toBe('too aggressive');
  });

  test('400 on invalid reasonCode', async () => {
    const insightsStub = {
      confirmInsight: () => {},
      dismissInsight: () => Promise.resolve({ ok: false, reason: 'INVALID_REASON_CODE' }),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app)
      .post('/api/v1/insights/i1/dismiss')
      .send({ reasonCode: 'banana' });
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('INVALID_REASON_CODE');
  });
});

// ─── POST /:id/note ───────────────────────────────────────────

describe('POST /api/v1/insights/:id/note', () => {
  test('200 on valid text', async () => {
    const insightsStub = {
      confirmInsight: () => {},
      addNote: () => Promise.resolve({ ok: true, insight: { _id: 'i1' } }),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app).post('/api/v1/insights/i1/note').send({ text: 'hello' });
    expect(res.status).toBe(200);
  });

  test('400 on missing text', async () => {
    const insightsStub = {
      confirmInsight: () => {},
      addNote: () => Promise.resolve({ ok: false, reason: 'NOTE_TEXT_REQUIRED' }),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app).post('/api/v1/insights/i1/note').send({});
    expect(res.status).toBe(400);
    expect(res.body.reason).toBe('NOTE_TEXT_REQUIRED');
  });

  test('413 on text > 2000 chars', async () => {
    const insightsStub = {
      confirmInsight: () => {},
      addNote: () => Promise.resolve({ ok: false, reason: 'NOTE_TEXT_TOO_LONG' }),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app)
      .post('/api/v1/insights/i1/note')
      .send({ text: 'x'.repeat(3000) });
    expect(res.status).toBe(413);
  });
});

// ─── POST /:id/resolve ───────────────────────────────────────

describe('POST /api/v1/insights/:id/resolve', () => {
  test('200 with noop=true is still success', async () => {
    const insightsStub = {
      confirmInsight: () => {},
      markResolved: () =>
        Promise.resolve({ ok: true, insight: { _id: 'i1', state: 'resolved' }, noop: true }),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app).post('/api/v1/insights/i1/resolve');
    expect(res.status).toBe(200);
    expect(res.body.data.noop).toBe(true);
  });

  test('404 when insight missing', async () => {
    const insightsStub = {
      confirmInsight: () => {},
      markResolved: () => Promise.resolve({ ok: false, reason: 'NOT_FOUND' }),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app).post('/api/v1/insights/missing/resolve');
    expect(res.status).toBe(404);
  });
});

// ─── GET /scoreboard ─────────────────────────────────────────

describe('GET /api/v1/insights/scoreboard', () => {
  test('returns rows array', async () => {
    const insightsStub = {
      confirmInsight: () => {},
      generatorScoreboard: () =>
        Promise.resolve([
          { generatorId: 'care-gap.v1', totalInsights: 12, confirmRate: 0.5, dismissRate: 0.1 },
          { generatorId: 'anomaly.v1', totalInsights: 5, confirmRate: 0.4, dismissRate: 0.2 },
        ]),
    };
    const app = buildApp({ insightsStub });
    const res = await request(app).get('/api/v1/insights/scoreboard');
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
  });
});

// ─── Factory contract guard ──────────────────────────────────

describe('createInsightsRouter — factory guard', () => {
  test('throws when insights service missing', () => {
    expect(() => createInsightsRouter({})).toThrow(/insights service is required/);
  });
});
