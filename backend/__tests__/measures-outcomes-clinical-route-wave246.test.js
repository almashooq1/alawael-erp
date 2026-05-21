'use strict';

/**
 * measures-outcomes-clinical-route-wave246.test.js — Wave 246.
 *
 * HTTP surface for W245 clinical-deep-dive report. Mirror of W241
 * (family-report) + W244 (ministry) — completes the trilogy on the
 * HTTP layer. Same direct-exec testing pattern (avoids supertest +
 * global mongoose mock 60s timeouts; matches W226/W233 convention).
 *
 *   Registration:
 *     - Module still loads after the W246 extension
 *     - Endpoint registered: GET /clinical-report/:beneficiaryId
 *     - Registry boot log mentions 8 endpoints + W245 clinical
 *
 *   Handler delegation:
 *     - Happy path → {success, data}
 *     - includeCorrections=false → opts.includeCorrections=false
 *     - includeCorrections=0 → also false (numeric falsy)
 *     - includeCorrections=true (default) → no opt passed
 *     - 400 when :beneficiaryId missing
 *     - 503 when service returns models_unavailable
 *     - 500 on unexpected service throw
 */

describe('W246 — clinical-report route registration', () => {
  test('module still loads cleanly after W246 extension', () => {
    expect(() => require('../routes/measures-outcomes.routes')).not.toThrow();
  });

  test('GET /clinical-report/:beneficiaryId is registered', () => {
    const router = require('../routes/measures-outcomes.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toContain('GET /clinical-report/:beneficiaryId');
  });

  test('registry boot log mentions 8 endpoints + W245 clinical', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'registries', 'clinical-assessment.registry.js'),
      'utf8'
    );
    expect(src).toMatch(/Measures Outcomes routes mounted \(\d+ endpoints/);
    expect(src).toMatch(/W245 clinical/i);
  });
});

describe('W246 — handler delegation with stubbed service', () => {
  let stub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    stub = {
      generate: jest.fn(),
    };
    jest.doMock('../services/measureClinicalReport.service', () => stub);

    router = require('../routes/measures-outcomes.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureClinicalReport.service');
    jest.resetModules();
  });

  function getHandler(method, path) {
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

  test('happy path: wraps W245 payload in {success, data}', async () => {
    stub.generate.mockResolvedValueOnce({
      reportType: 'CLINICAL_DEEP_DIVE',
      beneficiaryId: 'abc',
      measures: [{ measureCode: 'BERG', trend: { classification: 'linear_improvement' } }],
      citations: [{ measureCode: 'BERG', mcidSource: 'Donoghue 2009' }],
      summary: { totalAdmins: 4 },
    });
    const h = getHandler('GET', '/clinical-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: {} }, res);
    expect(res._body.success).toBe(true);
    expect(res._body.data.reportType).toBe('CLINICAL_DEEP_DIVE');
    expect(res._body.data.summary.totalAdmins).toBe(4);
    expect(stub.generate).toHaveBeenCalledWith('abc', {});
  });

  test('includeCorrections=false → passes opt to service', async () => {
    stub.generate.mockResolvedValueOnce({ measures: [] });
    const h = getHandler('GET', '/clinical-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: { includeCorrections: 'false' } }, res);
    expect(stub.generate).toHaveBeenLastCalledWith('abc', { includeCorrections: false });
  });

  test('includeCorrections=0 → also false (numeric falsy form)', async () => {
    stub.generate.mockResolvedValueOnce({ measures: [] });
    const h = getHandler('GET', '/clinical-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: { includeCorrections: '0' } }, res);
    expect(stub.generate).toHaveBeenLastCalledWith('abc', { includeCorrections: false });
  });

  test('includeCorrections=true (default) → no explicit opt', async () => {
    stub.generate.mockResolvedValueOnce({ measures: [] });
    const h = getHandler('GET', '/clinical-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: { includeCorrections: 'true' } }, res);
    const opts = stub.generate.mock.calls[stub.generate.mock.calls.length - 1][1];
    expect(opts.includeCorrections).toBeUndefined();
  });

  test('400 when beneficiaryId missing', async () => {
    const h = getHandler('GET', '/clinical-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: {}, query: {} }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/beneficiaryId required/);
  });

  test('503 when service returns models_unavailable', async () => {
    stub.generate.mockResolvedValueOnce({
      error: 'models_unavailable',
      beneficiaryId: 'abc',
    });
    const h = getHandler('GET', '/clinical-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: {} }, res);
    expect(res._status).toBe(503);
    expect(res._body.error).toBe('models_unavailable');
  });

  test('500 on unexpected service throw', async () => {
    stub.generate.mockRejectedValueOnce(new Error('boom'));
    const h = getHandler('GET', '/clinical-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: {} }, res);
    expect(res._status).toBe(500);
  });
});
