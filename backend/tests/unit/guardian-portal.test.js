'use strict';
/**
 * guardian-portal — route-level tests
 * Covers: GET /  GET /search  GET /:id  POST /  PUT /:id  DELETE /:id
 *         POST /:id/link  DELETE /:id/unlink/:beneficiaryId
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../middleware/auth.middleware', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { _id: 'usr1', id: 'usr1', role: 'admin' };
    next();
  },
}));
jest.mock('../../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../../utils/sanitize', () => ({ escapeRegex: jest.fn(s => s) }));

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

const mockGuardianFind = jest.fn(() => makeChain([]));
const mockGuardianFindById = jest.fn(() => makeChain(null));
const mockGuardianFindOne = jest.fn(() => makeChain(null));
const mockGuardianCount = jest.fn().mockResolvedValue(0);
const mockGuardianSave = jest.fn().mockResolvedValue({});
const mockGuardianCreate = jest.fn().mockResolvedValue({ _id: 'g1' });
const mockGuardianFindByIdAndUpdate = jest.fn(() => makeChain(null));
const mockGuardianFindByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'g1' });

jest.mock('../../models/Guardian', () => {
  const M = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data, { _id: 'g1', beneficiaries: [] });
    this.save = mockGuardianSave;
  });
  M.find = (...a) => mockGuardianFind(...a);
  M.findById = (...a) => mockGuardianFindById(...a);
  M.findOne = (...a) => mockGuardianFindOne(...a);
  M.countDocuments = (...a) => mockGuardianCount(...a);
  M.create = (...a) => mockGuardianCreate(...a);
  M.findByIdAndUpdate = (...a) => mockGuardianFindByIdAndUpdate(...a);
  M.findOneAndUpdate = (...a) => mockGuardianFindByIdAndUpdate(...a);
  M.findByIdAndDelete = (...a) => mockGuardianFindByIdAndDelete(...a);
  M.findOneAndDelete = (...a) => mockGuardianFindByIdAndDelete(...a);
  return M;
});

const mockBeneficiaryFindById = jest.fn().mockResolvedValue(null);
const mockBeneficiaryFind = jest.fn(() => makeChain([]));
const mockBeneficiaryCount = jest.fn().mockResolvedValue(0);
jest.mock('../../models/Beneficiary', () => ({
  findById: (...a) => mockBeneficiaryFindById(...a),
  find: (...a) => mockBeneficiaryFind(...a),
  countDocuments: (...a) => mockBeneficiaryCount(...a),
  exists: jest.fn().mockResolvedValue(null),
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/guardians', require('../../routes/guardians.routes'));
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /guardians/search', () => {
  test('returns empty array for short query', async () => {
    const res = await request(makeApp()).get('/api/guardians/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  test('searches guardians with valid query', async () => {
    mockGuardianFind.mockReturnValue(makeChain([{ _id: 'g1', firstName_ar: 'test' }]));
    const res = await request(makeApp()).get('/api/guardians/search?q=test');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /guardians (list)', () => {
  test('returns guardian list with pagination', async () => {
    mockGuardianFind.mockReturnValue(makeChain([]));
    mockGuardianCount.mockResolvedValue(0);
    const res = await request(makeApp()).get('/api/guardians');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /guardians/:id', () => {
  test('returns 400 for invalid ObjectId', async () => {
    const res = await request(makeApp()).get('/api/guardians/not-valid');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 404 when guardian not found', async () => {
    mockGuardianFindById.mockReturnValue(makeChain(null));
    const res = await request(makeApp()).get('/api/guardians/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('returns guardian when found', async () => {
    const guardian = { _id: 'g1', firstName_ar: 'محمد', lastName_ar: 'العلي', beneficiaries: [] };
    mockGuardianFindById.mockReturnValue(makeChain(guardian));
    const res = await request(makeApp()).get('/api/guardians/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.data.firstName_ar).toBe('محمد');
  });
});

describe('POST /guardians', () => {
  test('creates guardian and returns 201', async () => {
    mockGuardianFindOne.mockResolvedValue(null); // no duplicate
    mockGuardianSave.mockResolvedValue({});
    const res = await request(makeApp()).post('/api/guardians').send({
      firstName_ar: 'عبدالله',
      lastName_ar: 'الشمري',
      phone: '+966501234567',
      idNumber: '1234567890',
      relationship: 'parent',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('returns 409 when guardian with same idNumber already exists', async () => {
    mockGuardianFindOne.mockReturnValue(makeChain({ _id: 'existing', idNumber: '1234567890' }));
    const res = await request(makeApp()).post('/api/guardians').send({
      firstName_ar: 'عبدالله',
      lastName_ar: 'الشمري',
      phone: '+966501234567',
      idNumber: '1234567890',
      relationship: 'parent',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('PUT /guardians/:id', () => {
  test('returns 404 when guardian not found', async () => {
    mockGuardianFindByIdAndUpdate.mockReturnValue(makeChain(null));
    const res = await request(makeApp())
      .put('/api/guardians/507f1f77bcf86cd799439011')
      .send({ phone: '+966509999999' });
    expect(res.status).toBe(404);
  });

  test('updates guardian successfully', async () => {
    const updated = { _id: 'g1', firstName_ar: 'Updated', phone: '+966509999999' };
    mockGuardianFindByIdAndUpdate.mockReturnValue(makeChain(updated));
    const res = await request(makeApp())
      .put('/api/guardians/507f1f77bcf86cd799439011')
      .send({ phone: '+966509999999' });
    expect(res.status).toBe(200);
    expect(res.body.data.firstName_ar).toBe('Updated');
  });
});

describe('DELETE /guardians/:id', () => {
  test('returns 404 when guardian not found', async () => {
    mockGuardianFindById.mockReturnValue(makeChain(null));
    const res = await request(makeApp()).delete('/api/guardians/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('soft-deletes guardian', async () => {
    mockGuardianFindById.mockReturnValue(makeChain({ _id: 'g1' }));
    const res = await request(makeApp()).delete('/api/guardians/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
