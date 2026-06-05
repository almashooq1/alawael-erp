/**
 * Wave 930 — behavioral guard for the systemic branch enrichment in
 * requireBranchAccess.
 *
 * The JWT (generateToken) carries no branchId, so req.user.branchId is undefined
 * for token-authenticated users → branch scoping fell open (allBranches) and
 * branch_id-required create handlers had no branch source. W930 lazily enriches
 * branchId from the User row when the token lacks it — env-gated
 * (ENABLE_USER_BRANCH_ENRICH), default OFF, fail-safe.
 *
 * Verifies: (1) default OFF = pre-W930 behaviour (no DB touch, fail-open);
 * (2) ON + User has branchId → restricted scope to that branch;
 * (3) ON + lookup throws → fail-safe (unchanged behaviour, never crashes).
 */

'use strict';

jest.mock('../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));
jest.mock('../config/constants/roles.constants', () => ({
  CROSS_BRANCH_ROLES: ['admin', 'super_admin'],
  REGION_SCOPED_ROLES: [],
  resolveRole: r => r,
}));
jest.mock('../config/constants/tenant.constants', () => ({ TENANT_FIELD: 'branchId' }));

const mockLean = jest.fn();
jest.mock('../models/User', () => ({
  findById: jest.fn(() => ({ select: () => ({ lean: mockLean }) })),
}));

const { requireBranchAccess } = require('../middleware/branchScope.middleware');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('W930 — requireBranchAccess user-branch enrichment', () => {
  const ENV = process.env.ENABLE_USER_BRANCH_ENRICH;
  afterEach(() => {
    if (ENV === undefined) delete process.env.ENABLE_USER_BRANCH_ENRICH;
    else process.env.ENABLE_USER_BRANCH_ENRICH = ENV;
    jest.clearAllMocks();
  });

  it('default OFF: restricted user with no token branchId stays fail-open (no DB touch)', async () => {
    delete process.env.ENABLE_USER_BRANCH_ENRICH;
    const User = require('../models/User');
    const req = { user: { id: 'u1', role: 'therapist' }, query: {}, body: {}, params: {} };
    const res = makeRes();
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
    expect(req.branchScope.allBranches).toBe(true);
  });

  it('ON + User row has branchId: scope is restricted to that branch', async () => {
    process.env.ENABLE_USER_BRANCH_ENRICH = 'true';
    mockLean.mockResolvedValueOnce({ branchId: 'BR-9' });
    const req = { user: { id: 'u1', role: 'therapist' }, query: {}, body: {}, params: {} };
    const res = makeRes();
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.branchScope.restricted).toBe(true);
    expect(req.branchScope.branchId).toBe('BR-9');
    expect(req.branchScope.allBranches).toBe(false);
  });

  it('ON + lookup throws: fail-safe — never crashes, falls back to pre-W930 behaviour', async () => {
    process.env.ENABLE_USER_BRANCH_ENRICH = 'true';
    mockLean.mockRejectedValueOnce(new Error('db down'));
    const req = { user: { id: 'u1', role: 'therapist' }, query: {}, body: {}, params: {} };
    const res = makeRes();
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.branchScope.allBranches).toBe(true); // no branch resolved → unchanged
  });

  it('ON + cross-branch admin: enrichment is skipped (still sees all branches)', async () => {
    process.env.ENABLE_USER_BRANCH_ENRICH = 'true';
    const User = require('../models/User');
    const req = { user: { id: 'admin1', role: 'admin' }, query: {}, body: {}, params: {} };
    const res = makeRes();
    const next = jest.fn();
    await requireBranchAccess(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.branchScope.allBranches).toBe(true);
    expect(User.findById).not.toHaveBeenCalled();
  });
});
