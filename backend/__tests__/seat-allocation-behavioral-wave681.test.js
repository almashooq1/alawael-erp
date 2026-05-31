'use strict';

/**
 * seat-allocation-behavioral-wave681.test.js — behavioral counterpart to
 * the W681 static drift guard. MongoMemoryServer-based.
 *
 * Asserts runtime behavior: Wave-18 invariants fire, virtuals compute,
 * defaults apply, indexes exist.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SeatAllocation;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w681-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  SeatAllocation = require('../models/SeatAllocation');
  await SeatAllocation.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await SeatAllocation.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    effectiveFrom: new Date(),
    ...overrides,
  };
}

describe('W681 behavioral — defaults', () => {
  it('SAVES with defaults (status=active, period=full_day, attendsEveryDay)', async () => {
    const doc = await SeatAllocation.create(baseDoc());
    expect(doc.status).toBe('active');
    expect(doc.period).toBe('full_day');
    expect(doc.isActive).toBe(true);
    expect(doc.attendsEveryDay).toBe(true);
  });
});

describe('W681 behavioral — status invariants', () => {
  it('REJECTS status=released without releasedAt', async () => {
    const p = new SeatAllocation(baseDoc({ status: 'released', releaseReason: 'تخرّج' }));
    await expect(p.save()).rejects.toThrow(/releasedAt/);
  });

  it('REJECTS status=released without releaseReason', async () => {
    const p = new SeatAllocation(baseDoc({ status: 'released', releasedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/releaseReason/);
  });

  it('SAVES released with releasedAt + releaseReason', async () => {
    const doc = await SeatAllocation.create(
      baseDoc({ status: 'released', releasedAt: new Date(), releaseReason: 'انتقل لفرع آخر' })
    );
    expect(doc.status).toBe('released');
    expect(doc.isActive).toBe(false);
  });

  it('REJECTS status=on_hold without holdReason', async () => {
    const p = new SeatAllocation(baseDoc({ status: 'on_hold' }));
    await expect(p.save()).rejects.toThrow(/holdReason/);
  });

  it('SAVES on_hold with holdReason', async () => {
    const doc = await SeatAllocation.create(
      baseDoc({ status: 'on_hold', holdReason: 'إجازة مرضية ممتدة' })
    );
    expect(doc.status).toBe('on_hold');
  });
});

describe('W681 behavioral — date + daysOfWeek invariants', () => {
  it('REJECTS effectiveTo < effectiveFrom', async () => {
    const from = new Date();
    const to = new Date(from.getTime() - 86400000);
    const p = new SeatAllocation(baseDoc({ effectiveFrom: from, effectiveTo: to }));
    await expect(p.save()).rejects.toThrow(/effectiveTo/);
  });

  it('SAVES with valid daysOfWeek (Sun-Thu = 0..4)', async () => {
    const doc = await SeatAllocation.create(baseDoc({ daysOfWeek: [0, 1, 2, 3, 4] }));
    expect(doc.daysOfWeek).toEqual([0, 1, 2, 3, 4]);
    expect(doc.attendsEveryDay).toBe(false);
  });

  it('REJECTS daysOfWeek out of range (7)', async () => {
    const p = new SeatAllocation(baseDoc({ daysOfWeek: [0, 7] }));
    await expect(p.save()).rejects.toThrow(/daysOfWeek/);
  });
});

describe('W681 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await SeatAllocation.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+status');
    expect(keys).toContain('branchId+status');
    expect(keys).toContain('branchId+sectionId+status');
  });
});
