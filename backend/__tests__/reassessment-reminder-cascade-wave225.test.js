'use strict';

/**
 * reassessment-reminder-cascade-wave225.test.js — Wave 225.
 *
 * Verifies the reminder cascade dispatcher:
 *
 *   dispatch() basics:
 *     - Each phase fires the correct policy (priority, type, category, title)
 *     - SCHEDULED tasks skipped (no reminder phase)
 *     - completed/cancelled tasks skipped
 *
 *   Idempotency:
 *     - Re-running with same clock fires nothing new
 *     - remindersSent[] tracks fired (phase, sentAt) pairs
 *     - Phase transition lets the next phase fire (DUE_NOW after DUE_SOON)
 *
 *   Recipient fan-out:
 *     - Assignee always notified when set
 *     - OVERDUE/ESCALATED/BREACHED include supervisor via recipientHints
 *     - BREACHED also includes QA
 *     - Deduped: same user listed twice → one notification
 *     - No recipients → still marked sent (recipientCount=0)
 *
 *   Filters:
 *     - branchId / beneficiaryId scope
 *
 *   Off-switch:
 *     - MEASURE_REASSESS_REMINDERS=off → disabled summary
 *
 *   Read-side:
 *     - listForBeneficiary returns reminders newest first
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let MeasureReassessmentTask;
let Notification;
let cascade;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w225-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ MeasureReassessmentTask } = require('../domains/goals/models/MeasureReassessmentTask'));
  Notification = require('../models/Notification');
  cascade = require('../services/reassessmentReminderCascade.service');
  await MeasureReassessmentTask.init();
  await Notification.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MeasureReassessmentTask.deleteMany({});
  await Notification.deleteMany({});
});

async function seedTask({
  assigneeId,
  branchId,
  dueAt,
  phase = 'DUE_SOON',
  status = 'pending',
  beneficiaryId,
  escalatedToUserId,
}) {
  return MeasureReassessmentTask.create({
    beneficiaryId: beneficiaryId || new mongoose.Types.ObjectId(),
    measureId: new mongoose.Types.ObjectId(),
    measureCode: 'BERG',
    standardIntervalDays: 90,
    dueAt: dueAt || new Date(),
    overdueDays: 0,
    status,
    phase,
    assigneeId,
    branchId,
    escalatedToUserId,
    ...(status === 'cancelled' ? { cancelledAt: new Date(), cancellationReason: 'test' } : {}),
    ...(status === 'completed' ? { completedAt: new Date() } : {}),
  });
}

// ════════════════════════════════════════════════════════════════════════
// 1. Basics — each phase fires correct policy
// ════════════════════════════════════════════════════════════════════════

describe('W225 — phase → policy mapping', () => {
  test.each([
    ['DUE_SOON', 'medium', 'reminder', 'measure_reassessment'],
    ['DUE_NOW', 'high', 'reminder', 'measure_reassessment'],
    ['OVERDUE', 'high', 'alert', 'measure_reassessment_overdue'],
    ['ESCALATED', 'urgent', 'alert', 'measure_reassessment_escalated'],
    ['BREACHED', 'critical', 'alert', 'measure_reassessment_breached'],
  ])('phase=%s → priority=%s, type=%s, category=%s', async (phase, priority, type, category) => {
    const assigneeId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase });
    const out = await cascade.dispatch();
    expect(out.dispatched).toBe(1);
    const notif = await Notification.findOne({ recipientId: assigneeId });
    expect(notif.priority).toBe(priority);
    expect(notif.type).toBe(type);
    expect(notif.category).toBe(category);
  });

  test('SCHEDULED task NOT fired', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase: 'SCHEDULED' });
    const out = await cascade.dispatch();
    expect(out.dispatched).toBe(0);
    expect(out.scanned).toBe(0);
  });

  test('completed task NOT fired', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase: 'OVERDUE', status: 'completed' });
    const out = await cascade.dispatch();
    expect(out.dispatched).toBe(0);
  });

  test('cancelled task NOT fired', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase: 'OVERDUE', status: 'cancelled' });
    const out = await cascade.dispatch();
    expect(out.dispatched).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. Idempotency
// ════════════════════════════════════════════════════════════════════════

describe('W225 — idempotency', () => {
  test('re-running fires nothing new for same phase', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const task = await seedTask({ assigneeId, phase: 'DUE_SOON' });
    await cascade.dispatch();
    const out = await cascade.dispatch();
    expect(out.dispatched).toBe(0);
    const t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.remindersSent.length).toBe(1);
    expect(t.remindersSent[0].phase).toBe('DUE_SOON');
  });

  test('phase transition lets next phase fire', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const task = await seedTask({ assigneeId, phase: 'DUE_SOON' });
    await cascade.dispatch();
    // Simulate W222 phase transition
    task.phase = 'DUE_NOW';
    await task.save();
    const out = await cascade.dispatch();
    expect(out.dispatched).toBe(1);
    const t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.remindersSent.map(r => r.phase)).toEqual(['DUE_SOON', 'DUE_NOW']);
  });

  test('remindersSent[] records timestamp + recipientCount', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const task = await seedTask({ assigneeId, phase: 'OVERDUE' });
    const NOW = new Date('2026-05-20T14:00:00Z');
    await cascade.dispatch({ now: NOW });
    const t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.remindersSent[0].sentAt.getTime()).toBe(NOW.getTime());
    expect(t.remindersSent[0].recipientCount).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Recipient fan-out
// ════════════════════════════════════════════════════════════════════════

describe('W225 — recipient fan-out', () => {
  test('assignee notified when set', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase: 'DUE_SOON' });
    await cascade.dispatch();
    const notif = await Notification.findOne({ recipientId: assigneeId });
    expect(notif).toBeTruthy();
  });

  test('OVERDUE includes supervisor via recipientHints', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const supervisorId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, branchId, phase: 'OVERDUE' });
    const hints = {
      supervisorByBranchId: new Map([[String(branchId), supervisorId]]),
    };
    await cascade.dispatch({ recipientHints: hints });
    const all = await Notification.find({});
    const recipients = all.map(n => String(n.recipientId)).sort();
    expect(recipients).toEqual([String(assigneeId), String(supervisorId)].sort());
  });

  test('OVERDUE includes task.escalatedToUserId when set (no hints needed)', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const escalatedTo = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase: 'OVERDUE', escalatedToUserId: escalatedTo });
    await cascade.dispatch();
    const all = await Notification.find({});
    expect(all.length).toBe(2);
  });

  test('BREACHED includes QA + supervisor', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const supervisorId = new mongoose.Types.ObjectId();
    const qaId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, branchId, phase: 'BREACHED' });
    const hints = {
      supervisorByBranchId: new Map([[String(branchId), supervisorId]]),
      qaByBranchId: new Map([[String(branchId), qaId]]),
    };
    await cascade.dispatch({ recipientHints: hints });
    const all = await Notification.find({});
    expect(all.length).toBe(3);
    const recipients = new Set(all.map(n => String(n.recipientId)));
    expect(recipients.has(String(assigneeId))).toBe(true);
    expect(recipients.has(String(supervisorId))).toBe(true);
    expect(recipients.has(String(qaId))).toBe(true);
  });

  test('DUE_SOON does NOT include supervisor', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const supervisorId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, branchId, phase: 'DUE_SOON' });
    const hints = {
      supervisorByBranchId: new Map([[String(branchId), supervisorId]]),
    };
    await cascade.dispatch({ recipientHints: hints });
    const all = await Notification.find({});
    expect(all.length).toBe(1);
    expect(String(all[0].recipientId)).toBe(String(assigneeId));
  });

  test('dedupe: assignee + escalatedTo same user → single notification', async () => {
    const sameUser = new mongoose.Types.ObjectId();
    await seedTask({
      assigneeId: sameUser,
      phase: 'OVERDUE',
      escalatedToUserId: sameUser,
    });
    await cascade.dispatch();
    const all = await Notification.find({});
    expect(all.length).toBe(1);
  });

  test('no recipients → marked sent with count=0', async () => {
    const task = await seedTask({ phase: 'DUE_SOON' }); // no assignee
    await cascade.dispatch();
    const all = await Notification.find({});
    expect(all.length).toBe(0);
    const t = await MeasureReassessmentTask.findById(task._id).lean();
    expect(t.remindersSent[0].recipientCount).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. Notification payload
// ════════════════════════════════════════════════════════════════════════

describe('W225 — notification payload', () => {
  test('metadata carries the task context', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const task = await seedTask({
      assigneeId,
      branchId,
      beneficiaryId: benId,
      phase: 'OVERDUE',
    });
    await cascade.dispatch();
    const notif = await Notification.findOne({ recipientId: assigneeId });
    expect(notif.metadata.wave).toBe('W225');
    expect(notif.metadata.beneficiaryId).toBe(String(benId));
    expect(notif.metadata.measureCode).toBe('BERG');
    expect(notif.metadata.taskId).toBe(String(task._id));
    expect(notif.metadata.phase).toBe('OVERDUE');
    expect(notif.metadata.branchId).toBe(String(branchId));
    expect(notif.link).toMatch(/care-plans/);
  });

  test('title includes measure code', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase: 'BREACHED' });
    await cascade.dispatch();
    const notif = await Notification.findOne({ recipientId: assigneeId });
    expect(notif.title).toContain('BERG');
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. Filters + off-switch
// ════════════════════════════════════════════════════════════════════════

describe('W225 — filters + off-switch', () => {
  test('branchId scopes the dispatch', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedTask({
      assigneeId: new mongoose.Types.ObjectId(),
      branchId: branchA,
      phase: 'OVERDUE',
    });
    await seedTask({
      assigneeId: new mongoose.Types.ObjectId(),
      branchId: branchB,
      phase: 'OVERDUE',
    });
    const out = await cascade.dispatch({ branchId: branchA });
    expect(out.dispatched).toBe(1);
  });

  test('beneficiaryId scopes the dispatch', async () => {
    const benA = new mongoose.Types.ObjectId();
    const benB = new mongoose.Types.ObjectId();
    await seedTask({
      assigneeId: new mongoose.Types.ObjectId(),
      beneficiaryId: benA,
      phase: 'OVERDUE',
    });
    await seedTask({
      assigneeId: new mongoose.Types.ObjectId(),
      beneficiaryId: benB,
      phase: 'OVERDUE',
    });
    const out = await cascade.dispatch({ beneficiaryId: benA });
    expect(out.dispatched).toBe(1);
  });

  test('off-switch returns disabled summary', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    await seedTask({ assigneeId, phase: 'OVERDUE' });
    const orig = process.env.MEASURE_REASSESS_REMINDERS;
    process.env.MEASURE_REASSESS_REMINDERS = 'off';
    try {
      const out = await cascade.dispatch();
      expect(out.disabled).toBe(true);
      const all = await Notification.find({});
      expect(all.length).toBe(0);
    } finally {
      if (orig === undefined) {
        delete process.env.MEASURE_REASSESS_REMINDERS;
      } else {
        process.env.MEASURE_REASSESS_REMINDERS = orig;
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. Read-side
// ════════════════════════════════════════════════════════════════════════

describe('W225 — listForBeneficiary', () => {
  test('returns reminders newest first', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    const benId = new mongoose.Types.ObjectId();
    const t1 = await seedTask({ assigneeId, beneficiaryId: benId, phase: 'OVERDUE' });
    await cascade.dispatch({ now: new Date('2026-05-15T10:00:00Z') });
    // Simulate transition
    t1.phase = 'BREACHED';
    await t1.save();
    await cascade.dispatch({ now: new Date('2026-05-20T10:00:00Z') });
    const list = await cascade.listForBeneficiary(benId);
    expect(list.length).toBe(2);
    expect(list[0].metadata.phase).toBe('BREACHED');
    expect(list[1].metadata.phase).toBe('OVERDUE');
  });

  test('requires beneficiaryId', async () => {
    await expect(cascade.listForBeneficiary()).rejects.toThrow(/beneficiaryId required/);
  });
});
