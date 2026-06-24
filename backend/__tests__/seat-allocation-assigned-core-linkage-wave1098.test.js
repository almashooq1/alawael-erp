'use strict';

/**
 * W1098 — SeatAllocation → unified core timeline linkage.
 *
 * Allocating an active day-center seat to a beneficiary publishes
 * `seat-allocation.seat_allocation.assigned`, which the DDD cross-module
 * subscriber materialises into a per-beneficiary CareTimeline row
 * (category: administrative, severity: success). on_hold / released
 * allocations do NOT surface on the longitudinal record.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const SeatAllocation = require('../models/SeatAllocation');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1098-seat-allocation' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await SeatAllocation.deleteMany({});
  await CareTimeline.deleteMany({});
});

function allocation(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    seatLabel: 'B3',
    period: 'full_day',
    effectiveFrom: new Date('2026-05-03T00:00:00.000Z'),
    ...overrides,
  };
}

describe('W1098 — SeatAllocation → CareTimeline linkage', () => {
  it('records an administrative timeline row on an active seat allocation', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await SeatAllocation.create(
      allocation({ beneficiaryId, branchId, seatLabel: 'طاولة 2', period: 'morning' })
    );

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('seat_allocation_assigned');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.allocationId)).toBe(String(doc._id));
    expect(row.metadata.seatLabel).toBe('طاولة 2');
    expect(row.metadata.period).toBe('morning');
    expect(row.title).toContain('طاولة 2');
  });

  it('does NOT fire when a seat is created on_hold', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SeatAllocation.create(
      allocation({ beneficiaryId, status: 'on_hold', holdReason: 'بانتظار التقييم' })
    );

    await waitForCount({ beneficiaryId }, 0);
  });

  it('captures effectiveFrom in metadata', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SeatAllocation.create(
      allocation({ beneficiaryId, effectiveFrom: new Date('2026-06-01T00:00:00.000Z') })
    );

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(new Date(row.metadata.effectiveFrom).toISOString()).toContain('2026-06-01');
  });

  it('does not duplicate the timeline row when the seat is released', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await SeatAllocation.create(allocation({ beneficiaryId }));

    await waitForRows({ beneficiaryId }, 1);

    doc.status = 'released';
    doc.releasedAt = new Date();
    doc.releaseReason = 'انتقل المستفيد لفرع آخر';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});
