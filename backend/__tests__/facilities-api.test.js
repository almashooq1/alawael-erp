/**
 * Facilities API — Integration Tests
 * Tests rooms CRUD, bookings with conflict detection, maintenance CRUD, dashboard
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
let Room, RoomBooking, MaintenanceRequest;
let roomId, bookingId, maintenanceId;
const testUserId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const uri =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael';
  if (mongoose.connection.readyState === 0) await mongoose.connect(uri);

  Room = require('../models/Room');
  RoomBooking = require('../models/RoomBooking');
  MaintenanceRequest = require('../models/MaintenanceRequest');
  require('../models/User'); // ensure User model is registered for populate
  const routes = require('../routes/facilities.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { _id: testUserId, role: 'admin', name: 'Test Admin' };
    req.userId = testUserId;
    next();
  });
  app.use('/api/facilities', routes);
});

afterAll(async () => {
  try {
    if (Room) await Room.deleteMany({ name: /^test-fac-/ }).catch(() => {});
    if (RoomBooking) await RoomBooking.deleteMany({ title: /^test-fac-/ }).catch(() => {});
    if (MaintenanceRequest)
      await MaintenanceRequest.deleteMany({ title: /^test-fac-/ }).catch(() => {});
  } finally {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  }
});

describe('Facilities Routes', () => {
  // ── Rooms ────────────────────────────────────────────────────
  test('POST /api/facilities/rooms — creates a room', async () => {
    const res = await request(app)
      .post('/api/facilities/rooms')
      .send({
        name: 'test-fac-room-1',
        type: 'meeting_room',
        building: 'المبنى الرئيسي',
        floor: 2,
        capacity: 20,
        equipment: [{ name: 'بروجكتر', quantity: 1, condition: 'good' }],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.name).toBe('test-fac-room-1');
    expect(res.body.data.type).toBe('meeting_room');
    roomId = res.body.data._id;
  });

  test('GET /api/facilities/rooms — lists rooms', async () => {
    const res = await request(app)
      .get('/api/facilities/rooms')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('GET /api/facilities/rooms/:id — gets room detail', async () => {
    const res = await request(app).get(`/api/facilities/rooms/${roomId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(roomId);
  });

  test('PUT /api/facilities/rooms/:id — updates a room', async () => {
    const res = await request(app)
      .put(`/api/facilities/rooms/${roomId}`)
      .send({ capacity: 30, status: 'available' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.capacity).toBe(30);
  });

  test('DELETE /api/facilities/rooms/:id — deletes a room', async () => {
    const temp = await Room.create({
      name: 'test-fac-room-delete',
      type: 'office',
      building: 'مبنى',
      floor: 1,
      capacity: 5,
    });
    const res = await request(app).delete(`/api/facilities/rooms/${temp._id}`).expect(200);

    expect(res.body.success).toBe(true);
    const check = await Room.findById(temp._id);
    expect(check).toBeNull();
  });

  // ── Bookings ─────────────────────────────────────────────────
  test('POST /api/facilities/bookings — creates a booking', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/facilities/bookings')
      .send({
        room: roomId,
        title: 'test-fac-booking-1',
        bookingDate: dateStr,
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'اجتماع تجريبي',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    bookingId = res.body.data._id;
  });

  test('POST /api/facilities/bookings — rejects conflicting booking', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/facilities/bookings')
      .send({
        room: roomId,
        title: 'test-fac-booking-conflict',
        bookingDate: dateStr,
        startTime: '09:30',
        endTime: '10:30',
        purpose: 'حجز متعارض',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('تعارض');
  });

  test('GET /api/facilities/bookings — lists bookings', async () => {
    const res = await request(app)
      .get('/api/facilities/bookings')
      .query({ room: roomId })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/facilities/bookings/:id — updates a booking', async () => {
    const res = await request(app)
      .put(`/api/facilities/bookings/${bookingId}`)
      .send({ title: 'test-fac-booking-updated', purpose: 'تم التحديث' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('test-fac-booking-updated');
  });

  test('DELETE /api/facilities/bookings/:id — cancels a booking', async () => {
    const res = await request(app).delete(`/api/facilities/bookings/${bookingId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
  });

  // ── Maintenance ──────────────────────────────────────────────
  test('POST /api/facilities/maintenance — creates a request', async () => {
    const res = await request(app)
      .post('/api/facilities/maintenance')
      .send({
        title: 'test-fac-maintenance-1',
        description: 'طلب صيانة تجريبي',
        room: roomId,
        type: 'electrical',
        priority: 'high',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.requestId).toMatch(/^MR-/);
    maintenanceId = res.body.data._id;
  });

  test('GET /api/facilities/maintenance — lists maintenance requests', async () => {
    const res = await request(app)
      .get('/api/facilities/maintenance')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/facilities/maintenance/:id — updates a request', async () => {
    const res = await request(app)
      .put(`/api/facilities/maintenance/${maintenanceId}`)
      .send({ status: 'in_progress', notes: 'تم البدء بالعمل' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('in_progress');
  });

  test('DELETE /api/facilities/maintenance/:id — deletes a request', async () => {
    const temp = await MaintenanceRequest.create({
      title: 'test-fac-maint-delete',
      description: 'حذف تجريبي',
      room: roomId,
      type: 'plumbing',
      requestedBy: testUserId,
    });
    const res = await request(app).delete(`/api/facilities/maintenance/${temp._id}`).expect(200);

    expect(res.body.success).toBe(true);
  });

  // ── Dashboard ────────────────────────────────────────────────
  test('GET /api/facilities/dashboard — returns dashboard data', async () => {
    const res = await request(app).get('/api/facilities/dashboard').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.totalRooms).toBeDefined();
    expect(res.body.data.todayBookings).toBeDefined();
    expect(res.body.data.pendingMaintenance).toBeDefined();
  });
});
