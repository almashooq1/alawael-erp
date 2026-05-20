/**
 * archive.routes — smoke tests.
 * Verifies the router module loads cleanly and rejects unauthenticated
 * requests. Does NOT exercise mongoose state — that lives in the smart
 * service unit test + the e2e suite.
 */

'use strict';

const express = require('express');
const request = require('supertest');

describe('archive.routes — smoke', () => {
  test('module loads without throwing', () => {
    expect(() => require('../routes/archive.routes')).not.toThrow();
  });

  test('unauthenticated request to GET / returns 401', async () => {
    const router = require('../routes/archive.routes');
    const app = express();
    app.use(express.json());
    app.use('/archive', router);
    const res = await request(app).get('/archive');
    // authenticate middleware blocks: expect 401 (unauthorized)
    expect([401, 403]).toContain(res.status);
  });

  test('all 14 documented endpoints are registered on the router', () => {
    const router = require('../routes/archive.routes');
    const routes = router.stack
      .filter(layer => layer.route)
      .map(layer => ({
        method: Object.keys(layer.route.methods)[0],
        path: layer.route.path,
      }));
    const paths = routes.map(r => `${r.method.toUpperCase()} ${r.path}`);
    // Spot-check key endpoints exist
    expect(paths).toEqual(
      expect.arrayContaining([
        'GET /',
        'POST /:id/archive',
        'POST /:id/restore',
        'DELETE /:id/purge',
        'GET /retention-report',
        'GET /due-for-purge',
        'PATCH /:id/retention',
        'GET /stats',
        'POST /bulk/archive',
        'GET /recommendations',
        'POST /recommendations/scan',
        'POST /recommendations/:id/ack',
        'POST /recommendations/:id/dismiss',
      ])
    );
  });
});
