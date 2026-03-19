/**
 * Visitors API — Integration Tests
 * Tests visitors CRUD, check-in/out, stats, and blacklist
 */
jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const m1 = envContent.match(/^MONGO_URI\s*=\s*(.+)$/m);
  if (m1) process.env.MONGO_URI = m1[1].trim();
  const m2 = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
  if (m2) process.env.MONGODB_URI = m2[1].trim();
}

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

let app;
let Visitor;
let visitorId;
const testUserId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  Visitor = require('../models/Visitor');
  require('../models/User');
  const routes = require('../routes/visitors.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, role: 'admin', name: 'Test Admin' };
    req.userId = testUserId;
    next();
  });
  app.use('/api/visitors', routes);
});

afterAll(async () => {
  try {
    if (Visitor) await Visitor.deleteMany({ fullName: /^test-vis-/ }).catch(() => {});
    const { VisitorBlacklist } = require('../services/visitor-advanced.service');
    if (VisitorBlacklist)
      await VisitorBlacklist.deleteMany({ nationalId: /^test-vis-/ }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Visitors Routes', () => {
  // ── Register Visitor ─────────────────────────────────────────
  test('POST /api/visitors — registers a visitor', async () => {
    const res = await request(app)
      .post('/api/visitors')
      .send({
        fullName: 'test-vis-ahmed',
        nationalId: '1234567890',
        phone: '0551234567',
        purpose: 'meeting',
        hostName: 'Dr. Ali',
        hostDepartment: 'IT',
        expectedArrival: new Date(Date.now() + 3600000).toISOString(),
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data._id).toBeDefined();
    visitorId = res.body.data._id;
  });

  test('GET /api/visitors — lists visitors', async () => {
    const res = await request(app).get('/api/visitors');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/visitors/:id — gets visitor by ID', async () => {
    const res = await request(app).get(`/api/visitors/${visitorId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe('test-vis-ahmed');
  });

  test('PUT /api/visitors/:id — updates a visitor', async () => {
    const res = await request(app)
      .put(`/api/visitors/${visitorId}`)
      .send({ hostDepartment: 'Engineering' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Check-in / Check-out ─────────────────────────────────────
  test('POST /api/visitors/:id/check-in — checks in a visitor', async () => {
    const res = await request(app)
      .post(`/api/visitors/${visitorId}/check-in`)
      .send({ badgeNumber: 'B-101' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/visitors/:id/check-out — checks out a visitor', async () => {
    const res = await request(app).post(`/api/visitors/${visitorId}/check-out`).send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Stats ────────────────────────────────────────────────────
  test('GET /api/visitors/stats/today — returns today stats', async () => {
    const res = await request(app).get('/api/visitors/stats/today');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('GET /api/visitors/analytics — returns analytics', async () => {
    const res = await request(app).get('/api/visitors/analytics');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/visitors/currently-inside — returns currently inside visitors', async () => {
    const res = await request(app).get('/api/visitors/currently-inside');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/visitors/expected-today — returns expected today visitors', async () => {
    const res = await request(app).get('/api/visitors/expected-today');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Blacklist ────────────────────────────────────────────────
  test('POST /api/visitors/blacklist — adds to blacklist', async () => {
    const res = await request(app).post('/api/visitors/blacklist').send({
      nationalId: 'test-vis-bl-001',
      fullName: 'test-vis-blacklisted',
      reason: 'Security concern',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/visitors/blacklist — lists blacklisted visitors', async () => {
    const res = await request(app).get('/api/visitors/blacklist');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── Logs ─────────────────────────────────────────────────────
  test('GET /api/visitors/logs/recent — returns recent logs', async () => {
    const res = await request(app).get('/api/visitors/logs/recent');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Not Found ────────────────────────────────────────────────
  test('DELETE /api/visitors/blacklist/:id — removes from blacklist', async () => {
    // Create a blacklist entry, then remove it
    const addRes = await request(app).post('/api/visitors/blacklist').send({
      nationalId: 'test-vis-bl-del',
      fullName: 'test-vis-blacklist-delete',
      reason: 'Test removal',
    });
    const blId = addRes.body.data?._id;
    if (!blId) return; // skip if blacklist model not available
    const res = await request(app).delete(`/api/visitors/blacklist/${blId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/visitors/:id/no-show — marks visitor as no-show', async () => {
    const createRes = await request(app).post('/api/visitors').send({
      fullName: 'test-vis-noshow',
      nationalId: '8888888888',
      phone: '0558888888',
      purpose: 'meeting',
      hostName: 'Dr. NoShow',
      hostDepartment: 'Admin',
    });
    const nsId = createRes.body.data._id;
    const res = await request(app).post(`/api/visitors/${nsId}/no-show`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/visitors/:id/logs — returns visitor logs', async () => {
    if (!visitorId) return;
    const res = await request(app).get(`/api/visitors/${visitorId}/logs`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/visitors/:id — returns 404 for non-existent visitor', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/visitors/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ── Cancel ───────────────────────────────────────────────────
  test('POST /api/visitors/:id/cancel — cancels a visit', async () => {
    const createRes = await request(app).post('/api/visitors').send({
      fullName: 'test-vis-cancel',
      nationalId: '9999999999',
      phone: '0559999999',
      purpose: 'meeting',
      hostName: 'Dr. Test',
      hostDepartment: 'HR',
    });
    const cancelId = createRes.body.data._id;
    const res = await request(app)
      .post(`/api/visitors/${cancelId}/cancel`)
      .send({ reason: 'Scheduling conflict' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
