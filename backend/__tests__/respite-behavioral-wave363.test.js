'use strict';

/**
 * respite-behavioral-wave363.test.js — behavioral counterpart to
 * `respite-wave363.test.js` (static drift guard). MongoMemoryServer-based.
 *
 * Validates Wave-18 invariants:
 *   - bookingType enum (day/overnight/extended)
 *   - status enum (8-state lifecycle)
 *   - endAt > startAt
 *   - bookingType=day ⇒ nightCount=0
 *   - bookingType ∈ {overnight, extended} ⇒ nightCount ≥ 1
 *   - status=approved ⇒ approvedBy + approvedAt
 *   - status=rejected ⇒ rejectionReason
 *   - status=checked_in ⇒ checkedInAt
 *   - status=completed ⇒ checkedOutAt
 *   - status=cancelled ⇒ cancellationReason + cancelledAt
 *   - emergencyContactName + emergencyContactPhone required (mandatory)
 *
 * Plus `durationHours` + `isUpcoming` + `isActive` virtuals.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let RespiteBooking;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w363-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  RespiteBooking = require('../models/RespiteBooking');
  await RespiteBooking.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await RespiteBooking.deleteMany({});
});

function baseDoc(overrides = {}) {
  const now = new Date();
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    bookingType: 'day',
    startAt: now,
    endAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
    nightCount: 0,
    emergencyContactName: 'الأم',
    emergencyContactPhone: '+966500000000',
    ...overrides,
  };
}

describe('W363 behavioral — bookingType + time integrity', () => {
  it('SAVES with valid day booking', async () => {
    const doc = await RespiteBooking.create(baseDoc());
    expect(doc.status).toBe('requested');
  });

  it('REJECTS endAt <= startAt', async () => {
    const start = new Date();
    const p = new RespiteBooking(
      baseDoc({ startAt: start, endAt: new Date(start.getTime() - 1000) })
    );
    await expect(p.save()).rejects.toThrow(/endAt/);
  });

  it('REJECTS bookingType=day with nightCount>0', async () => {
    const p = new RespiteBooking(baseDoc({ bookingType: 'day', nightCount: 2 }));
    await expect(p.save()).rejects.toThrow(/nightCount/);
  });

  it('REJECTS bookingType=overnight without nightCount', async () => {
    const p = new RespiteBooking(
      baseDoc({
        bookingType: 'overnight',
        nightCount: 0,
        endAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
      })
    );
    await expect(p.save()).rejects.toThrow(/nightCount/);
  });

  it('SAVES overnight with nightCount ≥ 1', async () => {
    const doc = await RespiteBooking.create(
      baseDoc({
        bookingType: 'overnight',
        nightCount: 1,
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
    );
    expect(doc.bookingType).toBe('overnight');
  });
});

describe('W363 behavioral — emergency contact mandatory', () => {
  it('REJECTS missing emergencyContactName', async () => {
    const p = new RespiteBooking(baseDoc({ emergencyContactName: '' }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS missing emergencyContactPhone', async () => {
    const p = new RespiteBooking(baseDoc({ emergencyContactPhone: '' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W363 behavioral — status=approved/rejected invariants', () => {
  it('REJECTS approved without approvedBy', async () => {
    const p = new RespiteBooking(baseDoc({ status: 'approved', approvedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/approvedBy/);
  });

  it('REJECTS approved without approvedAt', async () => {
    const p = new RespiteBooking(
      baseDoc({ status: 'approved', approvedBy: new mongoose.Types.ObjectId() })
    );
    await expect(p.save()).rejects.toThrow(/approvedAt/);
  });

  it('SAVES approved with both', async () => {
    const doc = await RespiteBooking.create(
      baseDoc({
        status: 'approved',
        approvedBy: new mongoose.Types.ObjectId(),
        approvedAt: new Date(),
      })
    );
    expect(doc.status).toBe('approved');
  });

  it('REJECTS rejected without rejectionReason', async () => {
    const p = new RespiteBooking(baseDoc({ status: 'rejected' }));
    await expect(p.save()).rejects.toThrow(/rejectionReason/);
  });
});

describe('W363 behavioral — status=checked_in/completed/cancelled invariants', () => {
  it('REJECTS checked_in without checkedInAt', async () => {
    const p = new RespiteBooking(baseDoc({ status: 'checked_in' }));
    await expect(p.save()).rejects.toThrow(/checkedInAt/);
  });

  it('REJECTS completed without checkedOutAt', async () => {
    const p = new RespiteBooking(baseDoc({ status: 'completed', checkedInAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/checkedOutAt/);
  });

  it('REJECTS cancelled without reason', async () => {
    const p = new RespiteBooking(baseDoc({ status: 'cancelled', cancelledAt: new Date() }));
    await expect(p.save()).rejects.toThrow(/cancellationReason/);
  });

  it('REJECTS cancelled without cancelledAt', async () => {
    const p = new RespiteBooking(
      baseDoc({ status: 'cancelled', cancellationReason: 'family change of plans' })
    );
    await expect(p.save()).rejects.toThrow(/cancelledAt/);
  });

  it('SAVES cancelled with full chain', async () => {
    const doc = await RespiteBooking.create(
      baseDoc({
        status: 'cancelled',
        cancellationReason: 'family change of plans',
        cancelledAt: new Date(),
      })
    );
    expect(doc.status).toBe('cancelled');
  });
});

describe('W363 behavioral — virtuals', () => {
  it('durationHours computes from start/end', async () => {
    const start = new Date('2026-06-01T08:00:00Z');
    const end = new Date('2026-06-01T16:00:00Z');
    const doc = await RespiteBooking.create(baseDoc({ startAt: start, endAt: end }));
    expect(doc.durationHours).toBe(8);
  });

  it('isUpcoming=true when startAt in future + status=approved/confirmed', async () => {
    const doc = await RespiteBooking.create(
      baseDoc({
        status: 'approved',
        approvedBy: new mongoose.Types.ObjectId(),
        approvedAt: new Date(),
        startAt: new Date(Date.now() + 86400 * 1000),
        endAt: new Date(Date.now() + 86400 * 1000 + 8 * 3600 * 1000),
      })
    );
    expect(doc.isUpcoming).toBe(true);
  });

  it('isActive=true when checked_in', async () => {
    const doc = await RespiteBooking.create(
      baseDoc({ status: 'checked_in', checkedInAt: new Date() })
    );
    expect(doc.isActive).toBe(true);
  });
});

describe('W363 behavioral — defaults', () => {
  it('defaults status=requested, nightCount=0 for day type', async () => {
    const doc = await RespiteBooking.create(baseDoc());
    expect(doc.status).toBe('requested');
    expect(doc.nightCount).toBe(0);
  });
});
