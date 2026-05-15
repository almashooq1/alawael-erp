'use strict';

/**
 * rca-service.test.js — World-Class QMS Phase 29 Commit 2.
 *
 * Unit tests for the structured RCA service (Ishikawa + 5 Whys).
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { createRcaService } = require('../services/quality/rca.service');
const registry = require('../config/rca.registry');

let ownServer = null;
let RcaInvestigation;

const facilitator = new mongoose.Types.ObjectId();
const owner = new mongoose.Types.ObjectId();
const branchId = new mongoose.Types.ObjectId();

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
  await mongoose.connect(uri, {
    dbName: 'rca-test',
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  RcaInvestigation = require('../models/quality/RcaInvestigation.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await RcaInvestigation.deleteMany({});
});

// ── registry ─────────────────────────────────────────────────────────

describe('rca.registry', () => {
  test('validateFiveWhysChain enforces min/max depth', () => {
    expect(registry.validateFiveWhysChain([]).ok).toBe(false);
    expect(
      registry.validateFiveWhysChain([
        { question: 'q', answer: 'a' },
        { question: 'q', answer: 'a' },
      ]).ok
    ).toBe(false);
    expect(
      registry.validateFiveWhysChain([
        { question: 'q1', answer: 'a1' },
        { question: 'q2', answer: 'a2' },
        { question: 'q3', answer: 'a3' },
      ]).ok
    ).toBe(true);
  });

  test('validateFiveWhysChain rejects empty answer', () => {
    expect(
      registry.validateFiveWhysChain([
        { question: 'q1', answer: 'a1' },
        { question: 'q2', answer: '' },
        { question: 'q3', answer: 'a3' },
      ]).ok
    ).toBe(false);
  });

  test('validateIshikawa requires ≥3 populated categories', () => {
    expect(registry.validateIshikawa({}).ok).toBe(false);
    expect(registry.validateIshikawa({ a: [{ text: 'x' }] }).ok).toBe(false);
    expect(
      registry.validateIshikawa({
        a: [{ text: 'x' }],
        b: [{ text: 'y' }],
        c: [{ text: 'z' }],
      }).ok
    ).toBe(true);
  });
});

// ── service ─────────────────────────────────────────────────────────

describe('RcaService.createInvestigation', () => {
  test('creates investigation with healthcare fishbone seeded', async () => {
    const dispatcher = makeDispatcher();
    const svc = createRcaService({ model: RcaInvestigation, dispatcher });

    const doc = await svc.createInvestigation(
      {
        title: 'سقوط مستفيد في الصالة الرياضية',
        eventDate: '2026-04-30',
        eventDescription: 'سقط المستفيد أثناء الانتقال بين الأجهزة',
        severity: 3,
        branchId,
      },
      facilitator
    );

    expect(doc.status).toBe('draft');
    expect(doc.rcaNumber).toMatch(/^RCA-\d{4}-\d{4}$/);
    // Healthcare variant has 7 categories pre-seeded as empty arrays.
    expect(doc.ishikawa.size).toBe(7);
    expect(doc.ishikawa.get('people')).toEqual([]);
    expect(dispatcher.events.find(e => e.name === 'quality.rca.created')).toBeTruthy();
  });

  test('rejects unknown ishikawa variant', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    await expect(
      svc.createInvestigation(
        {
          title: 't',
          eventDate: '2026-04-30',
          eventDescription: 'd',
          severity: 1,
          ishikawaVariant: 'bogus',
        },
        facilitator
      )
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('RcaService.addIshikawaCause / removeIshikawaCause', () => {
  test('appends and removes causes by category', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    const doc = await svc.createInvestigation(
      {
        title: 'x',
        eventDate: '2026-04-30',
        eventDescription: 'y',
        severity: 2,
      },
      facilitator
    );
    let updated = await svc.addIshikawaCause(doc._id, 'people', 'no training', facilitator);
    expect(updated.ishikawa.get('people')).toHaveLength(1);
    updated = await svc.addIshikawaCause(doc._id, 'people', 'shift change', facilitator);
    expect(updated.ishikawa.get('people')).toHaveLength(2);
    const causeId = updated.ishikawa.get('people')[0]._id;
    updated = await svc.removeIshikawaCause(doc._id, 'people', causeId, facilitator);
    expect(updated.ishikawa.get('people')).toHaveLength(1);
  });

  test('rejects unknown category', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    const doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 2 },
      facilitator
    );
    await expect(svc.addIshikawaCause(doc._id, 'nonsense', 'x', facilitator)).rejects.toMatchObject(
      { code: 'VALIDATION' }
    );
  });
});

describe('RcaService.setFiveWhysChain', () => {
  test('stores chain with auto-numbered levels', async () => {
    const dispatcher = makeDispatcher();
    const svc = createRcaService({ model: RcaInvestigation, dispatcher });
    const doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 2 },
      facilitator
    );
    const updated = await svc.setFiveWhysChain(
      doc._id,
      [
        { question: 'لماذا سقط المستفيد؟', answer: 'لأن الأرضية كانت مبللة' },
        { question: 'لماذا كانت مبللة؟', answer: 'لأن نظافة الصالة تأخرت' },
        { question: 'لماذا تأخرت؟', answer: 'لأن جدول التنظيف غير محدد' },
      ],
      facilitator
    );
    expect(updated.fiveWhys).toHaveLength(3);
    expect(updated.fiveWhys.map(w => w.level)).toEqual([1, 2, 3]);
    expect(dispatcher.events.find(e => e.name === 'quality.rca.five_whys_updated')).toBeTruthy();
  });

  test('rejects chain shorter than min depth', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    const doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 2 },
      facilitator
    );
    await expect(
      svc.setFiveWhysChain(doc._id, [{ question: 'q', answer: 'a' }], facilitator)
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('RcaService.promoteToRootCause', () => {
  test('promotes a 5-Whys answer into a root cause + advances status', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    const doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 2 },
      facilitator
    );
    const updated = await svc.setFiveWhysChain(
      doc._id,
      [
        { question: 'q1', answer: 'a1' },
        { question: 'q2', answer: 'a2' },
        { question: 'q3', answer: 'no SOP' },
      ],
      facilitator
    );
    const lastWhy = updated.fiveWhys[2];
    const promoted = await svc.promoteToRootCause(
      doc._id,
      'five_whys',
      lastWhy._id,
      {},
      facilitator
    );
    expect(promoted.rootCauses).toHaveLength(1);
    expect(promoted.rootCauses[0].source).toBe('five_whys');
    expect(promoted.status).toBe('root_cause_identified');
  });

  test('promotes an Ishikawa cause + records its category', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    const doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 2 },
      facilitator
    );
    const upd = await svc.addIshikawaCause(doc._id, 'equipment', 'broken sensor', facilitator);
    const cause = upd.ishikawa.get('equipment')[0];
    const promoted = await svc.promoteToRootCause(doc._id, 'ishikawa', cause._id, {}, facilitator);
    expect(promoted.rootCauses[0].category).toBe('equipment');
    expect(promoted.rootCauses[0].text).toBe('broken sensor');
  });
});

describe('RcaService — actions + verification', () => {
  test('full happy path: root cause → action → completed → verified', async () => {
    const dispatcher = makeDispatcher();
    const svc = createRcaService({ model: RcaInvestigation, dispatcher });

    let doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 3 },
      facilitator
    );
    doc = await svc.addRootCause(doc._id, { text: 'missing SOP', source: 'manual' }, facilitator);
    const rcId = doc.rootCauses[0]._id;
    doc = await svc.addAction(
      doc._id,
      {
        description: 'كتابة SOP وتوزيعها',
        rootCauseId: rcId,
        ownerUserId: owner,
        dueDate: '2026-05-30',
      },
      facilitator
    );
    expect(doc.status).toBe('actions_open');
    const actionId = doc.actions[0]._id;
    doc = await svc.updateActionStatus(
      doc._id,
      actionId,
      { status: 'completed', effectivenessNotes: 'SOP موزعة على الفريق' },
      facilitator
    );
    expect(doc.status).toBe('actions_completed');
    doc = await svc.verify(doc._id, { lessonsLearned: 'كل عملية حرجة تحتاج SOP' }, facilitator);
    expect(doc.status).toBe('verified');
    expect(doc.verifiedAt).toBeTruthy();
    expect(doc.lessonsLearned).toContain('SOP');
    expect(dispatcher.events.find(e => e.name === 'quality.rca.verified')).toBeTruthy();
  });

  test('verify blocked if a root cause has no completed action', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    let doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 3 },
      facilitator
    );
    doc = await svc.addRootCause(doc._id, { text: 'rc1', source: 'manual' }, facilitator);
    doc = await svc.addRootCause(doc._id, { text: 'rc2', source: 'manual' }, facilitator);
    doc = await svc.addAction(
      doc._id,
      {
        description: 'fix rc1',
        rootCauseId: doc.rootCauses[0]._id,
        ownerUserId: owner,
        dueDate: '2026-05-30',
      },
      facilitator
    );
    await svc.updateActionStatus(doc._id, doc.actions[0]._id, { status: 'completed' }, facilitator);
    // rc2 has no action → verify should fail
    await expect(svc.verify(doc._id, {}, facilitator)).rejects.toMatchObject({
      code: 'INCOMPLETE',
    });
  });

  test('cancel locks further edits', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    const doc = await svc.createInvestigation(
      { title: 'x', eventDate: '2026-04-30', eventDescription: 'y', severity: 2 },
      facilitator
    );
    const cancelled = await svc.cancel(doc._id, 'duplicate', facilitator);
    expect(cancelled.status).toBe('cancelled');
    await expect(svc.addIshikawaCause(doc._id, 'people', 'x', facilitator)).rejects.toMatchObject({
      code: 'INVALID_PHASE',
    });
  });
});

describe('RcaService.getDashboard', () => {
  test('aggregates totals by status + severity', async () => {
    const svc = createRcaService({ model: RcaInvestigation });
    await svc.createInvestigation(
      { title: 'a', eventDate: '2026-04-30', eventDescription: 'd', severity: 2 },
      facilitator
    );
    await svc.createInvestigation(
      { title: 'b', eventDate: '2026-04-30', eventDescription: 'd', severity: 5 },
      facilitator
    );
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(2);
    expect(dash.byStatus.draft).toBe(2);
    expect(dash.bySeverity[2]).toBe(1);
    expect(dash.bySeverity[5]).toBe(1);
  });
});
