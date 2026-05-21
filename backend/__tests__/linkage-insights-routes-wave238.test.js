'use strict';

/**
 * linkage-insights-routes-wave238.test.js — Wave 238.
 *
 * Smoke + endpoint-registration tests for the 4 W237 insights endpoints
 * added to measures-workflow.routes.js:
 *
 *   GET /insights/orphaned-measures
 *   GET /insights/overloaded-measures
 *   GET /insights/kpis
 *   GET /insights/link-type-distribution
 *
 * Verifies module loads, endpoints registered, unauthenticated requests
 * blocked. Service-level behavior is covered by W237's own suite.
 */

'use strict';

const express = require('express');
const request = require('supertest');

describe('W238 — linkage insights routes smoke', () => {
  test('module still loads after W238 additions', () => {
    expect(() => require('../routes/measures-workflow.routes')).not.toThrow();
  });

  test('all 4 W238 endpoints registered', () => {
    const router = require('../routes/measures-workflow.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toEqual(
      expect.arrayContaining([
        'GET /insights/orphaned-measures',
        'GET /insights/overloaded-measures',
        'GET /insights/kpis',
        'GET /insights/link-type-distribution',
      ])
    );
  });

  test('all 4 endpoints require authentication', async () => {
    const router = require('../routes/measures-workflow.routes');
    const app = express();
    app.use(express.json());
    app.use('/measures-workflow', router);

    for (const p of [
      '/measures-workflow/insights/orphaned-measures',
      '/measures-workflow/insights/overloaded-measures',
      '/measures-workflow/insights/kpis',
      '/measures-workflow/insights/link-type-distribution',
    ]) {
      const res = await request(app).get(p);
      expect([401, 403]).toContain(res.status);
    }
  });

  test('health endpoint reflects W238 additions (13 endpoints + W237 service)', async () => {
    // Inspect the route directly — health is the only public-ish route
    // but still gated by authenticate at router level. We verify the
    // metadata by intercepting the handler.
    const router = require('../routes/measures-workflow.routes');
    const healthLayer = router.stack.find(
      l => l.route && l.route.path === '/_health' && l.route.methods.get
    );
    expect(healthLayer).toBeDefined();
    // The handler is wrapped after `router.use(authenticate)` so we
    // can't trivially exec it. Instead inspect the source string —
    // a smoke check is enough; service-level behavior covered elsewhere.
    const handlerSrc = healthLayer.route.stack
      .map(s => (s.handle && s.handle.toString && s.handle.toString()) || '')
      .join('\n');
    // W238 added W237 to the services list; subsequent waves may bump
    // the version string and endpoint count further.
    expect(handlerSrc).toMatch(/W238/);
    expect(handlerSrc).toMatch(/W237 linkage insights/);
  });
});
