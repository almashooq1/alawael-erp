/**
 * Organization Structure API — Integration Tests
 * Tests departments CRUD, positions CRUD, and hierarchical structure tree
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
let Department, Position;
let departmentId, childDepartmentId, positionId;
const testUserId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  Department = require('../models/Department');
  Position = require('../models/Position');
  require('../models/User');
  const routes = require('../routes/organization.real.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, role: 'admin', name: 'Test Admin' };
    req.userId = testUserId;
    next();
  });
  app.use('/api/organization', routes);
});

afterAll(async () => {
  try {
    if (Position) await Position.deleteMany({ title: /^test-org-/ }).catch(() => {});
    if (Department) await Department.deleteMany({ name: /^test-org-/ }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Organization Structure Routes', () => {
  // ── Departments ──────────────────────────────────────────────
  test('POST /api/organization/departments — creates a department', async () => {
    const res = await request(app).post('/api/organization/departments').send({
      name: 'test-org-dept-1',
      nameEn: 'Test Org Dept 1',
      type: 'department',
      status: 'active',
      level: 1,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    departmentId = res.body.data._id;
  });

  test('POST /api/organization/departments — creates a child department', async () => {
    const res = await request(app).post('/api/organization/departments').send({
      name: 'test-org-dept-child',
      nameEn: 'Test Org Dept Child',
      type: 'unit',
      status: 'active',
      parent: departmentId,
      level: 2,
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    childDepartmentId = res.body.data._id;
  });

  test('GET /api/organization/departments — lists departments', async () => {
    const res = await request(app).get('/api/organization/departments');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/organization/departments — filters by status', async () => {
    const res = await request(app).get('/api/organization/departments?status=active');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/organization/departments/:id — updates a department', async () => {
    const res = await request(app)
      .put(`/api/organization/departments/${departmentId}`)
      .send({ description: 'Updated description' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/organization/departments/:id — rejects deleting parent with children', async () => {
    const res = await request(app).delete(`/api/organization/departments/${departmentId}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/organization/departments/:id — deletes child department', async () => {
    const res = await request(app).delete(`/api/organization/departments/${childDepartmentId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Structure Tree ───────────────────────────────────────────
  test('GET /api/organization/structure — returns hierarchical tree', async () => {
    const res = await request(app).get('/api/organization/structure');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // ── Positions ────────────────────────────────────────────────
  test('POST /api/organization/positions — creates a position', async () => {
    const res = await request(app).post('/api/organization/positions').send({
      title: 'test-org-position-1',
      titleEn: 'Test Org Position 1',
      department: departmentId,
      level: 'staff',
      type: 'full_time',
      status: 'active',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    positionId = res.body.data._id;
  });

  test('GET /api/organization/positions — lists positions', async () => {
    const res = await request(app).get('/api/organization/positions');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/organization/positions/:id — updates a position', async () => {
    const res = await request(app)
      .put(`/api/organization/positions/${positionId}`)
      .send({ headcount: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/organization/positions/:id — deletes a position', async () => {
    const res = await request(app).delete(`/api/organization/positions/${positionId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Cleanup parent department ────────────────────────────────
  test('DELETE /api/organization/departments/:id — deletes parent once children removed', async () => {
    const res = await request(app).delete(`/api/organization/departments/${departmentId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
