/**
 * Succession Planning API — Integration Tests
 * Tests plans CRUD, candidates, stats, reports, and development plans
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
let SuccessionPlan, DevelopmentPlan;
let planId, devPlanId;
const testUserId = new mongoose.Types.ObjectId();
const candidateUserId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  SuccessionPlan = require('../models/SuccessionPlan');
  DevelopmentPlan = require('../models/DevelopmentPlan');
  require('../models/User');
  const routes = require('../routes/successionPlanning');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, role: 'admin', name: 'Test Admin' };
    req.userId = testUserId;
    next();
  });
  app.use('/api/succession-planning', routes);
});

afterAll(async () => {
  try {
    if (SuccessionPlan)
      await SuccessionPlan.deleteMany({ positionTitle: /^test-sp-/ }).catch(() => {});
    if (DevelopmentPlan)
      await DevelopmentPlan.deleteMany({ employeeId: candidateUserId }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Succession Planning Routes', () => {
  // ── Plans CRUD ───────────────────────────────────────────────
  test('POST /api/succession-planning — creates a plan', async () => {
    const res = await request(app)
      .post('/api/succession-planning')
      .send({
        positionId: 'POS-001',
        positionTitle: 'test-sp-director',
        department: 'Engineering',
        requiredCompetencies: [
          { competency: 'leadership', proficiencyLevel: 'advanced', criticality: 'critical' },
        ],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('draft');
    planId = res.body.data._id;
  });

  test('GET /api/succession-planning — lists plans', async () => {
    const res = await request(app).get('/api/succession-planning');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /api/succession-planning/:planId — gets a plan by ID', async () => {
    const res = await request(app).get(`/api/succession-planning/${planId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.positionTitle).toBe('test-sp-director');
  });

  test('PUT /api/succession-planning/:planId — updates a plan', async () => {
    const res = await request(app)
      .put(`/api/succession-planning/${planId}`)
      .send({ status: 'active', department: 'IT' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.department).toBe('IT');
  });

  // ── Candidates ───────────────────────────────────────────────
  test('POST /api/succession-planning/:planId/candidates — adds a candidate', async () => {
    const res = await request(app)
      .post(`/api/succession-planning/${planId}/candidates`)
      .send({
        candidateId: candidateUserId,
        readinessLevel: 'ready_1_year',
        readinessPercentage: 65,
        keyStrengths: ['communication'],
        developmentNeeds: ['project management'],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.successors.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/succession-planning/:planId/candidates/:candidateId/readiness — assesses readiness', async () => {
    const res = await request(app)
      .post(`/api/succession-planning/${planId}/candidates/${candidateUserId}/readiness`)
      .send({
        readinessLevel: 'ready_now',
        readinessPercentage: 90,
        assessmentComments: 'Excellent candidate',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Development Plans ────────────────────────────────────────
  test('POST /api/succession-planning/create — legacy create endpoint', async () => {
    const res = await request(app)
      .post('/api/succession-planning/create')
      .send({
        positionId: 'POS-LEGACY-001',
        positionTitle: 'test-sp-legacy-create',
        department: 'HR',
        requiredCompetencies: [
          { competency: 'management', proficiencyLevel: 'intermediate', criticality: 'critical' },
        ],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    // Clean up
    if (res.body.data?._id) {
      await SuccessionPlan.findByIdAndDelete(res.body.data._id).catch(() => {});
    }
  });

  test('PUT /api/succession-planning/:planId/candidates/:candidateId — updates candidate', async () => {
    const res = await request(app)
      .put(`/api/succession-planning/${planId}/candidates/${candidateUserId}`)
      .send({ readinessLevel: 'ready_3_years' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/succession-planning/:planId/candidates/:candidateId/development — get candidate dev plan', async () => {
    const res = await request(app).get(
      `/api/succession-planning/${planId}/candidates/${candidateUserId}/development`
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/succession-planning/:planId/add-successor — legacy add-successor', async () => {
    const res = await request(app)
      .post(`/api/succession-planning/${planId}/add-successor`)
      .send({
        candidateId: new mongoose.Types.ObjectId(),
        readinessLevel: 'ready_1_year',
        readinessPercentage: 70,
        keyStrengths: ['leadership'],
        developmentNeeds: ['communication'],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/succession-planning/:planId/add-leadership-program — adds leadership program', async () => {
    const res = await request(app)
      .post(`/api/succession-planning/${planId}/add-leadership-program`)
      .send({
        programName: 'Executive Leadership',
        provider: 'Training Corp',
        startDate: '2026-03-01',
        endDate: '2026-06-01',
        objectives: ['Develop strategic thinking'],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/succession-planning/:planId/add-mentorship/:successorId — adds mentorship', async () => {
    const mentorId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/succession-planning/${planId}/add-mentorship/${candidateUserId}`)
      .send({
        mentorId,
        startDate: '2026-01-15',
        objectives: ['Knowledge transfer'],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/succession-planning/position/:positionId/plans — gets plans by position', async () => {
    const res = await request(app).get('/api/succession-planning/position/POS-001/plans');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/succession-planning/reports/best-candidates — returns best candidates', async () => {
    const res = await request(app).get('/api/succession-planning/reports/best-candidates');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/succession-planning/:planId/create-development-plan/:successorId — creates dev plan', async () => {
    const res = await request(app)
      .post(`/api/succession-planning/${planId}/create-development-plan/${candidateUserId}`)
      .send({
        developmentGoals: [{ goal: 'Complete PMP certification', targetDate: '2026-06-01' }],
        plannedTrainings: [{ trainingTitle: 'Leadership Workshop' }],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    devPlanId = res.body.data._id;
  });

  test('GET /api/succession-planning/development-plan/:planId — gets dev plan', async () => {
    const res = await request(app).get(`/api/succession-planning/development-plan/${devPlanId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('PUT /api/succession-planning/development-plan/:planId/update — updates dev plan', async () => {
    const res = await request(app)
      .put(`/api/succession-planning/development-plan/${devPlanId}/update`)
      .send({ notes: 'On track' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/succession-planning/development-plan/:planId/goal-status/:goalIndex — updates goal status', async () => {
    if (!devPlanId) return;
    const res = await request(app)
      .put(`/api/succession-planning/development-plan/${devPlanId}/goal-status/0`)
      .send({ status: 'in_progress', completionPercentage: 40 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Stats & Reports ──────────────────────────────────────────
  test('GET /api/succession-planning/stats — returns statistics', async () => {
    const res = await request(app).get('/api/succession-planning/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('coverageRate');
  });

  test('GET /api/succession-planning/reports/top-candidates — returns top candidates report', async () => {
    const res = await request(app).get('/api/succession-planning/reports/top-candidates');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/succession-planning/reports/risk-assessment — returns risk assessment', async () => {
    const res = await request(app).get('/api/succession-planning/reports/risk-assessment');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalPositions');
  });

  // ── Cleanup ──────────────────────────────────────────────────
  test('DELETE /api/succession-planning/development-plan/:planId — deletes dev plan', async () => {
    const res = await request(app).delete(`/api/succession-planning/development-plan/${devPlanId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/succession-planning/:planId — deletes a plan', async () => {
    const res = await request(app).delete(`/api/succession-planning/${planId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
