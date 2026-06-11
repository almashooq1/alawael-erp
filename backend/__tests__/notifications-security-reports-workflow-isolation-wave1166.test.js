'use strict';

/**
 * W1166 — notifications + security-rbac + reports + workflow domain
 * isolation drift guard.
 *
 * Sixth application of the W1150 pattern (after W1150 episodes, W1152
 * care-plans/sessions, W1155 assessments/goals/behavior, W1157 tele-rehab/
 * programs/group-therapy, W1160 core-v2/dashboards/field-training). The
 * Wave-D registry re-sweep found four more unguarded domain route files:
 *
 *   1. notifications — USER-owned resources (recipientId) with ZERO checks:
 *      any authed user could read/snooze/archive/delete ANY notification by
 *      id (IDOR), bulk-mutate arbitrary ids, and send/schedule notifications
 *      to anyone. Now: `:notificationId` ownership param hook (owner OR
 *      cross-branch role), bulk ids pre-filtered to caller-owned, and
 *      send/send-bulk/schedule/stats role-gated (admin/manager/supervisor).
 *
 *   2. security-rbac — privilege escalation: any authed user could create/
 *      delete roles, grant permissions, read the audit log. Now: the whole
 *      router is requireAdmin-gated.
 *
 *   3. reports — branch-scoped PHI aggregates: ?branchId / body.branchId
 *      spoofable on generate/list/dashboard; GET /:id was a cross-branch
 *      read. Now: requireBranchAccess + effectiveBranchScope pin-first +
 *      `:reportId` branchScopedResourceParam(GeneratedReport) hook.
 *
 *   4. workflow — journey lifecycle: any authed user could advance/
 *      exception-advance/read ANY episode's journey and complete ANY task;
 *      dashboards/analytics/overdue spoofable; journey/start accepted
 *      foreign beneficiaryId + branchId. Now: `episodeId` + `taskId`
 *      branch-or-beneficiary param hooks (timeline's enforceEpisodeBranch
 *      pattern), enforceBeneficiaryBranch on start, pins everywhere.
 *
 * Static + behavioral, mirrors the W1160 guard structure.
 */

const fs = require('fs');
const path = require('path');

const NOTIF_ROUTES = path.resolve(
  __dirname,
  '../domains/notifications/routes/notifications.routes.js'
);
const SEC_ROUTES = path.resolve(__dirname, '../domains/security/routes/security-rbac.routes.js');
const REPORTS_ROUTES = path.resolve(__dirname, '../domains/reports/routes/reports.routes.js');
const WF_ROUTES = path.resolve(__dirname, '../domains/workflow/routes/workflow.routes.js');

