'use strict';

/**
 * W1152 — care-plans + sessions domains branch-isolation drift guard.
 *
 * Extends the W1150 branchScopedResourceParam pattern to the two remaining
 * resource-keyed domain route files:
 *
 *   1. care-plans — GET / list spread raw req.query into the service filter
 *      with NO branch pinning (restricted callers saw ALL branches), the
 *      dashboard aggregated globally, and 5 plan-keyed `:id` routes
 *      (GET/PUT/:id, activate, complete, goals) loaded the plan WITHOUT
 *      verifying its branchId. Routes renamed `:id` → `:planId` and a
 *      router.param('planId') hook (branchScopedResourceParam over
 *      UnifiedCarePlan) asserts ownership BEFORE any handler runs.
 *
 *   2. sessions — GET / list and /dashboard had no branch scoping,
 *      /therapist/:id leaked foreign-branch sessions, and 4 session-keyed
 *      `:id` routes (GET/PUT/:id, complete, cancel) skipped ownership.
 *      Routes renamed `:id` → `:sessionId` (+ `/therapist/:therapistId`)
 *      and a router.param('sessionId') hook over ClinicalSession asserts
 *      ownership; lists pin branchId via effectiveBranchScope(req).
 *
 * Static + behavioral, mirrors the W1150 guard structure.
 */

const fs = require('fs');
const path = require('path');

const CP_ROUTES = path.resolve(__dirname, '../domains/care-plans/routes/care-plans.routes.js');
const CP_SERVICE = path.resolve(__dirname, '../domains/care-plans/services/CarePlansService.js');
const SE_ROUTES = path.resolve(__dirname, '../domains/sessions/routes/sessions.routes.js');
const SE_SERVICE = path.resolve(__dirname, '../domains/sessions/services/SessionsService.js');

