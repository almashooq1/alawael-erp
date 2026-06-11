'use strict';

/**
 * W1160 — core(v2 mount) + dashboards + field-training branch-isolation
 * drift guard.
 *
 * Fifth application of the W1150 branchScopedResourceParam pattern (after
 * W1150 episodes, W1152 care-plans/sessions, W1155 assessments/goals/
 * behavior, W1157 tele-rehab/programs/group-therapy). The post-W1157
 * registry re-sweep found three more gaps:
 *
 *   1. domains/core/index.js — the /api/v2/core mount built its OWN router
 *      and called createBeneficiaryRoutes WITHOUT the beneficiaryId
 *      ownership hook (only the legacy /api/core mount via core.routes.js
 *      had it from W1146). /api/v2/core/beneficiaries/:beneficiaryId was
 *      a cross-branch read for any restricted caller. Now: index.js
 *      registers branchScopedBeneficiaryParam + bodyScopedBeneficiaryGuard
 *      before the route factory runs.
 *
 *   2. dashboards — NO guards at all. 16 resource-keyed `:id` routes
 *      (configs ×6 / kpis ×4 / alerts ×6) loaded docs with no ownership
 *      check; 7 branch-scoped reads trusted raw ?branchId= spoofing.
 *      Now: `:id` → `:dashboardConfigId` (DashboardConfig) +
 *      `:kpiId` (DashboardKPIDefinition) + `:alertId` (DecisionAlert)
 *      hooks; every branch read pins effectiveBranchScope(req).
 *
 *   3. field-training — NO guards at all. 10 resource-keyed `:id` routes
 *      (programs ×2 / trainees ×8) unprotected; dashboard spoofable.
 *      Now: `:id` → `:programId` (TrainingProgram) + `:traineeRecordId`
 *      (TraineeRecord) hooks (the pre-existing /programs/:programId/
 *      trainees enroll route is now covered too); dashboard pins
 *      effectiveBranchScope(req); body guard covers caseload assignment.
 *
 * Static + behavioral, mirrors the W1157 guard structure.
 */

const fs = require('fs');
const path = require('path');

const CORE_INDEX = path.resolve(__dirname, '../domains/core/index.js');
const DB_ROUTES = path.resolve(__dirname, '../domains/dashboards/routes/dashboards.routes.js');
const FT_ROUTES = path.resolve(
  __dirname,
  '../domains/field-training/routes/field-training.routes.js'
);

describe('W1160 — static wiring (core /api/v2 mount)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(CORE_INDEX, 'utf8');
  });

  test('imports the beneficiary guards from assertBranchMatch', () => {
    expect(src).toMatch(/branchScopedBeneficiaryParam/);
    expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test('registers the beneficiaryId hook + body guard BEFORE createBeneficiaryRoutes', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
    const hookIdx = src.indexOf("router.param('beneficiaryId'");
    const routesIdx = src.indexOf('createBeneficiaryRoutes(router');
    expect(hookIdx).toBeGreaterThan(-1);
    expect(routesIdx).toBeGreaterThan(hookIdx);
  });
});

