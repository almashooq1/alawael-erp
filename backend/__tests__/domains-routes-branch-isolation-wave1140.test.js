'use strict';

/**
 * domains-routes-branch-isolation-wave1140.test.js — Wave 1140.
 *
 * W269-class blanket closure for the `domains/` DDD route layer. The W1138
 * timeline fix revealed the wider gap: 14 beneficiary-keyed domain route
 * files were mounted via dualMountAuth with ZERO branch-isolation guards —
 * any branch-restricted caller could read any beneficiary's assessments,
 * care plans, sessions, episodes, family comms, goals, measures, risk
 * scores, behavior analytics, program enrollments, quality audits,
 * AR/VR progress, group-therapy memberships and research participation.
 *
 * W1140 closes ALL of them via the two prebuilt Layer-B middlewares
 * (middleware/assertBranchMatch.js):
 *
 *   router.param('beneficiaryId', branchScopedBeneficiaryParam)
 *     → every :beneficiaryId URL param triggers Beneficiary.findById +
 *       branch match BEFORE the handler runs (403/404 short-circuit).
 *   router.use(bodyScopedBeneficiaryGuard)
 *     → every body-carried beneficiaryId/beneficiary/beneficiary_id is
 *       ownership-checked on write paths.
 *
 * The 3 files that used `/beneficiary/:id` (assessments, care-plans,
 * sessions) were renamed to `/beneficiary/:beneficiaryId` (identical URL
 * shape — param name is internal) so the param hook fires for them too.
 *
 * Drift guard: static assertions on all 14 sources + behavioral
 * verification of the param hook through a representative router.
 */

const fs = require('fs');
const path = require('path');

const GUARDED_DOMAIN_ROUTE_FILES = [
  'ai-recommendations/routes/recommendations.routes.js',
  'ar-vr/routes/ar-vr.routes.js',
  'assessments/routes/assessments.routes.js',
  'behavior/routes/behavior.routes.js',
  'care-plans/routes/care-plans.routes.js',
  'episodes/routes/episodes.routes.js',
  'family/routes/family.routes.js',
  'goals/routes/goals.routes.js',
  'goals/routes/measures.routes.js',
  'group-therapy/routes/group-therapy.routes.js',
  'programs/routes/programs.routes.js',
  'quality/routes/quality.routes.js',
  'research/routes/research.routes.js',
  'sessions/routes/sessions.routes.js',
];

const DOMAINS_DIR = path.join(__dirname, '..', 'domains');

function srcOf(rel) {
  return fs.readFileSync(path.join(DOMAINS_DIR, rel), 'utf8');
}

describe('W1140 — domains/ routes blanket branch isolation (static)', () => {
  test.each(GUARDED_DOMAIN_ROUTE_FILES)('%s wires the param hook + body guard', rel => {
    const src = srcOf(rel);
    expect(src).toMatch(/branchScopedBeneficiaryParam/);
    expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
    expect(src).toMatch(
      /router\.param\(\s*'beneficiaryId'\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('no domain route file keeps the un-hooked /beneficiary/:id shape', () => {
    // The param hook only fires for :beneficiaryId — a `/beneficiary/:id`
    // path silently bypasses it. The 3 offenders were renamed in W1140;
    // this assertion stops the shape from coming back anywhere.
    const offenders = [];
    for (const rel of GUARDED_DOMAIN_ROUTE_FILES) {
      if (/\/beneficiary\/:id(?![a-zA-Z])/.test(srcOf(rel))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  test('W269h class — no req.branchId reads anywhere in domains routes', () => {
    const offenders = [];
    for (const rel of GUARDED_DOMAIN_ROUTE_FILES) {
      if (/req\.branchId\b/.test(srcOf(rel))) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

describe('W1140 — param hook behavioral verification (representative router)', () => {
  let router;
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
    // episodes router is the representative — pure structure, no heavy deps.
    router = require('../domains/episodes/routes/episodes.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  beforeEach(() => {
    beneficiaryModel.findById.mockReset();
  });

  function _mockBeneficiary(branchId) {
    beneficiaryModel.findById.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'ben1', branchId }),
      }),
    });
  }

  function _paramHandler() {
    // Express stores router.param callbacks keyed by param name.
    const fns = router.params && router.params.beneficiaryId;
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

  test('router registers a beneficiaryId param callback', () => {
    expect(typeof _paramHandler()).toBe('function');
  });

  test('param hook → 403 cross-branch, next() NOT called', async () => {
    _mockBeneficiary('branch-B');
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('param hook → next() on same-branch', async () => {
    _mockBeneficiary('branch-A');
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('param hook → 404 when beneficiary not found (restricted)', async () => {
    _mockBeneficiary(null);
    const handler = _paramHandler();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('param hook → no-op for unrestricted callers (no DB lookup)', async () => {
    const handler = _paramHandler();
    const req = { branchScope: { restricted: false, branchId: null } };
    const res = _mockRes();
    const next = jest.fn();
    await handler(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(beneficiaryModel.findById).not.toHaveBeenCalled();
  });
});
