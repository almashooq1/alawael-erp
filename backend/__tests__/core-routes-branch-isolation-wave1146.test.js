'use strict';

/**
 * core-routes-branch-isolation-wave1146.test.js — Wave 1146.
 *
 * W269-class closure for the CORE beneficiary surface — the most sensitive
 * PHI aggregation point in the system. Pre-W1146, `domains/core/routes/`
 * (mounted live at /api/core + /api/v1/core via dualMountAuth) exposed
 * 20 endpoints with ZERO branch isolation:
 *
 *   - beneficiary.routes.js (factory): full CRUD + archive/unarchive +
 *     risk-flags + soft delete + getFullContext(360°) — all by raw :id.
 *   - beneficiary360.routes.js (nested router): 6 dashboard endpoints
 *     aggregating assessments/goals/care-plan/sessions/family/journey.
 *   - 5 list/stat endpoints accepted ?branchId= directly from the query —
 *     a restricted caller could enumerate ANY branch's beneficiaries.
 *
 * W1146 fixes:
 *   1. core.routes.js — router.param('beneficiaryId', branchScopedBeneficiaryParam)
 *      + router.use(bodyScopedBeneficiaryGuard).
 *   2. beneficiary360.routes.js — its OWN param hook (nested routers do NOT
 *      inherit parent router.param callbacks in Express).
 *   3. All 15 `:id` route params renamed `:beneficiaryId` (URL shape
 *      unchanged) so the hooks fire.
 *   4. Query-branchId spoofing closed on the 5 list/stat endpoints via
 *      effectiveBranchScope(req) — restricted callers always get their
 *      own branch regardless of ?branchId=.
 */

const fs = require('fs');
const path = require('path');

const CORE_DIR = path.join(__dirname, '..', 'domains', 'core', 'routes');

const src = {
  core: fs.readFileSync(path.join(CORE_DIR, 'core.routes.js'), 'utf8'),
  crud: fs.readFileSync(path.join(CORE_DIR, 'beneficiary.routes.js'), 'utf8'),
  b360: fs.readFileSync(path.join(CORE_DIR, 'beneficiary360.routes.js'), 'utf8'),
};

describe('W1146 — core beneficiary surface branch isolation (static)', () => {
  test('core.routes.js wires the param hook + body guard', () => {
    expect(src.core).toMatch(
      /router\.param\(\s*'beneficiaryId'\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src.core).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('beneficiary360.routes.js wires its OWN param hook (nested router)', () => {
    // Express nested routers do not inherit parent router.param callbacks —
    // removing this line would silently un-guard all 6 dashboard endpoints.
    expect(src.b360).toMatch(
      /router\.param\(\s*'beneficiaryId'\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
  });

  test('no /beneficiaries/:id shape remains (param hook only fires for :beneficiaryId)', () => {
    for (const [name, code] of Object.entries(src)) {
      expect({ file: name, hasOldShape: /\/beneficiaries\/:id(?![a-zA-Z])/.test(code) }).toEqual({
        file: name,
        hasOldShape: false,
      });
    }
  });

  test('no req.params.id reads remain in the renamed files', () => {
    expect(/req\.params\.id\b/.test(src.crud)).toBe(false);
    expect(/req\.params\.id\b/.test(src.b360)).toBe(false);
  });

  test('query-branchId spoofing closed on list/stat endpoints via effectiveBranchScope', () => {
    expect(src.crud).toMatch(/effectiveBranchScope/);
    // Each of the 4 branch-parameterized service calls must prefer the scope.
    expect(src.crud).toMatch(
      /getStatistics\(\s*effectiveBranchScope\(req\)\s*\|\|\s*req\.query\.branchId\s*\)/
    );
    expect(src.crud).toMatch(
      /getHighRiskCases\(\s*effectiveBranchScope\(req\)\s*\|\|\s*req\.query\.branchId\s*\)/
    );
    expect(src.crud).toMatch(/getCasesNeedingAttention\(\s*\n?\s*effectiveBranchScope\(req\)/);
    // The list endpoint must not pass raw query branchId for restricted callers.
    expect(src.crud).toMatch(/const scopedBranch = effectiveBranchScope\(req\);/);
  });

  test('W269h class — no req.branchId reads in core routes', () => {
    for (const code of Object.values(src)) {
      expect(/req\.branchId\b/.test(code)).toBe(false);
    }
  });
});

describe('W1146 — param hook behavioral verification (core router)', () => {
  let coreRouter;
  let beneficiaryModel;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    beneficiaryModel = { findById: jest.fn() };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Beneficiary') return beneficiaryModel;
      return {
        findById: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
        findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
      };
    });
    coreRouter = require('../domains/core/routes/core.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    beneficiaryModel.findById.mockReset();
  });

  function _paramHandler() {
    const fns = coreRouter.params && coreRouter.params.beneficiaryId;
    return Array.isArray(fns) && fns[0];
  }

  function _mockRes() {
    const res = {};
    res.status = jest.fn(code => {
      res._status = code;
      return res;
    });
    res.json = jest.fn(body => {
      res._body = body;
      return res;
    });
    return res;
  }

  test('core router registers the beneficiaryId param callback', () => {
    expect(typeof _paramHandler()).toBe('function');
  });

  test('param hook → 403 cross-branch on the core PHI surface', async () => {
    beneficiaryModel.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ _id: 'ben1', branchId: 'branch-B' }) }),
    });
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('param hook → next() same-branch', async () => {
    beneficiaryModel.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ _id: 'ben1', branchId: 'branch-A' }) }),
    });
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('param hook → no-op for unrestricted callers', async () => {
    const handler = _paramHandler();
    const req = { branchScope: { restricted: false, branchId: null } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });

  test('nested 360 router also registers its own param callback', () => {
    const b360Router = require('../domains/core/routes/beneficiary360.routes');
    const fns = b360Router.params && b360Router.params.beneficiaryId;
    expect(typeof (Array.isArray(fns) && fns[0])).toBe('function');
  });
});
