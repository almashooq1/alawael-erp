'use strict';

/**
 * golden-thread-integrity-behavioral.test.js — behavioral counterpart to the
 * pure unit test (golden-thread-integrity-script.test.js).
 *
 * The pure test covers summarizeThread() scoring. THIS test proves the risky
 * part: the aggregation pipeline (buildStagePipeline) actually classifies real
 * documents into the right break-stage against an in-memory MongoDB — including
 * documents a live DB may genuinely hold (no objectives, unlinked-only links,
 * baseline-but-no-progress, deleted goals, branch-scoped).
 *
 * Per the CLAUDE.md doctrine: pair every static/pure guard with a behavioral
 * one — regex/pure logic can be right while the runtime path is wrong.
 *
 * Docs are seeded via raw collection.insertMany so the aggregation is tested on
 * arbitrary BSON shapes (bypassing the strict TherapeuticGoal validation hooks —
 * we are testing the read pipeline, not the write invariants).
 *
 * Run: cd backend && npx jest --config=jest.config.js \
 *        __tests__/golden-thread-integrity-behavioral.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { buildStagePipeline, summarizeThread } = require('../scripts/golden-thread-integrity');

let mongod;
let Goal;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'golden-thread-behavioral-test' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  Goal = require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal;
  await Goal.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Goal.collection.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// A non-unlinked measure link (only `status` matters to the pipeline).
const activeLink = () => ({ measureId: oid(), status: 'active', linkType: 'PRIMARY' });

/** Run the pipeline + fold rows into { total, byStage } the way the CLI does. */
async function runAudit(match = { isDeleted: { $ne: true } }) {
  const rows = await Goal.aggregate(buildStagePipeline(match));
  const byStage = {};
  let total = 0;
  for (const r of rows) {
    byStage[r._id] = r.count;
    total += r.count;
  }
  return { total, byStage };
}

describe('golden-thread-integrity — aggregation pipeline (behavioral)', () => {
  test('classifies every break-stage correctly across a mixed population', async () => {
    const b = oid();
    await Goal.collection.insertMany([
      // no_measure_link: no objectives at all
      { beneficiaryId: b, isDeleted: false, objectives: [], currentProgress: 0 },
      // no_measure_link: objective whose only link is unlinked (doesn't count)
      {
        beneficiaryId: b,
        isDeleted: false,
        objectives: [{ measureLinks: [{ measureId: oid(), status: 'unlinked' }] }],
        currentProgress: 0,
      },
      // linked_no_baseline: active link, no baseline.value
      {
        beneficiaryId: b,
        isDeleted: false,
        objectives: [{ measureLinks: [activeLink()] }],
        currentProgress: 0,
      },
      // linked_no_outcome: link + baseline.value, but no progress signal
      {
        beneficiaryId: b,
        isDeleted: false,
        baseline: { value: 5 },
        objectives: [{ measureLinks: [activeLink()] }],
        progressHistory: [],
        currentProgress: 0,
      },
      // complete: via progressHistory entry
      {
        beneficiaryId: b,
        isDeleted: false,
        baseline: { value: 5 },
        objectives: [{ measureLinks: [activeLink()] }],
        progressHistory: [{ date: new Date('2026-01-01'), value: 10 }],
      },
      // complete: via currentProgress > 0 (alternate outcome signal)
      {
        beneficiaryId: b,
        isDeleted: false,
        baseline: { value: 5 },
        objectives: [{ measureLinks: [activeLink()] }],
        currentProgress: 40,
      },
    ]);

    const { total, byStage } = await runAudit();
    expect(total).toBe(6);
    expect(byStage.no_measure_link).toBe(2);
    expect(byStage.linked_no_baseline).toBe(1);
    expect(byStage.linked_no_outcome).toBe(1);
    expect(byStage.complete).toBe(2);

    // ...and the report folds to FRAGMENTED (2/6 = 33.3% complete).
    const report = summarizeThread({ total, byStage });
    expect(report.grade).toBe('FRAGMENTED');
    expect(report.percentages.complete).toBe(33.3);
  });

  test('measureLink spread across MULTIPLE objectives still counts as linked', async () => {
    const b = oid();
    await Goal.collection.insertMany([
      {
        beneficiaryId: b,
        isDeleted: false,
        baseline: { value: 1 },
        currentProgress: 50,
        objectives: [
          { title: 'obj-1', measureLinks: [] }, // first objective: no link
          { title: 'obj-2', measureLinks: [activeLink()] }, // second: has the link
        ],
      },
    ]);
    const { byStage } = await runAudit();
    expect(byStage.complete).toBe(1);
    expect(byStage.no_measure_link).toBeUndefined();
  });

  test('soft-deleted goals are excluded from the default match', async () => {
    const b = oid();
    await Goal.collection.insertMany([
      { beneficiaryId: b, isDeleted: true, objectives: [] },
      { beneficiaryId: b, isDeleted: false, objectives: [] },
    ]);
    const { total, byStage } = await runAudit();
    expect(total).toBe(1);
    expect(byStage.no_measure_link).toBe(1);
  });

  test('branch-scoped match counts only the requested branch', async () => {
    const b = oid();
    const branchA = oid();
    const branchB = oid();
    await Goal.collection.insertMany([
      { beneficiaryId: b, branchId: branchA, isDeleted: false, objectives: [] },
      { beneficiaryId: b, branchId: branchA, isDeleted: false, objectives: [] },
      { beneficiaryId: b, branchId: branchB, isDeleted: false, objectives: [] },
    ]);
    const { total } = await runAudit({ isDeleted: { $ne: true }, branchId: branchA });
    expect(total).toBe(2);
  });

  test('empty collection → total 0 → NO_DATA grade (no false signal)', async () => {
    const { total, byStage } = await runAudit();
    expect(total).toBe(0);
    expect(summarizeThread({ total, byStage }).grade).toBe('NO_DATA');
  });
});
