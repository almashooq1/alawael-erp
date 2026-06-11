'use strict';

/**
 * staff-health-behavioral-wave1125.test.js — W1125 (behavioral).
 *
 * Exercises StaffHealthRecord against MongoMemoryServer: OHR record-number
 * autogen, every Wave-18 invariant (incl. on UPDATE-saves via the markModified
 * pre-validate), the surveillanceOverdue virtual, and a lifecycle transition.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Health;
const oid = () => new mongoose.Types.ObjectId();

async function base(overrides = {}) {
  return Health.create({
    employeeId: oid(),
    recordType: 'periodic_checkup',
    eventDate: new Date('2026-06-01'),
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1125-staff-health' } });
  await mongoose.connect(mongod.getUri());
  Health = require('../models/StaffHealthRecord');
});
afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});
afterEach(async () => {
  await Health.deleteMany({});
});

describe('W1125 — record number + defaults', () => {
  it('auto-generates OHR-YYYY-NNNN and defaults status=open', async () => {
    const d = await base();
    expect(d.recordNumber).toMatch(/^OHR-2026-\d{4}$/);
    expect(d.status).toBe('open');
    expect(d.confidential).toBe(true);
  });
});

describe('W1125 — Wave-18 invariants', () => {
  it('requires exposureType for an exposure_incident', async () => {
    await expect(base({ recordType: 'exposure_incident' })).rejects.toThrow(/exposureType/);
  });

  it('accepts an exposure_incident WITH exposureType', async () => {
    const d = await base({ recordType: 'exposure_incident', exposureType: 'needlestick' });
    expect(d.exposureType).toBe('needlestick');
  });

  it('requires vaccineName for an immunization', async () => {
    await expect(base({ recordType: 'immunization' })).rejects.toThrow(/vaccineName/);
  });

  it('rejects status=restricted without restrictions text — even on an UPDATE-save', async () => {
    const d = await base({ recordType: 'fitness_for_work' });
    d.status = 'restricted'; // transition without restrictions
    await expect(d.save()).rejects.toThrow(/restrictions/);
  });

  it('accepts status=restricted with restrictions text', async () => {
    const d = await base({ recordType: 'fitness_for_work' });
    d.status = 'restricted';
    d.restrictions = 'No direct patient contact until TB cleared';
    await d.save();
    expect(d.status).toBe('restricted');
  });
});

describe('W1125 — surveillanceOverdue virtual', () => {
  it('true when nextDueDate passed and not closed; false otherwise', async () => {
    const overdue = await base({
      recordType: 'respirator_fit_test',
      nextDueDate: new Date(Date.now() - 86400000),
    });
    expect(overdue.surveillanceOverdue).toBe(true);

    const future = await base({ nextDueDate: new Date(Date.now() + 86400000) });
    expect(future.surveillanceOverdue).toBe(false);

    const closed = await base({ nextDueDate: new Date(Date.now() - 86400000), status: 'closed' });
    expect(closed.surveillanceOverdue).toBe(false);

    const noDue = await base();
    expect(noDue.surveillanceOverdue).toBe(false);
  });
});

describe('W1125 — immunization lifecycle', () => {
  it('records a hepatitis-B dose and completes', async () => {
    const d = await base({
      recordType: 'immunization',
      vaccineName: 'Hepatitis B',
      doseNumber: 2,
      administeredDate: new Date('2026-06-01'),
      nextDueDate: new Date('2026-12-01'),
    });
    d.status = 'completed';
    d.outcome = 'Dose 2/3 administered';
    await d.save();
    const reloaded = await Health.findById(d._id);
    expect(reloaded.status).toBe('completed');
    expect(reloaded.vaccineName).toBe('Hepatitis B');
    expect(reloaded.doseNumber).toBe(2);
  });
});
