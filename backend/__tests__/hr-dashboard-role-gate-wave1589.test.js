/**
 * hr-dashboard-role-gate-wave1589.test.js — W1589
 *
 * `GET /api/v1/hr/dashboard` returns an executive HR rollup (headcount,
 * salary + leave-balance aggregates, compliance state). The router mounts
 * behind `authenticate` ONLY (app.js: `app.use('/api/v1/hr', authenticate,
 * dashboardRouter)`) and the file header assumed the caller applied RBAC at
 * mount time — it never did. So before W1589 ANY authenticated principal
 * could read org-wide HR analytics for any `?branchId`.
 *
 * W1589 adds the SAME role tier the twin `hr-smart-analytics` surface already
 * enforces. This suite mounts the REAL router and asserts a non-privileged
 * caller is 403'd while HR/manager tiers pass through to the service.
 */

const express = require('express');
const request = require('supertest');

const { createHrDashboardRouter } = require('../routes/hr/hr-dashboard.routes');

function buildApp(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  const service = { buildDashboard: jest.fn(async () => ({ ok: true, headcount: 42 })) };
  const router = createHrDashboardRouter({ service, logger: { info() {}, error() {} } });
  app.use('/api/v1/hr', router);
  return { app, service };
}

describe('W1589 — HR executive dashboard is role-gated', () => {
  it('403s a non-privileged authenticated caller (was: any user)', async () => {
    const { app, service } = buildApp({ id: 'u1', role: 'therapist' });
    const res = await request(app).get('/api/v1/hr/dashboard');
    expect(res.status).toBe(403);
    expect(service.buildDashboard).not.toHaveBeenCalled();
  });

  it('403s a receptionist / portal token', async () => {
    for (const role of ['receptionist', 'guardian', 'beneficiary', undefined]) {
      const { app } = buildApp({ id: 'u', role });
      const res = await request(app).get('/api/v1/hr/dashboard');
      expect(res.status).toBe(403);
    }
  });

  it('allows the HR/manager tiers (admin, hr_manager, manager, superadmin, super_admin)', async () => {
    for (const role of ['admin', 'hr_manager', 'manager', 'superadmin', 'super_admin']) {
      const { app, service } = buildApp({ id: 'x', role });
      const res = await request(app).get('/api/v1/hr/dashboard');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('headcount', 42);
      expect(service.buildDashboard).toHaveBeenCalled();
    }
  });

  it('source carries the role guard mirroring hr-smart-analytics (static drift guard)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'hr', 'hr-dashboard.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/router\.use\(/);
    expect(src).toMatch(/\['admin', 'hr_manager', 'manager', 'superadmin', 'super_admin'\]/);
    expect(src).toMatch(/insufficient permissions/);
  });
});
