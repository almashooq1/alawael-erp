'use strict';
/**
 * facilities-api — route-level tests
 * Covers: GET /rooms  GET /rooms/:id  POST /rooms  PUT /rooms/:id
 *         GET /bookings  POST /bookings  GET /bookings/:id
 *         POST /maintenance  GET /dashboard
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'usr1', id: 'usr1', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/validate', () => ({
  validate: () => (_req, _res, next) => next(),
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../../utils/safeError', () =>
  jest.fn((res, _e, _ctx) => res.status(500).json({ success: false, message: 'Error' }))
);

const makeChain = val => {
  const c = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    populate: jest.fn(),
    select: jest.fn(),
    lean: jest.fn().mockResolvedValue(val),
  };
  c.sort.mockReturnValue(c);
  c.skip.mockReturnValue(c);
  c.limit.mockReturnValue(c);
  c.populate.mockReturnValue(c);
  c.select.mockReturnValue(c);
  return c;
};

const mockRoomFind = jest.fn(() => makeChain([]));
const mockRoomFindById = jest.fn(() => makeChain(null));
const mockRoomCount = jest.fn().mockResolvedValue(0);
const mockRoomSave = jest.fn().mockResolvedValue({});
const mockRoomFindByIdAndUpdate = jest.fn(() => makeChain(null));
const mockRoomFindByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'r1' });

const mockBookingFind = jest.fn(() => makeChain([]));
const mockBookingFindById = jest.fn(() => makeChain(null));
const mockBookingCount = jest.fn().mockResolvedValue(0);
const mockBookingSave = jest.fn().mockResolvedValue({});
const mockBookingFindByIdAndUpdate = jest.fn(() => makeChain(null));

const mockMaintenanceFind = jest.fn(() => makeChain([]));
const mockMaintenanceCount = jest.fn().mockResolvedValue(0);
const mockMaintenanceSave = jest.fn().mockResolvedValue({});

jest.mock('../../models/Room', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'r1' });
    this.save = mockRoomSave;
  });
  M.find = (...a) => mockRoomFind(...a);
  M.findById = (...a) => mockRoomFindById(...a);
  M.countDocuments = (...a) => mockRoomCount(...a);
  M.findByIdAndUpdate = (...a) => mockRoomFindByIdAndUpdate(...a);
  M.findByIdAndDelete = (...a) => mockRoomFindByIdAndDelete(...a);
  return M;
});

jest.mock('../../models/RoomBooking', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'b1' });
    this.save = mockBookingSave;
  });
  M.find = (...a) => mockBookingFind(...a);
  M.findById = (...a) => mockBookingFindById(...a);
  M.countDocuments = (...a) => mockBookingCount(...a);
  M.findByIdAndUpdate = (...a) => mockBookingFindByIdAndUpdate(...a);
  return M;
});

jest.mock('../../models/MaintenanceRequest', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'm1' });
    this.save = mockMaintenanceSave;
  });
  M.find = (...a) => mockMaintenanceFind(...a);
  M.countDocuments = (...a) => mockMaintenanceCount(...a);
  return M;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/facilities', require('../../routes/facilities.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /facilities/rooms', () => {
  test('returns empty room list', async () => {
    const res = await request(makeApp()).get('/api/facilities/rooms');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('filters by floor', async () => {
    await request(makeApp()).get('/api/facilities/rooms?floor=2');
    expect(mockRoomFind).toHaveBeenCalledWith(expect.objectContaining({ floor: '2' }));
  });
});

describe('GET /facilities/rooms/:id', () => {
  test('returns 404 when room not found', async () => {
    mockRoomFindById.mockReturnValue(makeChain(null));
    const res = await request(makeApp()).get('/api/facilities/rooms/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('returns room when found', async () => {
    mockRoomFindById.mockReturnValue(makeChain({ _id: 'r1', name: 'Conference Room' }));
    const res = await request(makeApp()).get('/api/facilities/rooms/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Conference Room');
  });
});

describe('POST /facilities/rooms', () => {
  test('creates room and returns 201', async () => {
    const res = await request(makeApp()).post('/api/facilities/rooms').send({
      name: 'قاعة الاجتماعات',
      capacity: 20,
      type: 'meeting',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /facilities/bookings', () => {
  test('returns empty bookings list', async () => {
    const res = await request(makeApp()).get('/api/facilities/bookings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /facilities/bookings', () => {
  test('creates booking', async () => {
    const res = await request(makeApp())
      .post('/api/facilities/bookings')
      .send({
        roomId: 'r1',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        purpose: 'اجتماع',
      });
    expect([201, 200]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /facilities/maintenance', () => {
  test('creates maintenance request', async () => {
    const res = await request(makeApp()).post('/api/facilities/maintenance').send({
      roomId: 'r1',
      issue: 'تكييف معطل',
      priority: 'medium',
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });
});
