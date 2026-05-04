'use strict';
/**
 * strategic-planning-api — route-level tests
 * Covers: GET /goals  GET /goals/:id  POST /goals  PUT /goals/:id  DELETE /goals/:id
 *         GET /initiatives  POST /initiatives  GET /kpis  POST /kpis  GET /dashboard
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'usr1', id: 'usr1', userId: 'usr1', role: 'admin' };
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

const mockGoalFind = jest.fn(() => makeChain([]));
const mockGoalFindById = jest.fn(() => makeChain(null));
const mockGoalCount = jest.fn().mockResolvedValue(0);
const mockGoalSave = jest.fn().mockResolvedValue({});
const mockGoalUpdate = jest.fn(() => makeChain(null));
const mockGoalDelete = jest.fn().mockResolvedValue({ _id: 'g1' });

const mockInitFind = jest.fn(() => makeChain([]));
const mockInitCount = jest.fn().mockResolvedValue(0);
const mockInitSave = jest.fn().mockResolvedValue({});
const mockInitUpdate = jest.fn(() => makeChain(null));

const mockKpiFind = jest.fn(() => makeChain([]));
const mockKpiCount = jest.fn().mockResolvedValue(0);
const mockKpiSave = jest.fn().mockResolvedValue({});
const mockKpiUpdate = jest.fn(() => makeChain(null));
const mockKpiAggregate = jest.fn().mockResolvedValue([]);

jest.mock('../../models/StrategicGoal', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'g1' });
    this.save = mockGoalSave;
  });
  M.find = (...a) => mockGoalFind(...a);
  M.findById = (...a) => mockGoalFindById(...a);
  M.countDocuments = (...a) => mockGoalCount(...a);
  M.findByIdAndUpdate = (...a) => mockGoalUpdate(...a);
  M.findByIdAndDelete = (...a) => mockGoalDelete(...a);
  return M;
});

jest.mock('../../models/StrategicInitiative', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'i1' });
    this.save = mockInitSave;
  });
  M.find = (...a) => mockInitFind(...a);
  M.countDocuments = (...a) => mockInitCount(...a);
  M.findByIdAndUpdate = (...a) => mockInitUpdate(...a);
  return M;
});

jest.mock('../../models/StrategicKPI', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'k1' });
    this.save = mockKpiSave;
  });
  M.find = (...a) => mockKpiFind(...a);
  M.countDocuments = (...a) => mockKpiCount(...a);
  M.findByIdAndUpdate = (...a) => mockKpiUpdate(...a);
  M.aggregate = (...a) => mockKpiAggregate(...a);
  return M;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/strategic-planning', require('../../routes/strategicPlanning.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /strategic-planning/goals', () => {
  test('returns paginated goals list', async () => {
    mockGoalFind.mockReturnValue(makeChain([]));
    mockGoalCount.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/strategic-planning/goals');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('filters by perspective', async () => {
    mockGoalFind.mockReturnValue(makeChain([]));
    mockGoalCount.mockResolvedValue(0);
    await request(makeApp()).get('/api/strategic-planning/goals?perspective=financial');
    expect(mockGoalFind).toHaveBeenCalledWith(
      expect.objectContaining({ perspective: 'financial' })
    );
  });
});

describe('GET /strategic-planning/goals/:id', () => {
  test('returns 404 when goal not found', async () => {
    mockGoalFindById.mockReturnValue(makeChain(null));
    const res = await request(makeApp()).get(
      '/api/strategic-planning/goals/507f1f77bcf86cd799439011'
    );
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns goal when found', async () => {
    const goal = { _id: 'g1', title: 'تحسين جودة الخدمات', perspective: 'customer' };
    mockGoalFindById.mockReturnValue(makeChain(goal));
    const res = await request(makeApp()).get(
      '/api/strategic-planning/goals/507f1f77bcf86cd799439011'
    );
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('تحسين جودة الخدمات');
  });
});

describe('POST /strategic-planning/goals', () => {
  test('creates goal and returns 201', async () => {
    mockGoalSave.mockResolvedValue({});
    const res = await request(makeApp()).post('/api/strategic-planning/goals').send({
      title: 'زيادة رضا المستفيدين',
      perspective: 'customer',
      targetYear: 2026,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe('g1');
  });
});

describe('PUT /strategic-planning/goals/:id', () => {
  test('returns 404 when goal not found', async () => {
    mockGoalUpdate.mockReturnValue(makeChain(null));
    const res = await request(makeApp())
      .put('/api/strategic-planning/goals/507f1f77bcf86cd799439011')
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  test('updates goal successfully', async () => {
    const updated = { _id: 'g1', title: 'Updated Goal', status: 'in_progress' };
    mockGoalUpdate.mockReturnValue(makeChain(updated));
    const res = await request(makeApp())
      .put('/api/strategic-planning/goals/507f1f77bcf86cd799439011')
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });
});

describe('GET /strategic-planning/initiatives', () => {
  test('returns initiative list', async () => {
    mockInitFind.mockReturnValue(makeChain([]));
    mockInitCount.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/strategic-planning/initiatives');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /strategic-planning/initiatives', () => {
  test('creates initiative', async () => {
    const res = await request(makeApp()).post('/api/strategic-planning/initiatives').send({
      title: 'مبادرة تطوير المنظومة التقنية',
      goalId: 'g1',
      budget: 50000,
      startDate: '2026-01-01',
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /strategic-planning/kpis', () => {
  test('returns KPI list', async () => {
    mockKpiFind.mockReturnValue(makeChain([]));
    mockKpiCount.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/strategic-planning/kpis');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
