'use strict';

/**
 * anomalous-admins-route-wave257h.test.js — Wave 257h.
 *
 * HTTP surface for W257g listAnomalousAdmins. Pure route-layer
 * coverage via direct-exec pattern (mirrors W251). Service behavior
 * verified by W257g suite.
 *
 *   Registration:
 *     - Module still loads after the W257h extension
 *     - Endpoint registered: GET /anomalous-admins
 *     - Health endpoint mentions 21 endpoints + W257h
 *
 *   Param parsing:
 *     - branchId from query
 *     - branchId falls back to req.branchId when query omitted
 *     - from/to passed through as strings (service parses Date)
 *     - severity/flagType passed through
 *     - includeSuperseded coerced from 'true' / '1'
 *     - limit coerced to Number
 *
 *   Handler delegation:
 *     - Happy path → {success, data}
 *     - Invalid severity → 400 (service throws "Invalid severity")
 *     - Unexpected service throw → 500
 */

describe('W257h — anomalous-admins route registration', () => {
  test('module still loads cleanly after W257h extension', () => {
    expect(() => require('../routes/measures-workflow.routes')).not.toThrow();
  });

  test('GET /anomalous-admins is registered', () => {
    const router = require('../routes/measures-workflow.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toContain('GET /anomalous-admins');
  });

  test('_health endpoint advertises W257h + 21 endpoints', () => {
    const router = require('../routes/measures-workflow.routes');
    const layer = router.stack.find(
      l => l.route && l.route.path === '/_health' && l.route.methods.get
    );
    expect(layer).toBeDefined();
    const handler = layer.route.stack[layer.route.stack.length - 1].handle;
    const res = {};
    res.json = jest.fn(body => {
      res._body = body;
    });
    handler({}, res);
    expect(res._body.data.wave).toContain('W257h');
    expect(res._body.data.endpoints).toBe(21);
    expect(res._body.data.services.some(s => /W257h/.test(s))).toBe(true);
  });
});

describe('W257h — handler param parsing + delegation', () => {
  let stub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    stub = {
      listAnomalousAdmins: jest.fn(),
    };
    jest.doMock('../services/measureAdministration.service', () => stub);
    router = require('../routes/measures-workflow.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureAdministration.service');
    jest.resetModules();
  });

  beforeEach(() => {
    stub.listAnomalousAdmins.mockReset();
  });

  function getHandler() {
    const layer = router.stack.find(
      l => l.route && l.route.path === '/anomalous-admins' && l.route.methods.get
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

  test('happy path returns {success, data}', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({
      items: [{ _id: 'a1', anomalyFlags: [{ type: 'IMPOSSIBLY_FAST_ADMIN' }] }],
      total: 1,
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    expect(res._body).toEqual({
      success: true,
      data: { items: [{ _id: 'a1', anomalyFlags: [{ type: 'IMPOSSIBLY_FAST_ADMIN' }] }], total: 1 },
    });
  });

  test('branchId query param is passed through', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: { branchId: 'b123' } }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'b123' })
    );
  });

  test('branchId falls back to req.branchId when query omitted', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: {}, branchId: 'middleware-set' }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'middleware-set' })
    );
  });

  test('from/to are passed through as-is (service handles Date parsing)', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: { from: '2026-01-01', to: '2026-03-01' } }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-01-01', to: '2026-03-01' })
    );
  });

  test('severity + flagType passed through', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: { severity: 'high', flagType: 'OUT_OF_RANGE_SCORE' } }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'high', flagType: 'OUT_OF_RANGE_SCORE' })
    );
  });

  test('includeSuperseded=true coerced from string', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: { includeSuperseded: 'true' } }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ includeSuperseded: true })
    );
  });

  test('includeSuperseded=1 also coerced to true', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: { includeSuperseded: '1' } }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ includeSuperseded: true })
    );
  });

  test('includeSuperseded defaults to false when omitted', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: {} }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ includeSuperseded: false })
    );
  });

  test('limit coerced to Number', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h({ query: { limit: '25' } }, fakeRes());
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });

  test('invalid severity → 400', async () => {
    stub.listAnomalousAdmins.mockRejectedValueOnce(new Error('Invalid severity: garbage'));
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { severity: 'garbage' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
    expect(res._body.error).toMatch(/Invalid severity/);
  });

  test('unexpected service throw → 500', async () => {
    stub.listAnomalousAdmins.mockRejectedValueOnce(new Error('database connection lost'));
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });
});
