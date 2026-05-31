'use strict';

/**
 * sponsorship-behavioral-wave682.test.js — behavioral counterpart to the
 * W682 static drift guard. MongoMemoryServer-based.
 *
 * Asserts runtime behavior: Wave-18 invariants fire, totalPaid/isExpired
 * virtuals compute, defaults apply, indexes exist.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Sponsorship;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w682-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Sponsorship = require('../models/Sponsorship');
  await Sponsorship.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Sponsorship.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    donorId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    startDate: new Date(),
    sponsorshipType: 'full',
    monthlyAmount: 500,
    ...overrides,
  };
}

describe('W682 behavioral — defaults + type', () => {
  it('SAVES full sponsorship with defaults (status=pending, currency=SAR)', async () => {
    const doc = await Sponsorship.create(baseDoc());
    expect(doc.status).toBe('pending');
    expect(doc.currency).toBe('SAR');
    expect(doc.isActive).toBe(false);
  });

  it('REJECTS unknown sponsorshipType', async () => {
    const p = new Sponsorship(baseDoc({ sponsorshipType: 'not_a_type' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W682 behavioral — recurring requires monthlyAmount', () => {
  it('REJECTS full sponsorship with monthlyAmount = 0', async () => {
    const p = new Sponsorship(baseDoc({ sponsorshipType: 'full', monthlyAmount: 0 }));
    await expect(p.save()).rejects.toThrow(/monthlyAmount/);
  });

  it('REJECTS partial sponsorship with monthlyAmount = 0', async () => {
    const p = new Sponsorship(baseDoc({ sponsorshipType: 'partial', monthlyAmount: 0 }));
    await expect(p.save()).rejects.toThrow(/monthlyAmount/);
  });

  it('ALLOWS one_time sponsorship with monthlyAmount = 0', async () => {
    const doc = await Sponsorship.create(
      baseDoc({ sponsorshipType: 'one_time', monthlyAmount: 0 })
    );
    expect(doc.sponsorshipType).toBe('one_time');
  });
});

describe('W682 behavioral — status invariants', () => {
  it('REJECTS status=paused without pauseReason', async () => {
    const p = new Sponsorship(baseDoc({ status: 'paused' }));
    await expect(p.save()).rejects.toThrow(/pauseReason/);
  });

  it('REJECTS status=cancelled without cancelReason', async () => {
    const p = new Sponsorship(baseDoc({ status: 'cancelled' }));
    await expect(p.save()).rejects.toThrow(/cancelReason/);
  });

  it('SAVES cancelled with cancelReason', async () => {
    const doc = await Sponsorship.create(
      baseDoc({ status: 'cancelled', cancelReason: 'توقّف الكافل عن السداد' })
    );
    expect(doc.status).toBe('cancelled');
  });
});

describe('W682 behavioral — date invariant', () => {
  it('REJECTS endDate < startDate', async () => {
    const start = new Date();
    const end = new Date(start.getTime() - 86400000);
    const p = new Sponsorship(baseDoc({ startDate: start, endDate: end }));
    await expect(p.save()).rejects.toThrow(/endDate/);
  });
});

describe('W682 behavioral — totalPaid + isExpired virtuals', () => {
  it('totalPaid sums the payment ledger', async () => {
    const doc = await Sponsorship.create(
      baseDoc({
        payments: [
          { date: new Date(), amount: 500 },
          { date: new Date(), amount: 300 },
        ],
      })
    );
    expect(doc.totalPaid).toBe(800);
  });

  it('totalPaid is 0 with no payments', async () => {
    const doc = await Sponsorship.create(baseDoc());
    expect(doc.totalPaid).toBe(0);
  });

  it('isExpired true when endDate past and status active', async () => {
    const past = new Date(Date.now() - 86400000);
    const doc = await Sponsorship.create(
      baseDoc({ status: 'active', startDate: new Date(Date.now() - 2 * 86400000), endDate: past })
    );
    expect(doc.isExpired).toBe(true);
  });

  it('isExpired false when completed even if endDate past', async () => {
    const past = new Date(Date.now() - 86400000);
    const doc = await Sponsorship.create(
      baseDoc({
        status: 'completed',
        startDate: new Date(Date.now() - 2 * 86400000),
        endDate: past,
      })
    );
    expect(doc.isExpired).toBe(false);
  });
});

describe('W682 behavioral — indexes', () => {
  it('compound indexes exist for query patterns', async () => {
    const indexes = await Sponsorship.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('donorId+status');
    expect(keys).toContain('beneficiaryId+status');
    expect(keys).toContain('branchId+status');
  });
});
