/**
 * Telehealth Routes — backend integration tests
 *
 * Tests the /api/telehealth endpoints:
 *  - Dashboard & stats
 *  - Session CRUD
 *  - Real-time session control (start, end, vitals, notes, messages)
 *  - AI engagement analysis
 *  - Recordings & reports
 *  - Waiting room
 */

const request = require('supertest');
const express = require('express');

// ── Minimal auth mock ──
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', name: 'Test Therapist', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

// ── Create app with telehealth routes ──
let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const telehealthRouter = require('../routes/telehealth.routes');
  app.use('/api/telehealth', telehealthRouter);
});

// ══════════════════════════════════════════════════════════
//  1. Dashboard & Stats
// ══════════════════════════════════════════════════════════

describe('Telehealth — Dashboard & Stats', () => {
  test('GET /dashboard/overview → returns KPIs', async () => {
    const res = await request(app).get('/api/telehealth/dashboard/overview');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('scheduled');
    expect(res.body.data).toHaveProperty('completed');
    expect(res.body.data).toHaveProperty('completionRate');
    expect(res.body.data).toHaveProperty('platformStats');
    expect(res.body.data).toHaveProperty('departmentStats');
  });

  test('GET /stats → returns quick stats', async () => {
    const res = await request(app).get('/api/telehealth/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.total).toBe('number');
  });
});

// ══════════════════════════════════════════════════════════
//  2. Session CRUD
// ══════════════════════════════════════════════════════════

describe('Telehealth — Session CRUD', () => {
  test('GET /sessions → returns seeded sessions', async () => {
    const res = await request(app).get('/api/telehealth/sessions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('pagination');
  });

  test('GET /sessions?status=completed → filters by status', async () => {
    const res = await request(app).get('/api/telehealth/sessions?status=completed');
    expect(res.status).toBe(200);
    res.body.data.forEach(s => expect(s.status).toBe('completed'));
  });

  test('GET /sessions?search=... → filters by search term', async () => {
    const res = await request(app).get(
      `/api/telehealth/sessions?search=${encodeURIComponent('نطق')}`
    );
    expect(res.status).toBe(200);
    // should match "جلسة نطق وتخاطب"
  });

  let createdId;

  test('POST /sessions → creates a new session', async () => {
    const res = await request(app)
      .post('/api/telehealth/sessions')
      .send({
        title: 'جلسة اختبار',
        patientName: 'مريض اختبار',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        duration: 30,
        platform: 'jitsi',
        department: 'العلاج الطبيعي',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('جلسة اختبار');
    expect(res.body.data.status).toBe('scheduled');
    createdId = res.body.data.id;
  });

  test('POST /sessions → validation: missing title → 400', async () => {
    const res = await request(app)
      .post('/api/telehealth/sessions')
      .send({ patientName: 'x', scheduledDate: new Date().toISOString(), duration: 30 });
    expect(res.status).toBe(400);
  });

  test('GET /sessions/:id → returns session by ID', async () => {
    const res = await request(app).get(`/api/telehealth/sessions/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdId);
  });

  test('GET /sessions/999999 → 404', async () => {
    const res = await request(app).get('/api/telehealth/sessions/999999');
    expect(res.status).toBe(404);
  });

  test('PUT /sessions/:id → updates session', async () => {
    const res = await request(app)
      .put(`/api/telehealth/sessions/${createdId}`)
      .send({ title: 'جلسة محدثة', duration: 45 });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('جلسة محدثة');
    expect(res.body.data.duration).toBe(45);
  });

  test('PATCH /sessions/:id/status → changes status', async () => {
    const res = await request(app)
      .patch(`/api/telehealth/sessions/${createdId}/status`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data).toHaveProperty('cancelledAt');
  });

  test('PATCH /sessions/:id/status → invalid status → 400', async () => {
    const res = await request(app)
      .patch(`/api/telehealth/sessions/${createdId}/status`)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('DELETE /sessions/:id → deletes session', async () => {
    const res = await request(app).delete(`/api/telehealth/sessions/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app).get(`/api/telehealth/sessions/${createdId}`);
    expect(check.status).toBe(404);
  });

  test('DELETE /sessions/999999 → 404', async () => {
    const res = await request(app).delete('/api/telehealth/sessions/999999');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  3. Real-time Session Control
// ══════════════════════════════════════════════════════════

describe('Telehealth — Real-time Control', () => {
  let sessionId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/telehealth/sessions')
      .send({
        title: 'جلسة بدء/إيقاف',
        patientName: 'مريض',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        duration: 20,
      });
    sessionId = res.body.data.id;
  });

  test('POST /sessions/:id/start → starts session & generates room', async () => {
    const res = await request(app).post(`/api/telehealth/sessions/${sessionId}/start`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.status).toBe('in-progress');
    expect(res.body.data.room).toHaveProperty('joinUrl');
    expect(res.body.data.room).toHaveProperty('roomId');
  });

  test('POST /sessions/:id/start → already started → 400', async () => {
    const res = await request(app).post(`/api/telehealth/sessions/${sessionId}/start`);
    expect(res.status).toBe(400);
  });

  test('POST /sessions/:id/vitals → records vital signs', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${sessionId}/vitals`)
      .send({ heartRate: 72, bloodPressure: '120/80', oxygenSaturation: 98, temperature: 36.6 });
    expect(res.status).toBe(200);
    expect(res.body.data.vital.heartRate).toBe(72);
  });

  test('POST /sessions/:id/notes → adds session note', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${sessionId}/notes`)
      .send({ content: 'المريض يظهر تحسناً ملحوظاً' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('المريض يظهر تحسناً ملحوظاً');
  });

  test('POST /sessions/:id/notes → empty content → 400', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${sessionId}/notes`)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  test('POST /sessions/:id/messages → sends message', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${sessionId}/messages`)
      .send({ content: 'مرحباً، كيف حالك اليوم؟' });
    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe('مرحباً، كيف حالك اليوم؟');
  });

  test('POST /sessions/:id/rating → rates session', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${sessionId}/rating`)
      .send({ rating: 5, comment: 'ممتاز' });
    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(5);
  });

  test('POST /sessions/:id/rating → invalid → 400', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${sessionId}/rating`)
      .send({ rating: 10 });
    expect(res.status).toBe(400);
  });

  test('POST /sessions/:id/end → ends session', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${sessionId}/end`)
      .send({ rating: 4, notes: 'جلسة ناجحة' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data).toHaveProperty('completedAt');
  });
});

// ══════════════════════════════════════════════════════════
//  4. AI & Reports
// ══════════════════════════════════════════════════════════

describe('Telehealth — AI & Reports', () => {
  let completedId;

  beforeAll(async () => {
    // Create + complete a session
    const create = await request(app).post('/api/telehealth/sessions').send({
      title: 'جلسة تقرير',
      patientName: 'مريض تقرير',
      scheduledDate: new Date().toISOString(),
      duration: 30,
    });
    completedId = create.body.data.id;
    // Start it
    await request(app).post(`/api/telehealth/sessions/${completedId}/start`);
    // Add a note
    await request(app)
      .post(`/api/telehealth/sessions/${completedId}/notes`)
      .send({ content: 'ملاحظة للتقرير' });
    // End it
    await request(app).post(`/api/telehealth/sessions/${completedId}/end`);
  });

  test('POST /sessions/:id/analyze-engagement → returns AI analysis', async () => {
    const res = await request(app)
      .post(`/api/telehealth/sessions/${completedId}/analyze-engagement`)
      .send({ metrics: {} });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('attentionScore');
    expect(res.body.data).toHaveProperty('engagementLevel');
    expect(res.body.data).toHaveProperty('insights');
  });

  test('GET /sessions/:id/report → returns session report', async () => {
    const res = await request(app).get(`/api/telehealth/sessions/${completedId}/report`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('title');
    expect(res.body.data).toHaveProperty('patientName');
    expect(res.body.data).toHaveProperty('notes');
    expect(res.body.data).toHaveProperty('status', 'completed');
  });

  test('GET /sessions/:id/recording → returns recording info', async () => {
    const res = await request(app).get(`/api/telehealth/sessions/${completedId}/recording`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('available', true);
  });

  test('GET /sessions/999999/report → 404', async () => {
    const res = await request(app).get('/api/telehealth/sessions/999999/report');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  5. Waiting Room
// ══════════════════════════════════════════════════════════

describe('Telehealth — Waiting Room', () => {
  test('GET /waiting-room → returns today queue', async () => {
    const res = await request(app).get('/api/telehealth/waiting-room');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('count');
  });
});

// ══════════════════════════════════════════════════════════
//  6. Pagination
// ══════════════════════════════════════════════════════════

describe('Telehealth — Pagination', () => {
  test('GET /sessions?page=1&limit=2 → paginated results', async () => {
    const res = await request(app).get('/api/telehealth/sessions?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });
});
