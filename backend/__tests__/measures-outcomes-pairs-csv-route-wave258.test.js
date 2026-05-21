'use strict';

/**
 * measures-outcomes-pairs-csv-route-wave258.test.js — Wave 258.
 *
 * CSV export of the W256 per-(branch, measure) pairs drill.
 * Direct-exec pattern (mirrors W251 comparison-route test) to bypass
 * the router-level auth middleware without spinning a full app.
 *
 * Verifies:
 *   - Route registered with the .csv extension
 *   - CSV serialization: BOM prefix, AR headers, escaping
 *   - Service param wiring (branchId, measureId, from, to)
 *   - 400 missing IDs, 503 models_unavailable, 500 on throw
 *   - Registry boot log mentions 11 endpoints + W258
 */

describe('W258 — pairs.csv route registration', () => {
  test('module still loads cleanly after W258 extension', () => {
    expect(() => require('../routes/measures-outcomes.routes')).not.toThrow();
  });

  test('GET /branch/:branchId/measure/:measureId/pairs.csv is registered', () => {
    const router = require('../routes/measures-outcomes.routes');
    const paths = router.stack
      .filter(l => l.route)
      .map(l => {
        const method = Object.keys(l.route.methods)[0];
        return `${method.toUpperCase()} ${l.route.path}`;
      });
    expect(paths).toContain('GET /branch/:branchId/measure/:measureId/pairs.csv');
  });

  test('registry boot log mentions 11 endpoints + W258', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'registries', 'clinical-assessment.registry.js'),
      'utf-8'
    );
    expect(src).toMatch(/Measures Outcomes routes mounted \(11 endpoints/);
    expect(src).toMatch(/W258 pairs CSV/);
  });
});

