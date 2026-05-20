'use strict';

/**
 * measures-workflow-routes-wave226.test.js — Wave 226.
 *
 * Smoke + endpoint-registration tests for the HTTP surface.
 * - Module loads
 * - All 9 documented endpoints registered
 * - Unauthenticated requests → 401
 * - Mounted via clinical-assessment registry
 *
 * Service-level behavior is covered by the W218/W220/W222/W223/W225
 * service tests; this suite only verifies the HTTP layer.
 */

'use strict';

const express = require('express');
const request = require('supertest');

describe('W226 — measures-workflow routes smoke', () => {
  test('module loads without throwing', () => {
    expect(() => require('../routes/measures-workflow.routes')).not.toThrow();
  });

  test('all 9 documented endpoints registered', () => {
    const router = require('../routes/measures-workflow.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });

    expect(paths).toEqual(
      expect.arrayContaining([
        'POST /strategist/recommend',
        'POST /triggers/:eventCode/fire',
        'GET /triggers/:eventCode/preview',
        'GET /tasks',
        'POST /tasks/:taskId/acknowledge',
        'POST /tasks/:taskId/review-breach',
        'GET /readiness/care-plan-review/:beneficiaryId',
        'GET /readiness/discharge/:beneficiaryId',
        'GET /required-measures/:beneficiaryId',
        'GET /reminders/beneficiary/:beneficiaryId',
        'GET /_health',
      ])
    );
  });

  test('unauthenticated POST /strategist/recommend → 401', async () => {
    const router = require('../routes/measures-workflow.routes');
    const app = express();
    app.use(express.json());
    app.use('/measures-workflow', router);
    const res = await request(app)
      .post('/measures-workflow/strategist/recommend')
      .send({ beneficiary: { ageMonths: 60 } });
    expect([401, 403]).toContain(res.status);
  });

  test('unauthenticated GET /tasks → 401', async () => {
    const router = require('../routes/measures-workflow.routes');
    const app = express();
    app.use(express.json());
    app.use('/measures-workflow', router);
    const res = await request(app).get('/measures-workflow/tasks');
    expect([401, 403]).toContain(res.status);
  });

  test('unauthenticated GET /readiness/care-plan-review/:id → 401', async () => {
    const router = require('../routes/measures-workflow.routes');
    const app = express();
    app.use(express.json());
    app.use('/measures-workflow', router);
    const res = await request(app).get(
      '/measures-workflow/readiness/care-plan-review/507f1f77bcf86cd799439011'
    );
    expect([401, 403]).toContain(res.status);
  });

  test('unauthenticated POST /triggers/POST_BOTOX/fire → 401', async () => {
    const router = require('../routes/measures-workflow.routes');
    const app = express();
    app.use(express.json());
    app.use('/measures-workflow', router);
    const res = await request(app)
      .post('/measures-workflow/triggers/POST_BOTOX/fire')
      .send({ beneficiaryId: '507f1f77bcf86cd799439011' });
    expect([401, 403]).toContain(res.status);
  });

  test('mounted in clinical-assessment registry', () => {
    const registry = require('fs').readFileSync(
      require('path').join(
        __dirname,
        '..',
        'routes',
        'registries',
        'clinical-assessment.registry.js'
      ),
      'utf-8'
    );
    expect(registry).toMatch(/measures-workflow\.routes/);
    expect(registry).toMatch(/dualMount\(app, 'measures-workflow'/);
  });
});
