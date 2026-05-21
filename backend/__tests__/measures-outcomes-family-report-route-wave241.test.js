'use strict';

/**
 * measures-outcomes-family-report-route-wave241.test.js — Wave 241.
 *
 * Tests for the new GET /family-report/:beneficiaryId endpoint added
 * to the W233 measures-outcomes routes. Same direct-exec testing
 * pattern as W233 (avoids supertest fighting the global mongoose
 * mock; runs in milliseconds).
 *
 *   - Module still loads after the W241 extension
 *   - Endpoint registered (route stack carries it)
 *   - Registry mount log mentions family report (governance + ops)
 *   - Handler delegates to W240 service with includeHidden parsing
 *   - 400 when :beneficiaryId missing
 *   - 503 when service returns models_unavailable
 *   - 500 on unexpected service error
 */

describe('W241 — family-report route registration', () => {
  test('module still loads cleanly after W241 extension', () => {
    expect(() => require('../routes/measures-outcomes.routes')).not.toThrow();
  });

  test('GET /family-report/:beneficiaryId is registered', () => {
    const router = require('../routes/measures-outcomes.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toContain('GET /family-report/:beneficiaryId');
  });

  test('registry boot log mentions family report (5 endpoints, W240)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'registries', 'clinical-assessment.registry.js'),
      'utf8'
    );
    expect(src).toMatch(/Measures Outcomes routes mounted \(5 endpoints/);
    expect(src).toMatch(/W240 family-friendly Arabic report/);
  });
});

describe('W241 — handler delegation with stubbed service', () => {
  let stub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    stub = {
      generate: jest.fn(),
    };
    jest.doMock('../services/measureFamilyReport.service', () => stub);

    router = require('../routes/measures-outcomes.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureFamilyReport.service');
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

  test('happy path: wraps W240 payload in {success, data}', async () => {
    stub.generate.mockResolvedValueOnce({
      beneficiaryId: 'abc',
      overallStatus: 'progressing',
      headline: 'طفلك يحقّق تقدّماً ملموساً',
      headlineColor: 'green',
      measures: [],
      alertParagraphs: [],
    });
    const h = getHandler('GET', '/family-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: {} }, res);
    expect(res._body.success).toBe(true);
    expect(res._body.data.overallStatus).toBe('progressing');
    expect(res._body.data.headline).toMatch(/تقدّماً/);
    expect(stub.generate).toHaveBeenCalledWith('abc', {});
  });

  test('includeHidden=true → passes includeHiddenMeasures:true to service', async () => {
    stub.generate.mockResolvedValueOnce({ measures: [] });
    const h = getHandler('GET', '/family-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: { includeHidden: 'true' } }, res);
    expect(stub.generate).toHaveBeenLastCalledWith('abc', { includeHiddenMeasures: true });
  });

  test('includeHidden=1 also opts in (numeric truthy)', async () => {
    stub.generate.mockResolvedValueOnce({ measures: [] });
    const h = getHandler('GET', '/family-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: { includeHidden: '1' } }, res);
    expect(stub.generate).toHaveBeenLastCalledWith('abc', { includeHiddenMeasures: true });
  });

  test('includeHidden=false → hidden measures stay dropped (default)', async () => {
    stub.generate.mockResolvedValueOnce({ measures: [] });
    const h = getHandler('GET', '/family-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: { includeHidden: 'false' } }, res);
    const call = stub.generate.mock.calls[stub.generate.mock.calls.length - 1];
    expect(call[1].includeHiddenMeasures).toBeUndefined();
  });

  test('400 when beneficiaryId missing', async () => {
    const h = getHandler('GET', '/family-report/:beneficiaryId');
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
    const h = getHandler('GET', '/family-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: {} }, res);
    expect(res._status).toBe(503);
    expect(res._body.error).toBe('models_unavailable');
  });

  test('500 on unexpected service throw', async () => {
    stub.generate.mockRejectedValueOnce(new Error('boom'));
    const h = getHandler('GET', '/family-report/:beneficiaryId');
    const res = fakeRes();
    await h({ params: { beneficiaryId: 'abc' }, query: {} }, res);
    expect(res._status).toBe(500);
  });
});
