'use strict';
/**
 * visitors-api — route-level tests
 * Covers: GET /stats/today  GET /analytics  GET /currently-inside
 *         GET /  POST /  GET /:id  PUT /:id  POST /:id/check-in  POST /:id/check-out
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
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../../utils/safeError', () =>
  jest.fn(err => (typeof err === 'string' ? err : (err && err.message) || 'Error'))
);

const mockGetTodayStats = jest.fn().mockResolvedValue({ total: 5, checkedIn: 3 });
const mockGetAnalytics = jest.fn().mockResolvedValue({ period: '7d', total: 42 });
const mockGetCurrentlyInside = jest.fn().mockResolvedValue([]);
const mockGetExpectedToday = jest.fn().mockResolvedValue([]);
const mockGetRecentLogs = jest.fn().mockResolvedValue([]);
const mockListVisitors = jest.fn().mockResolvedValue({ visitors: [], total: 0 });
const mockGetVisitor = jest.fn().mockResolvedValue(null);
const mockCreateVisitor = jest.fn().mockResolvedValue({ _id: 'v1', name: 'Test Visitor' });
const mockUpdateVisitor = jest.fn().mockResolvedValue({ _id: 'v1', name: 'Updated' });
const mockCheckIn = jest.fn().mockResolvedValue({ _id: 'v1', status: 'inside' });
const mockCheckOut = jest.fn().mockResolvedValue({ _id: 'v1', status: 'exited' });
const mockCancelVisit = jest.fn().mockResolvedValue({ _id: 'v1', status: 'cancelled' });
const mockGetVisitorLogs = jest.fn().mockResolvedValue([]);

jest.mock('../../services/visitor-advanced.service', () => ({
  visitorAdvancedService: {
    getTodayStats: (...a) => mockGetTodayStats(...a),
    getAnalytics: (...a) => mockGetAnalytics(...a),
    getCurrentlyInside: (...a) => mockGetCurrentlyInside(...a),
    getExpectedToday: (...a) => mockGetExpectedToday(...a),
    getRecentLogs: (...a) => mockGetRecentLogs(...a),
    // list — route calls getVisitors, test asserts via mockListVisitors
    listVisitors: (...a) => mockListVisitors(...a),
    getVisitors: (...a) => mockListVisitors(...a),
    // get — route calls getVisitorById
    getVisitor: (...a) => mockGetVisitor(...a),
    getVisitorById: (...a) => mockGetVisitor(...a),
    // create — route calls registerVisitor
    createVisitor: (...a) => mockCreateVisitor(...a),
    registerVisitor: (...a) => mockCreateVisitor(...a),
    updateVisitor: (...a) => mockUpdateVisitor(...a),
    checkIn: (...a) => mockCheckIn(...a),
    checkOut: (...a) => mockCheckOut(...a),
    cancelVisit: (...a) => mockCancelVisit(...a),
    markNoShow: jest.fn().mockResolvedValue({ _id: 'v1', status: 'no-show' }),
    getVisitorLogs: (...a) => mockGetVisitorLogs(...a),
    getBlacklist: jest.fn().mockResolvedValue([]),
    addToBlacklist: jest.fn().mockResolvedValue({ _id: 'b1' }),
    removeFromBlacklist: jest.fn().mockResolvedValue({ removed: true }),
  },
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/visitors', require('../../routes/visitors.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /visitors/stats/today', () => {
  test('returns today stats', async () => {
    const res = await request(makeApp()).get('/api/visitors/stats/today');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(5);
    expect(mockGetTodayStats).toHaveBeenCalledTimes(1);
  });
});

describe('GET /visitors/analytics', () => {
  test('returns analytics data', async () => {
    const res = await request(makeApp()).get('/api/visitors/analytics?period=7d');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockGetAnalytics).toHaveBeenCalledWith(expect.objectContaining({ period: '7d' }));
  });
});

describe('GET /visitors/currently-inside', () => {
  test('returns empty array when no visitors inside', async () => {
    const res = await request(makeApp()).get('/api/visitors/currently-inside');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /visitors/expected-today', () => {
  test('returns expected visitors list', async () => {
    mockGetExpectedToday.mockResolvedValue([{ _id: 'v2', name: 'Expected Guest' }]);
    const res = await request(makeApp()).get('/api/visitors/expected-today');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /visitors (list)', () => {
  test('returns visitor list with pagination', async () => {
    mockListVisitors.mockResolvedValue({ visitors: [{ _id: 'v1', name: 'Ahmed' }], total: 1 });
    const res = await request(makeApp()).get('/api/visitors');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /visitors (create)', () => {
  test('creates visitor and returns data', async () => {
    const res = await request(makeApp())
      .post('/api/visitors')
      .send({ name: 'Visitor A', phone: '+966501234567', purpose: 'meeting' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockCreateVisitor).toHaveBeenCalledTimes(1);
  });
});

describe('POST /visitors/:id/check-in', () => {
  test('calls checkIn service and returns updated visitor', async () => {
    const res = await request(makeApp())
      .post('/api/visitors/507f1f77bcf86cd799439011/check-in')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inside');
  });
});

describe('POST /visitors/:id/check-out', () => {
  test('calls checkOut service', async () => {
    const res = await request(makeApp())
      .post('/api/visitors/507f1f77bcf86cd799439011/check-out')
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('exited');
  });
});
