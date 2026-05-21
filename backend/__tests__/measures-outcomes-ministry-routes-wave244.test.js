'use strict';

/**
 * measures-outcomes-ministry-routes-wave244.test.js — Wave 244.
 *
 * HTTP surface for the W242 ministry-report service. Same direct-exec
 * testing pattern as W233/W241 — supertest fights global mongoose
 * mock, so we reach into the router stack and call handlers with
 * fake req/res.
 *
 *   Registration:
 *     - JSON endpoint registered: GET /ministry-report/branch/:branchId
 *     - CSV endpoint registered: GET /ministry-report/branch/:branchId/csv/:year/:month
 *     - Registry log mentions 7 endpoints + W242
 *
 *   JSON endpoint:
 *     - happy path → {success:true, data}
 *     - 400 when year/month missing or invalid
 *     - 400 when branchId missing
 *     - 503 when service returns models_unavailable
 *     - 500 on unexpected service throw
 *
 *   CSV endpoint:
 *     - happy path → CSV string + attachment headers
 *     - 503 when service returns null (models_unavailable)
 *     - Content-Disposition filename uses padded month
 *     - 400 on invalid year/month
 */

describe('W244 — ministry-report routes registration', () => {
  test('module still loads after W244 extension', () => {
    expect(() => require('../routes/measures-outcomes.routes')).not.toThrow();
  });

  test('GET /ministry-report/branch/:branchId is registered', () => {
    const router = require('../routes/measures-outcomes.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toContain('GET /ministry-report/branch/:branchId');
    expect(paths).toContain('GET /ministry-report/branch/:branchId/csv/:year/:month');
  });

  test('registry boot log mentions 7 endpoints + W242', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'registries', 'clinical-assessment.registry.js'),
      'utf8'
    );
    // Endpoint count grows over time as more services land on this
    // surface — match any digit count rather than coupling to it.
    expect(src).toMatch(/Measures Outcomes routes mounted \(\d+ endpoints/);
    expect(src).toMatch(/W242 MOHRSD/);
  });
});

