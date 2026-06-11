'use strict';

/**
 * W1155 — assessments + goals + behavior domains branch-isolation drift guard.
 *
 * Third application of the W1150 branchScopedResourceParam pattern (after
 * W1150 episodes + W1152 care-plans/sessions). Registry sweep found the same
 * `:id`-keyed gap class in three more domain route files — each had the W1140
 * beneficiaryId hook but resource-keyed `:id` routes bypassed ownership:
 *
 *   1. assessments — GET/PUT /:id + /:id/complete loaded the assessment with
 *      NO branchId verification; list + dashboard aggregated ALL branches.
 *      Routes renamed `:id` → `:assessmentId` + router.param hook over
 *      ClinicalAssessment; list/dashboard pin effectiveBranchScope(req).
 *
 *   2. goals — GET/PUT /goals/:id + /goals/:id/progress hit TherapeuticGoal
 *      directly with NO ownership check; the /goals list honoured arbitrary
 *      filters across branches. Routes renamed `:id` → `:goalId` + hook over
 *      TherapeuticGoal; list pins branch via effectiveBranchScope(req).
 *
 *   3. behavior — /records/:id (+review) and /plans/:id (+approve/reviews)
 *      bypassed ownership; records/plans lists unscoped; /dashboard accepted
 *      raw ?branchId= spoofing. Two hooks (recordId → BehaviorRecord,
 *      planId → BehaviorPlan); lists + dashboard via effectiveBranchScope.
 *
 * Static + behavioral, mirrors the W1152 guard structure.
 */

const fs = require('fs');
const path = require('path');

const AS_ROUTES = path.resolve(__dirname, '../domains/assessments/routes/assessments.routes.js');
const AS_SERVICE = path.resolve(__dirname, '../domains/assessments/services/AssessmentsService.js');
const GO_ROUTES = path.resolve(__dirname, '../domains/goals/routes/goals.routes.js');
const BH_ROUTES = path.resolve(__dirname, '../domains/behavior/routes/behavior.routes.js');
const BH_SERVICE = path.resolve(__dirname, '../domains/behavior/services/BehaviorService.js');

