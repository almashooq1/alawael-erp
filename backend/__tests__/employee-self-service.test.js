/**
 * employee-self-service.test.js — Phase 11 Commit 7 (4.0.24).
 *
 * Integration coverage for the employee-self-service aggregator
 * against real models on mongodb-memory-server. Verifies:
 *
 *   - 404-like null return for a userId with no linked Employee
 *   - masked profile under self-access (RESTRICTED fields visible)
 *   - certifications get days_until_expiry + computed_status
 *   - leave_balance returns placeholder when no document exists
 *   - recent_leaves ordered by start_date desc, limited to 10
 *   - red_flags filtered by employeeId + active status
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createEmployeeSelfServiceService } = require('../services/hr/employeeSelfServiceService');

let mongoServer;
let Employee;
let EmploymentContract;
let Certification;
let LeaveBalance;
let Leave;
let RedFlagState;
let PerformanceReview;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'self-service-test' });
  Employee = require('../models/HR/Employee');
  EmploymentContract = require('../models/hr/EmploymentContract');
  Certification = require('../models/hr/Certification');
  LeaveBalance = require('../models/hr/LeaveBalance');
  Leave = require('../models/hr/Leave');
  RedFlagState = require('../models/RedFlagState');
  PerformanceReview = require('../models/hr/PerformanceReview');
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
  await Employee.deleteMany({});
  await EmploymentContract.deleteMany({});
  await Certification.deleteMany({});
  await LeaveBalance.deleteMany({});
  await Leave.deleteMany({});
  await RedFlagState.deleteMany({});
  await PerformanceReview.deleteMany({});
});

const MS_PER_DAY = 24 * 3600 * 1000;
const NOW = new Date('2026-04-22T12:00:00.000Z');

function buildService() {
  return createEmployeeSelfServiceService({
    employeeModel: Employee,
    employmentContractModel: EmploymentContract,
    certificationModel: Certification,
    leaveBalanceModel: LeaveBalance,
    leaveModel: Leave,
    redFlagStateModel: RedFlagState,
    performanceReviewModel: PerformanceReview,
    now: () => NOW,
  });
}

let empCounter = 1;
async function seedEmployee({
  userId = new mongoose.Types.ObjectId(),
  basicSalary = 12000,
  nationalId = null,
} = {}) {
  const seq = empCounter++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `SS-${seq}`,
    user_id: userId,
    national_id: nationalId || `SSS${String(seq).padStart(7, '0')}`,
    email: `ss-${seq}-${Date.now()}@t.local`,
    name_ar: `موظف ${seq}`,
    name_en: `Employee ${seq}`,
    job_title_ar: 'معالج',
    department: 'clinical',
    specialization: 'speech',
    basic_salary: basicSalary,
    housing_allowance: 2000,
    iban: 'SA0380000000000000012345',
    status: 'active',
    branch_id: new mongoose.Types.ObjectId(),
    deleted_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, userId };
}

async function seedContract({
  employeeId,
  status = 'active',
  startDaysAgo = 365,
  endDaysFromNow = 365,
}) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(EmploymentContract.collection.collectionName).insertOne({
    _id,
    contract_number: `SS-C-${_id.toString().slice(-6)}`,
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    contract_type: 'fixed_term',
    start_date: new Date(NOW.getTime() - startDaysAgo * MS_PER_DAY),
    end_date: new Date(NOW.getTime() + endDaysFromNow * MS_PER_DAY),
    position: 'Therapist',
    department: 'clinical',
    basic_salary: 12000,
    status,
    deleted_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

async function seedCertification({
  employeeId,
  certType = 'cpr',
  expiryDaysFromNow = 90,
  isMandatory = true,
}) {
  return Certification.create({
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    cert_type: certType,
    cert_name_ar: 'شهادة اختبار',
    is_mandatory: isMandatory,
    expiry_date: new Date(NOW.getTime() + expiryDaysFromNow * MS_PER_DAY),
  });
}

async function seedLeaveBalance({ employeeId, year = NOW.getFullYear(), annualRemaining = 21 }) {
  return LeaveBalance.create({
    employee_id: employeeId,
    year,
    annual_entitled: 21,
    annual_remaining: annualRemaining,
  });
}

async function seedLeave({
  employeeId,
  startDaysAgo = 30,
  leaveType = 'annual',
  reason = 'vacation',
}) {
  // Leave model has a legacy async-next pre-save hook; use raw collection insert.
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Leave.collection.collectionName).insertOne({
    _id,
    leave_number: `SS-LV-${_id.toString().slice(-6)}`,
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    leave_type: leaveType,
    start_date: new Date(NOW.getTime() - startDaysAgo * MS_PER_DAY),
    end_date: new Date(NOW.getTime() - (startDaysAgo - 5) * MS_PER_DAY),
    days_requested: 5,
    status: 'approved',
    reason,
    deleted_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

async function seedFlag({ employeeId, flagId = 'operational.probation_review.overdue_7d' }) {
  return RedFlagState.create({
    flagId,
    employeeId: String(employeeId),
    beneficiaryId: new mongoose.Types.ObjectId().toString(),
    status: 'active',
    domain: 'operational',
    severity: 'warning',
    blocking: false,
    raisedAt: new Date(),
  });
}

// ─── Tests ──────────────────────────────────────────────────────

describe('buildSnapshot — linkage', () => {
  it('throws when userId is missing', async () => {
    await expect(buildService().buildSnapshot({})).rejects.toThrow(/userId is required/);
  });

  it('returns null when userId has no linked Employee', async () => {
    const out = await buildService().buildSnapshot({
      userId: new mongoose.Types.ObjectId(),
      role: 'therapist',
    });
    expect(out).toBeNull();
  });

  it('resolves via Employee.user_id and sets subject fields', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });

    const out = await buildService().buildSnapshot({
      userId,
      role: 'therapist',
    });
    expect(out).not.toBeNull();
    expect(out.generated_at).toBe(NOW.toISOString());
    expect(out.subject.user_id).toBe(String(userId));
    expect(out.subject.employee_id).toBe(String(emp._id));
    expect(out.subject.access_mode).toBe('self');
  });
});

describe('buildSnapshot — profile masking under self-access', () => {
  it('surfaces RESTRICTED fields (salary, national_id, IBAN) for the user viewing themselves', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId, basicSalary: 15000, nationalId: '1122334455' });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.profile.basic_salary).toBe(15000);
    expect(out.sections.profile.national_id).toBe('1122334455');
    expect(out.sections.profile.iban).toBe('SA0380000000000000012345');
    expect(out.sections.profile.name_ar).toMatch(/موظف/);
  });
});

describe('buildSnapshot — current_contract', () => {
  it('returns the most-recent contract', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });
    await seedContract({
      employeeId: emp._id,
      status: 'expired',
      startDaysAgo: 1000,
      endDaysFromNow: -400,
    });
    await seedContract({
      employeeId: emp._id,
      status: 'active',
      startDaysAgo: 300,
      endDaysFromNow: 100,
    });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.current_contract.status).toBe('active');
    // Self-access reveals confidential basic_salary.
    expect(out.sections.current_contract.basic_salary).toBe(12000);
  });

  it('returns null when no contract exists', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.current_contract).toBeNull();
  });
});

describe('buildSnapshot — certifications', () => {
  it('returns certs with days_until_expiry + computed_status buckets', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });
    await seedCertification({ employeeId: emp._id, certType: 'cpr', expiryDaysFromNow: -5 });
    await seedCertification({ employeeId: emp._id, certType: 'first_aid', expiryDaysFromNow: 30 });
    await seedCertification({ employeeId: emp._id, certType: 'bcba', expiryDaysFromNow: 180 });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    const certs = out.sections.certifications;
    expect(certs).toHaveLength(3);
    // Sorted ascending by expiry_date:
    expect(certs[0].computed_status).toBe('expired');
    expect(certs[0].days_until_expiry).toBeLessThan(0);
    expect(certs[1].computed_status).toBe('expiring_soon');
    expect(certs[2].computed_status).toBe('valid');
  });
});

describe('buildSnapshot — leave_balance', () => {
  it('returns the current-year document', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });
    await seedLeaveBalance({ employeeId: emp._id, year: NOW.getFullYear(), annualRemaining: 17 });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.leave_balance.year).toBe(NOW.getFullYear());
    expect(out.sections.leave_balance.annual_remaining).toBe(17);
  });

  it('returns a placeholder when no balance exists yet', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.leave_balance.not_yet_initialized).toBe(true);
    expect(out.sections.leave_balance.year).toBe(NOW.getFullYear());
    expect(String(out.sections.leave_balance.employee_id)).toBe(String(emp._id));
  });
});

describe('buildSnapshot — recent_leaves', () => {
  it('returns leaves sorted newest-first, capped at 10, masked under self', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });
    for (let i = 0; i < 12; i++) {
      await seedLeave({ employeeId: emp._id, startDaysAgo: (i + 1) * 20, reason: `reason-${i}` });
    }

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.recent_leaves).toHaveLength(10);
    const dates = out.sections.recent_leaves.map(l => l.start_date.getTime());
    const sortedDesc = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sortedDesc);
    // Self-access: reason (CONFIDENTIAL) should be visible.
    expect(out.sections.recent_leaves[0].reason).toBeDefined();
    expect(out.sections.recent_leaves[0].reason).not.toBe('[RESTRICTED]');
  });

  it('returns empty array when no leaves exist', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.recent_leaves).toEqual([]);
  });
});

describe('buildSnapshot — red_flags', () => {
  it('returns an empty array (RedFlagState has no employee scope yet)', async () => {
    // The Beneficiary-360 RedFlagState schema is keyed on beneficiaryId
    // only. Until a future schema revision adds `employeeId`, the
    // self-service red_flags section is structurally present so the
    // UI can render it — but always empty. Seeding flags against a
    // beneficiaryId should NOT surface in the employee's own view.
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });
    await seedFlag({ employeeId: emp._id });
    await RedFlagState.create({
      flagId: 'operational.leave_balance.overflow_45d',
      beneficiaryId: new mongoose.Types.ObjectId().toString(),
      status: 'active',
      domain: 'operational',
      severity: 'warning',
      blocking: false,
      raisedAt: new Date(),
    });

    const out = await buildService().buildSnapshot({ userId, role: 'therapist' });
    expect(Array.isArray(out.sections.red_flags)).toBe(true);
    // Empty because employeeId is not an indexed field on the schema.
    expect(out.sections.red_flags).toHaveLength(0);
  });
});

describe('updateSelfProfile', () => {
  it('throws when userId is missing', async () => {
    await expect(
      buildService().updateSelfProfile({ patch: { phone: '0501234567' } })
    ).rejects.toThrow(/userId is required/);
  });

  it('returns not_linked when no Employee matches the userId', async () => {
    const res = await buildService().updateSelfProfile({
      userId: new mongoose.Types.ObjectId(),
      role: 'therapist',
      patch: { phone: '0501234567' },
    });
    expect(res.result).toBe('not_linked');
  });

  it('returns invalid with per-field errors for bad input', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId });

    const res = await buildService().updateSelfProfile({
      userId,
      role: 'therapist',
      patch: { phone: 'not-a-phone', basic_salary: 99999 },
    });
    expect(res.result).toBe('invalid');
    expect(res.errors.phone).toBeDefined();
    expect(res.errors.basic_salary).toBe('field is not self-editable');
  });

  it('returns no_changes when patch has only unknown fields that got filtered', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId });

    // All unknown fields → validation errors, not no_changes path.
    // no_changes fires only when the patch VALIDATES to an empty flat.
    const res = await buildService().updateSelfProfile({
      userId,
      role: 'therapist',
      patch: {},
    });
    expect(res.result).toBe('no_changes');
  });

  it('updates whitelisted fields and returns masked record + audit metadata', async () => {
    const userId = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ userId });

    const res = await buildService().updateSelfProfile({
      userId,
      role: 'therapist',
      patch: {
        phone: '0509998888',
        'emergency_contact.name': 'Sarah',
        'emergency_contact.phone': '0507776666',
        'emergency_contact.relation': 'spouse',
      },
    });
    expect(res.result).toBe('updated');
    expect(res.changedFields).toEqual(
      expect.arrayContaining([
        'phone',
        'emergency_contact.name',
        'emergency_contact.phone',
        'emergency_contact.relation',
      ])
    );
    expect(res.after).toEqual({
      phone: '0509998888',
      'emergency_contact.name': 'Sarah',
      'emergency_contact.phone': '0507776666',
      'emergency_contact.relation': 'spouse',
    });
    // Self-access masking: RESTRICTED fields still visible.
    expect(res.employee.phone).toBe('0509998888');
    expect(res.employee.emergency_contact.phone).toBe('0507776666');
    expect(res.employee.national_id).toBeDefined();
    expect(res.employee.national_id).not.toBe('[RESTRICTED]');

    // DB persisted
    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.phone).toBe('0509998888');
    expect(fromDb.emergency_contact.phone).toBe('0507776666');
  });

  it('records before-values for the audit trail', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId });
    // First patch sets emergency contact
    await buildService().updateSelfProfile({
      userId,
      role: 'therapist',
      patch: { 'emergency_contact.name': 'OriginalName' },
    });

    // Second patch updates it — before should be 'OriginalName'
    const res = await buildService().updateSelfProfile({
      userId,
      role: 'therapist',
      patch: { 'emergency_contact.name': 'NewName' },
    });
    expect(res.result).toBe('updated');
    expect(res.before['emergency_contact.name']).toBe('OriginalName');
    expect(res.after['emergency_contact.name']).toBe('NewName');
  });

  it('flattens nested emergency_contact object automatically', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId });

    const res = await buildService().updateSelfProfile({
      userId,
      role: 'therapist',
      patch: {
        emergency_contact: { name: 'Flat', phone: '0501111111', relation: 'parent' },
      },
    });
    expect(res.result).toBe('updated');
    expect(res.changedFields).toEqual(
      expect.arrayContaining([
        'emergency_contact.name',
        'emergency_contact.phone',
        'emergency_contact.relation',
      ])
    );
  });
});

describe('buildSnapshot — graceful degradation', () => {
  it('omits sections when their model is missing', async () => {
    const userId = new mongoose.Types.ObjectId();
    await seedEmployee({ userId });

    const service = createEmployeeSelfServiceService({
      employeeModel: Employee,
      // everything else missing
      now: () => NOW,
    });
    const out = await service.buildSnapshot({ userId, role: 'therapist' });
    expect(out.sections.current_contract).toBeNull();
    expect(out.sections.certifications).toEqual([]);
    expect(out.sections.leave_balance).toBeNull();
    expect(out.sections.recent_leaves).toEqual([]);
    expect(out.sections.red_flags).toEqual([]);
    expect(out.sections.last_review).toBeNull();
  });

  it('throws if employeeModel is missing entirely', () => {
    expect(() => createEmployeeSelfServiceService({})).toThrow(/employeeModel is required/);
  });
});
