'use strict';

/**
 * talent-grid-behavioral-wave1198.test.js — TalentReview against MongoMemoryServer.
 * box/segment auto-compute, Wave-18 invariants, unique (employee,cycle) index.
 * Employee is NOT registered → the hrBranchScope plugin's derive is a graceful
 * no-op (branchId stays unset), so we test TalentReview's own contract in isolation.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TR;
const oid = () => new mongoose.Types.ObjectId();

function base(over = {}) {
  return {
    employeeId: oid(),
    reviewCycle: '2026-H1',
    performanceBand: 3,
    potentialBand: 3,
    ...over,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1198-talent' } });
  await mongoose.connect(mongod.getUri());
  TR = require('../models/HR/TalentReview');
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
afterEach(async () => {
  if (TR) await TR.deleteMany({});
});

describe('W1198 TalentReview — box/segment auto-compute', () => {
  test('high/high → box 9 star; default source manual + status draft', async () => {
    const d = await TR.create(base());
    expect(d.box).toBe(9);
    expect(d.segment).toBe('star');
    expect(d.actionGroup).toBe('develop_retain');
    expect(d.performanceSource).toBe('manual');
    expect(d.status).toBe('draft');
  });

  test('low perf / high potential → box 3 enigma', async () => {
    const d = await TR.create(base({ performanceBand: 1, potentialBand: 3 }));
    expect(d.box).toBe(3);
    expect(d.segment).toBe('enigma');
  });

  test('box recomputes on update-save when a band changes', async () => {
    const d = await TR.create(base({ performanceBand: 3, potentialBand: 3 })); // box 9
    d.potentialBand = 1;
    await d.save();
    expect(d.box).toBe(7); // high perf / low potential
    expect(d.segment).toBe('high_professional');
  });
});

describe('W1198 TalentReview — Wave-18 invariants', () => {
  test('band out of [1,3] is rejected', async () => {
    await expect(TR.create(base({ performanceBand: 4 }))).rejects.toThrow();
    await expect(TR.create(base({ potentialBand: 0 }))).rejects.toThrow();
  });

  test('finalized requires a reviewer', async () => {
    await expect(TR.create(base({ status: 'finalized' }))).rejects.toThrow(/reviewedBy/);
  });

  test('finalized with a reviewer + both bands saves', async () => {
    const d = await TR.create(base({ status: 'finalized', reviewedBy: oid() }));
    expect(d.status).toBe('finalized');
    expect(d.box).toBe(9);
  });
});

describe('W1198 TalentReview — one review per employee per cycle', () => {
  test('duplicate (employeeId, reviewCycle) is rejected by the unique index', async () => {
    const emp = oid();
    await TR.create(base({ employeeId: emp, reviewCycle: '2026-H1' }));
    await expect(
      TR.create(base({ employeeId: emp, reviewCycle: '2026-H1', potentialBand: 1 }))
    ).rejects.toThrow(/duplicate key|E11000/);
  });

  test('same employee, different cycle is allowed', async () => {
    const emp = oid();
    await TR.create(base({ employeeId: emp, reviewCycle: '2026-H1' }));
    const d2 = await TR.create(base({ employeeId: emp, reviewCycle: '2026-H2' }));
    expect(d2._id).toBeDefined();
  });
});
