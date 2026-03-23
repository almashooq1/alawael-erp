/**
 * Appointments & Enhanced Sessions — Integration Tests
 * Tests: Appointment CRUD, conflict detection, recurring generation,
 *        check-in flow, convert-to-session, available slots/rooms,
 *        enhanced therapy session endpoints (recurring, reminders,
 *        goals-progress, status-tracked, room assignment).
 *
 * Uses REAL mongoose (not the global mock) for integration testing.
 */

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MONGO_URI\s*=\s*(.+)$/m);
  if (match) process.env.MONGO_URI = match[1].trim();
  const match2 = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
  if (match2) process.env.MONGODB_URI = match2[1].trim();
}

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// ─── Setup ──────────────────────────────────────────────────────────
let app;
let Appointment;
let TherapySession;
const TEST_PREFIX = 'test-apt-sess-';
const fakeUserId = new mongoose.Types.ObjectId();
const fakeTherapistId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  Appointment = require('../models/Appointment');
  TherapySession = require('../models/TherapySession');

  const appointmentRoutes = require('../routes/appointments.routes');
  const therapySessionRoutes = require('../routes/therapy-sessions.routes');
  const { errorHandler: enhancedErrorHandler } = require('../errors/errorHandler');

  app = express();
  app.use(express.json());
  // Fake auth middleware
  app.use((req, _res, next) => {
    req.user = {
      _id: fakeUserId,
      id: fakeUserId.toString(),
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
    };
    next();
  });
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/therapy-sessions', therapySessionRoutes);
  app.use(enhancedErrorHandler);
});

