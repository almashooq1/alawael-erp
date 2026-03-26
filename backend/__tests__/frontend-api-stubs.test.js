/**
 * frontend-api-stubs.test.js
 * ──────────────────────────
 * Unit tests for the frontend-api-stubs routers.
 * Validates every exported router returns the expected response shape
 * ({success: true, data: ...}) and correct HTTP status codes.
 *
 * The stubs are standalone Express routers that don't need DB, so we
 * mount them in a lightweight Express app and fire supertest requests.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/secrets');

// Load the stubs module
const stubs = require('../routes/frontend-api-stubs');

// Use the same secret the auth middleware uses so tokens verify correctly
const JWT_SECRET = jwtSecret;
const validToken = jwt.sign(
  { id: 'test-user-1', email: 'test@test.com', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// ─── Helper: build a mini app with one router ────────────────────────────────
function buildApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Router
// ═══════════════════════════════════════════════════════════════════════════════
describe('frontend-api-stubs: adminRouter', () => {
  const app = buildApp('/api/admin', stubs.adminRouter);

  test('GET /api/admin/overview returns success with data shape', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('systemHealth');
  });

  test('GET /api/admin/users returns array of users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('_id');
    expect(res.body.data[0]).toHaveProperty('email');
  });

  test('GET /api/admin/alerts returns alerts array', async () => {
    const res = await request(app)
      .get('/api/admin/alerts')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/admin/settings returns settings object', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/admin/reports returns reports data', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/admin/audit-logs returns audit logs', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/admin/clinics returns clinics data', async () => {
    const res = await request(app)
      .get('/api/admin/clinics')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/admin/notifications returns notifications', async () => {
    const res = await request(app)
      .get('/api/admin/notifications')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Account Router
// ═══════════════════════════════════════════════════════════════════════════════
describe('frontend-api-stubs: accountRouter', () => {
  const app = buildApp('/api/account', stubs.accountRouter);

  test('GET /api/account/security returns security settings', async () => {
    const res = await request(app)
      .get('/api/account/security')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/account/sessions returns sessions array', async () => {
    const res = await request(app)
      .get('/api/account/sessions')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/account/security without auth returns 401', async () => {
    const res = await request(app).put('/api/account/security').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/account/sessions/:id without auth returns 401', async () => {
    const res = await request(app).delete('/api/account/sessions/abc');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/account/sessions/logout-all without auth returns 401', async () => {
    const res = await request(app).post('/api/account/sessions/logout-all');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Payments Router
// ═══════════════════════════════════════════════════════════════════════════════
describe('frontend-api-stubs: paymentsRouter', () => {
  const app = buildApp('/api/payments', stubs.paymentsRouter);

  test('GET /api/payments/all returns payments list', async () => {
    const res = await request(app)
      .get('/api/payments/all')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/payments/history returns payments history', async () => {
    const res = await request(app)
      .get('/api/payments/history')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/payments/subscriptions/active returns subscription info', async () => {
    const res = await request(app)
      .get('/api/payments/subscriptions/active')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('plan');
    expect(res.body.data).toHaveProperty('status');
  });

  test('POST /api/payments/stripe without auth returns 401', async () => {
    const res = await request(app).post('/api/payments/stripe').send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/payments/paypal without auth returns 401', async () => {
    const res = await request(app).post('/api/payments/paypal').send({});
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Monitoring Router
// ═══════════════════════════════════════════════════════════════════════════════
describe('frontend-api-stubs: monitoringRouter', () => {
  const app = buildApp('/api/monitoring', stubs.monitoringRouter);

  test('GET /api/monitoring/dashboard returns system metrics', async () => {
    const res = await request(app)
      .get('/api/monitoring/dashboard')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('cpu');
    expect(res.body.data).toHaveProperty('memory');
    expect(res.body.data).toHaveProperty('uptime');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Module Exports Validation
// ═══════════════════════════════════════════════════════════════════════════════
describe('frontend-api-stubs: module exports', () => {
  const expectedRouters = [
    'adminRouter',
    'accountRouter',
    'paymentsRouter',
    'monitoringRouter',
    'aiPredictionsRouter',
    'hrSystemRouter',
    'integratedCareRouter',
    'securityRouter',
    'organizationRouter',
    'communicationsRouter',
    'aiCommRouter',
    'exportImportRouter',
    'exportsRouter',
    'studentReportsRouter',
    'rehabProgramsRouter',
    'documentsSmartRouter',
    'studentsRouter',
    'compensationRouter',
    'disabilityRouter',
    'pmRouter',
    'analyticsExtraRouter',
    'dashboardExtrasRouter',
    'searchAdapterRouter',
    'parentsRouter',
  ];

  test.each(expectedRouters)('exports %s as an Express router', name => {
    expect(stubs[name]).toBeDefined();
    // Express routers are functions with a stack property
    expect(typeof stubs[name]).toBe('function');
  });

  test('does not export unexpected keys', () => {
    const exportedKeys = Object.keys(stubs);
    for (const key of exportedKeys) {
      expect(expectedRouters).toContain(key);
    }
  });
});
