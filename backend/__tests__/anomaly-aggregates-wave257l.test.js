'use strict';

/**
 * anomaly-aggregates-wave257l.test.js — Wave 257l.
 *
 * Service-level integration tests for aggregateAnomalies() +
 * route-layer direct-exec tests for GET /anomalous-admins/aggregates.
 *
 * Verifies:
 *   Service:
 *     1. Empty DB → empty buckets + zero totals
 *     2. Single admin in one bucket → counted correctly
 *     3. Bucketing dedup: admin with 2 flags of same type/severity
 *        counts type once + severity once
 *     4. Multiple buckets → sorted ascending by period
 *     5. ISO week format YYYY-Www
 *     6. Month bucket YYYY-MM
 *     7. Branch filter narrows
 *     8. Date range from/to bounds
 *     9. Default window = last 90 days
 *    10. Corrected admins excluded by default
 *
 *   Route:
 *    11. GET /anomalous-admins/aggregates registered
 *    12. _health includes 23 endpoints + W257l
 *    13. Bucket query param coerced (only 'month'/'week')
 *    14. branchId fallback to req.branchId
 *    15. includeSuperseded coerced from 'true'/'1'
 *    16. Happy path delegation
 *    17. Service throw → 500
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Measure;
let MeasureApplication;
let measureAdmin;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w257l-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  measureAdmin = require('../services/measureAdministration.service');
  await Measure.init();
  await MeasureApplication.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
});

async function makeMeasure() {
  return Measure.create({
    code: 'BERG',
    name: 'BERG',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    minScore: 0,
    maxScore: 56,
    scoringDirection: 'higher_better',
    reassessment: { standardIntervalDays: 90 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'cite' },
    },
    targetPopulation: ['all'],
  });
}

function flag(type, severity = 'medium') {
  return { type, severity, evidence_ar: 'x', evidence_en: 'x' };
}

async function seedAdmin({ measure, branchId, applicationDate, flags = [], status = 'completed' }) {
  return MeasureApplication.create({
    beneficiaryId: new mongoose.Types.ObjectId(),
    measureId: measure._id,
    applicationDate,
    purpose: 'progress',
    assessorId: new mongoose.Types.ObjectId(),
    status,
    branchId,
    totalRawScore: 30,
    anomalyFlags: flags,
    scoredWithMeasureVersion: '1.0.0',
    scoredWithAlgorithmVersion: '1.0.0',
  });
}

// ─── Service tests ────────────────────────────────────────────────────

describe('W257l aggregateAnomalies — empty + basic shape', () => {
  test('empty DB returns zero buckets + zero totals', async () => {
    const out = await measureAdmin.aggregateAnomalies();
    expect(out.buckets).toEqual([]);
    expect(out.totals).toEqual({
      total: 0,
      byType: {},
      bySeverity: { low: 0, medium: 0, high: 0 },
    });
    expect(out.bucket).toBe('week');
  });

  test('default window is last 90 days', async () => {
    const out = await measureAdmin.aggregateAnomalies();
    const expectedFromMs = Date.now() - 90 * 86400000;
    // Within 1s tolerance for clock skew between the two calls
    expect(Math.abs(out.from.getTime() - expectedFromMs)).toBeLessThan(2000);
  });
});

describe('W257l aggregateAnomalies — within-admin dedup', () => {
  test('admin with 2 flags of same type counts type once, total once', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-15'),
      flags: [
        flag('IMPOSSIBLY_FAST_ADMIN', 'medium'),
        flag('IMPOSSIBLY_FAST_ADMIN', 'medium'), // duplicate
      ],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
    });
    expect(out.totals.total).toBe(1);
    expect(out.totals.byType.IMPOSSIBLY_FAST_ADMIN).toBe(1);
    expect(out.totals.bySeverity.medium).toBe(1);
  });

  test('admin with flags of different types counts each type', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'medium'), flag('OUT_OF_RANGE_SCORE', 'high')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
    });
    expect(out.totals.total).toBe(1);
    expect(out.totals.byType.IMPOSSIBLY_FAST_ADMIN).toBe(1);
    expect(out.totals.byType.OUT_OF_RANGE_SCORE).toBe(1);
    expect(out.totals.bySeverity.medium).toBe(1);
    expect(out.totals.bySeverity.high).toBe(1);
  });
});

describe('W257l aggregateAnomalies — bucketing', () => {
  test('week bucket format YYYY-Www', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
      bucket: 'week',
    });
    expect(out.buckets[0].period).toMatch(/^2026-W\d{2}$/);
  });

  test('month bucket format YYYY-MM', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
      bucket: 'month',
    });
    expect(out.buckets[0].period).toBe('2026-05');
  });

  test('buckets sorted ascending by period', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-01-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-03-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2025-12-01',
      to: '2026-06-01',
      bucket: 'month',
    });
    const periods = out.buckets.map(b => b.period);
    expect(periods).toEqual(['2026-01', '2026-03', '2026-05']);
  });

  test('multi-admin in same bucket aggregates total + byType/bySeverity', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-10'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'high')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-20'),
      flags: [flag('OUT_OF_RANGE_SCORE', 'high')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-25'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN', 'medium')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
      bucket: 'month',
    });
    const may = out.buckets.find(b => b.period === '2026-05');
    expect(may).toBeDefined();
    expect(may.total).toBe(3);
    expect(may.byType.IMPOSSIBLY_FAST_ADMIN).toBe(2);
    expect(may.byType.OUT_OF_RANGE_SCORE).toBe(1);
    expect(may.bySeverity.high).toBe(2);
    expect(may.bySeverity.medium).toBe(1);
  });
});

describe('W257l aggregateAnomalies — filters', () => {
  test('branchId narrows results', async () => {
    const measure = await makeMeasure();
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedAdmin({
      measure,
      branchId: branchA,
      applicationDate: new Date('2026-05-10'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      branchId: branchB,
      applicationDate: new Date('2026-05-10'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      branchId: branchA,
      from: '2026-04-01',
      to: '2026-06-01',
    });
    expect(out.totals.total).toBe(1);
  });

  test('from/to bounds exclude out-of-window admins', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-01-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-15'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
    });
    expect(out.totals.total).toBe(1);
  });

  test('corrected admins excluded by default', async () => {
    const measure = await makeMeasure();
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-10'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-10'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
      status: 'corrected',
    });

    const defaultOut = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
    });
    expect(defaultOut.totals.total).toBe(1);

    const withSuperseded = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
      includeSuperseded: true,
    });
    expect(withSuperseded.totals.total).toBe(2);
  });

  test('admins WITHOUT anomalyFlags excluded from totals', async () => {
    const measure = await makeMeasure();
    await seedAdmin({ measure, applicationDate: new Date('2026-05-10'), flags: [] }); // clean
    await seedAdmin({
      measure,
      applicationDate: new Date('2026-05-10'),
      flags: [flag('IMPOSSIBLY_FAST_ADMIN')],
    });
    const out = await measureAdmin.aggregateAnomalies({
      from: '2026-04-01',
      to: '2026-06-01',
    });
    expect(out.totals.total).toBe(1);
  });
});

// ─── Route tests ──────────────────────────────────────────────────────

describe('W257l route registration', () => {
  test('GET /anomalous-admins/aggregates registered', () => {
    const router = require('../routes/measures-workflow.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(l => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
    expect(paths).toContain('GET /anomalous-admins/aggregates');
  });

  test('_health advertises W257l + 23 endpoints', () => {
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
    expect(res._body.data.wave).toContain('W257l');
    expect(res._body.data.endpoints).toBeGreaterThanOrEqual(23);
    expect(res._body.data.services.some(s => /W257l/.test(s))).toBe(true);
  });
});

describe('W257l route handler delegation', () => {
  let stub;
  let router;

  beforeAll(() => {
    jest.resetModules();
    stub = { aggregateAnomalies: jest.fn(), listAnomalousAdmins: jest.fn() };
    jest.doMock('../services/measureAdministration.service', () => stub);
    router = require('../routes/measures-workflow.routes');
  });
  afterAll(() => {
    jest.dontMock('../services/measureAdministration.service');
    jest.resetModules();
  });
  beforeEach(() => stub.aggregateAnomalies.mockReset());

  function getHandler() {
    const layer = router.stack.find(
      l => l.route && l.route.path === '/anomalous-admins/aggregates' && l.route.methods.get
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
    stub.aggregateAnomalies.mockResolvedValueOnce({
      bucket: 'week',
      buckets: [],
      totals: { total: 0, byType: {}, bySeverity: { low: 0, medium: 0, high: 0 } },
    });
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    expect(res._body.success).toBe(true);
    expect(res._body.data.bucket).toBe('week');
  });

  test('bucket coerced to week unless explicitly month', async () => {
    stub.aggregateAnomalies.mockResolvedValueOnce({ bucket: 'week', buckets: [], totals: {} });
    const h = getHandler();
    await h({ query: { bucket: 'day' } }, fakeRes()); // unknown → week
    expect(stub.aggregateAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'week' })
    );
    stub.aggregateAnomalies.mockResolvedValueOnce({ bucket: 'month', buckets: [], totals: {} });
    await h({ query: { bucket: 'month' } }, fakeRes());
    expect(stub.aggregateAnomalies).toHaveBeenLastCalledWith(
      expect.objectContaining({ bucket: 'month' })
    );
  });

  test('W269e: restricted role gets own branch from req.branchScope.branchId', async () => {
    stub.aggregateAnomalies.mockResolvedValueOnce({ bucket: 'week', buckets: [], totals: {} });
    const h = getHandler();
    await h(
      {
        query: {},
        branchScope: { restricted: true, branchId: 'mw-branch' },
      },
      fakeRes()
    );
    expect(stub.aggregateAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({ branchId: 'mw-branch' })
    );
  });

  test('includeSuperseded coerced from string', async () => {
    stub.aggregateAnomalies.mockResolvedValueOnce({ bucket: 'week', buckets: [], totals: {} });
    const h = getHandler();
    await h({ query: { includeSuperseded: 'true' } }, fakeRes());
    expect(stub.aggregateAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({ includeSuperseded: true })
    );
  });

  test('service throw → 500 with safe body', async () => {
    stub.aggregateAnomalies.mockRejectedValueOnce(new Error('database connection lost'));
    const h = getHandler();
    const res = fakeRes();
    await h({ query: {} }, res);
    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });
});
