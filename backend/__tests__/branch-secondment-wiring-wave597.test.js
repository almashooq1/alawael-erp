'use strict';

/**
 * branch-secondment-wiring-wave597.test.js
 * ════════════════════════════════════════════════════════════════════
 * W597 — wires the previously-DORMANT UserBranchRole secondment /
 * acting-role model into requireBranchAccess (audit 2026-05-30 found it
 * built+tested with zero request-time consumer).
 *
 * TWO guards in one suite, per the project doctrine "pair every static
 * drift guard with a behavioral counterpart":
 *
 *  (A) STATIC — the middleware source actually references
 *      findActiveForUser + the two env flags, so the wiring can't
 *      silently rot back to dormant (the exact failure W269h-style
 *      guards exist to catch).
 *
 *  (B) BEHAVIORAL — with the flag OFF the output is byte-identical to
 *      pre-W597 (back-compat); with the flag ON, an active secondment
 *      widens the branch set, branchFilter emits $in, assertBranchMatch
 *      allows membership, and the no-branch path fails OPEN (default) or
 *      CLOSED (gated).
 *
 * DB-free: UserBranchRole is jest.mock()'d so the lazy require() inside
 * resolveSecondedBranchIds resolves to a stub.
 */

const fs = require('fs');
const path = require('path');

jest.mock('../models/UserBranchRole', () => ({
  findActiveForUser: jest.fn(),
}));
const UserBranchRole = require('../models/UserBranchRole');

const {
  requireBranchAccess,
  branchFilter,
  resolveRegionalBranchFilter,
} = require('../middleware/branchScope.middleware');
const { assertBranchMatch, assertBranchIdsAllowed } = require('../middleware/assertBranchMatch');

function mkReq(user, query = {}) {
  return { user, query, body: {}, params: {} };
}
function mkResNext() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };
  return { res, next, wasNextCalled: () => nextCalled };
}

const ENV_KEYS = ['ENABLE_USER_BRANCH_ROLE_SCOPE', 'BRANCH_SCOPE_FAIL_CLOSED'];
const ORIG = {};
beforeAll(() => ENV_KEYS.forEach(k => (ORIG[k] = process.env[k])));
afterEach(() => {
  ENV_KEYS.forEach(k => {
    if (ORIG[k] === undefined) delete process.env[k];
    else process.env[k] = ORIG[k];
  });
  jest.clearAllMocks();
});

