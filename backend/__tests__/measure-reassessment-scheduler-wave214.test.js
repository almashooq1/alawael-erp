'use strict';

/**
 * measure-reassessment-scheduler-wave214.test.js — Wave 214.
 *
 * Verifies the periodic scheduler that turns the W211b cadence model
 * into actionable tasks on MeasureReassessmentTask:
 *
 *   1. tick() creates a task when standardIntervalDays has elapsed.
 *   2. tick() is idempotent — second tick produces no duplicate.
 *   3. Partial unique index blocks duplicate pending tasks at the DB level.
 *   4. Scoped tick (branchId / beneficiaryId) narrows the scan.
 *   5. tick() respects MEASURE_REASSESS_SCHEDULER=off env flag.
 *   6. Auto-close post-save hook closes the task when a new admin
 *      lands for the same (beneficiary, measure) pair.
 *   7. Auto-close does NOT close on correction records (those retro-fix
 *      an old admin, not satisfy a new cadence).
 *   8. acknowledge() flips pending → acknowledged; complete() and
 *      cancel() obey state-machine guards.
 *   9. Cancellation requires reason; double-cancel rejected.
 *  10. listTasks(filter) returns scoped lists.
 *  11. Wave-18 invariants: completed without timestamp rejected;
 *      cancelled without reason rejected.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let Measure;
let MeasureApplication;
let MeasureReassessmentTask;
let scheduler;
let measureAdmin;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w214-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({ MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask'));
  scheduler = require('../services/measureReassessmentScheduler.service');
  measureAdmin = require('../services/measureAdministration.service');
  await MeasureApplication.init();
  await MeasureReassessmentTask.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Measure.deleteMany({});
  await MeasureApplication.deleteMany({});
  await MeasureReassessmentTask.deleteMany({});
  delete process.env.MEASURE_REASSESS_SCHEDULER;
});

// ─── Fixtures ──────────────────────────────────────────────────────────

async function makeBerg(overrides = {}) {
  return Measure.create({
    code: 'BERG',
    name: 'Berg Balance Scale',
    category: 'motor',
    version: '1.0.0',
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    scoringAlgorithmRef: 'scoring/berg.js',
    scoringEngineVersion: '1.0.0',
    status: 'active',
    reassessment: { standardIntervalDays: 90, minIntervalDays: 30 },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
    },
    ...overrides,
  });
}

function makeBenId() {
  return new mongoose.Types.ObjectId();
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seedAdmin({
  beneficiaryId,
  measure,
  applicationDate,
  status = 'completed',
  branchId,
  isBaseline = true,
}) {
  return MeasureApplication.create({
    beneficiaryId,
    measureId: measure._id,
    applicationDate,
    purpose: isBaseline ? 'baseline' : 'progress',
    isBaseline,
    status,
    assessorId: new mongoose.Types.ObjectId(),
    branchId,
    totalRawScore: 28,
    scoredWithMeasureVersion: '1.0.0',
  });
}

// ─── 1. tick creates a task when overdue ───────────────────────────────

describe('W214 — tick() creates tasks when overdue', () => {
  test('overdue admin (>90 days for Berg) → 1 task created', async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(120) });
    const result = await scheduler.tick();
    expect(result.scanned).toBe(1);
    expect(result.created).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.tasks).toHaveLength(1);
    const task = result.tasks[0];
    expect(task.status).toBe('pending');
    expect(task.measureCode).toBe('BERG');
    expect(task.overdueDays).toBeGreaterThan(0);
    expect(task.standardIntervalDays).toBe(90);
  });

  test('recent admin (<90 days) → no task created', async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(30) });
    const result = await scheduler.tick();
    expect(result.scanned).toBe(1);
    expect(result.created).toBe(0);
  });

  test('measure with no reassessment.standardIntervalDays → skipped', async () => {
    const measure = await Measure.create({
      code: 'NOCAD',
      name: 'No Cadence',
      category: 'developmental',
      version: '1.0.0',
      purpose: 'screening',
      status: 'active',
    });
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(500) });
    const result = await scheduler.tick();
    expect(result.created).toBe(0);
  });

  test('deprecated measure → skipped', async () => {
    const measure = await makeBerg({ status: 'deprecated' });
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(120) });
    const result = await scheduler.tick();
    expect(result.created).toBe(0);
  });
});

// ─── 2 + 3. Idempotency ────────────────────────────────────────────────

describe('W214 — idempotency', () => {
  test('second tick does NOT duplicate the task', async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(120) });
    const r1 = await scheduler.tick();
    expect(r1.created).toBe(1);
    const r2 = await scheduler.tick();
    expect(r2.created).toBe(0);
    expect(r2.skippedDuplicates).toBe(1);
    const all = await MeasureReassessmentTask.find().lean();
    expect(all).toHaveLength(1);
  });

  test('partial unique index rejects direct duplicate insert at DB level', async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    await MeasureReassessmentTask.create({
      beneficiaryId: benId,
      measureId: measure._id,
      measureCode: 'BERG',
      dueAt: daysAgo(5),
      status: 'pending',
    });
    await expect(
      MeasureReassessmentTask.create({
        beneficiaryId: benId,
        measureId: measure._id,
        measureCode: 'BERG',
        dueAt: new Date(),
        status: 'pending',
      })
    ).rejects.toThrow();
  });

  test('partial unique index allows a new pending task after the previous is completed', async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    const t1 = await MeasureReassessmentTask.create({
      beneficiaryId: benId,
      measureId: measure._id,
      measureCode: 'BERG',
      dueAt: daysAgo(5),
      status: 'pending',
    });
    t1.status = 'completed';
    t1.completedAt = new Date();
    await t1.save();
    await expect(
      MeasureReassessmentTask.create({
        beneficiaryId: benId,
        measureId: measure._id,
        measureCode: 'BERG',
        dueAt: new Date(),
        status: 'pending',
      })
    ).resolves.toBeTruthy();
  });
});

// ─── 4. Scoped tick ────────────────────────────────────────────────────

describe('W214 — scoped tick()', () => {
  test('tick({beneficiaryId}) restricts the scan', async () => {
    const measure = await makeBerg();
    const ben1 = makeBenId();
    const ben2 = makeBenId();
    await seedAdmin({ beneficiaryId: ben1, measure, applicationDate: daysAgo(120) });
    await seedAdmin({ beneficiaryId: ben2, measure, applicationDate: daysAgo(120) });
    const result = await scheduler.tick({ beneficiaryId: ben1 });
    expect(result.scanned).toBe(1);
    expect(result.created).toBe(1);
    const all = await MeasureReassessmentTask.find().lean();
    expect(all).toHaveLength(1);
    expect(String(all[0].beneficiaryId)).toBe(String(ben1));
  });
});

// ─── 5. Off-switch ─────────────────────────────────────────────────────

describe('W214 — env off-switch', () => {
  test('MEASURE_REASSESS_SCHEDULER=off → tick returns disabled and no DB work', async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(120) });
    process.env.MEASURE_REASSESS_SCHEDULER = 'off';
    const result = await scheduler.tick();
    expect(result.disabled).toBe(true);
    expect(result.created).toBe(0);
    const tasks = await MeasureReassessmentTask.find().lean();
    expect(tasks).toHaveLength(0);
  });
});

// ─── 6 + 7. Auto-close post-save hook ──────────────────────────────────

describe('W214 — auto-close on new admin', () => {
  test('new completed admin closes any open task for the pair', async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(120) });
    const tickResult = await scheduler.tick();
    expect(tickResult.created).toBe(1);
    const taskId = tickResult.tasks[0]._id;

    // New admin lands — via the service so the full path runs.
    await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: { _id: benId, ageMonths: 96, icd10: ['G80.1'] },
      purpose: 'progress',
      rawItems: Array(14).fill(3),
      adminDetails: { assessorId: new mongoose.Types.ObjectId() },
    });

    const closed = await MeasureReassessmentTask.findById(taskId).lean();
    expect(closed.status).toBe('completed');
    expect(closed.completionMode).toBe('auto');
    expect(closed.completedByApplicationId).toBeTruthy();
  });

  test("correction admin does NOT close tasks (retro-fix doesn't satisfy cadence)", async () => {
    const measure = await makeBerg();
    const benId = makeBenId();
    // Seed a locked baseline admin
    const baseline = await measureAdmin.administer({
      measureRef: measure._id,
      beneficiary: { _id: benId, ageMonths: 96, icd10: ['G80.1'] },
      purpose: 'baseline',
      rawItems: Array(14).fill(2),
      adminDetails: {
        assessorId: new mongoose.Types.ObjectId(),
        applicationDate: daysAgo(120),
      },
    });
    await measureAdmin.lockBaseline(baseline._id, new mongoose.Types.ObjectId());

    // Cooldown will pass since 120 days > 30 minIntervalDays.
    // Run tick — should create 1 task.
    const tickResult = await scheduler.tick();
    expect(tickResult.created).toBe(1);
    const taskId = tickResult.tasks[0]._id;

    // Now write a correction — should NOT close the task.
    await measureAdmin.correct(
      baseline._id,
      { totalRawScore: 30 },
      'transcription correction',
      new mongoose.Types.ObjectId()
    );

    const stillOpen = await MeasureReassessmentTask.findById(taskId).lean();
    expect(stillOpen.status).toBe('pending');
  });
});

// ─── 8. Lifecycle: acknowledge / complete / cancel ─────────────────────

describe('W214 — task lifecycle', () => {
  async function makeTask() {
    const measure = await makeBerg();
    const benId = makeBenId();
    await seedAdmin({ beneficiaryId: benId, measure, applicationDate: daysAgo(120) });
    const r = await scheduler.tick();
    return { task: r.tasks[0], measure, benId };
  }

  test('acknowledge() flips pending → acknowledged', async () => {
    const { task } = await makeTask();
    const actor = new mongoose.Types.ObjectId();
    const acked = await scheduler.acknowledge(task._id, actor);
    expect(acked.status).toBe('acknowledged');
    expect(acked.acknowledgedBy.toString()).toBe(actor.toString());
  });

  test('acknowledge() refuses non-pending', async () => {
    const { task } = await makeTask();
    await scheduler.acknowledge(task._id, new mongoose.Types.ObjectId());
    await expect(scheduler.acknowledge(task._id)).rejects.toThrow(/cannot acknowledge/);
  });

  test('complete() with manual mode + applicationId', async () => {
    const { task } = await makeTask();
    const applicationId = new mongoose.Types.ObjectId();
    const completed = await scheduler.complete(task._id, {
      actorId: new mongoose.Types.ObjectId(),
      applicationId,
    });
    expect(completed.status).toBe('completed');
    expect(completed.completionMode).toBe('manual');
    expect(completed.completedByApplicationId.toString()).toBe(applicationId.toString());
  });

  test('complete() is idempotent (returns the doc unchanged on re-call)', async () => {
    const { task } = await makeTask();
    await scheduler.complete(task._id);
    const again = await scheduler.complete(task._id);
    expect(again.status).toBe('completed');
  });

  test('cancel() requires reason', async () => {
    const { task } = await makeTask();
    await expect(scheduler.cancel(task._id, { reason: '' })).rejects.toThrow(
      /cancellationReason is required/
    );
  });

  test('cancel() flips pending → cancelled with reason', async () => {
    const { task } = await makeTask();
    const cancelled = await scheduler.cancel(task._id, {
      actorId: new mongoose.Types.ObjectId(),
      reason: 'beneficiary discharged',
    });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellationReason).toBe('beneficiary discharged');
  });

  test('cancel() refuses completed/cancelled tasks', async () => {
    const { task } = await makeTask();
    await scheduler.complete(task._id);
    await expect(scheduler.cancel(task._id, { reason: 'too late' })).rejects.toThrow(
      /cannot cancel from status=completed/
    );
  });
});

// ─── 10. listTasks filters ─────────────────────────────────────────────

describe('W214 — listTasks()', () => {
  test('listTasks({beneficiaryId}) scopes to one beneficiary', async () => {
    const measure = await makeBerg();
    const ben1 = makeBenId();
    const ben2 = makeBenId();
    await seedAdmin({ beneficiaryId: ben1, measure, applicationDate: daysAgo(120) });
    await seedAdmin({ beneficiaryId: ben2, measure, applicationDate: daysAgo(120) });
    await scheduler.tick();
    const list = await scheduler.listTasks({ beneficiaryId: ben1 });
    expect(list).toHaveLength(1);
    expect(String(list[0].beneficiaryId)).toBe(String(ben1));
  });
});

// ─── 11. Wave-18 invariants on the task itself ─────────────────────────

describe('W214 — task model invariants', () => {
  test('completed without completedAt is rejected', async () => {
    const t = new MeasureReassessmentTask({
      beneficiaryId: makeBenId(),
      measureId: new mongoose.Types.ObjectId(),
      measureCode: 'BERG',
      dueAt: new Date(),
      status: 'completed',
      // completedAt omitted
    });
    await expect(t.save()).rejects.toThrow(/completedAt required/);
  });

  test('cancelled without cancellationReason is rejected', async () => {
    const t = new MeasureReassessmentTask({
      beneficiaryId: makeBenId(),
      measureId: new mongoose.Types.ObjectId(),
      measureCode: 'BERG',
      dueAt: new Date(),
      status: 'cancelled',
      cancelledAt: new Date(),
      // cancellationReason omitted
    });
    await expect(t.save()).rejects.toThrow(/cancellationReason required/);
  });
});
