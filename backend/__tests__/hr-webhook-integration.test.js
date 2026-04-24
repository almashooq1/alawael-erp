'use strict';

/**
 * hr-webhook-integration.test.js — Phase 11 Commit 37 (4.0.54).
 *
 * Verifies that the services which own HR state transitions fire
 * webhook events via the injected dispatcher:
 *
 *   - hrAnomalyDetectorService → hr.anomaly.flagged (per flagged actor)
 *   - hrChangeRequestService   → hr.change_request.pending
 *                              → hr.change_request.approved  (applied or not)
 *                              → hr.change_request.rejected
 *                              → hr.change_request.cancelled
 *
 * The dispatcher is a fire-and-forget dependency — a failing
 * dispatcher must NOT break the business logic (anomaly recording,
 * change-request approval). These tests assert both behaviors.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrAnomalyDetectorService } = require('../services/hr/hrAnomalyDetectorService');
const { createHrChangeRequestService } = require('../services/hr/hrChangeRequestService');

let mongoServer;
let AuditLog;
let HrChangeRequest;
let Employee;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-webhook-int' });
  AuditLog = require('../models/AuditLog');
  HrChangeRequest = require('../models/hr/HrChangeRequest');
  Employee = require('../models/HR/Employee');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await AuditLog.deleteMany({});
  await HrChangeRequest.deleteMany({});
  await Employee.deleteMany({});
});

// A capturing dispatcher stub — records every dispatch call.
function makeCapturingDispatcher({ failOn = null } = {}) {
  const calls = [];
  return {
    calls,
    dispatch: jest.fn(async (eventType, payload) => {
      calls.push({ eventType, payload });
      if (failOn && failOn.includes(eventType)) {
        throw new Error(`dispatcher_fail_for_${eventType}`);
      }
      return { dispatched: 1, succeeded: 1, failed: 0, results: [] };
    }),
  };
}

async function seedReads({ userId, count, since }) {
  const docs = [];
  for (let i = 0; i < count; i += 1) {
    docs.push({
      eventType: 'data.read',
      eventCategory: 'data',
      userId,
      userRole: 'HR',
      resource: `hr:employee:abc${i}`,
      message: 'read',
      status: 'success',
      createdAt: new Date(since.getTime() + i * 1000),
    });
  }
  await AuditLog.insertMany(docs);
}

// ─── Anomaly detector → webhook ────────────────────────────────

describe('hrAnomalyDetectorService — webhook integration', () => {
  it('fires hr.anomaly.flagged once per flagged actor', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const now = new Date();
    await seedReads({ userId: userA, count: 120, since: new Date(now.getTime() - 30 * 60 * 1000) });
    await seedReads({ userId: userB, count: 150, since: new Date(now.getTime() - 30 * 60 * 1000) });

    const dispatcher = makeCapturingDispatcher();
    const svc = createHrAnomalyDetectorService({
      auditLogModel: AuditLog,
      webhookDispatcher: dispatcher,
      now: () => now,
    });

    const report = await svc.scan({
      windowMinutes: 60,
      readsPerHourThreshold: 100,
    });
    expect(report.totals.read_anomalies).toBe(2);
    expect(dispatcher.calls).toHaveLength(2);
    dispatcher.calls.forEach(c => {
      expect(c.eventType).toBe('hr.anomaly.flagged');
      expect(c.payload.reason).toBe('excessive_reads');
      expect(c.payload.userId).toBeDefined();
      expect(c.payload.observedCount).toBeGreaterThanOrEqual(100);
      expect(c.payload.scannedAt).toBe(now.toISOString());
    });
    expect(report.totals.webhooks_dispatched).toBe(2);
  });

  it('does not fire webhooks in dry-run mode', async () => {
    const userA = new mongoose.Types.ObjectId();
    const now = new Date();
    await seedReads({ userId: userA, count: 120, since: new Date(now.getTime() - 30 * 60 * 1000) });

    const dispatcher = makeCapturingDispatcher();
    const svc = createHrAnomalyDetectorService({
      auditLogModel: AuditLog,
      webhookDispatcher: dispatcher,
      now: () => now,
    });
    const report = await svc.scan({ dryRun: true });
    expect(report.totals.read_anomalies).toBe(1);
    expect(dispatcher.calls).toHaveLength(0);
  });

  it('dispatcher failure never breaks the scan', async () => {
    const userA = new mongoose.Types.ObjectId();
    const now = new Date();
    await seedReads({ userId: userA, count: 120, since: new Date(now.getTime() - 30 * 60 * 1000) });

    const dispatcher = makeCapturingDispatcher({ failOn: ['hr.anomaly.flagged'] });
    const svc = createHrAnomalyDetectorService({
      auditLogModel: AuditLog,
      webhookDispatcher: dispatcher,
      now: () => now,
    });
    const report = await svc.scan();
    expect(report.totals.read_anomalies).toBe(1);
    // Security audit event still recorded
    const auditHit = await AuditLog.findOne({ eventType: 'security.suspicious_activity' });
    expect(auditHit).not.toBeNull();
  });

  it('works with dispatcher absent (legacy construction)', async () => {
    const userA = new mongoose.Types.ObjectId();
    const now = new Date();
    await seedReads({ userId: userA, count: 120, since: new Date(now.getTime() - 30 * 60 * 1000) });

    const svc = createHrAnomalyDetectorService({
      auditLogModel: AuditLog,
      now: () => now,
    });
    const report = await svc.scan();
    expect(report.totals.read_anomalies).toBe(1);
    expect(report.totals.webhooks_dispatched).toBe(0);
  });

  it('fires for export anomalies too', async () => {
    const userA = new mongoose.Types.ObjectId();
    const now = new Date();
    const docs = [];
    for (let i = 0; i < 8; i += 1) {
      docs.push({
        eventType: 'data.exported',
        eventCategory: 'data',
        userId: userA,
        userRole: 'HR',
        resource: `hr:employee:exp${i}`,
        message: 'exported',
        status: 'success',
        createdAt: new Date(now.getTime() - i * 60 * 60 * 1000),
      });
    }
    await AuditLog.insertMany(docs);

    const dispatcher = makeCapturingDispatcher();
    const svc = createHrAnomalyDetectorService({
      auditLogModel: AuditLog,
      webhookDispatcher: dispatcher,
      now: () => now,
    });
    const report = await svc.scan({ exportsPerDayThreshold: 5 });
    expect(report.totals.export_anomalies).toBe(1);
    expect(dispatcher.calls).toHaveLength(1);
    expect(dispatcher.calls[0].payload.reason).toBe('excessive_exports');
  });
});

// ─── Change-request → webhook ──────────────────────────────────

async function seedEmployee(overrides = {}) {
  // Raw driver insert — EmploymentContract's pre-save hook is the
  // flaky one; Employee is fine but this bypass stays consistent
  // with other phase-11 tests.
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    employee_id: 'EMP' + Date.now(),
    national_id: '1' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
    full_name_ar: 'موظف',
    full_name_en: 'Employee',
    personal_info: { mobile: '0501234567' },
    employment_info: {
      position: 'Staff',
      department: 'HR',
      hire_date: new Date(),
    },
    ...overrides,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await mongoose.connection.db.collection('employees').insertOne(doc);
  return doc;
}

describe('hrChangeRequestService — webhook integration', () => {
  it('fires pending on createRequest', async () => {
    const emp = await seedEmployee();
    const dispatcher = makeCapturingDispatcher();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
      webhookDispatcher: dispatcher,
    });
    const r = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: 'HR',
      proposedChanges: { 'personal_info.mobile': '0509999999' },
      baseline: { 'personal_info.mobile': '0501234567' },
    });
    expect(r.result).toBe('created');
    // Fire-and-forget — give the microtask a tick to flush.
    await new Promise(setImmediate);
    expect(dispatcher.calls).toHaveLength(1);
    expect(dispatcher.calls[0].eventType).toBe('hr.change_request.pending');
    expect(dispatcher.calls[0].payload.status).toBe('pending');
    expect(dispatcher.calls[0].payload.changed_fields).toEqual(['personal_info.mobile']);
  });

  it('fires approved on successful apply', async () => {
    const emp = await seedEmployee();
    const dispatcher = makeCapturingDispatcher();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
      webhookDispatcher: dispatcher,
    });
    const req = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: 'HR',
      proposedChanges: { 'personal_info.mobile': '0509999999' },
      baseline: { 'personal_info.mobile': '0501234567' },
    });
    const approver = new mongoose.Types.ObjectId();
    const approval = await svc.approveRequest({
      requestId: req.request._id,
      approverUserId: approver,
      approverRole: 'HR_MANAGER',
    });
    expect(['applied', 'approved_not_applied']).toContain(approval.result);
    await new Promise(setImmediate);
    const approved = dispatcher.calls.find(c => c.eventType === 'hr.change_request.approved');
    expect(approved).toBeDefined();
    expect(String(approved.payload.approver_user_id)).toBe(String(approver));
  });

  it('fires rejected on rejectRequest', async () => {
    const emp = await seedEmployee();
    const dispatcher = makeCapturingDispatcher();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
      webhookDispatcher: dispatcher,
    });
    const req = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: 'HR',
      proposedChanges: { 'personal_info.mobile': '0509999999' },
      baseline: { 'personal_info.mobile': '0501234567' },
    });
    const r = await svc.rejectRequest({
      requestId: req.request._id,
      approverUserId: new mongoose.Types.ObjectId(),
      approverRole: 'HR_MANAGER',
      reason: 'not aligned',
    });
    expect(r.result).toBe('rejected');
    await new Promise(setImmediate);
    const rejected = dispatcher.calls.find(c => c.eventType === 'hr.change_request.rejected');
    expect(rejected).toBeDefined();
    expect(rejected.payload.rejection_reason).toBe('not aligned');
  });

  it('fires cancelled on cancelRequest', async () => {
    const emp = await seedEmployee();
    const dispatcher = makeCapturingDispatcher();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
      webhookDispatcher: dispatcher,
    });
    const requestor = new mongoose.Types.ObjectId();
    const req = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestor,
      requestorRole: 'HR',
      proposedChanges: { 'personal_info.mobile': '0509999999' },
      baseline: { 'personal_info.mobile': '0501234567' },
    });
    const r = await svc.cancelRequest({
      requestId: req.request._id,
      actorUserId: requestor,
    });
    expect(r.result).toBe('cancelled');
    await new Promise(setImmediate);
    const cancelled = dispatcher.calls.find(c => c.eventType === 'hr.change_request.cancelled');
    expect(cancelled).toBeDefined();
    expect(String(cancelled.payload.actor_user_id)).toBe(String(requestor));
  });

  it('dispatcher failure never breaks the transition', async () => {
    const emp = await seedEmployee();
    const dispatcher = makeCapturingDispatcher({
      failOn: [
        'hr.change_request.pending',
        'hr.change_request.approved',
        'hr.change_request.rejected',
        'hr.change_request.cancelled',
      ],
    });
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
      webhookDispatcher: dispatcher,
    });
    const r = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: 'HR',
      proposedChanges: { 'personal_info.mobile': '0509999999' },
      baseline: { 'personal_info.mobile': '0501234567' },
    });
    expect(r.result).toBe('created');
    await new Promise(setImmediate);
    const doc = await HrChangeRequest.findById(r.request._id);
    expect(doc.status).toBe('pending');
  });

  it('works with dispatcher absent (legacy construction)', async () => {
    const emp = await seedEmployee();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const r = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: 'HR',
      proposedChanges: { 'personal_info.mobile': '0509999999' },
      baseline: { 'personal_info.mobile': '0501234567' },
    });
    expect(r.result).toBe('created');
  });
});
