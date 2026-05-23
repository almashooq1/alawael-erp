/**
 * rag-metrics-endpoint-wave283h.test.js — GET /api/rag/metrics admin endpoint (W283h).
 *
 * Verifies the route filters to rag.* counters from the shared registry,
 * computes a `health` summary (rescue-rate, embed-error-rate), and uses
 * MFA tier 1 (operational read).
 *
 * Tests use a fake `req.app._ragService` so the route's auth/getService
 * branch passes without a real bootstrap.
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const ROUTES = fs.readFileSync(path.join(__dirname, '..', 'routes', 'rag.routes.js'), 'utf8');

describe('W283h — GET /api/rag/metrics endpoint', () => {
  describe('source-level assertions', () => {
    it('uses requireMfaTier(1)', () => {
      expect(ROUTES).toMatch(/router\.get\(['"]\/metrics['"]\s*,\s*requireMfaTier\(1\)/);
    });

    it('filters to rag.* family only', () => {
      expect(ROUTES).toMatch(/name\.startsWith\(['"]rag\.['"]\)/);
    });

    it('computes derived health: rescueRate, vectorMissRate, embedErrorRate', () => {
      expect(ROUTES).toMatch(/rescueRate/);
      expect(ROUTES).toMatch(/vectorMissRate/);
      expect(ROUTES).toMatch(/embedErrorRate/);
    });

    it('returns 503 with METRICS_REGISTRY_UNAVAILABLE if registry missing', () => {
      expect(ROUTES).toMatch(/METRICS_REGISTRY_UNAVAILABLE/);
    });
  });

  describe('behavior with real registry', () => {
    let metrics;
    let route;
    let req;
    let res;

    beforeAll(() => {
      metrics = require('../intelligence/risk-metrics.registry');
    });

    beforeEach(() => {
      metrics._reset();
      // Build a minimal req/res that lets the route handler run.
      // We need to find and invoke the metrics handler from the route stack.
      const ragRouter = require('../routes/rag.routes');
      // Find the /metrics GET layer
      const metricsLayer = ragRouter.stack.find(
        l => l.route && l.route.path === '/metrics' && l.route.methods.get
      );
      expect(metricsLayer).toBeTruthy();
      // The handler is the LAST one in the stack (after middleware)
      const handlers = metricsLayer.route.stack;
      route = handlers[handlers.length - 1].handle;
      req = { app: {}, user: { _id: 'u1' } };
      res = {
        statusCode: 200,
        body: null,
        status(n) {
          this.statusCode = n;
          return this;
        },
        json(b) {
          this.body = b;
          return this;
        },
      };
    });

    it('empty registry → empty counters + zero health rates', async () => {
      await route(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.counters).toEqual({});
      expect(res.body.health.totalRetrieves).toBe(0);
      expect(res.body.health.rescueRate).toBe(0);
      expect(res.body.health.vectorMissRate).toBe(0);
      expect(res.body.health.embedErrorRate).toBe(0);
      expect(res.body.health.totalEmbedErrors).toBe(0);
    });

    it('counts retrieve metrics correctly', async () => {
      // 4 healthy + 1 rescued + 1 embed error
      metrics.inc('rag.retrieve', { provider: 'mock', vector: 'some', fallback: 'unused' });
      metrics.inc('rag.retrieve', { provider: 'mock', vector: 'some', fallback: 'unused' });
      metrics.inc('rag.retrieve', { provider: 'mock', vector: 'some', fallback: 'unused' });
      metrics.inc('rag.retrieve', { provider: 'mock', vector: 'some', fallback: 'unused' });
      metrics.inc('rag.retrieve', { provider: 'mock', vector: 'none', fallback: 'rescued' });
      metrics.inc('rag.embed.error', { provider: 'mock', code: 'EMBEDDING_RATE_LIMITED' });

      await route(req, res);
      expect(res.body.health.totalRetrieves).toBe(5);
      expect(res.body.health.rescueRate).toBeCloseTo(0.2, 3); // 1/5
      expect(res.body.health.vectorMissRate).toBeCloseTo(0.2, 3); // 1/5
      expect(res.body.health.totalEmbedErrors).toBe(1);
      expect(res.body.health.embedErrorRate).toBeCloseTo(0.2, 3); // 1/5
    });

    it('filters out non-rag.* counters', async () => {
      metrics.inc('rag.ingest', { provider: 'mock', sourceDocType: 'sop' });
      metrics.inc('risk.alert.backlink.attempted', { result: 'ok' });
      metrics.inc('gov.adapter.consent', { provider: 'sehhaty', result: 'granted' });

      await route(req, res);
      expect(res.body.counters['rag.ingest']).toBeDefined();
      // Non-rag metrics filtered out
      expect(res.body.counters['risk.alert.backlink.attempted']).toBeUndefined();
      expect(res.body.counters['gov.adapter.consent']).toBeUndefined();
    });
  });
});
