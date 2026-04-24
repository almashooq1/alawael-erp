/**
 * employee-admin-service.test.js — Phase 11 Commit 8 (4.0.25).
 *
 * Integration coverage for the HR admin directory service.
 * Exercises role gating, branch scoping, masking per role, self-
 * access elevation on detail view, pagination bounds, and audit
 * wiring.
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createEmployeeAdminService } = require('../services/hr/employeeAdminService');
const { ROLES } = require('../config/rbac.config');
const { REDACTED } = require('../config/hr-data-classification');

let mongoServer;
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'employee-admin-test' });
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
  await Employee.deleteMany({});
});

let empCounter = 1;
async function seedEmployee({
  branchId = new mongoose.Types.ObjectId(),
  status = 'active',
  department = 'clinical',
  nameAr = null,
  basicSalary = 10000,
  nationalId = null,
  userId = new mongoose.Types.ObjectId(),
} = {}) {
  const seq = empCounter++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `EA-${seq}`,
    user_id: userId,
    national_id: nationalId || `EAN${String(seq).padStart(7, '0')}`,
    email: `ea-${seq}-${Date.now()}@t.local`,
    name_ar: nameAr || `موظف ${seq}`,
    name_en: `Employee ${seq}`,
    job_title_ar: 'معالج',
    department,
    specialization: 'speech',
    basic_salary: basicSalary,
    housing_allowance: 2000,
    iban: `SA0380000000000000000${String(seq).padStart(4, '0')}`,
    status,
    branch_id: branchId,
    deleted_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, branchId, userId };
}

function stubAuditService() {
  return {
    logHrAccess: jest.fn(async () => ({ logged: true })),
    logHrAccessDenied: jest.fn(async () => ({ logged: true })),
  };
}

// ─── Construction ───────────────────────────────────────────────

describe('createEmployeeAdminService — construction', () => {
  it('throws when employeeModel is missing', () => {
    expect(() => createEmployeeAdminService({})).toThrow(/employeeModel is required/);
  });
});

// ─── listEmployees — role gating ────────────────────────────────

describe('listEmployees — role gating', () => {
  it('THERAPIST is denied (PUBLIC tier — below list minimum INTERNAL)', async () => {
    const audit = stubAuditService();
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.THERAPIST,
      callerUserId: 'u-1',
    });
    expect(res.access).toBe('denied');
    expect(res.reason).toBe('insufficient_privilege_for_list');
    expect(audit.logHrAccessDenied).toHaveBeenCalledTimes(1);
  });

  it('RECEPTIONIST is denied', async () => {
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.RECEPTIONIST,
      callerUserId: 'u-2',
    });
    expect(res.access).toBe('denied');
  });

  it('BRANCH_MANAGER is granted (INTERNAL tier)', async () => {
    await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.BRANCH_MANAGER,
      callerUserId: 'u-3',
      callerBranchId: null,
    });
    expect(res.access).toBe('granted');
  });

  it('HR_MANAGER is granted', async () => {
    await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.HR_MANAGER,
      callerUserId: 'u-4',
    });
    expect(res.access).toBe('granted');
  });
});

// ─── listEmployees — branch scoping ─────────────────────────────

describe('listEmployees — branch scoping', () => {
  it('BRANCH_MANAGER is auto-scoped to their branch even without explicit filter', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    await seedEmployee({ branchId: branchA });
    await seedEmployee({ branchId: branchA });
    await seedEmployee({ branchId: branchB });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.BRANCH_MANAGER,
      callerUserId: 'u-5',
      callerBranchId: branchA,
    });
    expect(res.total).toBe(2);
  });

  it('HR_MANAGER is cross-branch by default', async () => {
    await seedEmployee();
    await seedEmployee();
    await seedEmployee();

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.HR_MANAGER,
      callerUserId: 'u-6',
    });
    expect(res.total).toBe(3);
  });

  it('HR_MANAGER can narrow to a specific branch', async () => {
    const branchA = new mongoose.Types.ObjectId();
    await seedEmployee({ branchId: branchA });
    await seedEmployee();
    await seedEmployee();

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: { branchId: branchA },
      role: ROLES.HR_MANAGER,
      callerUserId: 'u-7',
    });
    expect(res.total).toBe(1);
  });
});

// ─── listEmployees — masking per role ───────────────────────────

describe('listEmployees — masking per role', () => {
  it('BRANCH_MANAGER sees PUBLIC + INTERNAL but NOT salary/national_id', async () => {
    await seedEmployee({ basicSalary: 15000, nationalId: '1234567890' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.BRANCH_MANAGER,
      callerUserId: 'u-8',
    });
    const row = res.items[0];
    expect(row.name_ar).toBeDefined();
    expect(row.email).toBeDefined(); // INTERNAL
    // Confidential + Restricted should be absent (projected out) OR
    // redacted. With projection pruning, they simply aren't fetched.
    expect(row.basic_salary).toBeUndefined();
    expect(row.national_id).toBeUndefined();
  });

  it('HR_OFFICER sees salary (CONFIDENTIAL) but not national_id (RESTRICTED)', async () => {
    await seedEmployee({ basicSalary: 20000, nationalId: '9999999999' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.HR_OFFICER,
      callerUserId: 'u-9',
    });
    const row = res.items[0];
    expect(row.basic_salary).toBe(20000);
    expect(row.national_id).toBeUndefined();
  });

  it('HR_MANAGER sees all tiers', async () => {
    await seedEmployee({ basicSalary: 25000, nationalId: '5555555555' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: {},
      role: ROLES.HR_MANAGER,
      callerUserId: 'u-10',
    });
    const row = res.items[0];
    expect(row.basic_salary).toBe(25000);
    expect(row.national_id).toBe('5555555555');
  });
});

// ─── listEmployees — pagination + filters ───────────────────────

describe('listEmployees — pagination + filters', () => {
  it('respects pagination (page, perPage)', async () => {
    for (let i = 0; i < 12; i++) await seedEmployee();

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const p1 = await svc.listEmployees({
      filters: { page: 1, perPage: 5 },
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    const p3 = await svc.listEmployees({
      filters: { page: 3, perPage: 5 },
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(p1.items).toHaveLength(5);
    expect(p3.items).toHaveLength(2);
    expect(p1.total).toBe(12);
    expect(p1.totalPages).toBe(3);
  });

  it('clamps perPage at 100', async () => {
    await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: { perPage: 10000 },
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(res.perPage).toBe(100);
  });

  it('filters by status', async () => {
    await seedEmployee({ status: 'active' });
    await seedEmployee({ status: 'active' });
    await seedEmployee({ status: 'terminated' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: { status: 'active' },
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(res.total).toBe(2);
  });

  it('filters by department', async () => {
    await seedEmployee({ department: 'clinical' });
    await seedEmployee({ department: 'clinical' });
    await seedEmployee({ department: 'finance' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: { department: 'clinical' },
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(res.total).toBe(2);
  });

  it('text query (q) matches across name + employee_number', async () => {
    await seedEmployee({ nameAr: 'أحمد الخبير' });
    await seedEmployee({ nameAr: 'فاطمة المُدرّبة' });
    await seedEmployee({ nameAr: 'أحمد المتطوع' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.listEmployees({
      filters: { q: 'أحمد' },
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(res.total).toBe(2);
  });
});

// ─── listEmployees — audit ──────────────────────────────────────

describe('listEmployees — audit', () => {
  it('fires a successful audit on grant', async () => {
    await seedEmployee();
    const audit = stubAuditService();
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    await svc.listEmployees({
      filters: {},
      role: ROLES.HR_MANAGER,
      callerUserId: 'u-audit',
    });
    expect(audit.logHrAccess).toHaveBeenCalledTimes(1);
    const payload = audit.logHrAccess.mock.calls[0][0];
    expect(payload.action).toBe('list');
    expect(payload.entityType).toBe('employee');
    expect(payload.actorRole).toBe(ROLES.HR_MANAGER);
  });
});

// ─── getEmployeeById ────────────────────────────────────────────

describe('getEmployeeById', () => {
  it('returns denied for caller below INTERNAL tier (unless self)', async () => {
    const emp = await seedEmployee();
    const audit = stubAuditService();
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    const res = await svc.getEmployeeById({
      employeeId: emp._id,
      role: ROLES.THERAPIST,
      callerUserId: 'u-theirs',
    });
    expect(res.access).toBe('denied');
    expect(audit.logHrAccessDenied).toHaveBeenCalledTimes(1);
  });

  it('allows THERAPIST to view THEIR OWN record via self-access path', async () => {
    const emp = await seedEmployee({ basicSalary: 18000, nationalId: '8888888888' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.getEmployeeById({
      employeeId: emp._id,
      role: ROLES.THERAPIST,
      callerUserId: 'u-self',
      selfEmployeeId: emp._id, // they are this employee
    });
    expect(res.access).toBe('granted');
    expect(res.employee.basic_salary).toBe(18000);
    expect(res.employee.national_id).toBe('8888888888');
  });

  it('returns not_found for a non-existent id', async () => {
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.getEmployeeById({
      employeeId: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(res.access).toBe('not_found');
  });

  it('enforces branch scope: BRANCH_MANAGER of A cannot view employee of B', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const empB = await seedEmployee({ branchId: branchB });

    const audit = stubAuditService();
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    const res = await svc.getEmployeeById({
      employeeId: empB._id,
      role: ROLES.BRANCH_MANAGER,
      callerUserId: 'u',
      callerBranchId: branchA,
    });
    expect(res.access).toBe('denied');
    expect(res.reason).toBe('out_of_branch_scope');
    expect(audit.logHrAccessDenied).toHaveBeenCalled();
  });

  it('HR_MANAGER can view across branches', async () => {
    const emp = await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.getEmployeeById({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      callerBranchId: new mongoose.Types.ObjectId(), // different branch
    });
    expect(res.access).toBe('granted');
  });

  it('HR_OFFICER sees salary but not national_id (RESTRICTED) — unless self', async () => {
    const emp = await seedEmployee({ basicSalary: 13000, nationalId: '1112223334' });

    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const nonSelf = await svc.getEmployeeById({
      employeeId: emp._id,
      role: ROLES.HR_OFFICER,
      callerUserId: 'u',
    });
    expect(nonSelf.employee.basic_salary).toBe(13000);
    expect(nonSelf.employee.national_id).toBe(REDACTED);

    const asSelf = await svc.getEmployeeById({
      employeeId: emp._id,
      role: ROLES.HR_OFFICER,
      callerUserId: 'u',
      selfEmployeeId: emp._id,
    });
    expect(asSelf.employee.national_id).toBe('1112223334');
  });

  it('fires audit on successful detail view with isSelfAccess flag', async () => {
    const emp = await seedEmployee();
    const audit = stubAuditService();
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    await svc.getEmployeeById({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(audit.logHrAccess).toHaveBeenCalledTimes(1);
    const payload = audit.logHrAccess.mock.calls[0][0];
    expect(payload.action).toBe('view');
    expect(payload.isSelfAccess).toBe(false);
    expect(String(payload.entityId)).toBe(String(emp._id));
  });

  it('returns denied when employeeId is missing', async () => {
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.getEmployeeById({
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
    });
    expect(res.access).toBe('denied');
    expect(res.reason).toBe('missing_id');
  });
});

// ─── updateEmployee (C10) ───────────────────────────────────────

describe('updateEmployee — authorization', () => {
  it('denies caller with no write tier (THERAPIST, RECEPTIONIST)', async () => {
    const emp = await seedEmployee();
    const audit = stubAuditService();
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.THERAPIST,
      callerUserId: 'u',
      patch: { phone: '0501234567' },
    });
    expect(res.result).toBe('denied');
    expect(res.reason).toBe('no_write_tier');
    expect(audit.logHrAccessDenied).toHaveBeenCalledTimes(1);
  });

  it('rejects HR_OFFICER attempting manager-tier field', async () => {
    const emp = await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_OFFICER,
      callerUserId: 'u',
      patch: { basic_salary: 99999 },
    });
    expect(res.result).toBe('invalid');
    expect(res.errors.basic_salary).toMatch(/requires manager tier/);
  });

  it('HR_OFFICER can update officer-tier fields (department, job_title, phone)', async () => {
    const emp = await seedEmployee({ department: 'support' });
    const svc = createEmployeeAdminService({ employeeModel: Employee });

    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_OFFICER,
      callerUserId: 'u',
      patch: {
        department: 'clinical',
        job_title_ar: 'مدير برامج',
        phone: '0509990000',
      },
    });
    expect(res.result).toBe('updated');
    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.department).toBe('clinical');
    expect(fromDb.job_title_ar).toBe('مدير برامج');
    expect(fromDb.phone).toBe('0509990000');
  });

  it('HR_MANAGER can update compensation + status + national_id', async () => {
    const emp = await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });

    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      patch: {
        basic_salary: 30000,
        status: 'suspended',
        national_id: '9876543210',
        iban: 'SA0380000000000099999999',
      },
    });
    expect(res.result).toBe('updated');
    expect(res.changedFields).toEqual(
      expect.arrayContaining(['basic_salary', 'status', 'national_id', 'iban'])
    );
  });

  it('denies unknown field for any caller', async () => {
    const emp = await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });

    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      patch: { invented_field: 'nope' },
    });
    expect(res.result).toBe('invalid');
    expect(res.errors.invented_field).toMatch(/not admin-editable/);
  });
});

describe('updateEmployee — branch scope', () => {
  it('enforces branch scope for sub-HQ roles', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const empB = await seedEmployee({ branchId: branchB });

    const audit = stubAuditService();
    // HR_OFFICER is not in HQ_UNSCOPED_ROLES, so should be scope-limited.
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    const res = await svc.updateEmployee({
      employeeId: empB._id,
      role: ROLES.HR_OFFICER,
      callerUserId: 'u',
      callerBranchId: branchA,
      patch: { phone: '0509999999' },
    });
    expect(res.result).toBe('out_of_branch_scope');
    expect(audit.logHrAccessDenied).toHaveBeenCalled();
  });

  it('HR_MANAGER is cross-branch (HQ role)', async () => {
    const empB = await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });

    const res = await svc.updateEmployee({
      employeeId: empB._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      callerBranchId: new mongoose.Types.ObjectId(),
      patch: { status: 'on_leave' },
    });
    expect(res.result).toBe('updated');
  });
});

describe('updateEmployee — record state', () => {
  it('returns not_found for a missing employee', async () => {
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const res = await svc.updateEmployee({
      employeeId: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      patch: { phone: '0501234567' },
    });
    expect(res.result).toBe('not_found');
  });

  it('returns no_changes when patch validates to empty', async () => {
    const emp = await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });

    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      patch: {},
    });
    expect(res.result).toBe('no_changes');
  });

  it('records before values for the audit trail', async () => {
    const emp = await seedEmployee({ basicSalary: 10000 });
    const svc = createEmployeeAdminService({ employeeModel: Employee });

    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      patch: { basic_salary: 15000 },
    });
    expect(res.result).toBe('updated');
    expect(res.before.basic_salary).toBe(10000);
    expect(res.after.basic_salary).toBe(15000);
  });

  it('returns per-field errors on invalid value (pre-DB check)', async () => {
    const emp = await seedEmployee();
    const svc = createEmployeeAdminService({ employeeModel: Employee });

    const res = await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u',
      patch: { national_id: 'abcdefg123' },
    });
    expect(res.result).toBe('invalid');
    expect(res.errors.national_id).toBeDefined();
  });
});

describe('updateEmployee — audit', () => {
  it('fires data-read-like audit with changedFields on success', async () => {
    const emp = await seedEmployee();
    const audit = stubAuditService();
    const svc = createEmployeeAdminService({
      employeeModel: Employee,
      auditService: audit,
    });

    await svc.updateEmployee({
      employeeId: emp._id,
      role: ROLES.HR_MANAGER,
      callerUserId: 'u-audit',
      patch: { status: 'on_leave', basic_salary: 13000 },
    });
    expect(audit.logHrAccess).toHaveBeenCalledTimes(1);
    const payload = audit.logHrAccess.mock.calls[0][0];
    expect(payload.action).toBe('update');
    expect(payload.metadata.changedFields).toEqual(
      expect.arrayContaining(['status', 'basic_salary'])
    );
    expect(payload.metadata.writeTier).toBe('manager');
  });
});