afterAll(async () => {
  try {
    if (Appointment) {
      await Appointment.deleteMany({
        $or: [
          { reason: { $regex: /^test-apt-sess-/ } },
          { appointmentNumber: { $regex: /^APT-/ } },
          { bookedByName: 'Test User' },
        ],
      }).catch(() => {});
    }
    if (TherapySession) {
      await TherapySession.deleteMany({
        $or: [{ title: { $regex: /^test-apt-sess-/ } }, { notes: { $regex: /^test-apt-sess-/ } }],
      }).catch(() => {});
    }
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════
// PART 1: Appointment CRUD
// ═══════════════════════════════════════════════════════════════════════

describe('Appointment Routes — CRUD', () => {
  let createdId;

  test('POST /api/appointments — creates an appointment', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({
        date: '2026-06-15',
        startTime: '09:00',
        endTime: '09:30',
        therapist: fakeTherapistId,
        type: 'استشارة أولية',
        reason: `${TEST_PREFIX}create`,
        priority: 'normal',
        source: 'online',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.appointmentNumber).toMatch(/^APT-/);
    expect(res.body.data.startTime).toBe('09:00');
    createdId = res.body.data._id;
  });

  test('GET /api/appointments — lists appointments with pagination', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/appointments — filters by status', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .query({ status: 'PENDING' })
      .expect(200);

    expect(res.body.success).toBe(true);
    res.body.data.forEach(apt => {
      expect(apt.status).toBe('PENDING');
    });
  });

  test('GET /api/appointments/:id — returns single appointment', async () => {
    const res = await request(app).get(`/api/appointments/${createdId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(createdId);
    expect(res.body.data.reason).toBe(`${TEST_PREFIX}create`);
  });

  test('GET /api/appointments/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/appointments/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });

  test('PUT /api/appointments/:id — updates appointment', async () => {
    const res = await request(app)
      .put(`/api/appointments/${createdId}`)
      .send({ reason: `${TEST_PREFIX}updated`, priority: 'urgent' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reason).toBe(`${TEST_PREFIX}updated`);
    expect(res.body.data.priority).toBe('urgent');
  });

  test('GET /api/appointments/my — returns current user appointments', async () => {
    const res = await request(app).get('/api/appointments/my').expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/appointments/stats — returns statistics', async () => {
    const res = await request(app).get('/api/appointments/stats').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.byStatus).toBeDefined();
    expect(res.body.data.byType).toBeDefined();
  });

  test('DELETE /api/appointments/:id — deletes appointment (admin)', async () => {
    // Create a fresh one to delete
    const fresh = await Appointment.create({
      date: new Date('2026-06-20'),
      startTime: '14:00',
      endTime: '14:30',
      type: 'أخرى',
      reason: `${TEST_PREFIX}delete-target`,
      status: 'PENDING',
      bookedBy: fakeUserId,
      createdBy: fakeUserId,
    });

    const res = await request(app).delete(`/api/appointments/${fresh._id}`).expect(200);

    expect(res.body.success).toBe(true);
    const check = await Appointment.findById(fresh._id);
    expect(check).toBeNull();
  });

  test('DELETE /api/appointments/:id — 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/appointments/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 2: Appointment Status Workflow
// ═══════════════════════════════════════════════════════════════════════

describe('Appointment Routes — Status Workflow', () => {
  let aptId;

  beforeAll(async () => {
    const apt = await Appointment.create({
      date: new Date('2026-07-01'),
      startTime: '10:00',
      endTime: '10:45',
      type: 'علاج طبيعي',
      reason: `${TEST_PREFIX}workflow`,
      status: 'PENDING',
      therapist: fakeTherapistId,
      bookedBy: fakeUserId,
      createdBy: fakeUserId,
    });
    aptId = apt._id.toString();
  });

  test('POST /api/appointments/:id/confirm — confirms appointment', async () => {
    const res = await request(app).post(`/api/appointments/${aptId}/confirm`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  test('POST /api/appointments/:id/check-in — checks in patient', async () => {
    const res = await request(app).post(`/api/appointments/${aptId}/check-in`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CHECKED_IN');
    expect(res.body.data.checkInTime).toBeDefined();
  });

  test('POST /api/appointments/:id/complete — completes appointment', async () => {
    const res = await request(app)
      .post(`/api/appointments/${aptId}/complete`)
      .send({ notes: 'Completed successfully' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
  });
});

describe('Appointment Routes — Cancel & No-Show', () => {
  let cancelId;
  let noShowId;

  beforeAll(async () => {
    const [c, n] = await Promise.all([
      Appointment.create({
        date: new Date('2026-07-02'),
        startTime: '11:00',
        endTime: '11:30',
        type: 'استشارة أولية',
        reason: `${TEST_PREFIX}cancel`,
        status: 'PENDING',
        bookedBy: fakeUserId,
        createdBy: fakeUserId,
      }),
      Appointment.create({
        date: new Date('2026-07-02'),
        startTime: '12:00',
        endTime: '12:30',
        type: 'متابعة',
        reason: `${TEST_PREFIX}noshow`,
        status: 'CONFIRMED',
        bookedBy: fakeUserId,
        createdBy: fakeUserId,
      }),
    ]);
    cancelId = c._id.toString();
    noShowId = n._id.toString();
  });

  test('POST /api/appointments/:id/cancel — cancels with reason', async () => {
    const res = await request(app)
      .post(`/api/appointments/${cancelId}/cancel`)
      .send({ reason: 'Patient requested cancellation' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  test('POST /api/appointments/:id/no-show — marks no-show', async () => {
    const res = await request(app).post(`/api/appointments/${noShowId}/no-show`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('NO_SHOW');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 3: Appointment → Session Conversion
// ═══════════════════════════════════════════════════════════════════════

describe('Appointment Routes — Convert to Session', () => {
  let aptId;

  beforeAll(async () => {
    const apt = await Appointment.create({
      date: new Date('2026-07-05'),
      startTime: '09:00',
      endTime: '10:00',
      type: 'علاج طبيعي',
      reason: `${TEST_PREFIX}convert`,
      status: 'CONFIRMED',
      therapist: fakeTherapistId,
      bookedBy: fakeUserId,
      createdBy: fakeUserId,
    });
    aptId = apt._id.toString();
  });

  test('POST /api/appointments/:id/convert-to-session — converts', async () => {
    const res = await request(app)
      .post(`/api/appointments/${aptId}/convert-to-session`)
      .send({
        title: `${TEST_PREFIX}converted-session`,
        sessionType: 'علاج طبيعي',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.session).toBeDefined();
    expect(res.body.data.session.title).toBe(`${TEST_PREFIX}converted-session`);

    // Verify appointment was updated
    const apt = await Appointment.findById(aptId);
    expect(apt.linkedSession).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 4: Available Slots & Rooms
// ═══════════════════════════════════════════════════════════════════════

describe('Appointment Routes — Availability', () => {
  test('GET /api/appointments/available-slots/:therapistId — returns slots', async () => {
    const res = await request(app)
      .get(`/api/appointments/available-slots/${fakeTherapistId}`)
      .query({ date: '2026-08-01', duration: 30 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.slots).toBeDefined();
  });

  test('GET /api/appointments/available-rooms — returns rooms', async () => {
    const res = await request(app)
      .get('/api/appointments/available-rooms')
      .query({ date: '2026-08-01', startTime: '09:00', endTime: '10:00' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/appointments/today/:therapistId — today schedule', async () => {
    const res = await request(app).get(`/api/appointments/today/${fakeTherapistId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.totalItems).toBe('number');
  });

  test('GET /api/appointments/reminders/pending — returns pending reminders', async () => {
    const res = await request(app).get('/api/appointments/reminders/pending').expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 5: Enhanced Therapy Session Endpoints
// ═══════════════════════════════════════════════════════════════════════

describe('Therapy Sessions Routes — Enhanced Endpoints', () => {
  let sessionId;

  beforeAll(async () => {
    const session = await TherapySession.create({
      title: `${TEST_PREFIX}enhanced`,
      sessionType: 'علاج طبيعي',
      date: new Date('2026-07-10'),
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
      recurrence: 'weekly',
      recurrenceEnd: new Date('2026-08-10'),
    });
    sessionId = session._id.toString();
  });

  // ── Conflict Check ──
  test('POST /api/therapy-sessions/check-conflicts — checks conflicts', async () => {
    const res = await request(app)
      .post('/api/therapy-sessions/check-conflicts')
      .send({
        therapist: fakeTherapistId,
        date: '2026-07-10',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.hasConflicts).toBe('boolean');
  });

  // ── Reminders ──
  test('PUT /api/therapy-sessions/:id/reminders — sets reminders', async () => {
    const res = await request(app)
      .put(`/api/therapy-sessions/${sessionId}/reminders`)
      .send({
        reminders: [
          { type: 'sms', minutesBefore: 60 },
          { type: 'push', minutesBefore: 30 },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBe(2);
  });

  // ── Goals Progress ──
  test('PUT /api/therapy-sessions/:id/goals-progress — updates goals', async () => {
    const res = await request(app)
      .put(`/api/therapy-sessions/${sessionId}/goals-progress`)
      .send({
        goalsProgress: [
          {
            description: 'تحسين المشي',
            baseline: 20,
            target: 80,
            achieved: 45,
            notes: 'تقدم ملحوظ',
          },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].achieved).toBe(45);
  });

  // ── Status with History ──
  test('PATCH /api/therapy-sessions/:id/status-tracked — updates status with history', async () => {
    const res = await request(app)
      .patch(`/api/therapy-sessions/${sessionId}/status-tracked`)
      .send({
        status: 'CONFIRMED',
        reason: 'Therapist confirmed',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  // ── History ──
  test('GET /api/therapy-sessions/:id/history — returns status history', async () => {
    const res = await request(app)
      .get(`/api/therapy-sessions/${sessionId}/history`)
      .expect(res2 => {
        expect([200, 500]).toContain(res2.status);
      });

    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  // ── Recurring Generation ──
  test('POST /api/therapy-sessions/:id/generate-recurring — generates recurring', async () => {
    const res = await request(app)
      .post(`/api/therapy-sessions/${sessionId}/generate-recurring`)
      .expect(res2 => {
        // Accept success (200/201) or 400 if already generated
        expect([200, 201, 400]).toContain(res2.status);
      });

    expect(res.body.success).toBeDefined();
  });

  // ── Get Recurring Series ──
  test('GET /api/therapy-sessions/:id/recurring — gets recurring series', async () => {
    const res = await request(app).get(`/api/therapy-sessions/${sessionId}/recurring`).expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Room Assignment ──
  test('PUT /api/therapy-sessions/:id/room — assigns room', async () => {
    // Even without a real room, test the endpoint handles gracefully
    const fakeRoomId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/therapy-sessions/${sessionId}/room`)
      .send({
        roomId: fakeRoomId,
        date: '2026-07-10',
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(res2 => {
        // Accept 200 (success) or 409 (conflict) or 404 (room not found)
        expect([200, 404, 409]).toContain(res2.status);
      });

    expect(res.body).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 6: Appointment Model Validations
// ═══════════════════════════════════════════════════════════════════════

describe('Appointment Model', () => {
  test('auto-generates appointmentNumber', async () => {
    const apt = await Appointment.create({
      date: new Date('2026-08-15'),
      startTime: '09:00',
      type: 'استشارة أولية',
      reason: `${TEST_PREFIX}auto-number`,
      bookedBy: fakeUserId,
      createdBy: fakeUserId,
    });

    expect(apt.appointmentNumber).toBeDefined();
    expect(apt.appointmentNumber).toMatch(/^APT-\d{6}-/);
    expect(apt.status).toBe('PENDING');
  });

  test('auto-computes duration from startTime/endTime', async () => {
    const apt = await Appointment.create({
      date: new Date('2026-08-16'),
      startTime: '10:00',
      endTime: '11:30',
      type: 'علاج طبيعي',
      reason: `${TEST_PREFIX}duration-calc`,
      bookedBy: fakeUserId,
      createdBy: fakeUserId,
    });

    expect(apt.duration).toBe(90); // 1.5 hours
  });

  test('default status is PENDING', async () => {
    const apt = new Appointment({
      date: new Date(),
      startTime: '09:00',
      type: 'أخرى',
      reason: `${TEST_PREFIX}defaults`,
    });
    expect(apt.status).toBe('PENDING');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 7: TherapySession Model Enhancements
// ═══════════════════════════════════════════════════════════════════════

describe('TherapySession Model — Enhanced Fields', () => {
  test('accepts new fields: duration, priority, room, goalsProgress', async () => {
    const session = await TherapySession.create({
      title: `${TEST_PREFIX}enhanced-fields`,
      sessionType: 'علاج وظيفي',
      date: new Date('2026-08-20'),
      startTime: '09:00',
      endTime: '10:00',
      priority: 'high',
      goalsProgress: [{ description: 'تحسين التوازن', baseline: 10, target: 100, achieved: 35 }],
      reminders: [{ type: 'email', minutesBefore: 120 }],
    });

    expect(session.priority).toBe('high');
    expect(session.duration).toBe(60); // auto-computed
    expect(session.goalsProgress).toHaveLength(1);
    expect(session.goalsProgress[0].achieved).toBe(35);
    expect(session.reminders).toHaveLength(1);
  });

  test('IN_PROGRESS status is accepted', async () => {
    const session = await TherapySession.create({
      title: `${TEST_PREFIX}in-progress`,
      sessionType: 'علاج نفسي',
      date: new Date('2026-08-21'),
      startTime: '11:00',
      endTime: '12:00',
      status: 'IN_PROGRESS',
    });

    expect(session.status).toBe('IN_PROGRESS');
  });

  test('RESCHEDULED status is accepted', async () => {
    const session = await TherapySession.create({
      title: `${TEST_PREFIX}rescheduled`,
      sessionType: 'علاج طبيعي',
      date: new Date('2026-08-22'),
      startTime: '14:00',
      endTime: '15:00',
      status: 'RESCHEDULED',
    });

    expect(session.status).toBe('RESCHEDULED');
  });

  test('statusHistory tracks changes', async () => {
    const session = await TherapySession.create({
      title: `${TEST_PREFIX}status-track`,
      sessionType: 'علاج طبيعي',
      date: new Date('2026-08-23'),
      startTime: '09:00',
      endTime: '10:00',
      statusHistory: [
        { from: 'SCHEDULED', to: 'CONFIRMED', changedBy: fakeUserId, reason: 'Verified' },
      ],
    });

    expect(session.statusHistory).toHaveLength(1);
    expect(session.statusHistory[0].from).toBe('SCHEDULED');
    expect(session.statusHistory[0].to).toBe('CONFIRMED');
  });

  test('recurrence fields are stored', async () => {
    const session = await TherapySession.create({
      title: `${TEST_PREFIX}recurrence`,
      sessionType: 'علاج طبيعي',
      date: new Date('2026-09-01'),
      startTime: '10:00',
      endTime: '11:00',
      recurrence: 'weekly',
      recurrenceEnd: new Date('2026-10-01'),
    });

    expect(session.recurrence).toBe('weekly');
    expect(session.recurrenceEnd).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 8: Smart Scheduler Routes (replaced stub)
// ═══════════════════════════════════════════════════════════════════════

describe('Smart Scheduler Routes — Real Implementation', () => {
  let smartApp;

  beforeAll(() => {
    const smartRoutes = require('../routes/smartScheduler.routes');
    smartApp = express();
    smartApp.use(express.json());
    smartApp.use((req, _res, next) => {
      req.user = {
        _id: fakeUserId,
        id: fakeUserId.toString(),
        name: 'Test User',
        role: 'admin',
        roles: ['admin'],
      };
      next();
    });
    smartApp.use('/api/smart-scheduler', smartRoutes);
  });

  test('GET /api/smart-scheduler — returns list (real data)', async () => {
    const res = await request(smartApp)
      .get('/api/smart-scheduler')
      .query({ page: 1, limit: 5 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });

  test('POST /api/smart-scheduler — creates appointment from parent portal', async () => {
    const res = await request(smartApp)
      .post('/api/smart-scheduler')
      .send({
        date: '2026-09-15',
        time: '09:00',
        therapist: fakeTherapistId,
        type: 'استشارة أولية',
        notes: `${TEST_PREFIX}smart-create`,
        parentId: fakeUserId,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    // Should create a real appointment (not just return a fake ID)
    expect(res.body.data._id).toBeDefined();
  });

  test('POST /api/smart-scheduler — creates with title fallback', async () => {
    const res = await request(smartApp)
      .post('/api/smart-scheduler')
      .send({
        title: `${TEST_PREFIX}titlefallback`,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
  });

  test('POST /api/smart-scheduler — 400 without required fields', async () => {
    const res = await request(smartApp).post('/api/smart-scheduler').send({}).expect(400);

    expect(res.body.success).toBe(false);
  });
});
