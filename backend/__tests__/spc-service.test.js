'use strict';

/**
 * spc-service.test.js — World-Class QMS Phase 29 Commit 3.
 *
 * Service-level integration tests for SPC. Exercises the full
 * persistence + analysis loop.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { createSpcService } = require('../services/quality/spc.service');

let ownServer = null;
let SpcChart;
const creator = new mongoose.Types.ObjectId();

function makeDispatcher() {
  const events = [];
  return {
    events,
    async emit(name, payload) {
      events.push({ name, payload });
    },
  };
}

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
  await mongoose.connect(uri, { dbName: 'spc-test', serverSelectionTimeoutMS: 10000 });
  SpcChart = require('../models/quality/SpcChart.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await SpcChart.deleteMany({});
});

describe('SpcService.createChart', () => {
  test('creates X-bar/R chart with auto-numbered ID', async () => {
    const svc = createSpcService({ model: SpcChart });
    const doc = await svc.createChart(
      { title: 'Wound healing time', chartType: 'xbar_r', metric: 'days', subgroupSize: 5 },
      creator
    );
    expect(doc.chartNumber).toMatch(/^SPC-\d{4}-\d{4}$/);
    expect(doc.status).toBe('active');
  });

  test('rejects missing required fields', async () => {
    const svc = createSpcService({ model: SpcChart });
    await expect(svc.createChart({}, creator)).rejects.toThrow();
  });
});

describe('SpcService.addMeasurement', () => {
  test('appends a measurement and returns fresh analysis', async () => {
    const dispatcher = makeDispatcher();
    const svc = createSpcService({ model: SpcChart, dispatcher });
    const chart = await svc.createChart(
      { title: 'X-bar/R', chartType: 'xbar_r', metric: 'm', subgroupSize: 5 },
      creator
    );
    // Add 5 well-behaved subgroups
    for (const g of [
      [10, 11, 9, 10, 12],
      [10, 9, 11, 10, 10],
      [11, 10, 10, 11, 9],
      [10, 12, 11, 10, 11],
      [9, 10, 10, 11, 10],
    ]) {
      await svc.addMeasurement(chart._id, { values: g }, creator);
    }
    const { analysis } = await svc.findById(chart._id, { withAnalysis: true });
    expect(analysis.stats.points).toHaveLength(5);
    expect(analysis.stats.xBarMean).toBeCloseTo(10.28, 2);
    // No special cause fires for a stable process.
    expect(analysis.specialCauses.every(p => p.fired.length === 0)).toBe(true);
  });

  test('fires special-cause event when a 3σ breach is added', async () => {
    const dispatcher = makeDispatcher();
    const svc = createSpcService({ model: SpcChart, dispatcher });
    const chart = await svc.createChart(
      { title: 'p chart', chartType: 'p', metric: 'rate' },
      creator
    );
    // Establish baseline at low rate (1-2 defective per 100), then add huge outlier.
    for (const d of [1, 2, 1, 2, 1, 2, 1, 2, 1, 2]) {
      await svc.addMeasurement(chart._id, { defective: d, sampleSize: 100 }, creator);
    }
    await svc.addMeasurement(chart._id, { defective: 40, sampleSize: 100 }, creator);
    const sc = dispatcher.events.filter(e => e.name === 'quality.spc.special_cause_detected');
    expect(sc.length).toBeGreaterThan(0);
    expect(sc[sc.length - 1].payload.rules).toContain('rule_1_beyond_3sigma');
  });

  test('rejects mismatched payload for chart type', async () => {
    const svc = createSpcService({ model: SpcChart });
    const chart = await svc.createChart(
      { title: 'c chart', chartType: 'c', metric: 'defects' },
      creator
    );
    await expect(
      svc.addMeasurement(chart._id, { values: [1, 2, 3] }, creator)
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('SpcService.computeAnalysis + capability', () => {
  test('capability surfaces when usl/lsl set', async () => {
    const svc = createSpcService({ model: SpcChart });
    const chart = await svc.createChart(
      {
        title: 'Glycaemic control',
        chartType: 'imr',
        metric: 'HbA1c',
        usl: 7,
        lsl: 4,
      },
      creator
    );
    for (const v of [5.5, 5.6, 5.4, 5.5, 5.7, 5.5, 5.6, 5.5, 5.4, 5.6]) {
      await svc.addMeasurement(chart._id, { values: [v] }, creator);
    }
    const result = await svc.findById(chart._id, { withAnalysis: true });
    expect(result.analysis.capability).not.toBeNull();
    expect(result.analysis.capability.cp).toBeGreaterThan(0);
    expect(['inadequate', 'marginal', 'capable', 'world_class']).toContain(
      result.analysis.capability.grade
    );
  });
});

describe('SpcService — lifecycle + dashboard', () => {
  test('archive blocks further measurements', async () => {
    const svc = createSpcService({ model: SpcChart });
    const chart = await svc.createChart({ title: 'c', chartType: 'c', metric: 'd' }, creator);
    await svc.archive(chart._id, creator);
    await expect(svc.addMeasurement(chart._id, { count: 1 }, creator)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });

  test('getDashboard aggregates by type and status', async () => {
    const svc = createSpcService({ model: SpcChart });
    await svc.createChart({ title: 'a', chartType: 'c', metric: 'd' }, creator);
    await svc.createChart({ title: 'b', chartType: 'p', metric: 'd' }, creator);
    const c = await svc.createChart({ title: 'c', chartType: 'p', metric: 'd' }, creator);
    await svc.archive(c._id, creator);
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(3);
    expect(dash.active).toBe(2);
    expect(dash.archived).toBe(1);
    expect(dash.byType.p).toBe(2);
    expect(dash.byType.c).toBe(1);
  });
});
