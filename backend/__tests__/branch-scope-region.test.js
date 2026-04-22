/**
 * branch-scope-region.test.js — Phase-7 regional branchScope tests.
 *
 * Covers:
 *   • Cross-branch roles (CEO, GroupGM, etc.) still see allBranches.
 *   • Regional roles (regional_director, regional_quality) get
 *     `branchScope = { regional, regionIds, ... }`.
 *   • Regional role with empty regionIds is DENIED 403 (config error).
 *   • branchFilter() emits the region-pending marker for regional
 *     scope so callers don't accidentally filter by a null branchId.
 *   • resolveRegionalBranchFilter() expands to `{ branchId: $in }`
 *     (uses lazy Branch model — mocked here, not a full DB test).
 */

'use strict';

const {
  requireBranchAccess,
  branchFilter,
  resolveRegionalBranchFilter,
} = require('../middleware/branchScope.middleware');

function mkReq(user) {
  return { user, query: {}, body: {}, params: {} };
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

describe('requireBranchAccess — cross-branch roles', () => {
  for (const role of [
    'super_admin',
    'head_office_admin',
    'admin',
    'ceo',
    'group_gm',
    'group_cfo',
    'group_chro',
    'group_quality_officer',
    'compliance_officer',
    'internal_auditor',
    'it_admin',
  ]) {
    it(`"${role}" gets allBranches: true`, () => {
      const req = mkReq({ id: 'u1', role });
      const { res, next, wasNextCalled } = mkResNext();
      requireBranchAccess(req, res, next);
      expect(wasNextCalled()).toBe(true);
      expect(req.branchScope).toEqual({
        restricted: false,
        branchId: null,
        allBranches: true,
      });
    });
  }
});

describe('requireBranchAccess — regional roles', () => {
  for (const role of ['regional_director', 'regional_quality']) {
    it(`"${role}" with regionIds → regional scope`, () => {
      const req = mkReq({ id: 'u1', role, regionIds: ['R1', 'R2'] });
      const { res, next, wasNextCalled } = mkResNext();
      requireBranchAccess(req, res, next);
      expect(wasNextCalled()).toBe(true);
      expect(req.branchScope).toMatchObject({
        restricted: true,
        regional: true,
        regionIds: ['R1', 'R2'],
        allBranches: false,
      });
    });

    it(`"${role}" without regionIds → 403 (config error)`, () => {
      const req = mkReq({ id: 'u1', role, regionIds: [] });
      const { res, next, wasNextCalled } = mkResNext();
      requireBranchAccess(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body?.success).toBe(false);
    });
  }
});

describe('requireBranchAccess — branch-restricted roles', () => {
  it('therapist with branchId is restricted to that branch', () => {
    const req = mkReq({ id: 'u1', role: 'therapist', branchId: 'BR-1' });
    const { res, next, wasNextCalled } = mkResNext();
    requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(true);
    expect(req.branchScope).toEqual({
      restricted: true,
      branchId: 'BR-1',
      allBranches: false,
    });
  });

  it('therapist requesting another branch → 403', () => {
    const req = {
      user: { id: 'u1', role: 'therapist', branchId: 'BR-1' },
      query: { branchId: 'BR-2' },
    };
    const { res, next, wasNextCalled } = mkResNext();
    requireBranchAccess(req, res, next);
    expect(wasNextCalled()).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});

describe('branchFilter() — regional marker', () => {
  it('emits __pending_region_expand__ for regional scope', () => {
    const req = {
      branchScope: {
        restricted: true,
        regional: true,
        regionIds: ['R1', 'R2'],
        allBranches: false,
      },
    };
    expect(branchFilter(req)).toEqual({
      __pending_region_expand__: ['R1', 'R2'],
    });
  });

  it('still returns {} for allBranches', () => {
    const req = { branchScope: { allBranches: true } };
    expect(branchFilter(req)).toEqual({});
  });

  it('returns { branchId } for single-branch restricted scope', () => {
    const req = { branchScope: { restricted: true, branchId: 'BR-1' } };
    expect(branchFilter(req)).toEqual({ branchId: 'BR-1' });
  });
});

describe('resolveRegionalBranchFilter() — async expansion', () => {
  it('returns {} for allBranches', async () => {
    const req = { branchScope: { allBranches: true } };
    expect(await resolveRegionalBranchFilter(req)).toEqual({});
  });

  it('returns { branchId } for single-branch scope', async () => {
    const req = { branchScope: { restricted: true, branchId: 'BR-1' } };
    expect(await resolveRegionalBranchFilter(req)).toEqual({ branchId: 'BR-1' });
  });

  // The regional path depends on Mongoose Branch model lookup which
  // requires a DB. We test the caching behavior via a pre-seeded
  // `_resolvedBranchIds` instead to stay DB-free.
  it('uses cached _resolvedBranchIds when already resolved', async () => {
    const req = {
      branchScope: {
        restricted: true,
        regional: true,
        regionIds: ['R1'],
        _resolvedBranchIds: ['BR-A', 'BR-B'],
      },
    };
    const result = await resolveRegionalBranchFilter(req);
    expect(result).toEqual({ branchId: { $in: ['BR-A', 'BR-B'] } });
  });
});
