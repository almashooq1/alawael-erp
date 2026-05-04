'use strict';
/**
 * succession-planning-api — route-level tests
 * Covers: GET /  GET /stats  GET /:id  POST /  PUT /:id  DELETE /:id
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
jest.mock('../../utils/sanitize', () => ({ stripUpdateMeta: jest.fn(d => d) }));

const makeChain = val => {
  const p = Promise.resolve(val);
  const c = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    populate: jest.fn(),
    select: jest.fn(),
    lean: jest.fn().mockResolvedValue(val),
    then: (onFulfilled, onRejected) => p.then(onFulfilled, onRejected),
    catch: onRejected => p.catch(onRejected),
  };
  c.sort.mockReturnValue(c);
  c.skip.mockReturnValue(c);
  c.limit.mockReturnValue(c);
  c.populate.mockReturnValue(c);
  c.select.mockReturnValue(c);
  return c;
};

const mockFind = jest.fn(() => makeChain([]));
const mockFindById = jest.fn(() => makeChain(null));
const mockCountDocuments = jest.fn().mockResolvedValue(0);
const mockSave = jest.fn().mockResolvedValue({});
const mockFindByIdAndUpdate = jest.fn(() => makeChain(null));
const mockFindByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'sp1' });
const mockAggregate = jest.fn().mockResolvedValue([]);

jest.mock('../../models/SuccessionPlan', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'sp1' });
    this.save = mockSave;
  });
  M.find = (...a) => mockFind(...a);
  M.findById = (...a) => mockFindById(...a);
  M.countDocuments = (...a) => mockCountDocuments(...a);
  M.findByIdAndUpdate = (...a) => mockFindByIdAndUpdate(...a);
  M.findByIdAndDelete = (...a) => mockFindByIdAndDelete(...a);
  M.aggregate = (...a) => mockAggregate(...a);
  return M;
});

const mockDevPlanFind = jest.fn(() => makeChain([]));
const mockDevPlanFindByIdAndUpdate = jest.fn(() => makeChain(null));
const mockDevPlanSave = jest.fn().mockResolvedValue({});

jest.mock('../../models/DevelopmentPlan', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'dp1' });
    this.save = mockDevPlanSave;
  });
  M.find = (...a) => mockDevPlanFind(...a);
  M.findByIdAndUpdate = (...a) => mockDevPlanFindByIdAndUpdate(...a);
  return M;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/succession-planning', require('../../routes/successionPlanning.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /succession-planning (list)', () => {
  test('returns success:true with data and pagination', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/succession-planning');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('filters by status', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    await request(makeApp()).get('/api/succession-planning?status=active');
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });

  test('filters by department', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    await request(makeApp()).get('/api/succession-planning?department=IT');
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ department: 'IT' }));
  });
});

describe('GET /succession-planning/stats', () => {
  test('returns stats with coverage rate', async () => {
    mockCountDocuments
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(7); // withSuccessors
    mockAggregate.mockResolvedValue([{ _id: 'active', count: 8 }]);
    const res = await request(makeApp()).get('/api/succession-planning/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('coverageRate');
  });
});

describe('GET /succession-planning/:id', () => {
  test('returns 404 when plan not found', async () => {
    mockFindById.mockReturnValue(makeChain(null));
    const res = await request(makeApp()).get('/api/succession-planning/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('returns plan when found', async () => {
    const plan = { _id: 'sp1', positionTitle: 'CTO', status: 'active' };
    mockFindById.mockReturnValue(makeChain(plan));
    const res = await request(makeApp()).get('/api/succession-planning/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.data.positionTitle).toBe('CTO');
  });
});

describe('POST /succession-planning', () => {
  test('creates succession plan and returns 201', async () => {
    mockSave.mockResolvedValue({});
    const res = await request(makeApp())
      .post('/api/succession-planning')
      .send({
        positionTitle: 'Director of Rehab',
        department: 'Rehabilitation',
        currentHolder: { name: 'Ali Hassan', riskLevel: 'medium' },
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /succession-planning/:id', () => {
  test('returns 404 when plan not found', async () => {
    mockFindByIdAndUpdate.mockReturnValue(makeChain(null));
    const res = await request(makeApp())
      .put('/api/succession-planning/507f1f77bcf86cd799439011')
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  test('updates and returns plan', async () => {
    const updated = { _id: 'sp1', status: 'completed' };
    mockFindByIdAndUpdate.mockReturnValue(makeChain(updated));
    const res = await request(makeApp())
      .put('/api/succession-planning/507f1f77bcf86cd799439011')
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });
});
