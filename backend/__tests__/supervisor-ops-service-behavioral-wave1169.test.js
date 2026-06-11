'use strict';

/**
 * supervisor-ops-service-behavioral-wave1169.test.js — behavioral counterpart.
 *
 * Proves dailyBoardForTherapist() + documentationBacklog() read real sessions
 * and derive the workflow-cycle states against an in-memory MongoDB. Paired with
 * the pure guard `supervisor-ops-service-wave1169.test.js`.
 *
 * Seeds via raw collection.insertMany — the service only READS (.find().lean()),
 * so this tests the real query/derivation path without the session save hooks.
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/supervisor-ops-service-behavioral-wave1169.test.js --runInBand
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
      instance: { dbName: 'w1169-supervisor-ops-behavioral-test' },
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
const today = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
};

describe('supervisorOps (W1169) — dailyBoardForTherapist behavioral', () => {
  test('classifies a therapist day: documented vs awaiting vs in_progress + delivered minutes', async () => {
    const therapistId = oid();
    await ClinicalSession.collection.insertMany([
      {
        therapistId,
        beneficiaryId: oid(),
        scheduledDate: today(),
        status: 'completed',
        soapNotes: 'done',
        actualDurationMinutes: 45,
      },
      {
        therapistId,
        beneficiaryId: oid(),
        scheduledDate: today(),
        status: 'completed',
        actualDurationMinutes: 30,
      }, // awaiting
      { therapistId, beneficiaryId: oid(), scheduledDate: today(), status: 'in_progress' },
      { therapistId, beneficiaryId: oid(), scheduledDate: today(), status: 'scheduled' },
    ]);

    const board = await svc.dailyBoardForTherapist(therapistId);
    expect(board.counts.documented).toBe(1);
    expect(board.counts.awaiting_documentation).toBe(1);
    expect(board.counts.in_progress).toBe(1);
    expect(board.completed).toBe(2);
    expect(board.deliveredMinutes).toBe(75);
    expect(board.documentedRate).toBe(50);
    expect(board.awaitingDocumentation).toHaveLength(1);
  });

  test('only the requested therapist + day are counted', async () => {
    const me = oid();
    const other = oid();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await ClinicalSession.collection.insertMany([
      {
        therapistId: me,
        beneficiaryId: oid(),
        scheduledDate: today(),
        status: 'completed',
        soapNotes: 'x',
      },
      {
        therapistId: other,
        beneficiaryId: oid(),
        scheduledDate: today(),
        status: 'completed',
        soapNotes: 'x',
      },
      {
        therapistId: me,
        beneficiaryId: oid(),
        scheduledDate: yesterday,
        status: 'completed',
        soapNotes: 'x',
      },
    ]);
    const board = await svc.dailyBoardForTherapist(me);
    expect(board.total).toBe(1);
  });
});

describe('supervisorOps (W1169) — documentationBacklog behavioral', () => {
  test('surfaces completed-but-undocumented sessions grouped by therapist', async () => {
    const tA = oid();
    const tB = oid();
    await ClinicalSession.collection.insertMany([
      { therapistId: tA, beneficiaryId: oid(), scheduledDate: today(), status: 'completed' }, // awaiting
      { therapistId: tA, beneficiaryId: oid(), scheduledDate: today(), status: 'completed' }, // awaiting
      {
        therapistId: tA,
        beneficiaryId: oid(),
        scheduledDate: today(),
        status: 'completed',
        soapNotes: 'done',
      }, // documented
      { therapistId: tB, beneficiaryId: oid(), scheduledDate: today(), status: 'completed' }, // awaiting
      { therapistId: tB, beneficiaryId: oid(), scheduledDate: today(), status: 'scheduled' }, // not completed
    ]);

    const backlog = await svc.documentationBacklog({ sinceDays: 7 });
    expect(backlog.completedScanned).toBe(4); // 4 completed (scheduled excluded)
    expect(backlog.awaitingCount).toBe(3);
    expect(backlog.documentedRate).toBe(25); // 1 of 4 documented
    expect(backlog.byTherapist[String(tA)]).toHaveLength(2);
    expect(backlog.byTherapist[String(tB)]).toHaveLength(1);
  });

  test('a fully-documented branch has an empty backlog', async () => {
    await ClinicalSession.collection.insertMany([
      {
        therapistId: oid(),
        beneficiaryId: oid(),
        scheduledDate: today(),
        status: 'completed',
        soapNotes: 'done',
      },
    ]);
    const backlog = await svc.documentationBacklog({ sinceDays: 7 });
    expect(backlog.awaitingCount).toBe(0);
    expect(backlog.documentedRate).toBe(100);
  });
});
