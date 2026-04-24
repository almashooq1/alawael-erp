'use strict';

/**
 * hr-change-request-service.test.js — Phase 11 Commit 11 (4.0.28).
 *
 * Integration coverage for the approval-workflow service. Real
 * HrChangeRequest + Employee models against mongodb-memory-server.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrChangeRequestService } = require('../services/hr/hrChangeRequestService');
const { createEmployeeAdminService } = require('../services/hr/employeeAdminService');
const { ROLES } = require('../config/rbac.config');

let mongoServer;
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'hr-change-test' });
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
  await HrChangeRequest.deleteMany({});
  await Employee.deleteMany({});
});

let empCounter = 1;
async function seedEmployee({
  branchId = new mongoose.Types.ObjectId(),
  basicSalary = 10000,
  status = 'active',
  nationalId = null,
  housingAllowance = 2000,
} = {}) {
  const seq = empCounter++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `CR-${seq}`,
    user_id: new mongoose.Types.ObjectId(),
    national_id: nationalId || `CRN${String(seq).padStart(7, '0')}`,
    email: `cr-${seq}-${Date.now()}@t.local`,
    name_ar: `موظف ${seq}`,
    branch_id: branchId,
    department: 'clinical',
    specialization: 'speech',
    basic_salary: basicSalary,
    housing_allowance: housingAllowance,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, branchId };
}

function stubAuditService() {
  return {
    logHrAccess: jest.fn(async () => ({ logged: true })),
    logHrAccessDenied: jest.fn(async () => ({ logged: true })),
  };
}

// ─── createRequest ──────────────────────────────────────────────

describe('createRequest', () => {
  it('creates a pending request + fires audit', async () => {
    const emp = await seedEmployee();
    const audit = stubAuditService();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
      auditService: audit,
    });

    const res = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
      branchId: emp.branchId,
    });
    expect(res.result).toBe('created');
    expect(res.request.status).toBe('pending');
    expect(res.request.proposed_changes.basic_salary).toBe(15000);

    expect(audit.logHrAccess).toHaveBeenCalledTimes(1);
  });

  it('throws when proposedChanges is empty', async () => {
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    await expect(
      svc.createRequest({
        employeeId: new mongoose.Types.ObjectId(),
        requestorUserId: new mongoose.Types.ObjectId(),
        requestorRole: ROLES.HR_MANAGER,
        proposedChanges: {},
      })
    ).rejects.toThrow(/proposedChanges must be non-empty/);
  });
});

// ─── approveRequest ─────────────────────────────────────────────

describe('approveRequest', () => {
  it('applies to Employee + transitions to applied', async () => {
    const emp = await seedEmployee({ basicSalary: 10000 });
    const requestorId = new mongoose.Types.ObjectId();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });

    const { request } = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestorId,
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });

    const approverId = new mongoose.Types.ObjectId();
    const res = await svc.approveRequest({
      requestId: request._id,
      approverUserId: approverId,
      approverRole: ROLES.HR_SUPERVISOR,
    });
    expect(res.result).toBe('applied');
    expect(res.request.status).toBe('applied');
    expect(res.request.applied_at).toBeTruthy();

    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.basic_salary).toBe(15000);
  });

  it('forbids self-approval', async () => {
    const emp = await seedEmployee();
    const requestorId = new mongoose.Types.ObjectId();
    const audit = stubAuditService();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
      auditService: audit,
    });

    const { request } = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestorId,
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { status: 'terminated' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.termination'],
    });

    const res = await svc.approveRequest({
      requestId: request._id,
      approverUserId: requestorId, // same person
      approverRole: ROLES.HR_MANAGER,
    });
    expect(res.result).toBe('denied');
    expect(res.reason).toBe('self_approval_forbidden');
    expect(audit.logHrAccessDenied).toHaveBeenCalled();

    // Employee untouched
    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.status).toBe('active');
  });

  it('detects stale baseline and marks approved_not_applied', async () => {
    const emp = await seedEmployee({ basicSalary: 10000 });
    const requestorId = new mongoose.Types.ObjectId();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });

    const { request } = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestorId,
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });

    // Someone else updated salary between proposal and approval
    await Employee.updateOne({ _id: emp._id }, { $set: { basic_salary: 12000 } });

    const res = await svc.approveRequest({
      requestId: request._id,
      approverUserId: new mongoose.Types.ObjectId(),
      approverRole: ROLES.HR_SUPERVISOR,
    });
    expect(res.result).toBe('approved_not_applied');
    expect(res.reason).toBe('stale_baseline');
    expect(res.stalePaths).toContain('basic_salary');

    // The proposed value did NOT apply — still at 12000 (the intermediate)
    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.basic_salary).toBe(12000);
  });

  it('returns not_found for unknown request', async () => {
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const res = await svc.approveRequest({
      requestId: new mongoose.Types.ObjectId(),
      approverUserId: new mongoose.Types.ObjectId(),
      approverRole: ROLES.HR_SUPERVISOR,
    });
    expect(res.result).toBe('not_found');
  });

  it('returns invalid_state for non-pending requests', async () => {
    const emp = await seedEmployee();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const requestorId = new mongoose.Types.ObjectId();
    const { request } = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestorId,
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { status: 'terminated' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.termination'],
    });
    await svc.rejectRequest({
      requestId: request._id,
      approverUserId: new mongoose.Types.ObjectId(),
      approverRole: ROLES.HR_SUPERVISOR,
      reason: 'not now',
    });

    const res = await svc.approveRequest({
      requestId: request._id,
      approverUserId: new mongoose.Types.ObjectId(),
      approverRole: ROLES.HR_SUPERVISOR,
    });
    expect(res.result).toBe('invalid_state');
    expect(res.currentStatus).toBe('rejected');
  });
});

// ─── rejectRequest ──────────────────────────────────────────────

describe('rejectRequest', () => {
  it('transitions pending → rejected with reason', async () => {
    const emp = await seedEmployee();
    const requestorId = new mongoose.Types.ObjectId();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const { request } = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestorId,
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });
    const res = await svc.rejectRequest({
      requestId: request._id,
      approverUserId: new mongoose.Types.ObjectId(),
      approverRole: ROLES.HR_SUPERVISOR,
      reason: 'waiting for annual review',
    });
    expect(res.result).toBe('rejected');
    expect(res.request.status).toBe('rejected');
    expect(res.request.rejection_reason).toBe('waiting for annual review');
    // Employee untouched
    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.basic_salary).toBe(10000);
  });
});

// ─── cancelRequest ──────────────────────────────────────────────

describe('cancelRequest', () => {
  it('requestor can cancel their own pending request', async () => {
    const emp = await seedEmployee();
    const requestorId = new mongoose.Types.ObjectId();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const { request } = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestorId,
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });
    const res = await svc.cancelRequest({
      requestId: request._id,
      actorUserId: requestorId,
    });
    expect(res.result).toBe('cancelled');
  });

  it('non-requestor cannot cancel', async () => {
    const emp = await seedEmployee();
    const requestorId = new mongoose.Types.ObjectId();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const { request } = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: requestorId,
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });
    const res = await svc.cancelRequest({
      requestId: request._id,
      actorUserId: new mongoose.Types.ObjectId(), // different user
    });
    expect(res.result).toBe('denied');
    expect(res.reason).toBe('only_requestor_can_cancel');
  });
});

// ─── listPending ────────────────────────────────────────────────

describe('listPending', () => {
  it('returns only pending requests, filterable by branch', async () => {
    const emp = await seedEmployee();
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });

    const reqA = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
      branchId: emp.branchId,
    });
    // Reject one so only the first is pending.
    const reqB = await svc.createRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      requestorRole: ROLES.HR_MANAGER,
      proposedChanges: { status: 'terminated' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.termination'],
      branchId: emp.branchId,
    });
    await svc.rejectRequest({
      requestId: reqB.request._id,
      approverUserId: new mongoose.Types.ObjectId(),
      approverRole: ROLES.HR_SUPERVISOR,
    });

    const res = await svc.listPending({ branchId: emp.branchId });
    expect(res.total).toBe(1);
    expect(String(res.items[0]._id)).toBe(String(reqA.request._id));
  });
});

// ─── Integration: employeeAdminService.updateEmployee ───────────

describe('employeeAdminService.updateEmployee — approval integration', () => {
  it('sensitive patch (salary +20%) creates ChangeRequest instead of applying', async () => {
    const emp = await seedEmployee({ basicSalary: 10000 });
    const crSvc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const adminSvc = createEmployeeAdminService({
      employeeModel: Employee,
      changeRequestService: crSvc,
    });

    const res = await adminSvc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: new mongoose.Types.ObjectId(),
      patch: { basic_salary: 12500 }, // +25%
    });
    expect(res.result).toBe('pending_approval');
    expect(res.rulesTriggered).toContain('salary.increase_gt_15pct');
    expect(res.requestId).toBeTruthy();

    // Employee record NOT updated
    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.basic_salary).toBe(10000);

    // A pending request exists
    const pending = await HrChangeRequest.findOne({ status: 'pending' }).lean();
    expect(pending).toBeTruthy();
    expect(pending.proposed_changes.basic_salary).toBe(12500);
  });

  it('non-sensitive patch (department change) applies directly', async () => {
    const emp = await seedEmployee({ basicSalary: 10000 });
    const crSvc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const adminSvc = createEmployeeAdminService({
      employeeModel: Employee,
      changeRequestService: crSvc,
    });

    const res = await adminSvc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_OFFICER,
      callerUserId: new mongoose.Types.ObjectId(),
      patch: { department: 'support' },
    });
    expect(res.result).toBe('updated');

    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.department).toBe('support');

    // No pending request created
    const count = await HrChangeRequest.countDocuments({});
    expect(count).toBe(0);
  });

  it('termination request is routed to approval', async () => {
    const emp = await seedEmployee();
    const crSvc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const adminSvc = createEmployeeAdminService({
      employeeModel: Employee,
      changeRequestService: crSvc,
    });

    const res = await adminSvc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: new mongoose.Types.ObjectId(),
      patch: { status: 'terminated' },
    });
    expect(res.result).toBe('pending_approval');
    expect(res.rulesTriggered).toContain('employment.termination');

    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.status).toBe('active');
  });

  it('without changeRequestService injected, applies immediately (legacy path)', async () => {
    const emp = await seedEmployee({ basicSalary: 10000 });
    const adminSvc = createEmployeeAdminService({
      employeeModel: Employee,
      // no changeRequestService
    });

    const res = await adminSvc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: new mongoose.Types.ObjectId(),
      patch: { basic_salary: 15000 },
    });
    expect(res.result).toBe('updated');

    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.basic_salary).toBe(15000);
  });
});
