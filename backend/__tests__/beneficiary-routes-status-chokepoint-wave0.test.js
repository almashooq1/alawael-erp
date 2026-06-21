/**
 * beneficiary-routes-status-chokepoint-wave0.test.js
 *
 * W0-LifecycleAlign: Verify that the legacy direct-status-mutation endpoints
 * are closed and redirect callers to the unified lifecycle workflow.
 */

'use strict';

const express = require('express');
const beneficiaryRoutes = require('../routes/beneficiaries');

describe('Legacy beneficiary routes — status chokepoint', () => {
  function buildApp() {
    const app = express();
    app.use(express.json());
    // Minimal auth/branch stubs so the router's middleware passes.
    app.use((req, _res, next) => {
      req.user = { _id: 'user-123', role: 'admin' };
      req.branchScope = { unrestricted: true };
      next();
    });
    app.use('/api/beneficiaries', beneficiaryRoutes);
    return app;
  }

  test('PATCH /api/beneficiaries/:id/status returns 410 with lifecycle redirect', async () => {
    const app = buildApp();
    const request = require('supertest');

    const res = await request(app)
      .patch('/api/beneficiaries/507f1f77bcf86cd799439011/status')
      .send({ status: 'active' });

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.reason).toBe('LIFECYCLE_CHOKEPOINT_REQUIRED');
    expect(res.body.alternativeEndpoint).toBe('/api/v1/beneficiary-lifecycle/transitions');
  });

  test('bulk-action activate/deactivate/update-status return 410', async () => {
    const app = buildApp();
    const request = require('supertest');

    for (const action of ['activate', 'deactivate', 'update-status']) {
      const res = await request(app)
        .post('/api/beneficiaries/bulk-action')
        .send({ action, ids: ['507f1f77bcf86cd799439011'], data: { status: 'active' } });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.reason).toBe('LIFECYCLE_CHOKEPOINT_REQUIRED');
      expect(res.body.alternativeEndpoint).toBe('/api/v1/beneficiary-lifecycle/transitions');
    }
  });
});