describe('W1166 — static wiring (notifications routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(NOTIF_ROUTES, 'utf8');
  });

  test('imports requireBranchAccess + requireRole and populates branchScope', () => {
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/auth['"]\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  test('wires the notificationId ownership param hook', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]notificationId['"]\s*,\s*notificationOwnershipParam\s*\)/
    );
    expect(src).toMatch(/recipientId/);
  });

  test('NO route registered with bare :id (must be named params so the hook fires)', () => {
    expect(src).not.toMatch(/['"`]\/[^'"`]*\/:id\b/);
    expect(src).not.toMatch(/['"`]\/:id['"`]/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('bulk operations pre-filter ids to caller-owned (filterOwnedIds)', () => {
    const calls = src.match(/filterOwnedIds\(req,\s*req\.body\.ids\)/g) || [];
    expect(calls.length).toBe(2); // bulk/read + DELETE /bulk
    expect(src).not.toMatch(/markMultipleAsRead\(req\.body\.ids\)/);
    expect(src).not.toMatch(/deleteMultiple\(req\.body\.ids\)/);
  });

  test('send / send-bulk / schedule / stats are role-gated', () => {
    const gates =
      src.match(
        /requireRole\(\s*['"]admin['"]\s*,\s*['"]manager['"]\s*,\s*['"]supervisor['"]\s*\)/g
      ) || [];
    expect(gates.length).toBeGreaterThanOrEqual(4);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1166 — static wiring (security-rbac routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(SEC_ROUTES, 'utf8');
  });

  test('imports requireAdmin from the canonical auth middleware', () => {
    expect(src).toMatch(/requireAdmin/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/auth['"]\)/);
  });

  test('the WHOLE router is admin-gated BEFORE any route definition', () => {
    expect(src).toMatch(/router\.use\(\s*requireAdmin\s*\)/);
    const gateIdx = src.indexOf('router.use(requireAdmin');
    const firstRouteIdx = src.search(/router\.(get|post|put|patch|delete)\(/);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(firstRouteIdx).toBeGreaterThan(gateIdx);
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1166 — static wiring (reports routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(REPORTS_ROUTES, 'utf8');
  });

  test('imports the guard kit and populates branchScope', () => {
    expect(src).toMatch(/branchScopedResourceParam/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  test('wires the reportId hook with the GeneratedReport model', () => {
    expect(src).toMatch(/router\.param\(\s*['"]reportId['"]/);
    expect(src).toMatch(/modelName:\s*['"]GeneratedReport['"]/);
  });

  test('NO route registered with bare :id', () => {
    expect(src).not.toMatch(/['"`]\/[^'"`]*\/:id\b/);
    expect(src).not.toMatch(/['"`]\/:id['"`]/);
    expect(src).not.toMatch(/req\.params\.id\b/);
  });

  test('every branch read pins effectiveBranchScope(req) FIRST (no raw spoof)', () => {
    // any surviving req.query.branchId / req.body.branchId must be a fallback
    // AFTER the restricted-caller pin
    expect(src).not.toMatch(/(?<!effectiveBranchScope\(req\) \|\| )req\.query\.branchId/);
    expect(src).not.toMatch(/branchId:\s*req\.user\?\.branchId\s*\|\|\s*req\.body\.branchId/);
    const pins = src.match(/effectiveBranchScope\(req\)/g) || [];
    expect(pins.length).toBeGreaterThanOrEqual(3); // generate + list + dashboard
  });

  test('never reads the phantom req.branchId (W269h class)', () => {
    expect(src).not.toMatch(/req\.branchId\b/);
  });
});

describe('W1166 — static wiring (workflow routes)', () => {
  let src;
  beforeAll(() => {
    src = fs.readFileSync(WF_ROUTES, 'utf8');
  });

  test('imports the guard kit and populates branchScope', () => {
    expect(src).toMatch(/assertBranchMatch/);
    expect(src).toMatch(/effectiveBranchScope/);
    expect(src).toMatch(/enforceBeneficiaryBranch/);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(src).toMatch(/router\.use\(\s*requireBranchAccess\s*\)/);
  });

  test('wires episodeId + taskId branch-or-beneficiary param hooks', () => {
    expect(src).toMatch(
      /router\.param\(\s*['"]episodeId['"]\s*,\s*branchOrBeneficiaryParam\(\s*['"]EpisodeOfCare['"]/
    );
    expect(src).toMatch(
      /router\.param\(\s*['"]taskId['"]\s*,\s*branchOrBeneficiaryParam\(\s*['"]WorkflowTask['"]/
    );
  });

  test('journey/start enforces beneficiary branch ownership (anti body-spoof)', () => {
    expect(src).toMatch(/enforceBeneficiaryBranch\(req,\s*beneficiaryId\)/);
  });

  test('every branch read pins effectiveBranchScope(req) FIRST (no raw spoof)', () => {
    expect(src).not.toMatch(/(?<!effectiveBranchScope\(req\) \|\| )req\.query\.branchId/);
    expect(src).not.toMatch(/branchId:\s*req\.user\?\.branchId\s*\|\|\s*req\.body\.branchId/);
    const pins = src.match(/effectiveBranchScope\(req\)/g) || [];
    expect(pins.length).toBeGreaterThanOrEqual(4); // start + dashboard + analytics + overdue
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
 * Shared behavioral suite (W1160 lineage) for branch-keyed param hooks:
 * loads the router with mongoose.model mocked so `modelName` resolves to a
 * stub, then drives the hook directly through the canonical cases.
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
  title: 'W1166 — behavioral (reportId param hook — reports)',
  routerPath: '../domains/reports/routes/reports.routes',
  paramName: 'reportId',
  modelName: 'GeneratedReport',
  docId: 'gr1',
});

describeParamHookSuite({
  title: 'W1166 — behavioral (episodeId param hook — workflow)',
  routerPath: '../domains/workflow/routes/workflow.routes',
  paramName: 'episodeId',
  modelName: 'EpisodeOfCare',
  docId: 'ep1',
});

describeParamHookSuite({
  title: 'W1166 — behavioral (taskId param hook — workflow)',
  routerPath: '../domains/workflow/routes/workflow.routes',
  paramName: 'taskId',
  modelName: 'WorkflowTask',
  docId: 'wt1',
});

/* ─── behavioral: notification USER-ownership hook (custom shape) ─────────── */

describe('W1166 — behavioral (notificationId ownership hook)', () => {
  let router;
  let model;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');
    model = _stubModel(undefined);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Notification') return model;
      return _stubModel(null);
    });
    router = require('../domains/notifications/routes/notifications.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function _mockDoc(doc) {
    model.findById.mockImplementation(() => ({
      select: () => ({ lean: () => Promise.resolve(doc) }),
    }));
  }

  function _handler() {
    const fns = router.params && router.params.notificationId;
    return Array.isArray(fns) && fns[0];
  }

  test('router registers a notificationId param callback', () => {
    expect(typeof _handler()).toBe('function');
  });

  test('403 when the notification belongs to ANOTHER user (IDOR closed)', async () => {
    _mockDoc({ _id: 'n1', recipientId: 'user-B' });
    const req = {
      user: { _id: 'user-A' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('next() when the caller OWNS the notification', async () => {
    _mockDoc({ _id: 'n1', recipientId: 'user-A' });
    const req = {
      user: { _id: 'user-A' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('next() for cross-branch (unrestricted) management roles', async () => {
    _mockDoc({ _id: 'n1', recipientId: 'user-B' });
    const req = { user: { _id: 'user-A' }, branchScope: { restricted: false } };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(next).toHaveBeenCalledWith();
    expect(res._status).toBeUndefined();
  });

  test('404 when the notification does not exist', async () => {
    _mockDoc(null);
    const req = {
      user: { _id: 'user-A' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, '507f1f77bcf86cd799439011');
    expect(res._status).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('non-ObjectId param value falls through without a DB hit', async () => {
    model.findById.mockClear();
    const req = {
      user: { _id: 'user-A' },
      branchScope: { restricted: true, branchId: 'branch-A' },
    };
    const res = _mockRes();
    const next = jest.fn();
    await _handler()(req, res, next, 'me');
    expect(next).toHaveBeenCalledWith();
    expect(model.findById).not.toHaveBeenCalled();
  });
});
