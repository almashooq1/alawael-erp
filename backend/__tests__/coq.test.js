'use strict';

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const registry = require('../config/coq.registry');
const { createCoqService } = require('../services/quality/coq.service');

let ownServer = null;
let CoqEntry;
const creator = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'coq-test', serverSelectionTimeoutMS: 10000 });
  CoqEntry = require('../models/quality/CoqEntry.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await CoqEntry.deleteMany({});
});

describe('coq registry', () => {
  test('classifyCoqRatio bands', () => {
    expect(registry.classifyCoqRatio(0.02)).toBe('world_class');
    expect(registry.classifyCoqRatio(0.08)).toBe('acceptable');
    expect(registry.classifyCoqRatio(0.15)).toBe('poor');
    expect(registry.classifyCoqRatio(0.3)).toBe('critical');
    expect(registry.classifyCoqRatio(null)).toBe('unknown');
  });

  test('summarise totals + paafShare + shiftLeft', () => {
    const r = registry.summarise(
      [
        { category: 'prevention', amount: 20 },
        { category: 'appraisal', amount: 30 },
        { category: 'internal_failure', amount: 10 },
        { category: 'external_failure', amount: 5 },
      ],
      1000
    );
    expect(r.total).toBe(65);
    expect(r.ratio).toBeCloseTo(0.065, 3);
    expect(r.grade).toBe('acceptable');
    expect(r.paafShare).toBeCloseTo(50 / 65, 3);
    expect(r.shiftLeft).toBe(true);
  });

  test('summarise with no entries is safe', () => {
    expect(registry.summarise([]).total).toBe(0);
  });
});

describe('CoqService.recordEntry + lookups', () => {
  test('records entry with auto-number', async () => {
    const svc = createCoqService({ model: CoqEntry });
    const doc = await svc.recordEntry(
      {
        category: 'prevention',
        amount: 1000,
        description: 'دورة FMEA',
        period: { year: 2026, month: 5 },
      },
      creator
    );
    expect(doc.entryNumber).toMatch(/^COQ-\d{4}-\d{4}$/);
  });

  test('rejects invalid category', async () => {
    const svc = createCoqService({ model: CoqEntry });
    await expect(
      svc.recordEntry(
        { category: 'bogus', amount: 1, description: 'x', period: { year: 2026, month: 5 } },
        creator
      )
    ).rejects.toThrow();
  });

  test('rejects negative amount', async () => {
    const svc = createCoqService({ model: CoqEntry });
    await expect(
      svc.recordEntry(
        { category: 'prevention', amount: -1, description: 'x', period: { year: 2026, month: 5 } },
        creator
      )
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('CoqService.getMonthlyReport', () => {
  test('aggregates by category for a single month', async () => {
    const svc = createCoqService({ model: CoqEntry });
    for (const e of [
      {
        category: 'prevention',
        amount: 500,
        description: 'training',
        period: { year: 2026, month: 5 },
      },
      {
        category: 'appraisal',
        amount: 800,
        description: 'inspection',
        period: { year: 2026, month: 5 },
      },
      {
        category: 'internal_failure',
        amount: 200,
        description: 'rework',
        period: { year: 2026, month: 5 },
      },
      {
        category: 'external_failure',
        amount: 100,
        description: 'refund',
        period: { year: 2026, month: 5 },
      },
      // outside the window
      {
        category: 'prevention',
        amount: 9999,
        description: 'old',
        period: { year: 2026, month: 4 },
      },
    ]) {
      await svc.recordEntry(e, creator);
    }
    const r = await svc.getMonthlyReport({ year: 2026, month: 5, revenue: 30_000 });
    expect(r.total).toBe(1600);
    expect(r.totals.prevention).toBe(500);
    expect(r.totals.appraisal).toBe(800);
    expect(r.totals.internal_failure).toBe(200);
    expect(r.totals.external_failure).toBe(100);
    expect(r.grade).toBe('acceptable');
    expect(r.shiftLeft).toBe(true);
  });
});

describe('CoqService.getYearlyReport', () => {
  test('produces monthly trend across 12 months', async () => {
    const svc = createCoqService({ model: CoqEntry });
    await svc.recordEntry(
      { category: 'prevention', amount: 100, description: 'x', period: { year: 2026, month: 1 } },
      creator
    );
    await svc.recordEntry(
      {
        category: 'external_failure',
        amount: 50,
        description: 'y',
        period: { year: 2026, month: 6 },
      },
      creator
    );
    const r = await svc.getYearlyReport({ year: 2026, revenue: 5000 });
    expect(r.trend).toHaveLength(12);
    expect(r.trend[0].total).toBe(100);
    expect(r.trend[5].total).toBe(50);
    expect(r.annual.total).toBe(150);
  });
});

describe('CoqService.getDashboard', () => {
  test('returns current-year totals', async () => {
    const svc = createCoqService({ model: CoqEntry, now: () => new Date('2026-05-15') });
    await svc.recordEntry(
      { category: 'prevention', amount: 200, description: 'd', period: { year: 2026, month: 1 } },
      creator
    );
    const dash = await svc.getDashboard({});
    expect(dash.currentYear).toBe(2026);
    expect(dash.total).toBe(200);
    expect(dash.totals.prevention).toBe(200);
  });
});