// ── (A) STATIC DRIFT GUARD ───────────────────────────────────────────
describe('W597 static — secondment wiring is present in source', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'middleware', 'branchScope.middleware.js'),
    'utf8'
  );

  it('references UserBranchRole.findActiveForUser (wiring not dormant)', () => {
    expect(src).toMatch(/findActiveForUser/);
    expect(src).toMatch(/require\(['"]\.\.\/models\/UserBranchRole['"]\)/);
  });

  it('gates both behaviours behind explicit env flags (default off)', () => {
    expect(src).toMatch(/ENABLE_USER_BRANCH_ROLE_SCOPE/);
    expect(src).toMatch(/BRANCH_SCOPE_FAIL_CLOSED/);
  });
});

// ── (B) BEHAVIORAL — flag OFF (back-compat) ──────────────────────────
describe('W597 behavioral — flag OFF preserves pre-W597 output', () => {
  it('single-branch user → exact { restricted, branchId, allBranches } (no extra keys)', async () => {
    const req = mkReq({ id: 'u1', role: 'therapist', branchId: 'BR-1' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(true);
    expect(req.branchScope).toEqual({
      restricted: true,
      branchId: 'BR-1',
      allBranches: false,
    });
    expect(UserBranchRole.findActiveForUser).not.toHaveBeenCalled();
  });

  it('no-branch user fails OPEN by default (legacy behaviour, documented)', async () => {
    const req = mkReq({ id: 'u2', role: 'therapist' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(true);
    expect(req.branchScope).toEqual({ restricted: false, branchId: null, allBranches: true });
  });
});

// ── (B) BEHAVIORAL — fail-closed flag ────────────────────────────────
describe('W597 behavioral — BRANCH_SCOPE_FAIL_CLOSED closes the hole', () => {
  it('no-branch restricted user → 403 when flag on', async () => {
    process.env.BRANCH_SCOPE_FAIL_CLOSED = 'true';
    const req = mkReq({ id: 'u3', role: 'therapist' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body?.success).toBe(false);
  });
});

// ── (B) BEHAVIORAL — secondment expansion (flag ON) ──────────────────
describe('W597 behavioral — secondment widens the branch set', () => {
  beforeEach(() => {
    process.env.ENABLE_USER_BRANCH_ROLE_SCOPE = 'true';
  });

  it('primary ∪ active secondments → branchIds[] + $in filter', async () => {
    UserBranchRole.findActiveForUser.mockResolvedValue([
      { branchId: 'BR-2' },
      { branchId: 'BR-3' },
    ]);
    const req = mkReq({ id: 'u4', role: 'therapist', branchId: 'BR-1' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);

    expect(wasNextCalled()).toBe(true);
    expect(req.branchScope.restricted).toBe(true);
    expect(req.branchScope.branchId).toBe('BR-1');
    expect(req.branchScope.branchIds).toEqual(['BR-1', 'BR-2', 'BR-3']);
    expect(branchFilter(req)).toEqual({ branchId: { $in: ['BR-1', 'BR-2', 'BR-3'] } });
    expect(await resolveRegionalBranchFilter(req)).toEqual({
      branchId: { $in: ['BR-1', 'BR-2', 'BR-3'] },
    });
  });

  it('assertBranchMatch allows a seconded branch, denies a foreign one', async () => {
    UserBranchRole.findActiveForUser.mockResolvedValue([{ branchId: 'BR-2' }]);
    const req = mkReq({ id: 'u5', role: 'therapist', branchId: 'BR-1' });
    const { res, next } = mkResNext();
    await requireBranchAccess(req, res, next);

    expect(() => assertBranchMatch(req, 'BR-2', 'doc')).not.toThrow();
    expect(() => assertBranchMatch(req, 'BR-1', 'doc')).not.toThrow();
    expect(() => assertBranchMatch(req, 'BR-9', 'doc')).toThrow(/cross-branch/i);
    expect(() => assertBranchIdsAllowed(req, ['BR-1', 'BR-2'])).not.toThrow();
    expect(() => assertBranchIdsAllowed(req, ['BR-2', 'BR-9'])).toThrow(/cross-branch/i);
  });

  it('explicitly requesting an allowed seconded branch narrows scope to it', async () => {
    UserBranchRole.findActiveForUser.mockResolvedValue([{ branchId: 'BR-2' }]);
    const req = mkReq({ id: 'u6', role: 'therapist', branchId: 'BR-1' }, { branchId: 'BR-2' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(true);
    expect(req.branchScope).toEqual({ restricted: true, branchId: 'BR-2', allBranches: false });
  });

  it('requesting a branch outside primary ∪ secondment → 403', async () => {
    UserBranchRole.findActiveForUser.mockResolvedValue([{ branchId: 'BR-2' }]);
    const req = mkReq({ id: 'u7', role: 'therapist', branchId: 'BR-1' }, { branchId: 'BR-9' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('no primary branch but active secondment → restricted to seconded set (not allBranches)', async () => {
    UserBranchRole.findActiveForUser.mockResolvedValue([{ branchId: 'BR-5' }]);
    const req = mkReq({ id: 'u8', role: 'therapist' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(true);
    expect(req.branchScope).toEqual({
      restricted: true,
      branchId: 'BR-5',
      branchIds: ['BR-5'],
      allBranches: false,
    });
  });

  it('secondment lookup failure fails SAFE (no widening, keeps primary only)', async () => {
    UserBranchRole.findActiveForUser.mockRejectedValue(new Error('db down'));
    const req = mkReq({ id: 'u9', role: 'therapist', branchId: 'BR-1' });
    const { res, next, wasNextCalled } = mkResNext();
    await requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(true);
    expect(req.branchScope).toEqual({ restricted: true, branchId: 'BR-1', allBranches: false });
  });
});
