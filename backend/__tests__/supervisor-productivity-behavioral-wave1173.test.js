'use strict';

/**
 * supervisor-productivity-behavioral-wave1173.test.js — behavioral counterpart.
 *
 * Proves branchProductivity() reads real ClinicalSessions and derives
 * per-therapist throughput (completed, delivered minutes, today) against an
 * in-memory MongoDB. Paired with the pure guard
 * `supervisor-productivity-wave1173.test.js`.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/supervisor-productivity-behavioral-wave1173.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let ClinicalSession;
let svc;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w1173-supervisor-productivity-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ClinicalSession = require('../domains/sessions/models/ClinicalSession').ClinicalSession;
  svc = require('../services/supervisorOps.service');
  await ClinicalSession.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await ClinicalSession.collection.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();
const todayAt = h => {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d;
};
const daysAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
};

describe('supervisorOps (W1173) — branchProductivity behavioral', () => {
  test('per-therapist completed (window + today) + delivered minutes', async () => {
    const branchId = oid();
    const tA = oid();
    const tB = oid();
    await ClinicalSession.collection.insertMany([
      {
        branchId,
        therapistId: tA,
        beneficiaryId: oid(),
        scheduledDate: todayAt(9),
        status: 'completed',
        soapNotes: 'x',
        actualDurationMinutes: 45,
      },
      {
        branchId,
        therapistId: tA,
        beneficiaryId: oid(),
        scheduledDate: daysAgo(3),
        status: 'completed',
        actualDurationMinutes: 30,
      }, // awaiting, this week, not today
      {
        branchId,
        therapistId: tB,
        beneficiaryId: oid(),
        scheduledDate: todayAt(10),
        status: 'completed',
        soapNotes: 'y',
        actualDurationMinutes: 60,
      },
      {
        branchId,
        therapistId: tB,
        beneficiaryId: oid(),
        scheduledDate: todayAt(11),
        status: 'no_show',
      },
    ]);

    const result = await svc.branchProductivity({ branchId, sinceDays: 7 });
    expect(result.therapistCount).toBe(2);

    const a = result.byTherapist[String(tA)];
    expect(a.completed).toBe(2); // documented + awaiting
    expect(a.completedToday).toBe(1); // only the 9am one is today
    expect(a.deliveredMinutes).toBe(75);
    expect(a.documentedRate).toBe(50);

    const b = result.byTherapist[String(tB)];
    expect(b.completed).toBe(1);
    expect(b.completedToday).toBe(1);
    expect(b.deliveredMinutes).toBe(60);
    expect(b.noShow).toBe(1);
  });

  test('only the requested branch is counted', async () => {
    const branchId = oid();
    await ClinicalSession.collection.insertMany([
      {
        branchId,
        therapistId: oid(),
        beneficiaryId: oid(),
        scheduledDate: todayAt(9),
        status: 'completed',
        soapNotes: 'x',
      },
      {
        branchId: oid(),
        therapistId: oid(),
        beneficiaryId: oid(),
        scheduledDate: todayAt(9),
        status: 'completed',
        soapNotes: 'x',
      },
    ]);
    const result = await svc.branchProductivity({ branchId, sinceDays: 7 });
    expect(result.therapistCount).toBe(1);
  });

  test('sessions older than the window are excluded', async () => {
    const branchId = oid();
    const t = oid();
    await ClinicalSession.collection.insertMany([
      {
        branchId,
        therapistId: t,
        beneficiaryId: oid(),
        scheduledDate: todayAt(9),
        status: 'completed',
        soapNotes: 'x',
      },
      {
        branchId,
        therapistId: t,
        beneficiaryId: oid(),
        scheduledDate: daysAgo(40),
        status: 'completed',
        soapNotes: 'x',
      },
    ]);
    const result = await svc.branchProductivity({ branchId, sinceDays: 7 });
    expect(result.byTherapist[String(t)].completed).toBe(1);
  });
});
