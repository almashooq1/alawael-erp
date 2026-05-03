'use strict';
/**
 * organization-api — route-level tests
 * Covers: GET /structure  GET /departments  POST /departments  PUT /departments/:id  DELETE /departments/:id
 *         GET /positions  POST /positions  PUT /positions/:id  DELETE /positions/:id  GET /stats
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
  _branchFilter: jest.fn(),
}));
jest.mock('../../middleware/validate', () => ({
  validate: () => (_req, _res, next) => next(),
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../../utils/safeError', () =>
  jest.fn((res, _e, _ctx) => res.status(500).json({ success: false, message: 'Error' }))
);
jest.mock('../../utils/sanitize', () => ({ stripUpdateMeta: jest.fn(d => d) }));

// Dynamic requires used inside route handler for structure endpoint
jest.mock('../../models/organization.model', () => ({
  findOne: jest.fn().mockResolvedValue({ _id: 'org1', name: 'Test Org' }),
}));
jest.mock('../../models/Branch', () => ({
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  }),
}));

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

const mockDeptFind = jest.fn(() => makeChain([]));
const mockDeptFindById = jest.fn(() => makeChain(null));
const mockDeptCount = jest.fn().mockResolvedValue(0);
const mockDeptSave = jest.fn().mockResolvedValue({});
const mockDeptUpdate = jest.fn(() => makeChain(null));
const mockDeptDelete = jest.fn().mockResolvedValue({ _id: 'd1' });

const mockPosFind = jest.fn(() => makeChain([]));
const mockPosFindById = jest.fn(() => makeChain(null));
const mockPosCount = jest.fn().mockResolvedValue(0);
const mockPosSave = jest.fn().mockResolvedValue({});
const mockPosUpdate = jest.fn(() => makeChain(null));
const mockPosDelete = jest.fn().mockResolvedValue({ _id: 'p1' });

jest.mock('../../models/Department', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'd1' });
    this.save = mockDeptSave;
  });
  M.find = (...a) => mockDeptFind(...a);
  M.findById = (...a) => mockDeptFindById(...a);
  M.countDocuments = (...a) => mockDeptCount(...a);
  M.findByIdAndUpdate = (...a) => mockDeptUpdate(...a);
  M.findByIdAndDelete = (...a) => mockDeptDelete(...a);
  return M;
});

jest.mock('../../models/Position', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'p1' });
    this.save = mockPosSave;
  });
  M.find = (...a) => mockPosFind(...a);
  M.findById = (...a) => mockPosFindById(...a);
  M.countDocuments = (...a) => mockPosCount(...a);
  M.findByIdAndUpdate = (...a) => mockPosUpdate(...a);
  M.findByIdAndDelete = (...a) => mockPosDelete(...a);
  return M;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/organization', require('../../routes/organization.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /organization/structure', () => {
  test('returns org structure', async () => {
    mockDeptFind.mockReturnValue(makeChain([]));
    const res = await request(makeApp()).get('/api/organization/structure');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /organization/departments', () => {
  test('returns department list', async () => {
    mockDeptFind.mockReturnValue(makeChain([{ _id: 'd1', name: 'IT Department' }]));
    const res = await request(makeApp()).get('/api/organization/departments');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('filters by parent department', async () => {
    mockDeptFind.mockReturnValue(makeChain([]));
    await request(makeApp()).get('/api/organization/departments?parentId=d0');
    expect(mockDeptFind).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'd0' }));
  });
});

describe('POST /organization/departments', () => {
  test('creates department and returns 201', async () => {
    const res = await request(makeApp())
      .post('/api/organization/departments')
      .send({ name: 'قسم التأهيل', code: 'REHAB', managerId: 'usr1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /organization/departments/:id', () => {
  test('returns 404 when department not found', async () => {
    mockDeptUpdate.mockReturnValue(makeChain(null));
    const res = await request(makeApp())
      .put('/api/organization/departments/507f1f77bcf86cd799439011')
      .send({ name: 'Updated' });
    expect(res.status).toBe(404);
  });

  test('updates department successfully', async () => {
    mockDeptUpdate.mockReturnValue(makeChain({ _id: 'd1', name: 'Updated Dept' }));
    const res = await request(makeApp())
      .put('/api/organization/departments/507f1f77bcf86cd799439011')
      .send({ name: 'Updated Dept' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Dept');
  });
});

describe('GET /organization/positions', () => {
  test('returns position list', async () => {
    mockPosFind.mockReturnValue(makeChain([{ _id: 'p1', title: 'أخصائي تأهيل' }]));
    const res = await request(makeApp()).get('/api/organization/positions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /organization/positions', () => {
  test('creates position', async () => {
    const res = await request(makeApp())
      .post('/api/organization/positions')
      .send({ title: 'مشرف قسم', departmentId: 'd1', level: 'senior' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /organization/stats', () => {
  test('returns organization statistics', async () => {
    mockDeptCount.mockResolvedValue(5);
    mockPosCount.mockResolvedValue(12);
    const res = await request(makeApp()).get('/api/organization/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
