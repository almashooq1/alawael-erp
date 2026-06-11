'use strict';

/**
 * W1157 — tele-rehab + programs + group-therapy branch-isolation drift guard.
 *
 * Fourth application of the W1150 branchScopedResourceParam pattern (after
 * W1150 episodes, W1152 care-plans/sessions, W1155 assessments/goals/behavior).
 * Registry sweep found the same `:id`-keyed gap class in the 3 last domains:
 *
 *   1. tele-rehab — WORST: file had NO guards at all (no beneficiaryId hook,
 *      no body guard). 6 session-keyed `:id` routes (get/start/complete/
 *      cancel/quality/satisfaction) loaded TeleSession with NO ownership
 *      check; list unscoped; dashboard trusted raw ?branchId= spoofing.
 *      Now: full W1140 header + `:id` → `:teleSessionId` hook over
 *      TeleSession; list + dashboard pin effectiveBranchScope(req);
 *      TeleRehabService.listSessions applies q.branchId.
 *
 *   2. programs — had the W1140 hooks but 4 program-keyed `:id` routes
 *      (get/update/publish/dashboard) + 6 enrollment-keyed `/enrollments/:id`
 *      routes bypassed ownership; list/statistics/overdue honoured raw
 *      ?branchId=. Now: `:id` → `:programId` (Program) + `/enrollments/:id`
 *      → `/enrollments/:enrollmentId` (ProgramEnrollment) hooks; the 3
 *      branch-scoped reads pin effectiveBranchScope(req).
 *
 *   3. group-therapy — had the W1140 hooks but 6 group-keyed `:id` routes +
 *      2 `/sessions/:sessionId` routes bypassed ownership; list + dashboard
 *      honoured raw ?branchId=. Now: `:id` → `:groupId` (TherapyGroup) +
 *      `/sessions/:sessionId` → `/sessions/:groupSessionId` (GroupSession)
 *      hooks; list + dashboard pin effectiveBranchScope(req).
 *
 * Static + behavioral, mirrors the W1155 guard structure.
 */

const fs = require('fs');
const path = require('path');

const TR_ROUTES = path.resolve(__dirname, '../domains/tele-rehab/routes/tele-rehab.routes.js');
const TR_SERVICE = path.resolve(__dirname, '../domains/tele-rehab/services/TeleRehabService.js');
const PR_ROUTES = path.resolve(__dirname, '../domains/programs/routes/programs.routes.js');
const GT_ROUTES = path.resolve(
  __dirname,
  '../domains/group-therapy/routes/group-therapy.routes.js'
);

