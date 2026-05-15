'use strict';

/**
 * pareto-a3.test.js — World-Class QMS Phase 29 Commit 4.
 *
 * Tests both the Pareto registry math and the A3 service lifecycle.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { createParetoA3Service } = require('../services/quality/paretoA3.service');
const registry = require('../config/pareto-a3.registry');

let ownServer = null;
let A3Report;
const creator = new mongoose.Types.ObjectId();
const owner = new mongoose.Types.ObjectId();

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
  await mongoose.connect(uri, { dbName: 'pareto-a3-test', serverSelectionTimeoutMS: 10000 });
  A3Report = require('../models/quality/A3Report.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await A3Report.deleteMany({});
});

describe('computePareto', () => {
  test('classic 80/20 dataset returns a vital-few set', () => {
    const items = [
      // 5 categories, very lopsided: A=50, B=30, C=10, D=6, E=4
      ...Array(50).fill({ category: 'A' }),
      ...Array(30).fill({ category: 'B' }),
      ...Array(10).fill({ category: 'C' }),
      ...Array(6).fill({ category: 'D' }),
      ...Array(4).fill({ category: 'E' }),
    ];
    const r = registry.computePareto(items);
    expect(r.total).toBe(100);
    expect(r.distinct).toBe(5);
    expect(r.vitalFew).toEqual(['A', 'B']); // 50+30 = 80%
    expect(r.distribution[0].percent).toBeCloseTo(0.5, 3);
    expect(r.distribution[1].cumulative).toBeCloseTo(0.8, 3);
    expect(r.isParetoFit).toBe(true);
    expect(r.gini).toBeGreaterThan(0.4);
  });

  test('respects pre-aggregated counts', () => {
    const items = [
      { category: 'A', count: 70 },
      { category: 'B', count: 20 },
      { category: 'C', count: 10 },
    ];
    const r = registry.computePareto(items);
    expect(r.total).toBe(100);
    expect(r.distribution[0].count).toBe(70);
  });

  test('uniform distribution is not a Pareto fit', () => {
    const items = ['A', 'B', 'C', 'D', 'E'].flatMap(c => Array(20).fill({ category: c }));
    const r = registry.computePareto(items);
    expect(r.gini).toBeLessThan(0.2);
    expect(r.isParetoFit).toBe(false);
  });

  test('empty input is safe', () => {
    const r = registry.computePareto([]);
    expect(r.total).toBe(0);
    expect(r.distribution).toEqual([]);
  });

  test('threshold can be tuned', () => {
    const items = [
      ...Array(60).fill({ category: 'A' }),
      ...Array(30).fill({ category: 'B' }),
      ...Array(10).fill({ category: 'C' }),
    ];
    const tight = registry.computePareto(items, { threshold: 0.5 });
    expect(tight.vitalFew).toEqual(['A']);
    const loose = registry.computePareto(items, { threshold: 0.95 });
    expect(loose.vitalFew.length).toBeGreaterThanOrEqual(2);
  });
});

describe('ParetoA3Service.createReport', () => {
  test('creates draft report with auto-number', async () => {
    const dispatcher = makeDispatcher();
    const svc = createParetoA3Service({ model: A3Report, dispatcher });
    const doc = await svc.createReport(
      {
        title: 'إعادة هندسة استقبال المستفيدين',
        problemStatement: 'تأخر متوسط زمن الاستقبال إلى 25 دقيقة',
      },
      creator
    );
    expect(doc.status).toBe('draft');
    expect(doc.reportNumber).toMatch(/^A3-\d{4}-\d{4}$/);
    expect(dispatcher.events.find(e => e.name === 'quality.a3.created')).toBeTruthy();
  });
});

describe('ParetoA3Service.updateSection', () => {
  test('writes section body and emits event', async () => {
    const dispatcher = makeDispatcher();
    const svc = createParetoA3Service({ model: A3Report, dispatcher });
    const doc = await svc.createReport({ title: 't', problemStatement: 'p' }, creator);
    const updated = await svc.updateSection(
      doc._id,
      'background',
      'حملة الرعاية بدأت في يناير',
      creator
    );
    expect(updated.sections.get('background')).toContain('يناير');
    expect(dispatcher.events.find(e => e.name === 'quality.a3.section_updated')).toBeTruthy();
  });

  test('rejects unknown section codes', async () => {
    const svc = createParetoA3Service({ model: A3Report });
    const doc = await svc.createReport({ title: 't', problemStatement: 'p' }, creator);
    await expect(svc.updateSection(doc._id, 'nonsense', 'body', creator)).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});

describe('ParetoA3Service — lifecycle', () => {
  test('draft → in_review → approved → in_execution → follow_up → closed', async () => {
    const svc = createParetoA3Service({ model: A3Report });
    let doc = await svc.createReport({ title: 't', problemStatement: 'p' }, creator);
    doc = await svc.setStatus(doc._id, 'in_review', creator);
    doc = await svc.setStatus(doc._id, 'approved', creator);
    expect(doc.approvedAt).toBeTruthy();
    doc = await svc.setStatus(doc._id, 'in_execution', creator);
    doc = await svc.setStatus(doc._id, 'follow_up', creator);
    doc = await svc.setStatus(doc._id, 'closed', creator);
    expect(doc.status).toBe('closed');
    expect(doc.closedAt).toBeTruthy();
  });

  test('cannot edit a closed report', async () => {
    const svc = createParetoA3Service({ model: A3Report });
    let doc = await svc.createReport({ title: 't', problemStatement: 'p' }, creator);
    // walk to closed
    doc = await svc.setStatus(doc._id, 'in_review', creator);
    doc = await svc.setStatus(doc._id, 'approved', creator);
    doc = await svc.setStatus(doc._id, 'in_execution', creator);
    doc = await svc.setStatus(doc._id, 'follow_up', creator);
    doc = await svc.setStatus(doc._id, 'closed', creator);
    await expect(svc.updateSection(doc._id, 'background', 'x', creator)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });

  test('illegal transition is rejected', async () => {
    const svc = createParetoA3Service({ model: A3Report });
    const doc = await svc.createReport({ title: 't', problemStatement: 'p' }, creator);
    await expect(svc.setStatus(doc._id, 'closed', creator)).rejects.toMatchObject({
      code: 'ILLEGAL_TRANSITION',
    });
  });

  test('action lifecycle', async () => {
    const svc = createParetoA3Service({ model: A3Report });
    let doc = await svc.createReport({ title: 't', problemStatement: 'p' }, creator);
    doc = await svc.addAction(
      doc._id,
      {
        description: 'إعادة كتابة سياسة الاستقبال',
        ownerUserId: owner,
        dueDate: '2026-06-01',
      },
      creator
    );
    const actionId = doc.actions[0]._id;
    doc = await svc.updateActionStatus(doc._id, actionId, { status: 'completed' }, creator);
    expect(doc.actions[0].status).toBe('completed');
    expect(doc.actions[0].completedAt).toBeTruthy();
  });
});

describe('ParetoA3Service.getDashboard', () => {
  test('aggregates by status', async () => {
    const svc = createParetoA3Service({ model: A3Report });
    await svc.createReport({ title: 'a', problemStatement: 'p' }, creator);
    await svc.createReport({ title: 'b', problemStatement: 'p' }, creator);
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(2);
    expect(dash.byStatus.draft).toBe(2);
  });
});
