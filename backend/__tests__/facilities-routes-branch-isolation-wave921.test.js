'use strict';

/**
 * facilities-routes-branch-isolation-wave921.test.js — W921.
 *
 * Facilities routes previously used global findById/find/count paths for
 * rooms, bookings, maintenance, and dashboard counters.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(role)) return next();
    return res.status(403).json({ success: false });
  },
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const managerA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let Room;
let RoomBooking;
let MaintenanceRequest;
let app;

function roomDoc(branchId, suffix, status = 'available') {
  return {
    branchId,
    code: `R-${suffix}`,
    nameAr: `غرفة ${suffix}`,
    type: 'therapy',
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function bookingDoc(roomId, suffix, status = 'confirmed') {
  return {
    room: roomId,
    title: `Booking ${suffix}`,
    bookingDate: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    status,
    bookedBy: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function maintenanceDoc(branchId, suffix, status = 'new', roomId = null) {
  return {
    requestId: `MR-${suffix}`,
    title: `Maintenance ${suffix}`,
    description: 'Issue',
    status,
    branchId,
    room: roomId || undefined,
    createdBy: new mongoose.Types.ObjectId(),
    requestedBy: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w921-facilities' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  if (!mongoose.models.User) {
    mongoose.model(
      'User',
      new mongoose.Schema({
        name: String,
        email: String,
        branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
      })
    );
  }

  Room = require('../models/Room');
  RoomBooking = require('../models/RoomBooking');
  MaintenanceRequest = require('../models/MaintenanceRequest');
  await Promise.all([Room.init(), RoomBooking.init(), MaintenanceRequest.init()]);

  const appExpress = express();
  appExpress.use(express.json());
  appExpress.use('/api/v1/facilities', require('../routes/facilities.routes'));
  app = appExpress;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await Promise.all([
    Room.deleteMany({}),
    RoomBooking.deleteMany({}),
    MaintenanceRequest.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W921 — facilities routes branch isolation', () => {
  it('lists only in-scope rooms', async () => {
    await Room.collection.insertMany([roomDoc(BRANCH_A, 'A9211'), roomDoc(BRANCH_B, 'B9211')]);
    const res = await request(app).get('/api/v1/facilities/rooms');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch room GET /rooms/:id', async () => {
    const { insertedId } = await Room.collection.insertOne(roomDoc(BRANCH_B, 'B9212'));
    const res = await request(app).get(`/api/v1/facilities/rooms/${insertedId}`);
    expect(res.status).toBe(404);
  });

  it('lists bookings only for rooms in caller branch', async () => {
    const roomA = await Room.collection.insertOne(roomDoc(BRANCH_A, 'A9213'));
    const roomB = await Room.collection.insertOne(roomDoc(BRANCH_B, 'B9213'));
    await RoomBooking.collection.insertMany([
      bookingDoc(roomA.insertedId, 'A9213'),
      bookingDoc(roomB.insertedId, 'B9213'),
    ]);

    const res = await request(app).get('/api/v1/facilities/bookings');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].room._id)).toBe(String(roomA.insertedId));
  });

  it('returns 404 for foreign-branch booking PUT /bookings/:id', async () => {
    const roomB = await Room.collection.insertOne(roomDoc(BRANCH_B, 'B9214'));
    const bookingB = await RoomBooking.collection.insertOne(bookingDoc(roomB.insertedId, 'B9214'));

    const res = await request(app)
      .put(`/api/v1/facilities/bookings/${bookingB.insertedId}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(404);
  });

  it('scopes maintenance list by branch', async () => {
    await MaintenanceRequest.collection.insertMany([
      maintenanceDoc(BRANCH_A, 'A9215'),
      maintenanceDoc(BRANCH_B, 'B9215'),
    ]);

    const res = await request(app).get('/api/v1/facilities/maintenance');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('scopes dashboard counters to caller branch', async () => {
    const roomA1 = await Room.collection.insertOne(roomDoc(BRANCH_A, 'A9216-1', 'available'));
    const roomA2 = await Room.collection.insertOne(roomDoc(BRANCH_A, 'A9216-2', 'occupied'));
    const roomB = await Room.collection.insertOne(roomDoc(BRANCH_B, 'B9216', 'occupied'));
    await RoomBooking.collection.insertMany([
      bookingDoc(roomA1.insertedId, 'A9216', 'confirmed'),
      bookingDoc(roomB.insertedId, 'B9216', 'confirmed'),
    ]);
    await MaintenanceRequest.collection.insertMany([
      maintenanceDoc(BRANCH_A, 'A9216', 'new', roomA2.insertedId),
      maintenanceDoc(BRANCH_B, 'B9216', 'new', roomB.insertedId),
    ]);

    const res = await request(app).get('/api/v1/facilities/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.totalRooms).toBe(2);
    expect(res.body.data.occupiedRooms).toBe(1);
    expect(res.body.data.todayBookings).toBe(1);
    expect(res.body.data.pendingMaintenance).toBe(1);
  });

  it('rejects foreign room on booking creation', async () => {
    const roomB = await Room.collection.insertOne(roomDoc(BRANCH_B, 'B9217'));

    const res = await request(app)
      .post('/api/v1/facilities/bookings')
      .send({
        room: String(roomB.insertedId),
        title: 'Foreign room booking',
        bookingDate: new Date().toISOString(),
        startTime: '11:00',
        endTime: '12:00',
      });
    expect(res.status).toBe(404);
  });

  it('stamps caller branchId on maintenance creation', async () => {
    const roomA = await Room.collection.insertOne(roomDoc(BRANCH_A, 'A9218'));
    const res = await request(app)
      .post('/api/v1/facilities/maintenance')
      .send({
        room: String(roomA.insertedId),
        title: 'Scoped maintenance',
        description: 'Leak',
      });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});
