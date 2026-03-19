/**
 * Meetings API — Integration Tests
 * Tests meetings CRUD, minutes, and RSVP
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
let Meeting;
let meetingId;
const testUserId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  Meeting = require('../models/Meeting');
  require('../models/User');
  const routes = require('../routes/meetings.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, id: testUserId, role: 'admin', name: 'Test Admin' };
    req.userId = testUserId;
    next();
  });
  app.use('/api/meetings', routes);
});

afterAll(async () => {
  try {
    if (Meeting) await Meeting.deleteMany({ title: /^test-mtg-/ }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Meetings Routes', () => {
  // ── CRUD ─────────────────────────────────────────────────────
  test('POST /api/meetings — creates a meeting', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .send({
        title: 'test-mtg-weekly-sync',
        description: 'Weekly team sync',
        type: 'department',
        date: '2026-03-15',
        startTime: '09:00',
        endTime: '10:00',
        location: 'Meeting Room A',
        attendees: [{ name: 'User1', email: 'u1@test.com', role: 'required' }],
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.meetingId).toMatch(/^MTG-/);
    meetingId = res.body.data._id;
  });

  test('GET /api/meetings — lists meetings', async () => {
    const res = await request(app).get('/api/meetings');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/meetings — filters by type', async () => {
    const res = await request(app).get('/api/meetings?type=department');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/meetings/:id — gets a meeting by ID', async () => {
    const res = await request(app).get(`/api/meetings/${meetingId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('test-mtg-weekly-sync');
  });

  test('PUT /api/meetings/:id — updates a meeting', async () => {
    const res = await request(app)
      .put(`/api/meetings/${meetingId}`)
      .send({ location: 'Meeting Room B', status: 'in_progress' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Minutes ──────────────────────────────────────────────────
  test('POST /api/meetings/:id/minutes — adds meeting minutes', async () => {
    const res = await request(app)
      .post(`/api/meetings/${meetingId}/minutes`)
      .send({ content: 'Discussed project timeline and deadlines.' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── RSVP ─────────────────────────────────────────────────────
  test('POST /api/meetings/:id/rsvp — sends RSVP', async () => {
    const res = await request(app)
      .post(`/api/meetings/${meetingId}/rsvp`)
      .send({ rsvpStatus: 'accepted' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── Not Found ────────────────────────────────────────────────
  test('GET /api/meetings/:id — returns 404 for non-existent meeting', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/meetings/${fakeId}`);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ── Delete ───────────────────────────────────────────────────
  test('DELETE /api/meetings/:id — deletes a meeting', async () => {
    const res = await request(app).delete(`/api/meetings/${meetingId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
