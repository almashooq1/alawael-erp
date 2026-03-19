/**
 * Strategic Planning API — Integration Tests
 * Tests goals, initiatives, KPIs CRUD + dashboard + BSC
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
let StrategicGoal, StrategicInitiative, StrategicKPI;
let goalId, initiativeId, kpiId;

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  StrategicGoal = require('../models/StrategicGoal');
  StrategicInitiative = require('../models/StrategicInitiative');
  StrategicKPI = require('../models/StrategicKPI');
  const routes = require('../routes/strategicPlanning.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId(), role: 'admin', name: 'Test Admin' };
    req.userId = req.user._id;
    next();
  });
  app.use('/api/strategic-planning', routes);
});

afterAll(async () => {
  try {
    if (StrategicGoal) await StrategicGoal.deleteMany({ title: /^test-sp-/ }).catch(() => {});
    if (StrategicInitiative)
      await StrategicInitiative.deleteMany({ title: /^test-sp-/ }).catch(() => {});
    if (StrategicKPI) await StrategicKPI.deleteMany({ name: /^test-sp-/ }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Strategic Planning Routes', () => {
  // ── Goals ────────────────────────────────────────────────────
  test('POST /api/strategic-planning/goals — creates a goal', async () => {
    const res = await request(app)
      .post('/api/strategic-planning/goals')
      .send({
        title: 'test-sp-goal-1',
        description: 'هدف تجريبي',
        perspective: 'financial',
        priority: 'high',
        targetValue: 100,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('test-sp-goal-1');
    goalId = res.body.data._id;
  });

  test('GET /api/strategic-planning/goals — lists goals', async () => {
    const res = await request(app)
      .get('/api/strategic-planning/goals')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('PUT /api/strategic-planning/goals/:id — updates a goal', async () => {
    const res = await request(app)
      .put(`/api/strategic-planning/goals/${goalId}`)
      .send({ title: 'test-sp-goal-updated', progress: 50 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('test-sp-goal-updated');
  });

  test('DELETE /api/strategic-planning/goals/:id — deletes a goal', async () => {
    const temp = await StrategicGoal.create({
      title: 'test-sp-goal-delete',
      perspective: 'customer',
    });
    const res = await request(app).delete(`/api/strategic-planning/goals/${temp._id}`).expect(200);

    expect(res.body.success).toBe(true);
    const check = await StrategicGoal.findById(temp._id);
    expect(check).toBeNull();
  });

  // ── Initiatives ──────────────────────────────────────────────
  test('POST /api/strategic-planning/initiatives — creates an initiative', async () => {
    const res = await request(app)
      .post('/api/strategic-planning/initiatives')
      .send({
        title: 'test-sp-initiative-1',
        description: 'مبادرة تجريبية',
        goalId: goalId,
        priority: 'medium',
        startDate: '2026-02-01',
        endDate: '2026-06-30',
        budget: 50000,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('test-sp-initiative-1');
    initiativeId = res.body.data._id;
  });

  test('GET /api/strategic-planning/initiatives — lists initiatives', async () => {
    const res = await request(app)
      .get('/api/strategic-planning/initiatives')
      .query({ goalId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/strategic-planning/initiatives/:id — updates an initiative', async () => {
    const res = await request(app)
      .put(`/api/strategic-planning/initiatives/${initiativeId}`)
      .send({ progress: 30 })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/strategic-planning/initiatives/:id — deletes an initiative', async () => {
    const temp = await StrategicInitiative.create({
      title: 'test-sp-init-delete',
      goalId: new mongoose.Types.ObjectId(),
    });
    const res = await request(app)
      .delete(`/api/strategic-planning/initiatives/${temp._id}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── KPIs ─────────────────────────────────────────────────────
  test('POST /api/strategic-planning/kpis — creates a KPI', async () => {
    const res = await request(app)
      .post('/api/strategic-planning/kpis')
      .send({
        name: 'test-sp-kpi-1',
        description: 'مؤشر أداء تجريبي',
        goalId: goalId,
        targetValue: 100,
        unit: '%',
        frequency: 'monthly',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('test-sp-kpi-1');
    kpiId = res.body.data._id;
  });

  test('POST /api/strategic-planning/kpis/:id/record — records KPI value', async () => {
    const res = await request(app)
      .post(`/api/strategic-planning/kpis/${kpiId}/record`)
      .send({ value: 65, notes: 'تسجيل تجريبي' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.currentValue).toBe(65);
  });

  test('GET /api/strategic-planning/kpis — lists KPIs', async () => {
    const res = await request(app)
      .get('/api/strategic-planning/kpis')
      .query({ goalId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('DELETE /api/strategic-planning/kpis/:id — deletes a KPI', async () => {
    const temp = await StrategicKPI.create({
      name: 'test-sp-kpi-delete',
      goalId: new mongoose.Types.ObjectId(),
      targetValue: 50,
    });
    const res = await request(app).delete(`/api/strategic-planning/kpis/${temp._id}`).expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── Dashboard & Reports ──────────────────────────────────────
  test('GET /api/strategic-planning/goals/:id — gets goal detail', async () => {
    if (!goalId) return;
    const res = await request(app).get(`/api/strategic-planning/goals/${goalId}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(goalId);
  });

  test('GET /api/strategic-planning/initiatives/:id — gets initiative detail', async () => {
    if (!initiativeId) return;
    const res = await request(app)
      .get(`/api/strategic-planning/initiatives/${initiativeId}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(initiativeId);
  });

  test('PUT /api/strategic-planning/kpis/:id — updates a KPI', async () => {
    if (!kpiId) return;
    const res = await request(app)
      .put(`/api/strategic-planning/kpis/${kpiId}`)
      .send({ targetValue: 200, currentValue: 50 })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.targetValue).toBe(200);
  });

  test('GET /api/strategic-planning/dashboard — returns dashboard data', async () => {
    const res = await request(app).get('/api/strategic-planning/dashboard').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.totals).toBeDefined();
    expect(res.body.data.totals.goals).toBeDefined();
    expect(res.body.data.totals.initiatives).toBeDefined();
    expect(res.body.data.totals.kpis).toBeDefined();
  });

  test('GET /api/strategic-planning/balanced-scorecard — returns BSC data', async () => {
    const res = await request(app).get('/api/strategic-planning/balanced-scorecard').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/strategic-planning/progress-report — returns progress report', async () => {
    const res = await request(app).get('/api/strategic-planning/progress-report').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});