describe('W1160 — static wiring (dashboards routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(DB_ROUTES, 'utf8');
  });

  test('imports the guard kit from assertBranchMatch', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test('wires the three resource param hooks with the right models', () => {
    expect(src).toMatch(/router\.param\(\s*['"]dashboardConfigId['"]/);
    expect(src).toMatch(/modelName:\s*['"]DashboardConfig['"]/);
    expect(src).toMatch(/router\.param\(\s*['"]kpiId['"]/);
    expect(src).toMatch(/modelName:\s*['"]DashboardKPIDefinition['"]/);
    expect(src).toMatch(/router\.param\(\s*['"]alertId['"]/);
    expect(src).toMatch(/modelName:\s*['"]DecisionAlert['"]/);
  });

  test('NO route registered with bare :id (must be the named params so hooks fire)', () => {
    expect(src).not.toMatch(/['"`]\/[^'"`]*\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('no branch read trusts raw req.query.branchId (spoof closed)', () => {
    expect(src).not.toMatch(/req\.query\.branchId/);
    const pins = src.match(/effectiveBranchScope\(req\)/g) || [];
    expect(pins.length).toBeGreaterThanOrEqual(6);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1160 — static wiring (field-training routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(FT_ROUTES, 'utf8');
  });

  test('imports the guard kit from assertBranchMatch', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test('wires programId (TrainingProgram) + traineeRecordId (TraineeRecord) hooks', () => {
    expect(src).toMatch(/router\.param\(\s*['"]programId['"]/);
    expect(src).toMatch(/modelName:\s*['"]TrainingProgram['"]/);
    expect(src).toMatch(/router\.param\(\s*['"]traineeRecordId['"]/);
    expect(src).toMatch(/modelName:\s*['"]TraineeRecord['"]/);
  });

  test('registers the body guard (caseload carries beneficiary ids)', () => {
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO route registered with bare :id (must be named params so hooks fire)', () => {
    expect(src).not.toMatch(/['"`]\/[^'"`]*\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('dashboard no longer trusts raw req.query.branchId', () => {
    expect(src).not.toMatch(/req\.query\.branchId/);
    expect(src).toMatch(/getDashboard\(\s*\n?\s*effectiveBranchScope\(req\)/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
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

/**
 * Shared behavioral suite factory: loads the router with mongoose.model
 * mocked so `modelName` resolves to a stub, then drives the param hook
 * directly (router.params.<paramName>[0]) through the 4 canonical cases.
 */
function describeParamHookSuite({ title, routerPath, paramName, modelName, docId }) {
  describe(title, () => {
    let router;
    let model;

    beforeAll(() => {
      jest.resetModules();
      const mongoose = require('mongoose');
      model = _stubModel(undefined);
      jest.spyOn(mongoose, 'model').mockImplementation(name => {
        if (name === modelName) return model;
        return _stubModel(null);
      });
      router = require(routerPath);
    });

    afterAll(() => {
      jest.restoreAllMocks();
      jest.resetModules();
    });

    function _mockDoc(branchId) {
      model.findById.mockImplementation(() => ({
        select: () => ({
          lean: () => Promise.resolve(branchId === null ? null : { _id: docId, branchId }),
        }),
      }));
    }

    function _handler() {
      const fns = router.params && router.params[paramName];
      return Array.isArray(fns) && fns[0];
    }

    test(`router registers a ${paramName} param callback`, () => {
      expect(typeof _handler()).toBe('function');
    });

    test('403 on cross-branch resource, next() NOT called', async () => {
      _mockDoc('branch-B');
      const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
      const res = _mockRes();
      const next = jest.fn();
      await _handler()(req, res, next, '507f1f77bcf86cd799439011');
      expect(res._status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('next() on same-branch resource', async () => {
      _mockDoc('branch-A');
      const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
      const res = _mockRes();
      const next = jest.fn();
      await _handler()(req, res, next, '507f1f77bcf86cd799439011');
      expect(next).toHaveBeenCalledWith();
      expect(res._status).toBeUndefined();
    });

    test('404 when resource not found (restricted)', async () => {
      _mockDoc(null);
      const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
      const res = _mockRes();
      const next = jest.fn();
      await _handler()(req, res, next, '507f1f77bcf86cd799439011');
      expect(res._status).toBe(404);
      expect(next).not.toHaveBeenCalled();
    });

    test('non-ObjectId param value falls through (literal segments are not ids)', async () => {
      model.findById.mockClear();
      const req = { branchScope: { restricted: true, branchId: 'branch-A' } };
      const res = _mockRes();
      const next = jest.fn();
      await _handler()(req, res, next, 'latest');
      expect(next).toHaveBeenCalledWith();
      expect(model.findById).not.toHaveBeenCalled();
    });
  });
}

describeParamHookSuite({
  title: 'W1160 — behavioral (dashboardConfigId param hook)',
  routerPath: '../domains/dashboards/routes/dashboards.routes',
  paramName: 'dashboardConfigId',
  modelName: 'DashboardConfig',
  docId: 'dc1',
});

describeParamHookSuite({
  title: 'W1160 — behavioral (kpiId param hook)',
  routerPath: '../domains/dashboards/routes/dashboards.routes',
  paramName: 'kpiId',
  modelName: 'DashboardKPIDefinition',
  docId: 'k1',
});

describeParamHookSuite({
  title: 'W1160 — behavioral (alertId param hook)',
  routerPath: '../domains/dashboards/routes/dashboards.routes',
  paramName: 'alertId',
  modelName: 'DecisionAlert',
  docId: 'a1',
});

describeParamHookSuite({
  title: 'W1160 — behavioral (programId param hook — field-training)',
  routerPath: '../domains/field-training/routes/field-training.routes',
  paramName: 'programId',
  modelName: 'TrainingProgram',
  docId: 'tp1',
});

describeParamHookSuite({
  title: 'W1160 — behavioral (traineeRecordId param hook)',
  routerPath: '../domains/field-training/routes/field-training.routes',
  paramName: 'traineeRecordId',
  modelName: 'TraineeRecord',
  docId: 'tr1',
});