describe('W1155 — static wiring (assessments routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(AS_ROUTES, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test("wires router.param('assessmentId', ...) with ClinicalAssessment", () => {
    expect(src).toMatch(/router\.param\(\s*['"]assessmentId['"]/);
    expect(src).toMatch(/modelName:\s*['"]ClinicalAssessment['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO route registered with bare :id (must be :assessmentId so the hook fires)', () => {
    expect(src).not.toMatch(/router\.(get|put|post|delete|patch)\(\s*\n?\s*['"`]\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('list filter pins branchId through effectiveBranchScope (spoof closed)', () => {
    expect(src).toMatch(/branchId:\s*effectiveBranchScope\(req\)/);
    expect(src).not.toMatch(/req\.query\.branchId/);
  });

  test('dashboard scoped through effectiveBranchScope', () => {
    expect(src).toMatch(/getDashboard\(\{[\s\S]{0,80}branchId:\s*effectiveBranchScope\(req\)/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1155 — static wiring (goals routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(GO_ROUTES, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
  });

  test("wires router.param('goalId', ...) with TherapeuticGoal", () => {
    expect(src).toMatch(/router\.param\(\s*['"]goalId['"]/);
    expect(src).toMatch(/modelName:\s*['"]TherapeuticGoal['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO goal route registered with bare :id (must be :goalId)', () => {
    expect(src).not.toMatch(/\/goals\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('list pins branchId through effectiveBranchScope (spoof closed)', () => {
    expect(src).toMatch(/effectiveBranchScope\(req\)/);
    expect(src).toMatch(/filter\.branchId\s*=\s*scopedBranchId/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1155 — static wiring (behavior routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(BH_ROUTES, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
  });

  test("wires router.param('recordId', ...) with BehaviorRecord", () => {
    expect(src).toMatch(/router\.param\(\s*['"]recordId['"]/);
    expect(src).toMatch(/modelName:\s*['"]BehaviorRecord['"]/);
  });

  test("wires router.param('planId', ...) with BehaviorPlan", () => {
    expect(src).toMatch(/router\.param\(\s*['"]planId['"]/);
    expect(src).toMatch(/modelName:\s*['"]BehaviorPlan['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO record/plan route registered with bare :id', () => {
    expect(src).not.toMatch(/['"`]\/records\/:id\b/);
    expect(src).not.toMatch(/['"`]\/plans\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('records + plans lists and dashboard scope via effectiveBranchScope', () => {
    expect(src.match(/effectiveBranchScope\(req\)/g).length).toBeGreaterThanOrEqual(3);
  });

  test('dashboard no longer trusts raw req.query.branchId', () => {
    expect(src).not.toMatch(/getDashboard\(\s*req\.query\.branchId/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1155 — static wiring (services honour branchId)', () => {
  test('AssessmentsService.listAssessments applies filter.branchId', () => {
    const src = fs.readFileSync(AS_SERVICE, 'utf8');
    expect(src).toMatch(/if \(filter\.branchId\) q\.branchId = filter\.branchId;/);
  });

  test('AssessmentsService.getDashboard accepts + applies branchId (incl. overdue)', () => {
    const src = fs.readFileSync(AS_SERVICE, 'utf8');
    expect(src).toMatch(/getDashboard\(\{\s*from,\s*to,\s*branchId\s*\}\s*=\s*\{\}\)/);
    expect(src).toMatch(/if \(branchId\) dateFilter\.branchId = branchId;/);
    expect(src).toMatch(/\.\.\.\(branchId && \{ branchId \}\)/);
  });

  test('BehaviorService.listRecords + listPlans both apply branchId', () => {
    const src = fs.readFileSync(BH_SERVICE, 'utf8');
    const hits = src.match(/if \(branchId\) q\.branchId = branchId;/g) || [];
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/listPlans\(\{[^}]*branchId\s*\}/);
    expect(src).toMatch(/listRecords\(\{[\s\S]{0,200}branchId,/);
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

describe('W1155 — behavioral (assessmentId param hook)', () => {
  let router;
  let model;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    model = _stubModel(undefined);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'ClinicalAssessment') return model;
      return _stubModel(null);
    });
    router = require('../domains/assessments/routes/assessments.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function _mockDoc(branchId) {
    model.findById.mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'a1', branchId }),
      }),
    }));
  }

  function _handler() {
    const fns = router.params && router.params.assessmentId;
    return Array.isArray(fns) && fns[0];
  }

  test('router registers an assessmentId param callback', () => {
    expect(typeof _handler()).toBe('function');
  });

  test('403 on cross-branch assessment, next() NOT called', async () => {
    _mockDoc('branch-B');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('next() on same-branch assessment', async () => {
    _mockDoc('branch-A');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('404 when assessment not found (restricted)', async () => {
    _mockDoc(null);
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('non-ObjectId param value falls through (dashboard is not an id)', async () => {
    model.findById.mockClear();
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, 'dashboard');
    expect(next).toHaveBeenCalledWith();
    expect(model.findById).not.toHaveBeenCalled();
  });
});

describe('W1155 — behavioral (goalId param hook)', () => {
  let router;
  let model;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    model = _stubModel(undefined);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'TherapeuticGoal') return model;
      return _stubModel(null);
    });
    router = require('../domains/goals/routes/goals.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function _mockDoc(branchId) {
    model.findById.mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'g1', branchId }),
      }),
    }));
  }

  function _handler() {
    const fns = router.params && router.params.goalId;
    return Array.isArray(fns) && fns[0];
  }

  test('router registers a goalId param callback', () => {
    expect(typeof _handler()).toBe('function');
  });

  test('403 on cross-branch goal, next() NOT called', async () => {
    _mockDoc('branch-B');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('next() on same-branch goal', async () => {
    _mockDoc('branch-A');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('404 when goal not found (restricted)', async () => {
    _mockDoc(null);
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('W597 secondment: branchIds[] array honoured by the hook', async () => {
    _mockDoc('branch-B');
    const req = {
      branchScope: { restricted: true, branchId: 'branch-A', branchIds: ['branch-A', 'branch-B'] },
    };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
  });
});

describe('W1155 — behavioral (behavior recordId + planId param hooks)', () => {
  let router;
  let recordModel;
  let planModel;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    recordModel = _stubModel(undefined);
    planModel = _stubModel(undefined);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorRecord') return recordModel;
      if (name === 'BehaviorPlan') return planModel;
      return _stubModel(null);
    });
    router = require('../domains/behavior/routes/behavior.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function _mock(model, branchId) {
    model.findById.mockImplementation(() => ({
      select: () => ({
        lean: () => Promise.resolve(branchId === null ? null : { _id: 'x1', branchId }),
      }),
    }));
  }

  function _handler(name) {
    const fns = router.params && router.params[name];
    return Array.isArray(fns) && fns[0];
  }

  test('router registers recordId AND planId param callbacks', () => {
    expect(typeof _handler('recordId')).toBe('function');
    expect(typeof _handler('planId')).toBe('function');
  });

  test('recordId hook: 403 on cross-branch record', async () => {
    _mock(recordModel, 'branch-B');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler('recordId')(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('recordId hook: next() on same-branch record', async () => {
    _mock(recordModel, 'branch-A');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler('recordId')(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
  });

  test('planId hook: 403 on cross-branch plan', async () => {
    _mock(planModel, 'branch-B');
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler('planId')(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('planId hook: 404 when plan not found (restricted)', async () => {
    _mock(planModel, null);
    const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler('planId')(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });
});