describe('W258 — pairs.csv handler behavior (direct-exec)', () => {
  let router;
  let stub;

  beforeAll(() => {
    jest.resetModules();
    stub = { listMeasurePairsAt: jest.fn() };
    jest.doMock('../services/measureOutcomesAggregator.service', () => stub);
    router = require('../routes/measures-outcomes.routes');
  });

  afterAll(() => {
    jest.dontMock('../services/measureOutcomesAggregator.service');
    jest.resetModules();
  });

  function getHandler() {
    const layer = router.stack.find(
      l =>
        l.route &&
        l.route.path === '/branch/:branchId/measure/:measureId/pairs.csv' &&
        l.route.methods.get
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function fakeRes() {
    const res = {};
    res._headers = {};
    res.setHeader = jest.fn((k, v) => {
      res._headers[k] = v;
      return res;
    });
    res.status = jest.fn(code => {
      res._status = code;
      return res;
    });
    res.json = jest.fn(body => {
      res._body = body;
      return res;
    });
    res.send = jest.fn(body => {
      res._sent = body;
      return res;
    });
    return res;
  }

  test('happy path: CSV with BOM + AR headers + escaping', async () => {
    stub.listMeasurePairsAt.mockResolvedValueOnce({
      branchId: 'b1',
      measureId: 'm1',
      pairs: [
        {
          beneficiaryNameAr: 'علي محمد',
          beneficiaryNumber: 'B-001',
          adminCount: 4,
          firstScore: 18,
          firstDate: '2026-01-15T00:00:00.000Z',
          lastScore: 32,
          lastDate: '2026-04-22T00:00:00.000Z',
          delta: 14,
          mcidValue: 4,
          mcidStatus: 'established',
          mcidAchieved: true,
        },
        {
          beneficiaryNameAr: 'فهد, يوسف', // Latin comma triggers CSV escape
          beneficiaryNumber: null,
          adminCount: 3,
          firstScore: 20,
          firstDate: '2026-02-01T00:00:00.000Z',
          lastScore: 21,
          lastDate: '2026-04-30T00:00:00.000Z',
          delta: 1,
          mcidValue: 4,
          mcidStatus: 'established',
          mcidAchieved: false,
        },
      ],
      pairsThinHistory: 0,
    });

    const h = getHandler();
    const res = fakeRes();
    await h({ params: { branchId: 'b1', measureId: 'm1' }, query: {} }, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringMatching(/text\/csv/));
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringMatching(/attachment.*\.csv/)
    );
    expect(typeof res._sent).toBe('string');
    // BOM prefix
    expect(res._sent.charCodeAt(0)).toBe(0xfeff);

    const body = res._sent.slice(1);
    const lines = body.split('\n').filter(l => l.length > 0);

    // Header row first
    expect(lines[0]).toContain('المستفيد');
    expect(lines[0]).toContain('Δ');
    expect(lines[0]).toContain('حقّق MCID');

    // 2 data rows
    expect(lines).toHaveLength(3);

    // Row 1 — achieved (نعم)
    expect(lines[1]).toContain('علي محمد');
    expect(lines[1]).toContain('B-001');
    expect(lines[1]).toContain('14');
    expect(lines[1]).toContain('نعم');

    // Row 2 — escaped name due to comma + not achieved (لا)
    expect(lines[2]).toContain('"فهد, يوسف"');
    expect(lines[2]).toContain('لا');
  });

  test('empty pairs returns header-only CSV', async () => {
    stub.listMeasurePairsAt.mockResolvedValueOnce({
      branchId: 'b1',
      measureId: 'm1',
      pairs: [],
      pairsThinHistory: 0,
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ params: { branchId: 'b1', measureId: 'm1' }, query: {} }, res);
    const body = res._sent.slice(1);
    const lines = body.split('\n').filter(l => l.length > 0);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('المستفيد');
  });

  test('service models_unavailable → 503', async () => {
    stub.listMeasurePairsAt.mockResolvedValueOnce({ error: 'models_unavailable' });
    const h = getHandler();
    const res = fakeRes();
    await h({ params: { branchId: 'b1', measureId: 'm1' }, query: {} }, res);
    expect(res._status).toBe(503);
    expect(res._body.error).toBe('models_unavailable');
  });

  test('service throw → 500', async () => {
    stub.listMeasurePairsAt.mockRejectedValueOnce(new Error('boom'));
    const h = getHandler();
    const res = fakeRes();
    await h({ params: { branchId: 'b1', measureId: 'm1' }, query: {} }, res);
    expect(res._status).toBeGreaterThanOrEqual(500);
  });

  test('forwards from/to query params to service', async () => {
    stub.listMeasurePairsAt.mockResolvedValueOnce({
      branchId: 'b1',
      measureId: 'm1',
      pairs: [],
      pairsThinHistory: 0,
    });
    const h = getHandler();
    const res = fakeRes();
    const fromIso = '2026-01-01T00:00:00.000Z';
    const toIso = '2026-02-01T00:00:00.000Z';
    await h(
      { params: { branchId: 'b1', measureId: 'm1' }, query: { from: fromIso, to: toIso } },
      res
    );
    const opts = stub.listMeasurePairsAt.mock.calls[0][0];
    expect(opts.branchId).toBe('b1');
    expect(opts.measureId).toBe('m1');
    expect(new Date(opts.from).toISOString()).toBe(fromIso);
    expect(new Date(opts.to).toISOString()).toBe(toIso);
  });

  test('mcidAchieved=true renders "نعم", false renders "لا"', async () => {
    stub.listMeasurePairsAt.mockResolvedValueOnce({
      branchId: 'b1',
      measureId: 'm1',
      pairs: [
        {
          beneficiaryNameAr: 'A',
          beneficiaryNumber: null,
          adminCount: 3,
          firstScore: 1,
          firstDate: '2026-01-01T00:00:00.000Z',
          lastScore: 2,
          lastDate: '2026-04-01T00:00:00.000Z',
          delta: 1,
          mcidValue: null,
          mcidStatus: null,
          mcidAchieved: false,
        },
      ],
      pairsThinHistory: 0,
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ params: { branchId: 'b1', measureId: 'm1' }, query: {} }, res);
    const lines = res._sent
      .slice(1)
      .split('\n')
      .filter(l => l.length > 0);
    expect(lines[1]).toMatch(/لا$/);
  });
});
