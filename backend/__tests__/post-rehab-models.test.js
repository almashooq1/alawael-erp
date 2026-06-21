/**
 * Behavioral model tests for PostRehabCase.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let PostRehabCase;

const OID = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  PostRehabCase = require('../models/post-rehab/PostRehabCase.model');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 60000);

beforeEach(async () => {
  await PostRehabCase.collection.deleteMany({});
}, 20000);

function baseDoc(overrides = {}) {
  return {
    beneficiary: OID(),
    dischargeDate: new Date('2024-01-01'),
    status: 'ACTIVE',
    priority: 'MEDIUM',
    category: 'PHYSICAL_REHAB',
    followUpPlan: {
      frequency: 'MONTHLY',
      totalPlannedVisits: 6,
      completedVisits: 2,
      missedVisits: 1,
    },
    ...overrides,
  };
}

describe('PostRehabCase model — persistence', () => {
  it('persists a valid case and auto-generates case number', async () => {
    const doc = await PostRehabCase.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.caseNumber).toMatch(/^PRF-\d{4}-\d{5}$/);
  });

  it('rejects invalid status enum', async () => {
    await expect(PostRehabCase.create({ ...baseDoc(), status: 'UNKNOWN' })).rejects.toThrow(
      /status/
    );
  });

  it('rejects invalid category enum', async () => {
    await expect(PostRehabCase.create({ ...baseDoc(), category: 'OTHER_TYPE' })).rejects.toThrow(
      /category/
    );
  });

  it('rejects missing dischargeDate', async () => {
    await expect(PostRehabCase.create({ ...baseDoc(), dischargeDate: undefined })).rejects.toThrow(
      /dischargeDate/
    );
  });

  it('computes completionRate virtual', async () => {
    const doc = await PostRehabCase.create(baseDoc());
    expect(doc.toJSON().completionRate).toBe(33);
  });

  it('completionRate is 0 when no planned visits', async () => {
    const doc = await PostRehabCase.create({
      ...baseDoc(),
      followUpPlan: { totalPlannedVisits: 0, completedVisits: 0 },
    });
    expect(doc.toJSON().completionRate).toBe(0);
  });

  it('computes daysSinceDischarge virtual', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    const doc = await PostRehabCase.create({ ...baseDoc(), dischargeDate: old });
    expect(doc.toJSON().daysSinceDischarge).toBeGreaterThanOrEqual(10);
  });

  it('stores contact attempts and alerts', async () => {
    const doc = await PostRehabCase.create({
      ...baseDoc(),
      contactAttempts: [{ method: 'PHONE', outcome: 'REACHED', notes: 'تم التواصل' }],
      alerts: [{ type: 'MISSED_VISIT', severity: 'HIGH', message: 'missed visit' }],
    });
    expect(doc.contactAttempts.length).toBe(1);
    expect(doc.alerts.length).toBe(1);
    expect(doc.alerts[0].isResolved).toBe(false);
  });

  it('rejects invalid contact attempt method', async () => {
    await expect(
      PostRehabCase.create({
        ...baseDoc(),
        contactAttempts: [{ method: 'LETTER', outcome: 'REACHED' }],
      })
    ).rejects.toThrow(/method/);
  });

  it('rejects invalid alert type', async () => {
    await expect(
      PostRehabCase.create({
        ...baseDoc(),
        alerts: [{ type: 'UNKNOWN', severity: 'MEDIUM' }],
      })
    ).rejects.toThrow(/type/);
  });
});