describe('W1157 — static wiring (tele-rehab routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(TR_ROUTES, 'utf8');
  });

  test('imports the full guard kit from assertBranchMatch', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/branchScopedBeneficiaryParam/);
    expect(src).toMatch(/bodyScopedBeneficiaryGuard/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
  });

  test("wires router.param('teleSessionId', ...) with TeleSession", () => {
    expect(src).toMatch(/router\.param\(\s*['"]teleSessionId['"]/);
    expect(src).toMatch(/modelName:\s*['"]TeleSession['"]/);
  });

  test('wires the W1140 beneficiaryId param hook + body guard (was missing entirely)', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO route registered with bare :id (must be :teleSessionId so the hook fires)', () => {
    expect(src).not.toMatch(/['"`]\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('list pins branchId through effectiveBranchScope (spoof closed)', () => {
    expect(src).toMatch(/branchId:\s*effectiveBranchScope\(req\)/);
  });

  test('dashboard no longer trusts raw req.query.branchId', () => {
    expect(src).not.toMatch(/req\.query\.branchId/);
    expect(src).toMatch(/getDashboard\(\s*\n?\s*effectiveBranchScope\(req\)/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1157 — static wiring (tele-rehab service honours branchId)', () => {
  test('TeleRehabService.listSessions accepts + applies branchId', () => {
    const src = fs.readFileSync(TR_SERVICE, 'utf8');
    expect(src).toMatch(/listSessions\(\{[\s\S]{0,200}branchId,/);
    expect(src).toMatch(/if \(branchId\) q\.branchId = branchId;/);
  });
});

describe('W1157 — static wiring (programs routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(PR_ROUTES, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
  });

  test("wires router.param('programId', ...) with Program", () => {
    expect(src).toMatch(/router\.param\(\s*['"]programId['"]/);
    expect(src).toMatch(/modelName:\s*['"]Program['"]/);
  });

  test("wires router.param('enrollmentId', ...) with ProgramEnrollment", () => {
    expect(src).toMatch(/router\.param\(\s*['"]enrollmentId['"]/);
    expect(src).toMatch(/modelName:\s*['"]ProgramEnrollment['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO program/enrollment route registered with bare :id', () => {
    expect(src).not.toMatch(/['"`]\/:id\b/);
    expect(src).not.toMatch(/['"`]\/enrollments\/:id\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('list/statistics/overdue pin branch via effectiveBranchScope (spoof closed)', () => {
    expect((src.match(/effectiveBranchScope\(req\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(src).not.toMatch(/req\.query\.branchId/);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1157 — static wiring (group-therapy routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(GT_ROUTES, 'utf8');
  });

  test('imports branchScopedResourceParam + effectiveBranchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
  });

  test("wires router.param('groupId', ...) with TherapyGroup", () => {
    expect(src).toMatch(/router\.param\(\s*['"]groupId['"]/);
    expect(src).toMatch(/modelName:\s*['"]TherapyGroup['"]/);
  });

  test("wires router.param('groupSessionId', ...) with GroupSession", () => {
    expect(src).toMatch(/router\.param\(\s*['"]groupSessionId['"]/);
    expect(src).toMatch(/modelName:\s*['"]GroupSession['"]/);
  });

  test('keeps the W1140 beneficiaryId param hook + body guard', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]beneficiaryId['"]\s*,\s*branchScopedBeneficiaryParam\s*\)/
    );
    expect(src).toMatch(/router\.use\(\s*bodyScopedBeneficiaryGuard\s*\)/);
  });

  test('NO group/session route registered with bare :id / :sessionId', () => {
    expect(src).not.toMatch(/['"`]\/:id\b/);
    expect(src).not.toMatch(/['"`]\/sessions\/:sessionId\b/);
    expect(src).not.toMatch(/req\.params\.id\b/);
    expect(src).not.toMatch(/req\.params\.sessionId\b/);
  });

  test('list + dashboard pin branch via effectiveBranchScope (spoof closed)', () => {
    expect((src.match(/effectiveBranchScope\(req\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/req\.query\.branchId/);
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
      await _handler()(req, res, next, 'dashboard');
      expect(next).toHaveBeenCalledWith();
      expect(model.findById).not.toHaveBeenCalled();
    });
  });
}

describeParamHookSuite({
  title: 'W1157 — behavioral (teleSessionId param hook)',
  routerPath: '../domains/tele-rehab/routes/tele-rehab.routes',
  paramName: 'teleSessionId',
  modelName: 'TeleSession',
  docId: 'ts1',
});

describeParamHookSuite({
  title: 'W1157 — behavioral (programId param hook)',
  routerPath: '../domains/programs/routes/programs.routes',
  paramName: 'programId',
  modelName: 'Program',
  docId: 'p1',
});

describeParamHookSuite({
  title: 'W1157 — behavioral (enrollmentId param hook)',
  routerPath: '../domains/programs/routes/programs.routes',
  paramName: 'enrollmentId',
  modelName: 'ProgramEnrollment',
  docId: 'e1',
});

describeParamHookSuite({
  title: 'W1157 — behavioral (groupId param hook)',
  routerPath: '../domains/group-therapy/routes/group-therapy.routes',
  paramName: 'groupId',
  modelName: 'TherapyGroup',
  docId: 'g1',
});

describeParamHookSuite({
  title: 'W1157 — behavioral (groupSessionId param hook)',
  routerPath: '../domains/group-therapy/routes/group-therapy.routes',
  paramName: 'groupSessionId',
  modelName: 'GroupSession',
  docId: 'gs1',
});
