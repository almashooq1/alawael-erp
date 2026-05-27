'use strict';

/**
 * measure-alert-auto-assignment-wave509.test.js — Wave 509 (Phase D).
 *
 * Behavioural drift guard for services/measure-alert-auto-assignment.service.js.
 * Covers the auto-assignment lifecycle end-to-end via real Mongoose
 * (MongoMemoryServer) — proves:
 *
 *   1. New MeasureAlert with no assignee → service picks best therapist
 *      via W432 matcher + sets assigneeId atomically.
 *   2. Already-assigned alert is NEVER overridden.
 *   3. Resolved/dismissed alert is skipped.
 *   4. Empty candidate pool → skipped with reason 'no_candidates' (NOT
 *      a random assignment).
 *   5. Concurrent fire races → only ONE call sees null assigneeId and
 *      assigns; the rest get 'concurrent_assignment'.
 *   6. Subscriber wires correctly to a bus stub + invokes the handler
 *      with the event payload.
 *
 * Pattern mirrors W479/W507 drift guards — real Mongoose where the
 * persistence semantics matter, stub bus for the subscriber wiring.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let MeasureAlert;
let Beneficiary;
let User;
let service;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w509-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ MeasureAlert } = require('../domains/goals/models/MeasureAlert'));
  Beneficiary = require('../models/Beneficiary');
  User = require('../models/User');
  await MeasureAlert.init();
  service = require('../services/measure-alert-auto-assignment.service');
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await MeasureAlert.deleteMany({});
  await Beneficiary.deleteMany({});
  await User.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────

async function makeBeneficiary(overrides = {}) {
  return Beneficiary.create({
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'Ben',
    firstName_ar: overrides.firstName_ar || 'تجربة',
    lastName_ar: overrides.lastName_ar || 'مستفيد',
    branchId: overrides.branchId,
    ...overrides,
  });
}

async function makeTherapist(overrides = {}) {
  const firstName = overrides.firstName || 'TherapistFirst';
  const lastName = overrides.lastName || 'TherapistLast';
  return User.create({
    firstName,
    lastName,
    fullName: overrides.fullName || `${firstName} ${lastName}`,
    email: overrides.email || `t${Math.random().toString(36).slice(2, 8)}@x.io`,
    password: 'X1!aaaaa',
    role: 'therapist',
    isActive: overrides.isActive ?? true,
    branchId: overrides.branchId,
    specialties: overrides.specialties,
    experienceYears: overrides.experienceYears ?? 5,
    ...overrides,
  });
}

async function makeAlert({
  beneficiaryId,
  branchId,
  assigneeId = null,
  severity = 'high',
  alertType = 'FORECAST_OFF_TRACK',
  status = 'open',
}) {
  return MeasureAlert.create({
    beneficiaryId,
    measureId: new mongoose.Types.ObjectId(),
    measureCode: 'BERG',
    branchId,
    alertType,
    severity,
    status,
    firstSeenAt: new Date(),
    lastEvaluatedAt: new Date(),
    assigneeId,
  });
}

// ════════════════════════════════════════════════════════════════════
// _autoAssignOne — primary unit
// ════════════════════════════════════════════════════════════════════

describe('W509 — _autoAssignOne happy path', () => {
  test('assigns the best-match therapist when assigneeId is null', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    const t1 = await makeTherapist({ branchId, experienceYears: 8 });
    const t2 = await makeTherapist({ branchId, experienceYears: 2 });
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
    });

    const r = await service._autoAssignOne({ alertId: alert._id, logger: console });
    expect(r.action).toBe('assigned');
    expect([String(t1._id), String(t2._id)]).toContain(r.assigneeId);
    expect(r.score).toBeGreaterThan(0);

    const updated = await MeasureAlert.findById(alert._id).lean();
    expect(updated.assigneeId).toBeTruthy();
    expect([String(t1._id), String(t2._id)]).toContain(String(updated.assigneeId));
  });

  test('chooses the therapist with the LOWER currentLoad (caseload balancing)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    // Both therapists have identical specialty + experience.
    const tA = await makeTherapist({ branchId, experienceYears: 5 });
    const tB = await makeTherapist({ branchId, experienceYears: 5 });
    // Stack 10 open alerts on tA before the contested alert.
    for (let i = 0; i < 10; i++) {
      await makeAlert({
        beneficiaryId: new mongoose.Types.ObjectId(),
        branchId,
        assigneeId: tA._id,
      });
    }
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
    });
    const r = await service._autoAssignOne({ alertId: alert._id });
    expect(r.action).toBe('assigned');
    // tB has fewer open alerts → should win on currentLoad factor.
    expect(r.assigneeId).toBe(String(tB._id));
  });
});

// ════════════════════════════════════════════════════════════════════
// _autoAssignOne — guard rails
// ════════════════════════════════════════════════════════════════════

describe('W509 — _autoAssignOne guard rails', () => {
  test('skips when assigneeId is already set', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    const t = await makeTherapist({ branchId });
    const preAssigned = new mongoose.Types.ObjectId();
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
      assigneeId: preAssigned,
    });
    const r = await service._autoAssignOne({ alertId: alert._id });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('already_assigned');
    const after = await MeasureAlert.findById(alert._id).lean();
    expect(String(after.assigneeId)).toBe(String(preAssigned));
    // Confirm therapist t wasn't picked.
    expect(String(after.assigneeId)).not.toBe(String(t._id));
  });

  test('skips when status is not open', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    await makeTherapist({ branchId });
    // Build the alert as 'open' then flip to 'resolved' WITH resolvedAt
    // — the schema's W221 invariant requires resolvedAt set when status='resolved'.
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
    });
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolutionMode = 'manual';
    await alert.save();
    const r = await service._autoAssignOne({ alertId: alert._id });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('not_open');
  });

  test('skips when alert does not exist', async () => {
    const r = await service._autoAssignOne({
      alertId: new mongoose.Types.ObjectId(),
    });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('alert_not_found');
  });

  test('skips when no candidate therapists in branch', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    // No therapists seeded.
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
    });
    const r = await service._autoAssignOne({ alertId: alert._id });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('no_candidates');
    const after = await MeasureAlert.findById(alert._id).lean();
    expect(after.assigneeId).toBeFalsy();
  });

  test('inactive therapists are excluded from the pool', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    await makeTherapist({ branchId, isActive: false });
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
    });
    const r = await service._autoAssignOne({ alertId: alert._id });
    expect(r.action).toBe('skipped');
    expect(r.reason).toBe('no_candidates');
  });
});

// ════════════════════════════════════════════════════════════════════
// Concurrency
// ════════════════════════════════════════════════════════════════════

describe('W509 — concurrency safety', () => {
  test('two concurrent fires → only one assignment wins (findOneAndUpdate atomic)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    await makeTherapist({ branchId });
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
    });

    const [r1, r2] = await Promise.all([
      service._autoAssignOne({ alertId: alert._id }),
      service._autoAssignOne({ alertId: alert._id }),
    ]);

    const outcomes = [r1.action, r2.action].sort();
    // Exactly ONE 'assigned' + one 'skipped' (concurrent_assignment OR
    // already_assigned depending on race ordering).
    expect(outcomes.filter(o => o === 'assigned')).toHaveLength(1);
    expect(outcomes.filter(o => o === 'skipped')).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════════════
// wireMeasureAlertAutoAssignment — bus subscription
// ════════════════════════════════════════════════════════════════════

describe('W509 — wireMeasureAlertAutoAssignment subscription', () => {
  function makeBusStub() {
    const handlers = new Map();
    return {
      subscribe(pattern, handler) {
        handlers.set(pattern, handler);
        return () => handlers.delete(pattern);
      },
      async fire(pattern, payload) {
        const h = handlers.get(pattern);
        if (h) await h({ payload });
      },
      handlers,
    };
  }

  test('subscribes to the W506 pattern and increments stats on each event', async () => {
    const bus = makeBusStub();
    const wired = service.wireMeasureAlertAutoAssignment({
      integrationBus: bus,
      logger: { info: () => {}, warn: () => {} },
    });
    expect(bus.handlers.has(service.PATTERN)).toBe(true);

    // Fire with no alertId — should count as received + skipped.
    await bus.fire(service.PATTERN, {});
    expect(wired.ranSinceBoot()).toMatchObject({
      received: 1,
      assigned: 0,
      skipped: 1,
    });
  });

  test('handler triggers actual assignment when alert exists', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const beneficiary = await makeBeneficiary({ branchId });
    await makeTherapist({ branchId });
    const alert = await makeAlert({
      beneficiaryId: beneficiary._id,
      branchId,
    });

    const bus = makeBusStub();
    const wired = service.wireMeasureAlertAutoAssignment({
      integrationBus: bus,
      logger: { info: () => {}, warn: () => {} },
    });
    await bus.fire(service.PATTERN, { alertId: String(alert._id) });

    expect(wired.ranSinceBoot().assigned).toBe(1);
    const after = await MeasureAlert.findById(alert._id).lean();
    expect(after.assigneeId).toBeTruthy();
  });

  test('throws when bus lacks .subscribe', () => {
    expect(() => service.wireMeasureAlertAutoAssignment({ integrationBus: {} })).toThrow(
      /subscribe/
    );
  });
});