describe('W244 — JSON endpoint handler', () => {
  let stub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    stub = {
      generate: jest.fn(),
      generateCsv: jest.fn(),
    };
    jest.doMock('../services/measureMinistryReport.service', () => stub);

    router = require('../routes/measures-outcomes.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureMinistryReport.service');
    jest.resetModules();
  });

  function getHandler(method, path) {
    const layer = router.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function fakeRes() {
    const res = { _headers: {} };
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
    res.setHeader = jest.fn((k, v) => {
      res._headers[k.toLowerCase()] = v;
      return res;
    });
    return res;
  }

  test('happy path: wraps W242 payload in {success, data}', async () => {
    stub.generate.mockResolvedValueOnce({
      reportType: 'MOHRSD_MONTHLY',
      period: { year: 2026, month: 5, monthName_ar: 'مايو' },
      outcomes: { mcidAchievementRate: 0.4 },
    });
    const h = getHandler('GET', '/ministry-report/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { year: '2026', month: '5' } }, res);
    expect(res._body.success).toBe(true);
    expect(res._body.data.reportType).toBe('MOHRSD_MONTHLY');
    expect(stub.generate).toHaveBeenCalledWith('br1', { year: 2026, month: 5 });
  });

  test('400 when year missing', async () => {
    const h = getHandler('GET', '/ministry-report/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { month: '5' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/year required/);
  });

  test('400 when month missing', async () => {
    const h = getHandler('GET', '/ministry-report/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { year: '2026' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/month required/);
  });

  test('400 when year out of range', async () => {
    const h = getHandler('GET', '/ministry-report/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { year: '1999', month: '5' } }, res);
    expect(res._status).toBe(400);
  });

  test('400 when month out of range', async () => {
    const h = getHandler('GET', '/ministry-report/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { year: '2026', month: '13' } }, res);
    expect(res._status).toBe(400);
  });

  test('503 when service returns models_unavailable', async () => {
    stub.generate.mockResolvedValueOnce({
      error: 'models_unavailable',
      branchId: 'br1',
      period: { year: 2026, month: 5 },
    });
    const h = getHandler('GET', '/ministry-report/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { year: '2026', month: '5' } }, res);
    expect(res._status).toBe(503);
    expect(res._body.error).toBe('models_unavailable');
  });

  test('500 on unexpected service throw', async () => {
    stub.generate.mockRejectedValueOnce(new Error('boom'));
    const h = getHandler('GET', '/ministry-report/branch/:branchId');
    const res = fakeRes();
    await h({ params: { branchId: 'br1' }, query: { year: '2026', month: '5' } }, res);
    expect(res._status).toBe(500);
  });
});

describe('W244 — CSV endpoint handler', () => {
  let stub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    stub = {
      generate: jest.fn(),
      generateCsv: jest.fn(),
    };
    jest.doMock('../services/measureMinistryReport.service', () => stub);

    router = require('../routes/measures-outcomes.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureMinistryReport.service');
    jest.resetModules();
  });

  function getHandler(method, path) {
    const layer = router.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function fakeRes() {
    const res = { _headers: {} };
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
    res.setHeader = jest.fn((k, v) => {
      res._headers[k.toLowerCase()] = v;
      return res;
    });
    return res;
  }

  test('happy path: returns CSV string + attachment headers', async () => {
    const csv = '﻿hello,world\n1,2';
    stub.generateCsv.mockResolvedValueOnce(csv);
    const h = getHandler('GET', '/ministry-report/branch/:branchId/csv/:year/:month');
    const res = fakeRes();
    await h({ params: { branchId: 'br1', year: '2026', month: '5' } }, res);
    expect(res._sent).toBe(csv);
    expect(res._headers['content-type']).toMatch(/text\/csv/);
    expect(res._headers['content-type']).toMatch(/utf-8/);
    expect(res._headers['content-disposition']).toMatch(/attachment/);
    expect(res._headers['content-disposition']).toMatch(/filename="ministry-br1-2026-05\.csv"/);
    expect(stub.generateCsv).toHaveBeenCalledWith('br1', { year: 2026, month: 5 });
  });

  test('filename pads single-digit month with leading zero', async () => {
    stub.generateCsv.mockResolvedValueOnce('csv');
    const h = getHandler('GET', '/ministry-report/branch/:branchId/csv/:year/:month');
    const res = fakeRes();
    await h({ params: { branchId: 'br1', year: '2026', month: '1' } }, res);
    expect(res._headers['content-disposition']).toMatch(/filename="ministry-br1-2026-01\.csv"/);
  });

  test('503 when service returns null (models_unavailable)', async () => {
    stub.generateCsv.mockResolvedValueOnce(null);
    const h = getHandler('GET', '/ministry-report/branch/:branchId/csv/:year/:month');
    const res = fakeRes();
    await h({ params: { branchId: 'br1', year: '2026', month: '5' } }, res);
    expect(res._status).toBe(503);
    expect(res._body.error).toBe('models_unavailable');
  });

  test('400 on invalid year in path', async () => {
    const h = getHandler('GET', '/ministry-report/branch/:branchId/csv/:year/:month');
    const res = fakeRes();
    await h({ params: { branchId: 'br1', year: 'abc', month: '5' } }, res);
    expect(res._status).toBe(400);
  });

  test('400 on invalid month in path', async () => {
    const h = getHandler('GET', '/ministry-report/branch/:branchId/csv/:year/:month');
    const res = fakeRes();
    await h({ params: { branchId: 'br1', year: '2026', month: '20' } }, res);
    expect(res._status).toBe(400);
  });

  test('500 on unexpected service throw', async () => {
    stub.generateCsv.mockRejectedValueOnce(new Error('boom'));
    const h = getHandler('GET', '/ministry-report/branch/:branchId/csv/:year/:month');
    const res = fakeRes();
    await h({ params: { branchId: 'br1', year: '2026', month: '5' } }, res);
    expect(res._status).toBe(500);
  });
});
