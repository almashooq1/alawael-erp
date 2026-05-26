/**
 * Wave 410 — branch-scope gate for clinical models without a direct
 * branchId field (CarePlan, TherapySession, etc).
 *
 * Companion to commit `5ca905fde` which closed the legacy
 * `/api/beneficiaries` cross-tenant leak. This guard locks in the
 * helper used to close the same class on clinical sibling routes.
 *
 * Mocks `mongoose.model('Beneficiary')` so the suite is pure-unit, no
 * MongoMemoryServer needed.
 */

'use strict';

// jest globals are auto-injected by the jest test runner — no require needed.
// (eslint-env jest configured in eslint.config.js for __tests__/; inline comments deprecated)

// ─── Mock the Beneficiary model BEFORE requiring the helper ────────────────
const mockFindOne = jest.fn();
jest.mock('../models/Beneficiary', () => ({
  findOne: (...args) => mockFindOne(...args),
}));

// Stub the branchFilter middleware so we don't depend on the full role/tenant
// constants pipeline. The helper only calls `branchFilter(req)` once per id;
// returning a fixed scope is enough.
jest.mock('../middleware/branchScope.middleware', () => ({
  branchFilter: jest.fn(req => req.__branchFilterReturn ?? {}),
}));

const { assertBeneficiaryInScope } = require('../utils/beneficiaryBranchGate');

// Minimal Express-shaped res mock.
function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

// Mongoose chain stub: findOne(...).select(...).lean()
function chainResolving(value) {
  return {
    select() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
  };
}

describe('beneficiaryBranchGate.assertBeneficiaryInScope', () => {
  beforeEach(() => {
    mockFindOne.mockReset();
  });

  it('returns null when beneficiaryId is null/undefined (nothing to gate)', async () => {
    const req = {};
    const res = makeRes();
    await expect(assertBeneficiaryInScope(req, null, res)).resolves.toBeNull();
    await expect(assertBeneficiaryInScope(req, undefined, res)).resolves.toBeNull();
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('returns 400 when beneficiaryId is malformed', async () => {
    const req = {};
    const res = makeRes();
    const out = await assertBeneficiaryInScope(req, 'not-an-objectid', res);
    expect(out).toBe(res);
    expect(res.statusCode).toBe(400);
    expect(mockFindOne).not.toHaveBeenCalled();
  });

  it('passes through when beneficiary exists in caller scope', async () => {
    const req = { __branchFilterReturn: { branchId: 'branchA' } };
    const res = makeRes();
    mockFindOne.mockReturnValue(chainResolving({ _id: '507f1f77bcf86cd799439011' }));

    const out = await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res);
    expect(out).toBeNull();
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      branchId: 'branchA',
    });
  });

  it('returns 404 when beneficiary exists but in a different branch', async () => {
    const req = { __branchFilterReturn: { branchId: 'branchA' } };
    const res = makeRes();
    // Findone with the scope filter returns nothing → cross-branch.
    mockFindOne.mockReturnValue(chainResolving(null));

    const out = await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res);
    expect(out).toBe(res);
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    // Uniform 'not found' so cross-branch existence isn't probable.
    expect(res.body.message).toContain('غير موجود');
  });

  it('HQ / cross-branch role gets empty scope filter → passes everything', async () => {
    const req = { __branchFilterReturn: {} };
    const res = makeRes();
    mockFindOne.mockReturnValue(chainResolving({ _id: '507f1f77bcf86cd799439011' }));

    const out = await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res);
    expect(out).toBeNull();
    expect(mockFindOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011' });
  });

  it('caches the lookup per request — second call with same id does NOT query again', async () => {
    const req = { __branchFilterReturn: { branchId: 'branchA' } };
    const res = makeRes();
    mockFindOne.mockReturnValue(chainResolving({ _id: '507f1f77bcf86cd799439011' }));

    const a = await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res);
    const b = await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res);
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(mockFindOne).toHaveBeenCalledTimes(1);
  });

  it('cache correctly returns the denial result the second time without re-querying', async () => {
    const req = { __branchFilterReturn: { branchId: 'branchA' } };
    const res1 = makeRes();
    const res2 = makeRes();
    mockFindOne.mockReturnValue(chainResolving(null));

    await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res1);
    expect(res1.statusCode).toBe(404);

    await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res2);
    expect(res2.statusCode).toBe(404);
    // Only ONE actual DB call — second one served from cache.
    expect(mockFindOne).toHaveBeenCalledTimes(1);
  });

  it('different ids in the same request → two queries', async () => {
    const req = { __branchFilterReturn: { branchId: 'branchA' } };
    const res = makeRes();
    mockFindOne.mockReturnValue(chainResolving({ _id: 'whatever' }));

    await assertBeneficiaryInScope(req, '507f1f77bcf86cd799439011', res);
    await assertBeneficiaryInScope(req, '507f191e810c19729de860ea', res);
    expect(mockFindOne).toHaveBeenCalledTimes(2);
  });

  it('accepts beneficiary as a populated subdoc with _id', async () => {
    const req = { __branchFilterReturn: { branchId: 'branchA' } };
    const res = makeRes();
    mockFindOne.mockReturnValue(chainResolving({ _id: '507f1f77bcf86cd799439011' }));

    const out = await assertBeneficiaryInScope(
      req,
      { _id: '507f1f77bcf86cd799439011', firstName: 'سارة' },
      res
    );
    expect(out).toBeNull();
    expect(mockFindOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      branchId: 'branchA',
    });
  });
});
