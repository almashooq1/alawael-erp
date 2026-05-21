'use strict';

/**
 * linkage-crud-routes-wave239.test.js — Wave 239.
 *
 * Smoke tests for the 7 W235-CRUD + decision-suggestion endpoints
 * added to measures-workflow.routes.js:
 *
 *   POST /goals/:goalId/objectives/:objectiveIndex/links
 *   POST /goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/review
 *   POST /goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/unlink
 *   GET  /goals/:goalId/objectives/:objectiveIndex/suggestions
 *   GET  /goals/:goalId/weighted-progress
 *   GET  /measures/:measureId/goals
 *   GET  /links/due-for-review
 *
 * Verifies endpoints registered + authentication gates.
 * Service-level behavior covered by W235's own suite.
 */

'use strict';

const express = require('express');
const request = require('supertest');

describe('W239 — linkage CRUD routes smoke', () => {
  test('module still loads after W239 additions', () => {
    expect(() => require('../routes/measures-workflow.routes')).not.toThrow();
  });

  test('all 7 W239 endpoints registered', () => {
    const router = require('../routes/measures-workflow.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toEqual(
      expect.arrayContaining([
        'POST /goals/:goalId/objectives/:objectiveIndex/links',
        'POST /goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/review',
        'POST /goals/:goalId/objectives/:objectiveIndex/links/:linkIndex/unlink',
        'GET /goals/:goalId/objectives/:objectiveIndex/suggestions',
        'GET /goals/:goalId/weighted-progress',
        'GET /measures/:measureId/goals',
        'GET /links/due-for-review',
      ])
    );
  });

  test('all 7 endpoints require authentication', async () => {
    const router = require('../routes/measures-workflow.routes');
    const app = express();
    app.use(express.json());
    app.use('/measures-workflow', router);

    const id = '507f1f77bcf86cd799439011';
    const requests = [
      ['post', `/measures-workflow/goals/${id}/objectives/0/links`],
      ['post', `/measures-workflow/goals/${id}/objectives/0/links/0/review`],
      ['post', `/measures-workflow/goals/${id}/objectives/0/links/0/unlink`],
      ['get', `/measures-workflow/goals/${id}/objectives/0/suggestions`],
      ['get', `/measures-workflow/goals/${id}/weighted-progress`],
      ['get', `/measures-workflow/measures/${id}/goals`],
      ['get', `/measures-workflow/links/due-for-review`],
    ];
    for (const [method, p] of requests) {
      const res = await request(app)[method](p);
      expect([401, 403]).toContain(res.status);
    }
  });

  test('health endpoint reflects W239 additions (20 endpoints + W235 service)', () => {
    const router = require('../routes/measures-workflow.routes');
    const healthLayer = router.stack.find(
      l => l.route && l.route.path === '/_health' && l.route.methods.get
    );
    expect(healthLayer).toBeDefined();
    const handlerSrc = healthLayer.route.stack
      .map(s => (s.handle && s.handle.toString && s.handle.toString()) || '')
      .join('\n');
    expect(handlerSrc).toMatch(/W226\+W238\+W239/);
    expect(handlerSrc).toMatch(/W235 linkage CRUD/);
    expect(handlerSrc).toMatch(/endpoints: 20/);
  });
});
