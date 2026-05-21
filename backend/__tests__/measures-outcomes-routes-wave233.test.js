'use strict';

/**
 * measures-outcomes-routes-wave233.test.js — Wave 233.
 *
 * Smoke + endpoint-registration tests for the W229 aggregator's HTTP
 * surface. Same shape as W226 routes test:
 *   - Module loads
 *   - All 4 endpoints registered
 *   - _health responds 200 without auth
 *   - Registry mount declared
 *   - Handler shapes via direct exec (avoids supertest fighting global
 *     mongoose mock; matches W226's approach)
 *
 * Service-layer behaviour is covered by the W229 aggregator suite.
 * Param-parsing edge cases (date / bucket / months) are covered there
 * via direct calls; the integration smoke here just exercises one
 * representative handler with a stubbed service.
 */

const express = require('express');
const request = require('supertest');

describe('W233 — measures-outcomes routes smoke', () => {
  test('module loads without throwing', () => {
    expect(() => require('../routes/measures-outcomes.routes')).not.toThrow();
  });

  test('all 4 documented endpoints registered', () => {
    const router = require('../routes/measures-outcomes.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });

    expect(paths).toEqual(
      expect.arrayContaining([
        'GET /_health',
        'GET /beneficiary/:beneficiaryId',
        'GET /branch/:branchId',
        'GET /branch/:branchId/timeseries',
      ])
    );
  });

  test('_health responds 200 with wave marker (no auth required)', async () => {
    const router = require('../routes/measures-outcomes.routes');
    const app = express();
    app.use(express.json());
    app.use('/measures-outcomes', router);
    const res = await request(app).get('/measures-outcomes/_health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.wave).toBe('W233');
    expect(res.body.surface).toBe('measures-outcomes');
  });
});

describe('W233 — registry mount declared', () => {
  test('clinical-assessment registry references measures-outcomes route', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'registries', 'clinical-assessment.registry.js'),
      'utf8'
    );
    expect(src).toMatch(/measures-outcomes\.routes/);
    expect(src).toMatch(/dualMount\(app,\s*'measures-outcomes'/);
  });

  test('aggregator service required by route file', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'measures-outcomes.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/measureOutcomesAggregator\.service/);
  });
});

describe('W233 — handler shape (direct exec, no supertest)', () => {
  // Avoids global-mongoose-mock fighting supertest + auth middleware.
  // Each test reaches into the router stack and calls the handler
  // directly with fake req/res objects.
  const router = require('../routes/measures-outcomes.routes');

  function findHandler(method, path) {
    const layer = router.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
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

  test('GET /_health handler returns wave marker', () => {
    const h = findHandler('GET', '/_health');
    expect(h).toBeTruthy();
    const res = fakeRes();
    h({}, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        wave: 'W233',
        surface: 'measures-outcomes',
      })
    );
  });

  test('GET /beneficiary handler returns 400 when :id missing', async () => {
    const h = findHandler('GET', '/beneficiary/:beneficiaryId');
    const res = fakeRes();
    await h({ params: {} }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/beneficiaryId required/);
  });

  test('GET /branch handler returns 400 when :id missing', async () => {
    const h = findHandler('GET', '/branch/:branchId');
    const res = fakeRes();
    await h({ params: {}, query: {} }, res);
    expect(res._status).toBe(400);
  });
});

describe('W233 — handler delegates to aggregator with param parsing', () => {
  // Fresh module load with mocked service to verify the wire.
  let stub;
  let routerWithStub;
  beforeAll(() => {
    jest.resetModules();
    stub = {
      aggregateBeneficiary: jest.fn().mockResolvedValue({ overallStatus: 'progressing' }),
      aggregateBranch: jest.fn().mockResolvedValue({ branchId: 'br1' }),
      aggregateBranchTimeseries: jest.fn().mockResolvedValue({ bucket: 'month', points: [] }),
    };
    jest.doMock('../services/measureOutcomesAggregator.service', () => stub);

    routerWithStub = require('../routes/measures-outcomes.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureOutcomesAggregator.service');
    jest.resetModules();
  });

  function getHandler(method, path) {
    const layer = routerWithStub.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function fakeRes() {
    const res = {};
    res.status = jest.fn(c => {
      res._status = c;
      return res;
    });
    res.json = jest.fn(b => {
      res._body = b;
      return res;
    });
    return res;
  }

  test('/beneficiary delegates beneficiaryId, wraps in {success, data}', async () => {
    const h = getHandler('GET', '/beneficiary/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' } }, res);
    expect(stub.aggregateBeneficiary).toHaveBeenCalledWith('abc');
    expect(res._body.success).toBe(true);
    expect(res._body.data.overallStatus).toBe('progressing');
  });

  test('/branch parses ISO from/to query params', async () => {
    const h = getHandler('GET', '/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { from: '2026-01-01', to: '2026-03-31' } }, res);
    expect(stub.aggregateBranch).toHaveBeenCalled();
    const opts = stub.aggregateBranch.mock.calls[stub.aggregateBranch.mock.calls.length - 1][1];
    expect(opts.from instanceof Date).toBe(true);
    expect(opts.to instanceof Date).toBe(true);
  });

  test('/branch ignores invalid date strings', async () => {
    const h = getHandler('GET', '/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { from: 'not-a-date' } }, res);
    const opts = stub.aggregateBranch.mock.calls[stub.aggregateBranch.mock.calls.length - 1][1];
    expect(opts.from).toBeUndefined();
  });

  test('/branch/timeseries: bucket=quarter respected, months clamped to 24', async () => {
    const h = getHandler('GET', '/branch/:branchId/timeseries');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { bucket: 'quarter', months: '999' } }, res);
    const opts =
      stub.aggregateBranchTimeseries.mock.calls[
        stub.aggregateBranchTimeseries.mock.calls.length - 1
      ][1];
    expect(opts.bucket).toBe('quarter');
    expect(opts.months).toBe(24);
  });

  test('/branch/timeseries: invalid bucket defaults to month', async () => {
    const h = getHandler('GET', '/branch/:branchId/timeseries');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { bucket: 'daily' } }, res);
    const opts =
      stub.aggregateBranchTimeseries.mock.calls[
        stub.aggregateBranchTimeseries.mock.calls.length - 1
      ][1];
    expect(opts.bucket).toBe('month');
  });

  test('/branch/timeseries: invalid months defaults to 6', async () => {
    const h = getHandler('GET', '/branch/:branchId/timeseries');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { months: 'abc' } }, res);
    const opts =
      stub.aggregateBranchTimeseries.mock.calls[
        stub.aggregateBranchTimeseries.mock.calls.length - 1
      ][1];
    expect(opts.months).toBe(6);
  });

  test('models_unavailable from service → 503', async () => {
    stub.aggregateBeneficiary.mockResolvedValueOnce({ error: 'models_unavailable' });
    const h = getHandler('GET', '/beneficiary/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' } }, res);
    expect(res._status).toBe(503);
    expect(res._body.error).toBe('models_unavailable');
  });
});

// Avoid the unused-import lint warning when supertest is only used once.
void request;
void express;
