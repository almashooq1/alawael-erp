/**
 * Complaints API — Integration Tests
 * Tests unified complaints CRUD + actions (respond/escalate/resolve/rate) + stats
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
let Complaint;
let complaintId;
const testUserId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  Complaint = require('../models/Complaint');
  require('../models/User'); // ensure User model is registered for populate
  const routes = require('../routes/complaints.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, role: 'admin', name: 'Test Admin' };
    req.userId = testUserId;
    next();
  });
  app.use('/api/complaints', routes);
});

afterAll(async () => {
  try {
    if (Complaint) await Complaint.deleteMany({ subject: /^test-cmp-/ }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Complaints Routes', () => {
  // ── CRUD ─────────────────────────────────────────────────────
  test('POST /api/complaints — creates a complaint', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({
        subject: 'test-cmp-complaint-1',
        description: 'شكوى تجريبية',
        type: 'complaint',
        source: 'employee',
        category: 'administrative',
        priority: 'high',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.subject).toBe('test-cmp-complaint-1');
    expect(res.body.data.complaintId).toMatch(/^CMP-/);
    complaintId = res.body.data._id;
  });

  test('POST /api/complaints — creates a suggestion with SUG prefix', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({
        subject: 'test-cmp-suggestion-1',
        description: 'مقترح تجريبي',
        type: 'suggestion',
        source: 'student',
        category: 'service',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.complaintId).toMatch(/^SUG-/);
  });

  test('GET /api/complaints — lists complaints with pagination', async () => {
    const res = await request(app).get('/api/complaints').query({ page: 1, limit: 10 }).expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/complaints — filters by source', async () => {
    const res = await request(app).get('/api/complaints').query({ source: 'employee' }).expect(200);

    expect(res.body.success).toBe(true);
    res.body.data.forEach(c => expect(c.source).toBe('employee'));
  });

  test('GET /api/complaints/:id — gets complaint detail', async () => {
    const res = await request(app).get(`/api/complaints/${complaintId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(complaintId);
  });

  test('PUT /api/complaints/:id — updates a complaint', async () => {
    const res = await request(app)
      .put(`/api/complaints/${complaintId}`)
      .send({ priority: 'critical', description: 'تحديث الوصف' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.priority).toBe('critical');
  });

  test('GET /api/complaints/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/complaints/${fakeId}`).expect(404);
    expect(res.body.success).toBe(false);
  });

  // ── Actions ──────────────────────────────────────────────────
  test('POST /api/complaints/:id/respond — adds a response', async () => {
    const res = await request(app)
      .post(`/api/complaints/${complaintId}/respond`)
      .send({ content: 'رد تجريبي على الشكوى' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.responses.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/complaints/:id/escalate — escalates', async () => {
    const res = await request(app)
      .post(`/api/complaints/${complaintId}/escalate`)
      .send({ reason: 'عدم الاستجابة في الوقت المحدد' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('escalated');
  });

  test('POST /api/complaints/:id/resolve — resolves', async () => {
    const res = await request(app)
      .post(`/api/complaints/${complaintId}/resolve`)
      .send({ resolution: 'تم حل المشكلة بنجاح' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('resolved');
  });

  test('POST /api/complaints/:id/rate — rates resolution', async () => {
    const res = await request(app)
      .post(`/api/complaints/${complaintId}/rate`)
      .send({ rating: 4, comment: 'خدمة جيدة' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
  });

  // ── Stats ────────────────────────────────────────────────────
  test('GET /api/complaints/stats — returns statistics', async () => {
    const res = await request(app).get('/api/complaints/stats').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.total).toBeDefined();
  });

  // ── Delete ───────────────────────────────────────────────────
  test('DELETE /api/complaints/:id — soft deletes', async () => {
    const temp = await Complaint.create({
      subject: 'test-cmp-delete-target',
      description: 'حذف تجريبي',
      type: 'feedback',
      source: 'customer',
      createdBy: testUserId,
    });
    const res = await request(app).delete(`/api/complaints/${temp._id}`).expect(200);

    expect(res.body.success).toBe(true);
  });
});