describe('W1152 — static wiring (care-plans routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(CP_ROUTES, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test("wires router.param('planId', branchScopedResourceParam(...)) with UnifiedCarePlan", () => {
    expect(src).toMatch(/router\.param\(\s*['"]planId['"]/);
    expect(src).toMatch(/modelName:\s*['"]UnifiedCarePlan['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO route registered with bare :id (must be :planId so the hook fires)', () => {
    expect(src).not.toMatch(/router\.(get|put|post|delete|patch)\(\s*['"`]\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('list filter pins branchId through effectiveBranchScope (spoof closed)', () => {
    expect(src).toMatch(/filter\.branchId\s*=\s*effectiveBranchScope\(req\)/);
    expect(src).not.toMatch(/req\.query\.branchId/);
  });

  test('dashboard scoped through effectiveBranchScope', () => {
    expect(src).toMatch(/getDashboard\(\{\s*\n?\s*branchId:\s*effectiveBranchScope\(req\)/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1152 — static wiring (sessions routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(SE_ROUTES, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
  });

  test("wires router.param('sessionId', branchScopedResourceParam(...)) with ClinicalSession", () => {
    expect(src).toMatch(/router\.param\(\s*['"]sessionId['"]/);
    expect(src).toMatch(/modelName:\s*['"]ClinicalSession['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO route registered with bare :id (sessionId/therapistId only)', () => {
    expect(src).not.toMatch(/router\.(get|put|post|delete|patch)\(\s*['"`]\/:id\b/);
    expect(src).not.toMatch(/\/therapist\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('list + dashboard + therapist endpoints scope via effectiveBranchScope', () => {
    expect(src.match(/effectiveBranchScope\(req\)/g).length).toBeGreaterThanOrEqual(3);
    expect(src).not.toMatch(/req\.query\.branchId/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1152 — static wiring (services honour branchId)', () => {
  test('CarePlansService.listPlans applies filter.branchId', () => {
    const src = fs.readFileSync(CP_SERVICE, 'utf8');
    expect(src).toMatch(/if \(filter\.branchId\) q\.branchId = filter\.branchId;/);
  });

  test('CarePlansService.getDashboard accepts + applies branchId', () => {
    const src = fs.readFileSync(CP_SERVICE, 'utf8');
    expect(src).toMatch(/getDashboard\(\{\s*branchId\s*\}\s*=\s*\{\}\)/);
    expect(src).toMatch(/branchId \? \{ branchId \} : \{\}/);
  });

  test('SessionsService.listSessions applies filter.branchId', () => {
    const src = fs.readFileSync(SE_SERVICE, 'utf8');
    expect(src).toMatch(/if \(filter\.branchId\) q\.branchId = filter\.branchId;/);
  });

  test('SessionsService.getTherapistSessions accepts + applies branchId', () => {
    const src = fs.readFileSync(SE_SERVICE, 'utf8');
    expect(src).toMatch(/getTherapistSessions\(\s*therapistId\s*,\s*\{[^}]*branchId/);
  });

  test('SessionsService.getDashboard accepts + applies branchId (incl. todaySessions)', () => {
    const src = fs.readFileSync(SE_SERVICE, 'utf8');
    expect(src).toMatch(/getDashboard\(\{\s*from,\s*to,\s*branchId\s*\}\s*=\s*\{\}\)/);
    expect(src).toMatch(/if \(branchId\) dateFilter\.branchId = branchId;/);
    expect(src).toMatch(/\.\.\.\(branchId && \{ branchId \}\)/);
  });
});

/* ─── behavioral: param hooks via router.params.<name>[0] ─────────────────── */

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

function _stubModel(doc) {
  return {
    findById: jest.fn(() => ({
      select: () => ({ lean: () => Promise.resolve(doc) }),
    })),
  };
}

describe('W1152 — behavioral (planId param hook)', () => {
  let router;
  let planModel;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    planModel = _stubModel(undefined);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'UnifiedCarePlan') return planModel;
      return _stubModel(null);
    });
    router = require('../domains/care-plans/routes/care-plans.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function _mockPlan(branchId) {
    planModel.findById.mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'cp1', branchId }),
      }),
    }));
  }

  function _handler() {
    const fns = router.params && router.params.planId;
    return Array.isArray(fns) && fns[0];
  }

  test('router registers a planId param callback', () => {
    expect(typeof _handler()).toBe('function');
  });

  test('403 on cross-branch plan, next() NOT called', async () => {
    _mockPlan('branch-B');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('next() on same-branch plan', async () => {
    _mockPlan('branch-A');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('404 when plan not found (restricted)', async () => {
    _mockPlan(null);
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('no-op (no DB lookup) for unrestricted / missing branchScope', async () => {
    planModel.findById.mockClear();
    for (const req of [{}, { branchScope: { restricted: false } }]) {
      const res = _mockRes();
      const next = jest.fn();
      await _handler()(req, res, next, '507f1f77bcf86cd799439011');
      expect(next).toHaveBeenCalledWith();
    }
    expect(planModel.findById).not.toHaveBeenCalled();
  });

  test('non-ObjectId param value falls through (dashboard is not a plan id)', async () => {
    planModel.findById.mockClear();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, 'dashboard');
    expect(next).toHaveBeenCalledWith();
    expect(planModel.findById).not.toHaveBeenCalled();
  });
});

describe('W1152 — behavioral (sessionId param hook)', () => {
  let router;
  let sessionModel;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    sessionModel = _stubModel(undefined);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'ClinicalSession') return sessionModel;
      return _stubModel(null);
    });
    router = require('../domains/sessions/routes/sessions.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function _mockSession(branchId) {
    sessionModel.findById.mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'cs1', branchId }),
      }),
    }));
  }

  function _handler() {
    const fns = router.params && router.params.sessionId;
    return Array.isArray(fns) && fns[0];
  }

  test('router registers a sessionId param callback', () => {
    expect(typeof _handler()).toBe('function');
  });

  test('403 on cross-branch session, next() NOT called', async () => {
    _mockSession('branch-B');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('next() on same-branch session', async () => {
    _mockSession('branch-A');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('404 when session not found (restricted)', async () => {
    _mockSession(null);
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('W597 secondment: branchIds[] array honoured by the hook', async () => {
    _mockSession('branch-B');
    const req = {
      branchScope: { restricted: true, branchId: 'branch-A', branchIds: ['branch-A', 'branch-B'] },
    };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
  });
});
