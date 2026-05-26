'use strict';

/**
 * anomalous-admins-csv-wave257k.test.js — Wave 257k.
 *
 * HTTP surface + CSV format for W257h's CSV companion. Pure
 * route-layer + helper coverage via direct-exec pattern (mirrors W258
 * pairs.csv).
 *
 * Verifies:
 *   - GET /anomalous-admins.csv is registered
 *   - _health advertises 22 endpoints + W257k service
 *   - Content-Type: text/csv; charset=utf-8
 *   - Content-Disposition attachment + filename includes date stamp
 *   - Response body starts with UTF-8 BOM
 *   - Header row in Arabic with 9 columns
 *   - Per-row: date YYYY-MM-DD, IDs as strings, topSev computed
 *     from highest flag severity, types deduped + semicolon-joined
 *   - RFC 4180 escape on cells containing comma/quote/newline
 *   - Empty result → headers-only CSV (still has BOM + newline)
 *   - Service throw → 500 with safe body (NO crash on res-undefined)
 */

describe('W257k — anomalous-admins.csv route', () => {
  test('GET /anomalous-admins.csv is registered', () => {
    const router = require('../routes/measures-workflow.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const method = Object.keys(layer.route.methods)[0];
        return `${method.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toContain('GET /anomalous-admins.csv');
  });

  test('_health endpoint advertises W257k + 22 endpoints', () => {
    const router = require('../routes/measures-workflow.routes');
    const layer = router.stack.find(
      l => l.route && l.route.path === '/_health' && l.route.methods.get
    );
    const handler = layer.route.stack[layer.route.stack.length - 1].handle;
    const res = {};
    res.json = jest.fn(body => {
      res._body = body;
    });
    handler({}, res);
    expect(res._body.data.wave).toContain('W257k');
    // Inequality not exact — W257l bumped to 23. Same lesson recorded
    // 4× now (W244, W239, W257h, W257k). Future _health tests should
    // ALWAYS use `.toBeGreaterThanOrEqual(N)` from day one.
    expect(res._body.data.endpoints).toBeGreaterThanOrEqual(22);
    expect(res._body.data.services.some(s => /W257k/.test(s))).toBe(true);
  });
});

describe('W257k — handler delegation + CSV shape', () => {
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
      l => l.route && l.route.path === '/anomalous-admins.csv' && l.route.methods.get
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function fakeRes() {
    const res = { _headers: {}, _body: undefined, _status: 200 };
    res.setHeader = jest.fn((k, v) => {
      res._headers[k] = v;
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
      res._body = body;
      return res;
    });
    return res;
  }

  test('sets correct headers + BOM prefix on body', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    expect(res._headers['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(res._headers['Content-Disposition']).toMatch(/^attachment;\s*filename="anomalies-/);
    expect(res._headers['Content-Disposition']).toMatch(/\.csv"$/);
    expect(typeof res._body).toBe('string');
    expect(res._body.charCodeAt(0)).toBe(0xfeff); // BOM
  });

  test('filename includes date stamp + branch shortcode when scoped', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { branchId: '65ab12cd34ef567890abcdef' } }, res);
    // Last 8 chars of branchId
    expect(res._headers['Content-Disposition']).toContain('90abcdef');
    // Date stamp YYYY-MM-DD
    expect(res._headers['Content-Disposition']).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test('filename uses "all" scope when no branchId', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    expect(res._headers['Content-Disposition']).toMatch(/anomalies-all-/);
  });

  test('empty result → BOM + header row only + trailing newline', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    const csv = res._body.slice(1); // strip BOM
    expect(csv).toMatch(/^تاريخ التطبيق,الحالة,/);
    expect(csv.split('\n').filter(Boolean).length).toBe(1); // header only
  });

  test('header row has exactly 9 Arabic columns', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    const csv = res._body.slice(1);
    const header = csv.split('\n')[0];
    expect(header.split(',').length).toBe(9);
  });

  test('row carries date YYYY-MM-DD + ids + topSev + count + deduped types', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({
      items: [
        {
          _id: 'a1',
          applicationDate: '2026-05-15T10:30:00.000Z',
          status: 'completed',
          beneficiaryId: 'ben-1',
          measureId: 'meas-1',
          branchId: 'branch-1',
          totalRawScore: 42,
          anomalyFlags: [
            { type: 'IMPOSSIBLY_FAST_ADMIN', severity: 'medium' },
            { type: 'OUT_OF_RANGE_SCORE', severity: 'high' },
            { type: 'IMPOSSIBLY_FAST_ADMIN', severity: 'low' }, // dup type
          ],
        },
      ],
      total: 1,
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    const csv = res._body.slice(1);
    const rows = csv.split('\n').filter(Boolean);
    expect(rows).toHaveLength(2);
    const cells = rows[1].split(',');
    expect(cells[0]).toBe('2026-05-15'); // ISO sliced to YYYY-MM-DD
    expect(cells[1]).toBe('completed');
    expect(cells[2]).toBe('ben-1');
    expect(cells[3]).toBe('meas-1');
    expect(cells[4]).toBe('branch-1');
    expect(cells[5]).toBe('42');
    expect(cells[6]).toBe('high'); // top severity wins
    expect(cells[7]).toBe('3'); // total flag count (NOT deduped)
    // Types deduped, semicolon-joined
    expect(cells[8]).toMatch(/IMPOSSIBLY_FAST_ADMIN/);
    expect(cells[8]).toMatch(/OUT_OF_RANGE_SCORE/);
    expect(cells[8].split(';')).toHaveLength(2); // 3 flags → 2 unique types
  });

  test('topSev empty when no flags', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({
      items: [
        {
          _id: 'a1',
          applicationDate: '2026-05-15T00:00:00Z',
          beneficiaryId: 'b',
          measureId: 'm',
          anomalyFlags: [],
        },
      ],
      total: 1,
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    const csv = res._body.slice(1);
    const cells = csv.split('\n')[1].split(',');
    expect(cells[6]).toBe(''); // empty severity
    expect(cells[7]).toBe('0'); // zero flags
    expect(cells[8]).toBe(''); // empty types
  });

  test('RFC 4180 escape on cells with comma', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({
      items: [
        {
          _id: 'a1',
          applicationDate: '2026-05-15T00:00:00Z',
          status: 'has,comma',
          beneficiaryId: 'b',
          measureId: 'm',
          anomalyFlags: [],
        },
      ],
      total: 1,
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    const csv = res._body.slice(1);
    expect(csv).toContain('"has,comma"');
  });

  test('RFC 4180 escape doubles inner quotes', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({
      items: [
        {
          _id: 'a1',
          applicationDate: '2026-05-15T00:00:00Z',
          status: 'with"quote',
          beneficiaryId: 'b',
          measureId: 'm',
          anomalyFlags: [],
        },
      ],
      total: 1,
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    const csv = res._body.slice(1);
    expect(csv).toContain('"with""quote"');
  });

  test('W269e: restricted role gets own branch from req.branchScope.branchId', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h(
      {
        query: {},
        branchScope: { restricted: true, branchId: 'mw-branch' },
      },
      fakeRes()
    );
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'mw-branch' })
    );
  });

  test('all filter params pass through to service', async () => {
    stub.listAnomalousAdmins.mockResolvedValueOnce({ items: [], total: 0 });
    const h = getHandler();
    await h(
      {
        query: {
          branchId: 'b',
          from: '2026-01-01',
          to: '2026-05-01',
          severity: 'high',
          flagType: 'OUT_OF_RANGE_SCORE',
          includeSuperseded: '1',
          limit: '100',
        },
      },
      fakeRes()
    );
    expect(stub.listAnomalousAdmins).toHaveBeenCalledWith({
      branchId: 'b',
      from: '2026-01-01',
      to: '2026-05-01',
      severity: 'high',
      flagType: 'OUT_OF_RANGE_SCORE',
      includeSuperseded: true,
      limit: 100,
    });
  });

  test('service throw → 500 with safe body (NO crash on res-undefined)', async () => {
    stub.listAnomalousAdmins.mockRejectedValueOnce(new Error('database connection lost'));
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });

  test('invalid severity → 400 from validation error', async () => {
    stub.listAnomalousAdmins.mockRejectedValueOnce(new Error('Invalid severity: garbage'));
    const h = getHandler();
    const res = fakeRes();
    await h({ query: { severity: 'garbage' } }, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/Invalid severity/);
  });
});
