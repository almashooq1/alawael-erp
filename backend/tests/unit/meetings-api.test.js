'use strict';
/**
 * meetings-api — route-level tests
 * Covers: GET /  GET /:id  POST /  PUT /:id  DELETE /:id
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
  branchFilter: () => ({}),
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

const mockFind = jest.fn(() => makeChain([]));
const mockFindById = jest.fn(() => makeChain(null));
const mockCountDocuments = jest.fn().mockResolvedValue(0);
const mockCreate = jest
  .fn()
  .mockResolvedValue({ _id: 'm1', title: 'Test Meeting', status: 'scheduled' });
const mockFindByIdAndUpdate = jest.fn(() => makeChain(null));
const mockFindByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'm1' });
const mockAggregate = jest.fn().mockResolvedValue([]);

jest.mock('../../models/Meeting', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'm1' });
    this.save = jest.fn().mockResolvedValue(this);
  });
  M.find = (...a) => mockFind(...a);
  M.findById = (...a) => mockFindById(...a);
  M.findOne = (...a) => mockFindById(...a);
  M.countDocuments = (...a) => mockCountDocuments(...a);
  M.create = (...a) => mockCreate(...a);
  M.findByIdAndUpdate = (...a) => mockFindByIdAndUpdate(...a);
  M.findOneAndUpdate = (...a) => mockFindByIdAndUpdate(...a);
  M.findByIdAndDelete = (...a) => mockFindByIdAndDelete(...a);
  M.findOneAndDelete = (...a) => mockFindByIdAndDelete(...a);
  M.aggregate = (...a) => mockAggregate(...a);
  return M;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/meetings', require('../../routes/meetings.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /meetings', () => {
  test('returns success:true with data and pagination', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/meetings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('filters by status', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    await request(makeApp()).get('/api/meetings?status=scheduled');
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled' }));
  });

  test('respects page limit', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/meetings?limit=200');
    expect(res.status).toBe(200);
    // MAX_PAGE_LIMIT=100 is enforced server-side
    expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
  });
});

describe('GET /meetings/:id', () => {
  test('returns 400 for invalid ObjectId', async () => {
    const res = await request(makeApp()).get('/api/meetings/not-a-valid-id');
    expect(res.status).toBe(400);
  });

  test('returns 404 when meeting not found', async () => {
    mockFindById.mockReturnValue(makeChain(null));
    const res = await request(makeApp()).get('/api/meetings/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('returns meeting when found', async () => {
    const mtg = { _id: 'm1', title: 'Sprint Planning', status: 'scheduled' };
    mockFindById.mockReturnValue(makeChain(mtg));
    const res = await request(makeApp()).get('/api/meetings/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Sprint Planning');
  });
});

describe('POST /meetings', () => {
  test('creates meeting and returns 201', async () => {
    mockCreate.mockResolvedValue({
      _id: 'm1',
      title: 'اجتماع التقييم الأسبوعي',
      status: 'scheduled',
    });
    const res = await request(makeApp())
      .post('/api/meetings')
      .send({
        title: 'اجتماع التقييم الأسبوعي',
        date: new Date(Date.now() + 86400000).toISOString(),
        type: 'regular',
        attendees: [],
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe('m1');
  });
});

describe('PUT /meetings/:id', () => {
  test('returns 404 when meeting not found', async () => {
    mockFindByIdAndUpdate.mockReturnValue(makeChain(null));
    const res = await request(makeApp())
      .put('/api/meetings/507f1f77bcf86cd799439011')
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  test('updates and returns meeting', async () => {
    const updated = { _id: 'm1', title: 'Updated Meeting', status: 'completed' };
    mockFindByIdAndUpdate.mockReturnValue(makeChain(updated));
    const res = await request(makeApp())
      .put('/api/meetings/507f1f77bcf86cd799439011')
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });
});

describe('DELETE /meetings/:id', () => {
  test('returns 400 for invalid ObjectId', async () => {
    const res = await request(makeApp()).delete('/api/meetings/bad-id');
    expect(res.status).toBe(400);
  });

  test('returns 404 when not found', async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);
    const res = await request(makeApp()).delete('/api/meetings/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('deletes meeting successfully', async () => {
    mockFindByIdAndDelete.mockResolvedValue({ _id: 'm1', title: 'To Delete' });
    const res = await request(makeApp()).delete('/api/meetings/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
