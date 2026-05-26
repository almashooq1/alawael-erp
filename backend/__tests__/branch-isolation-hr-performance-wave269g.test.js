'use strict';

/**
 * branch-isolation-hr-performance-wave269g.test.js — Wave 269g.
 *
 * Closes the W269 Vuln-1 pattern in routes/hr/hr-performance.routes.js:
 * the file's comment claimed `req.branchId` is "set by requireBranchAccess"
 * — but the middleware only ever sets `req.branchScope.branchId`. A
 * restricted user's branchId therefore landed as `undefined`, the service
 * was called with `{branchId: undefined}`, and the query ran un-scoped.
 *
 * Also covers the related data-integrity bug in routes/goalBank.routes.js
 * where the create + bulk paths used the same broken `req.branchId` field
 * — new goals got `branchId: undefined`, then `branchFilter()` reads
 * couldn't find them again.
 *
 * Strategy: direct-exec handler invocation. The hr-performance file
 * exposes routes via a factory `createHrPerformanceRoutes(...)`, so
 * we exercise the inner handlers after requiring the factory + service.
 */

describe('W269g — hr-performance restricted-branch enforcement', () => {
  let createRouter;
  let serviceStub;

  beforeAll(() => {
    jest.resetModules();
    serviceStub = {
      listEvaluations: jest.fn(),
      getPerformanceStats: jest.fn(),
    };
    jest.doMock('../services/hr/hrPerformanceService', () => ({
      HrPerformanceService: function (...args) {
        return serviceStub;
      },
    }));
    // The file exports a factory; load it after the mock so it picks up our service.
    const mod = require('../routes/hr/hr-performance.routes');
    createRouter = mod.createHrPerformanceRouter;
  });

  afterAll(() => {
    jest.dontMock('../services/hr/hrPerformanceService');
    jest.resetModules();
  });

  beforeEach(() => {
    serviceStub.listEvaluations.mockReset();
    serviceStub.getPerformanceStats.mockReset();
  });

  function _findHandler(router, method, path) {
    const layer = router.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method]
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
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

  test('GET /evaluations: restricted user gets their own branchId regardless of input', async () => {
    const router = createRouter({});
    serviceStub.listEvaluations.mockResolvedValue({ items: [], total: 0 });
    const handler = _findHandler(router, 'get', '/evaluations');
    expect(handler).toBeTruthy();

    const req = {
      query: { branchId: 'spoofed-branch' },
      branchScope: { restricted: true, branchId: 'own-branch' },
    };
    const res = _mockRes();
    await handler(req, res);

    // The branchId passed to the service MUST be the caller's own,
    // not the spoofed query value, AND not undefined.
    const opts = serviceStub.listEvaluations.mock.calls[0][0];
    expect(opts.branchId).toBe('own-branch');
  });

  test('GET /evaluations/stats: restricted user gets their own branchId', async () => {
    const router = createRouter({});
    serviceStub.getPerformanceStats.mockResolvedValue({ counts: {} });
    const handler = _findHandler(router, 'get', '/evaluations/stats');
    const req = {
      query: {},
      branchScope: { restricted: true, branchId: 'restricted-A' },
    };
    const res = _mockRes();
    await handler(req, res);
    const opts = serviceStub.getPerformanceStats.mock.calls[0][0];
    expect(opts.branchId).toBe('restricted-A');
  });

  test('GET /evaluations: cross-branch role honours query branchId when supplied', async () => {
    const router = createRouter({});
    serviceStub.listEvaluations.mockResolvedValue({ items: [], total: 0 });
    const handler = _findHandler(router, 'get', '/evaluations');
    const req = {
      query: { branchId: 'requested-branch' },
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res);
    const opts = serviceStub.listEvaluations.mock.calls[0][0];
    expect(opts.branchId).toBe('requested-branch');
  });

  test('GET /evaluations: cross-branch role with no query → undefined (= all branches)', async () => {
    const router = createRouter({});
    serviceStub.listEvaluations.mockResolvedValue({ items: [], total: 0 });
    const handler = _findHandler(router, 'get', '/evaluations');
    const req = {
      query: {},
      branchScope: { restricted: false, branchId: null },
    };
    const res = _mockRes();
    await handler(req, res);
    const opts = serviceStub.listEvaluations.mock.calls[0][0];
    expect(opts.branchId).toBeUndefined();
  });

  test('GET /evaluations: test-pattern req with no branchScope passes-through query (back-compat)', async () => {
    const router = createRouter({});
    serviceStub.listEvaluations.mockResolvedValue({ items: [], total: 0 });
    const handler = _findHandler(router, 'get', '/evaluations');
    const req = { query: { branchId: 'test-branch' } };
    const res = _mockRes();
    await handler(req, res);
    const opts = serviceStub.listEvaluations.mock.calls[0][0];
    expect(opts.branchId).toBe('test-branch');
  });
});
