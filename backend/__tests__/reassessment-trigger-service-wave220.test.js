'use strict';

/**
 * reassessment-trigger-service-wave220.test.js — Wave 220.
 *
 * Verifies the event-triggered reassessment service:
 *
 *   Argument guards:
 *     - rejects unknown event type
 *     - requires beneficiaryId
 *     - bypassCooldown requires justification + approver
 *     - approver cannot be the same as firing actor (SoD)
 *
 *   Event → measure resolution:
 *     - Resolves measures via reassessment.triggerOverrides
 *     - Returns NO_MATCHING_MEASURES if none opt in
 *     - previewMeasuresFor returns same set without firing
 *
 *   Per-measure resolution:
 *     - Fresh fire creates new pending task with eventTriggerCode +
 *       eventTriggeredAt + eventTriggerPayload preserved
 *     - dueAt = now (event makes task immediately due)
 *     - lastApplicationId snapshot captured from latest completed admin
 *
 *   Cooldown:
 *     - Recent admin within minInterval → action='skipped',
 *       reason=COOLDOWN_NOT_ELAPSED (no bypass requested)
 *     - bypassCooldown + justification + approver → still creates task,
 *       cooldownBypassedJustification + cooldownBypassedApprovedBy
 *       persisted on the task
 *
 *   Idempotency:
 *     - Existing pending task → action='updated', same _id,
 *       dueAt bumped to now, trigger metadata appended
 *     - Re-firing the same event in same minute → still 'updated',
 *       no duplicate row (partial unique index holds)
 *
 *   Convenience:
 *     - listEventTriggered filters by beneficiary + eventCode
 *     - listEventTriggered excludes scheduler-created tasks
 *       (no eventTriggerCode field)
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
let EVENT_TRIGGER_CODES;
let triggerSvc;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w220-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ Measure } = require('../domains/goals/models/Measure'));
  ({ MeasureApplication } = require('../domains/goals/models/MeasureApplication'));
  ({
    MeasureReassessmentTask,
    EVENT_TRIGGER_CODES,
  } = require('../domains/goals/models/MeasureReassessmentTask'));
  triggerSvc = require('../services/reassessmentTriggerService.service');
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
});

// ─── Fixtures ──────────────────────────────────────────────────────────

async function seedBerg({ triggerOverrides, ...overrides } = {}) {
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
    administrationTime: 20,
    administeredBy: ['physical_therapist'],
    ageRange: { min: 5, max: 95, unit: 'years' },
    reassessment: {
      standardIntervalDays: 90,
      minIntervalDays: 30,
      triggerOverrides: triggerOverrides || [],
    },
    interpretation: {
      mcid: { value: 4, type: 'absolute', status: 'established', source: 'Donoghue 2009' },
    },
    targetPopulation: ['all'],
    ...overrides,
  });
}

async function seedFim({ triggerOverrides, ...overrides } = {}) {
  return Measure.create({
    code: 'FIM',
    name: 'Functional Independence Measure',
    category: 'functional',
    version: '1.0.0',
    purpose: 'functional_status',
    rawShape: 'items_array',
    derivedType: 'sum',
    interpretationStyle: 'tier',
    status: 'active',
    administrationTime: 45,
    administeredBy: ['occupational_therapist'],
    ageRange: { min: 7, max: 99, unit: 'years' },
    reassessment: {
      standardIntervalDays: 60,
      minIntervalDays: 14,
      triggerOverrides: triggerOverrides || [],
    },
    targetPopulation: ['all'],
    ...overrides,
  });
}

async function seedAdmin({ benId, measureId, daysAgo = 5, totalRawScore = 40 }) {
  return MeasureApplication.create({
    beneficiaryId: benId,
    measureId,
    assessorId: new mongoose.Types.ObjectId(),
    applicationDate: new Date(Date.now() - daysAgo * 86400000),
    totalRawScore,
    status: 'completed',
  });
}

// ════════════════════════════════════════════════════════════════════════
// 1. Argument guards
// ════════════════════════════════════════════════════════════════════════

describe('W220 — fire() argument guards', () => {
  test('rejects unknown event type', async () => {
    await expect(
      triggerSvc.fire({ type: 'NOT_A_REAL_EVENT', beneficiaryId: new mongoose.Types.ObjectId() })
    ).rejects.toThrow(/invalid event type/);
  });

  test('requires beneficiaryId', async () => {
    await expect(triggerSvc.fire({ type: 'POST_BOTOX' })).rejects.toThrow(/beneficiaryId required/);
  });

  test('bypassCooldown requires justification', async () => {
    await expect(
      triggerSvc.fire({
        type: 'POST_BOTOX',
        beneficiaryId: new mongoose.Types.ObjectId(),
        bypassCooldown: true,
        cooldownApprovedBy: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow(/cooldownJustification/);
  });

  test('bypassCooldown requires approver', async () => {
    await expect(
      triggerSvc.fire({
        type: 'POST_BOTOX',
        beneficiaryId: new mongoose.Types.ObjectId(),
        bypassCooldown: true,
        cooldownJustification: 'urgent post-procedure',
      })
    ).rejects.toThrow(/cooldownApprovedBy/);
  });

  test('approver cannot be the firing actor (SoD)', async () => {
    const sameUser = new mongoose.Types.ObjectId();
    await expect(
      triggerSvc.fire({
        type: 'POST_BOTOX',
        beneficiaryId: new mongoose.Types.ObjectId(),
        actor: { userId: sameUser },
        bypassCooldown: true,
        cooldownJustification: 'urgent post-procedure',
        cooldownApprovedBy: sameUser,
      })
    ).rejects.toThrow(/cannot be the firing actor/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. Event → measure resolution
// ════════════════════════════════════════════════════════════════════════

describe('W220 — measure resolution', () => {
  test('resolves measures via triggerOverrides', async () => {
    await seedBerg({ triggerOverrides: ['POST_BOTOX', 'FALL_EVENT'] });
    await seedFim({ triggerOverrides: ['POST_SURGERY'] }); // not POST_BOTOX
    const out = await triggerSvc.fire({
      type: 'POST_BOTOX',
      beneficiaryId: new mongoose.Types.ObjectId(),
    });
    expect(out.cycles.length).toBe(1);
    expect(out.cycles[0].measureCode).toBe('BERG');
  });

  test('NO_MATCHING_MEASURES when none opt in', async () => {
    await seedBerg({ triggerOverrides: ['FALL_EVENT'] });
    const out = await triggerSvc.fire({
      type: 'POST_BOTOX',
      beneficiaryId: new mongoose.Types.ObjectId(),
    });
    expect(out.cycles).toEqual([]);
    expect(out.reasonCodes).toContain(triggerSvc.REASON_CODES.NO_MATCHING_MEASURES);
  });

  test('previewMeasuresFor returns set without firing', async () => {
    await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    await seedFim({ triggerOverrides: ['POST_BOTOX'] });
    const preview = await triggerSvc.previewMeasuresFor('POST_BOTOX');
    expect(preview.map(m => m.code).sort()).toEqual(['BERG', 'FIM']);
    // Did NOT create any tasks
    const allTasks = await MeasureReassessmentTask.find({});
    expect(allTasks.length).toBe(0);
  });

  test('previewMeasuresFor rejects unknown event', async () => {
    await expect(triggerSvc.previewMeasuresFor('BAD_CODE')).rejects.toThrow(/invalid event code/);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Fresh fire creates a task
// ════════════════════════════════════════════════════════════════════════

describe('W220 — fresh fire creates task', () => {
  test('creates pending task with full trigger metadata', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const benId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();
    const eventDate = new Date('2026-05-15T10:00:00Z');
    const out = await triggerSvc.fire({
      type: 'POST_BOTOX',
      beneficiaryId: benId,
      payload: { medicationCode: 'A03BB01', dose: '200u' },
      actor: { userId: actorId },
      eventDate,
    });
    expect(out.cycles.length).toBe(1);
    expect(out.cycles[0].action).toBe('created');
    expect(out.summary).toEqual({ created: 1, updated: 0, skipped: 0 });
    const task = await MeasureReassessmentTask.findById(out.cycles[0].taskId);
    expect(task.status).toBe('pending');
    expect(String(task.beneficiaryId)).toBe(String(benId));
    expect(String(task.measureId)).toBe(String(berg._id));
    expect(task.eventTriggerCode).toBe('POST_BOTOX');
    expect(task.eventTriggerPayload.medicationCode).toBe('A03BB01');
    expect(task.eventTriggeredAt.getTime()).toBe(eventDate.getTime());
    expect(String(task.eventFiredBy)).toBe(String(actorId));
    expect(task.standardIntervalDays).toBe(90);
  });

  test('captures latest admin snapshot in lastApplicationId', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const benId = new mongoose.Types.ObjectId();
    // Two prior admins: latest 60d ago, older 120d ago
    await seedAdmin({ benId, measureId: berg._id, daysAgo: 120, totalRawScore: 30 });
    const latestAdmin = await seedAdmin({
      benId,
      measureId: berg._id,
      daysAgo: 60,
      totalRawScore: 42,
    });
    const out = await triggerSvc.fire({ type: 'POST_BOTOX', beneficiaryId: benId });
    const task = await MeasureReassessmentTask.findById(out.cycles[0].taskId);
    expect(String(task.lastApplicationId)).toBe(String(latestAdmin._id));
    expect(task.lastApplicationDate.getTime()).toBe(latestAdmin.applicationDate.getTime());
  });

  test('dueAt set to now (event makes task immediately due)', async () => {
    await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const now = new Date('2026-05-20T14:30:00Z');
    const out = await triggerSvc.fire({
      type: 'POST_BOTOX',
      beneficiaryId: new mongoose.Types.ObjectId(),
      now,
    });
    const task = await MeasureReassessmentTask.findById(out.cycles[0].taskId);
    expect(task.dueAt.getTime()).toBe(now.getTime());
    expect(task.overdueDays).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Cooldown handling
// ════════════════════════════════════════════════════════════════════════

describe('W220 — cooldown handling', () => {
  test('recent admin within minInterval → skipped', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({ benId, measureId: berg._id, daysAgo: 5 }); // < 30d
    const out = await triggerSvc.fire({ type: 'POST_BOTOX', beneficiaryId: benId });
    expect(out.cycles[0].action).toBe('skipped');
    expect(out.cycles[0].reasonCodes).toContain(triggerSvc.REASON_CODES.COOLDOWN_NOT_ELAPSED);
    expect(out.summary.skipped).toBe(1);
    const tasks = await MeasureReassessmentTask.find({});
    expect(tasks.length).toBe(0);
  });

  test('bypassCooldown creates task with justification persisted', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const benId = new mongoose.Types.ObjectId();
    await seedAdmin({ benId, measureId: berg._id, daysAgo: 5 });
    const approverId = new mongoose.Types.ObjectId();
    const out = await triggerSvc.fire({
      type: 'POST_BOTOX',
      beneficiaryId: benId,
      actor: { userId: new mongoose.Types.ObjectId() },
      bypassCooldown: true,
      cooldownJustification: 'medication-driven change, urgent re-baseline',
      cooldownApprovedBy: approverId,
    });
    expect(out.cycles[0].action).toBe('created');
    const task = await MeasureReassessmentTask.findById(out.cycles[0].taskId);
    expect(task.cooldownBypassedJustification).toMatch(/urgent re-baseline/);
    expect(String(task.cooldownBypassedApprovedBy)).toBe(String(approverId));
  });

  test('no prior admin → no cooldown to violate, task created', async () => {
    await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const out = await triggerSvc.fire({
      type: 'POST_BOTOX',
      beneficiaryId: new mongoose.Types.ObjectId(),
    });
    expect(out.cycles[0].action).toBe('created');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. Idempotency
// ════════════════════════════════════════════════════════════════════════

describe('W220 — idempotency', () => {
  test('existing pending task → action=updated, no duplicate', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const benId = new mongoose.Types.ObjectId();
    // First fire creates
    const a = await triggerSvc.fire({ type: 'POST_BOTOX', beneficiaryId: benId });
    expect(a.cycles[0].action).toBe('created');
    const taskId1 = a.cycles[0].taskId;
    // Second fire — same (ben, measure) → update
    const b = await triggerSvc.fire({
      type: 'FALL_EVENT', // Different event code — still update same row
      beneficiaryId: benId,
    });
    // FALL_EVENT doesn't have BERG in triggerOverrides → NO_MATCHING
    expect(b.cycles).toEqual([]);
    // Same event again
    const c = await triggerSvc.fire({ type: 'POST_BOTOX', beneficiaryId: benId });
    expect(c.cycles[0].action).toBe('updated');
    expect(c.cycles[0].taskId).toBe(taskId1);
    // Only ONE row exists
    const allTasks = await MeasureReassessmentTask.find({
      beneficiaryId: benId,
      measureId: berg._id,
    });
    expect(allTasks.length).toBe(1);
  });

  test('updated task gets new event metadata appended', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX', 'FALL_EVENT'] });
    const benId = new mongoose.Types.ObjectId();
    await triggerSvc.fire({
      type: 'POST_BOTOX',
      beneficiaryId: benId,
      payload: { medicationCode: 'A03BB01' },
    });
    const newEventDate = new Date('2026-05-21T10:00:00Z');
    await triggerSvc.fire({
      type: 'FALL_EVENT',
      beneficiaryId: benId,
      payload: { severity: 'moderate' },
      eventDate: newEventDate,
    });
    const task = await MeasureReassessmentTask.findOne({ measureId: berg._id });
    expect(task.eventTriggerCode).toBe('FALL_EVENT');
    expect(task.eventTriggerPayload.severity).toBe('moderate');
    expect(task.eventTriggeredAt.getTime()).toBe(newEventDate.getTime());
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. listEventTriggered
// ════════════════════════════════════════════════════════════════════════

describe('W220 — listEventTriggered', () => {
  test('filters by beneficiary + eventCode', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX', 'FALL_EVENT'] });
    const fim = await seedFim({ triggerOverrides: ['POST_BOTOX'] });
    const benA = new mongoose.Types.ObjectId();
    const benB = new mongoose.Types.ObjectId();
    await triggerSvc.fire({ type: 'POST_BOTOX', beneficiaryId: benA });
    await triggerSvc.fire({ type: 'POST_BOTOX', beneficiaryId: benB });
    const a = await triggerSvc.listEventTriggered({ beneficiaryId: benA });
    expect(a.length).toBe(2); // BERG + FIM for benA
    const filtered = await triggerSvc.listEventTriggered({
      beneficiaryId: benA,
      eventCode: 'POST_BOTOX',
    });
    expect(filtered.length).toBe(2);
  });

  test('excludes scheduler-created tasks (no eventTriggerCode)', async () => {
    const berg = await seedBerg({ triggerOverrides: ['POST_BOTOX'] });
    const benId = new mongoose.Types.ObjectId();
    // Scheduler-style task (no eventTriggerCode)
    await MeasureReassessmentTask.create({
      beneficiaryId: benId,
      measureId: berg._id,
      measureCode: berg.code,
      standardIntervalDays: 90,
      dueAt: new Date(),
      status: 'pending',
    });
    const list = await triggerSvc.listEventTriggered({ beneficiaryId: benId });
    expect(list.length).toBe(0);
  });
});
