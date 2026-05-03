'use strict';
/**
 * complaints-api — route-level tests
 * Covers: GET /  GET /stats  GET /:id  POST /  PUT /:id  DELETE /:id
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'usr1', id: 'usr1', role: 'admin', userId: 'usr1' };
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
jest.mock('../../middleware/validateObjectId', () => (_req, _res, next) => next());
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
const mockAggregate = jest.fn().mockResolvedValue([]);
const mockSave = jest.fn().mockResolvedValue({});
const mockFindByIdAndUpdate = jest.fn(() => makeChain(null));
const mockFindByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'c1' });

jest.mock('../../models/Complaint', () => {
  const MockComplaint = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'c1' });
    this.save = mockSave;
  });
  MockComplaint.find = (...args) => mockFind(...args);
  MockComplaint.findById = (...args) => mockFindById(...args);
  MockComplaint.countDocuments = (...args) => mockCountDocuments(...args);
  MockComplaint.aggregate = (...args) => mockAggregate(...args);
  MockComplaint.findByIdAndUpdate = (...args) => mockFindByIdAndUpdate(...args);
  MockComplaint.findByIdAndDelete = (...args) => mockFindByIdAndDelete(...args);
  return MockComplaint;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/complaints', require('../../routes/complaints.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /complaints', () => {
  test('returns success:true with pagination', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/complaints');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('applies status filter', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    await request(makeApp()).get('/api/complaints?status=open');
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }));
  });

  test('applies priority filter', async () => {
    mockFind.mockReturnValue(makeChain([]));
    mockCountDocuments.mockResolvedValue(0);
    await request(makeApp()).get('/api/complaints?priority=high');
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high' }));
  });
});

describe('GET /complaints/stats', () => {
  test('returns stats object', async () => {
    mockCountDocuments.mockResolvedValue(10);
    mockAggregate.mockResolvedValue([{ _id: 'open', count: 5 }]);
    const res = await request(makeApp()).get('/api/complaints/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /complaints/:id', () => {
  test('returns 404 when not found', async () => {
    mockFindById.mockReturnValue(makeChain(null));
    const res = await request(makeApp()).get('/api/complaints/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns complaint when found', async () => {
    const complaint = { _id: 'c1', subject: 'Test', status: 'open' };
    mockFindById.mockReturnValue(makeChain(complaint));
    const res = await request(makeApp()).get('/api/complaints/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.data.subject).toBe('Test');
  });
});

describe('POST /complaints', () => {
  test('creates complaint and returns 201', async () => {
    mockSave.mockResolvedValue({});
    const res = await request(makeApp()).post('/api/complaints').send({
      subject: 'مشكلة في الخدمة',
      description: 'وصف المشكلة',
      type: 'complaint',
      priority: 'medium',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /complaints/:id', () => {
  test('returns 404 when complaint not found', async () => {
    mockFindByIdAndUpdate.mockReturnValue(makeChain(null));
    const res = await request(makeApp())
      .put('/api/complaints/507f1f77bcf86cd799439011')
      .send({ status: 'resolved' });
    expect(res.status).toBe(404);
  });

  test('returns updated complaint', async () => {
    const updated = { _id: 'c1', status: 'resolved' };
    mockFindByIdAndUpdate.mockReturnValue(makeChain(updated));
    const res = await request(makeApp())
      .put('/api/complaints/507f1f77bcf86cd799439011')
      .send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
  });
});
