/**
 * ai-briefing-routes.test.js — Wave 4 wiring smoke test.
 *
 * Verifies the route surface:
 *   - GET /status returns service stats.
 *   - GET /morning calls briefing.morningBriefing with the right
 *     shape (role, branchId, alerts, kpis) and returns the result.
 *   - GET /next-best-action does the same for nextBestActions.
 *   - getAlerts/getKpis injection failures degrade gracefully.
 *   - Audit logger is invoked when supplied.
 *
 * Mounts the router on an in-memory Express app with a fake `req.user`
 * middleware so we don't depend on the real auth chain.
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { createAiBriefingRouter } = require('../routes/ai-briefing.routes');

function makeBriefingStub({ morningResult, nbaResult, statsResult } = {}) {
  return {
    morningBriefing: jest.fn(
      async () =>
        morningResult || {
          available: true,
          source: 'rule',
          data: { headlineAr: 'A', bulletsAr: ['x'] },
        }
    ),
    nextBestActions: jest.fn(
      async () =>
        nbaResult || {
          available: true,
          source: 'rule',
          data: { actions: [] },
        }
    ),
    stats: jest.fn(
      () => statsResult || { available: true, model: 'test', morningCacheSize: 0, nbaCacheSize: 0 }
    ),
    isAvailable: jest.fn(() => true),
  };
}

function mountApp({
  briefing,
  getAlerts = null,
  getKpis = null,
  auditLogger = null,
  user = { role: 'admin', branchId: 'br-1' },
}) {
  const app = express();
  app.use(express.json());
  // Inject a fake authenticated user — same shape the real middleware
  // would attach after JWT verification.
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(
    '/api/v1/ai/briefing',
    createAiBriefingRouter({
      briefing,
      ...(getAlerts ? { getAlerts } : {}),
      ...(getKpis ? { getKpis } : {}),
      ...(auditLogger ? { auditLogger } : {}),
      logger: { warn() {} },
    })
  );
  return app;
}

describe('ai-briefing routes — /status', () => {
  test('returns service stats', async () => {
    const briefing = makeBriefingStub({
      statsResult: { available: true, model: 'haiku', morningCacheSize: 3, nbaCacheSize: 5 },
    });
    const app = mountApp({ briefing });
    const res = await request(app).get('/api/v1/ai/briefing/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.morningCacheSize).toBe(3);
    expect(briefing.stats).toHaveBeenCalledTimes(1);
  });
});

describe('ai-briefing routes — /morning', () => {
  test('forwards role + branchId + alerts + kpis to the service', async () => {
    const briefing = makeBriefingStub();
    const getAlerts = jest.fn(async () => [
      {
        ruleId: 'r1',
        severity: 'critical',
        headlineAr: 't',
        headlineEn: 't',
        category: 'compliance',
      },
    ]);
    const getKpis = jest.fn(() => [{ id: 'finance.dso', classification: 'red' }]);
    const app = mountApp({ briefing, getAlerts, getKpis });

    const res = await request(app).get('/api/v1/ai/briefing/morning');
    expect(res.status).toBe(200);
    expect(briefing.morningBriefing).toHaveBeenCalledTimes(1);
    const callArg = briefing.morningBriefing.mock.calls[0][0];
    expect(callArg.role).toBe('admin');
    expect(callArg.branchId).toBe('br-1');
    expect(callArg.alerts).toHaveLength(1);
    expect(callArg.kpis).toHaveLength(1);
  });

  test('degrades when getAlerts throws — empty array forwarded', async () => {
    const briefing = makeBriefingStub();
    const getAlerts = jest.fn(async () => {
      throw new Error('mongo down');
    });
    const app = mountApp({ briefing, getAlerts });
    const res = await request(app).get('/api/v1/ai/briefing/morning');
    expect(res.status).toBe(200);
    const callArg = briefing.morningBriefing.mock.calls[0][0];
    expect(callArg.alerts).toEqual([]);
  });

  test('uses unknown / null when user has no role / branch', async () => {
    const briefing = makeBriefingStub();
    const app = mountApp({ briefing, user: {} });
    const res = await request(app).get('/api/v1/ai/briefing/morning');
    expect(res.status).toBe(200);
    const callArg = briefing.morningBriefing.mock.calls[0][0];
    expect(callArg.role).toBe('unknown');
    expect(callArg.branchId).toBe(null);
  });

  test('audit logger receives the call envelope', async () => {
    const briefing = makeBriefingStub();
    const auditLogger = { log: jest.fn(async () => {}) };
    const app = mountApp({ briefing, auditLogger });
    await request(app).get('/api/v1/ai/briefing/morning');
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    const entry = auditLogger.log.mock.calls[0][0];
    expect(entry.action).toBe('ai.briefing.morning');
    expect(entry.entityType).toBe('ai_briefing');
  });
});

describe('ai-briefing routes — /next-best-action', () => {
  test('forwards alerts and returns ranked actions', async () => {
    const briefing = makeBriefingStub({
      nbaResult: {
        available: true,
        source: 'rule',
        data: {
          actions: [
            {
              titleAr: 'افتح',
              titleEn: 'Open',
              reasonAr: 'r',
              reasonEn: 'r',
              urgency: 'now',
              category: 'compliance',
              deepLink: null,
            },
          ],
        },
      },
    });
    const getAlerts = jest.fn(async () => [
      {
        ruleId: 'r1',
        severity: 'critical',
        headlineAr: 't',
        headlineEn: 't',
        category: 'compliance',
      },
    ]);
    const app = mountApp({ briefing, getAlerts });
    const res = await request(app).get('/api/v1/ai/briefing/next-best-action');
    expect(res.status).toBe(200);
    expect(res.body.data.data.actions).toHaveLength(1);
    expect(briefing.nextBestActions).toHaveBeenCalledTimes(1);
  });
});

describe('ai-briefing routes — defensive contract', () => {
  test('throws if no briefing service is supplied', () => {
    expect(() => createAiBriefingRouter({})).toThrow();
  });
});
