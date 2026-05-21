'use strict';

/**
 * measures-outcomes-comparison-route-wave251.test.js — Wave 251.
 *
 * HTTP surface for W250 cross-branch ministry comparison. Pure
 * route-layer coverage via direct-exec pattern. Service behavior is
 * verified by the W250 suite.
 *
 *   Registration:
 *     - Module still loads after the W251 extension
 *     - Endpoint registered: GET /ministry-comparison
 *     - Registry boot log mentions 9 endpoints + W250 comparison
 *
 *   Param parsing:
 *     - branchIds=a,b,c → ['a','b','c']
 *     - branchIds as repeated query (Express array form)
 *     - empty branchIds → 400
 *     - missing branchIds → 400
 *     - year out of range → 400
 *     - month out of range → 400
 *     - missing year/month → 400
 *
 *   Handler delegation:
 *     - Happy path → {success, data}
 *     - 500 on unexpected service throw
 *     - Per-branch errors propagate inside data (NOT 500)
 */

describe('W251 — comparison route registration', () => {
  test('module still loads cleanly after W251 extension', () => {
    expect(() => require('../routes/measures-outcomes.routes')).not.toThrow();
  });

  test('GET /ministry-comparison is registered', () => {
    const router = require('../routes/measures-outcomes.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toContain('GET /ministry-comparison');
  });

  test('registry boot log mentions 9 endpoints + W250 comparison', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'registries', 'clinical-assessment.registry.js'),
      'utf8'
    );
    expect(src).toMatch(/Measures Outcomes routes mounted \(\d+ endpoints/);
    expect(src).toMatch(/W250 .*comparison/i);
  });
});

describe('W251 — handler param parsing + delegation', () => {
  let stub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    stub = {
      compareBranches: jest.fn(),
    };
    jest.doMock('../services/measureMinistryComparison.service', () => stub);

    router = require('../routes/measures-outcomes.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureMinistryComparison.service');
    jest.resetModules();
  });

  function getHandler() {
    const layer = router.stack.find(
      l => l.route && l.route.path === '/ministry-comparison' && l.route.methods.get
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function fakeRes() {
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

  test('happy path: CSV branchIds + valid year/month', async () => {
    stub.compareBranches.mockResolvedValueOnce({
      reportType: 'MOHRSD_MONTHLY_COMPARISON',
      branches: [{ branchId: 'a' }, { branchId: 'b' }, { branchId: 'c' }],
      organizationTotals: { branchesReporting: 3 },
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: 'a,b,c', year: '2026', month: '5' } }, res);
    expect(res._body.success).toBe(true);
    expect(res._body.data.reportType).toBe('MOHRSD_MONTHLY_COMPARISON');
    expect(stub.compareBranches).toHaveBeenCalledWith({
      branchIds: ['a', 'b', 'c'],
      year: 2026,
      month: 5,
    });
  });

  test('branchIds as repeated query (Express array form)', async () => {
    stub.compareBranches.mockResolvedValueOnce({ branches: [] });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: ['a', 'b'], year: '2026', month: '5' } }, res);
    expect(stub.compareBranches).toHaveBeenLastCalledWith({
      branchIds: ['a', 'b'],
      year: 2026,
      month: 5,
    });
  });

  test('branchIds with whitespace trimmed + empty entries dropped', async () => {
    stub.compareBranches.mockResolvedValueOnce({ branches: [] });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: ' a , , b ', year: '2026', month: '5' } }, res);
    expect(stub.compareBranches).toHaveBeenLastCalledWith({
      branchIds: ['a', 'b'],
      year: 2026,
      month: 5,
    });
  });

  test('400 when branchIds missing', async () => {
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { year: '2026', month: '5' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/branchIds required/);
  });

  test('400 when branchIds is only whitespace + commas', async () => {
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: ' , , ', year: '2026', month: '5' } }, res);
    expect(res._status).toBe(400);
  });

  test('400 when year out of range', async () => {
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: 'a', year: '1800', month: '5' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/year required/);
  });

  test('400 when month out of range', async () => {
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: 'a', year: '2026', month: '13' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/month required/);
  });

  test('400 when year missing entirely', async () => {
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: 'a', month: '5' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/year required/);
  });

  test('per-branch errors propagate inside data (NOT 500)', async () => {
    stub.compareBranches.mockResolvedValueOnce({
      branches: [
        { branchId: 'a', outcomes: { mcidAchievementRate: 0.5 } },
        { branchId: 'b', error: 'models_unavailable' },
      ],
      organizationTotals: { branchesReporting: 1, branchesErrored: 1 },
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: 'a,b', year: '2026', month: '5' } }, res);
    expect(res._status).toBeUndefined(); // default 200
    expect(res._body.success).toBe(true);
    expect(res._body.data.organizationTotals.branchesErrored).toBe(1);
    expect(res._body.data.branches[1].error).toBe('models_unavailable');
  });

  test('500 on unexpected service throw', async () => {
    stub.compareBranches.mockRejectedValueOnce(new Error('boom'));
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchIds: 'a', year: '2026', month: '5' } }, res);
    expect(res._status).toBe(500);
  });
});
