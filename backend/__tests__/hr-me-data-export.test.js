'use strict';

/**
 * hr-me-data-export.test.js — Phase 11 Commit 17 (4.0.34).
 *
 * Supertest coverage for GET /api/v1/hr/me/data-export (PDPL Art.
 * 18 data portability). Verifies auth, 404 on unlinked user, full
 * payload shape across all sections, Content-Disposition header,
 * and audit emission.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createEmployeeSelfServiceRouter } = require('../routes/hr/employee-self-service.routes');
const { createEmployeeSelfServiceService } = require('../services/hr/employeeSelfServiceService');
const { createEmployeeDataExportService } = require('../services/hr/employeeDataExportService');
const { createHrAccessAuditService } = require('../services/hr/hrAccessAuditService');
const { ROLES } = require('../config/rbac.config');

let mongoServer;
let Employee;
let EmploymentContract;
let Certification;
let LeaveBalance;
let Leave;
let PerformanceReview;
let HrChangeRequest;
let AuditLog;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'me-export-test' });
  Employee = require('../models/HR/Employee');
  EmploymentContract = require('../models/hr/EmploymentContract');
  Certification = require('../models/hr/Certification');
  LeaveBalance = require('../models/hr/LeaveBalance');
  Leave = require('../models/hr/Leave');
  PerformanceReview = require('../models/hr/PerformanceReview');
  HrChangeRequest = require('../models/hr/HrChangeRequest');
  AuditLog = require('../models/auditLog.model').AuditLog;
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
  await PerformanceReview.deleteMany({});
  await HrChangeRequest.deleteMany({});
  await AuditLog.deleteMany({});
});

let empSeq = 1;
async function seedEmployee({ userId = new mongoose.Types.ObjectId() } = {}) {
  const seq = empSeq++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `EX-${seq}`,
    user_id: userId,
    national_id: `EX${String(seq).padStart(8, '0')}`,
    email: `ex-${seq}-${Date.now()}@t.local`,
    name_ar: `Employee ${seq}`,
    branch_id: new mongoose.Types.ObjectId(),
    department: 'clinical',
    status: 'active',
    basic_salary: 12000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, userId };
}

async function seedContract(employeeId) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(EmploymentContract.collection.collectionName).insertOne({
    _id,
    contract_number: `EX-C-${_id.toString().slice(-6)}`,
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    contract_type: 'fixed_term',
    start_date: new Date(Date.now() - 100 * 24 * 3600 * 1000),
    end_date: new Date(Date.now() + 265 * 24 * 3600 * 1000),
    position: 'Therapist',
    department: 'clinical',
    basic_salary: 12000,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function seedCert(employeeId) {
  return Certification.create({
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    cert_type: 'cpr',
    cert_name_ar: 'شهادة اختبار',
    is_mandatory: true,
    expiry_date: new Date(Date.now() + 90 * 24 * 3600 * 1000),
  });
}

async function seedLeave(employeeId) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Leave.collection.collectionName).insertOne({
    _id,
    leave_number: `LV-${_id.toString().slice(-6)}`,
    employee_id: employeeId,
    branch_id: new mongoose.Types.ObjectId(),
    leave_type: 'annual',
    start_date: new Date('2026-05-01'),
    end_date: new Date('2026-05-05'),
    days_requested: 5,
    status: 'approved',
    reason: 'family',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function seedLeaveBalance(employeeId, year) {
  return LeaveBalance.create({
    employee_id: employeeId,
    year,
    annual_entitled: 21,
    annual_remaining: 15,
  });
}

async function seedAuditEvent(employeeId) {
  return AuditLog.create({
    eventType: 'data.read',
    eventCategory: 'data',
    severity: 'info',
    status: 'success',
    userId: new mongoose.Types.ObjectId(),
    userRole: 'hr_officer',
    resource: `hr:employee:${String(employeeId)}:view`,
    message: 'test',
    metadata: {
      custom: {
        entityType: 'hr:employee',
        entityId: String(employeeId),
        action: 'view',
        isSelfAccess: false,
      },
    },
    tags: ['hr', 'hr:employee'],
  });
}

function buildApp(user) {
  const selfSvc = createEmployeeSelfServiceService({ employeeModel: Employee });
  const auditService = createHrAccessAuditService({ auditLogModel: AuditLog });
  const dataExportService = createEmployeeDataExportService({
    employeeModel: Employee,
    employmentContractModel: EmploymentContract,
    certificationModel: Certification,
    leaveBalanceModel: LeaveBalance,
    leaveModel: Leave,
    performanceReviewModel: PerformanceReview,
    changeRequestModel: HrChangeRequest,
    auditService,
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(
    createEmployeeSelfServiceRouter({
      service: selfSvc,
      auditService,
      dataExportService,
    })
  );
  return app;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('GET /me/data-export — auth + linkage', () => {
  it('401 without req.user', async () => {
    const app = express();
    app.use(express.json());
    const selfSvc = createEmployeeSelfServiceService({ employeeModel: Employee });
    app.use(
      createEmployeeSelfServiceRouter({
        service: selfSvc,
        dataExportService: createEmployeeDataExportService({ employeeModel: Employee }),
      })
    );
    const res = await request(app).get('/me/data-export');
    expect(res.status).toBe(401);
  });

  it('503 when dataExportService is not wired', async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: new mongoose.Types.ObjectId(), role: ROLES.THERAPIST };
      next();
    });
    const selfSvc = createEmployeeSelfServiceService({ employeeModel: Employee });
    app.use(createEmployeeSelfServiceRouter({ service: selfSvc })); // no dataExportService
    const res = await request(app).get('/me/data-export');
    expect(res.status).toBe(503);
  });

  it('404 when no Employee linked to user', async () => {
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.THERAPIST })
    ).get('/me/data-export');
    expect(res.status).toBe(404);
  });
});

describe('GET /me/data-export — payload shape', () => {
  it('returns full metadata + subject + sections', async () => {
    const { _id, userId } = await seedEmployee();
    await seedContract(_id);
    await seedCert(_id);
    await seedLeave(_id);
    await seedLeaveBalance(_id, 2026);
    await seedAuditEvent(_id);

    const res = await request(buildApp({ id: userId, role: ROLES.THERAPIST })).get(
      '/me/data-export'
    );

    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);

    expect(body.export_metadata).toMatchObject({
      pdpl_article: 'PDPL Art. 18',
      format_version: '1.0.0',
    });
    expect(body.subject.employee_id).toBe(String(_id));
    expect(body.subject.user_id).toBe(String(userId));

    const s = body.sections;
    expect(s.profile).toBeDefined();
    expect(String(s.profile._id)).toBe(String(_id));
    expect(s.contracts).toHaveLength(1);
    expect(s.certifications).toHaveLength(1);
    expect(s.leaves).toHaveLength(1);
    expect(s.leave_balances).toHaveLength(1);
    expect(Array.isArray(s.access_log)).toBe(true);
    expect(s.access_log.length).toBeGreaterThanOrEqual(1);
  });

  it('empty collections surface as empty arrays (not null) when the model is wired', async () => {
    const { userId } = await seedEmployee();
    // No contracts/certs/leaves/etc seeded

    const res = await request(buildApp({ id: userId, role: ROLES.THERAPIST })).get(
      '/me/data-export'
    );
    expect(res.status).toBe(200);
    const body = JSON.parse(res.text);
    expect(body.sections.contracts).toEqual([]);
    expect(body.sections.certifications).toEqual([]);
    expect(body.sections.leaves).toEqual([]);
    expect(body.sections.leave_balances).toEqual([]);
    expect(body.sections.performance_reviews).toEqual([]);
    expect(body.sections.change_requests).toEqual([]);
  });

  it('Content-Disposition triggers download with per-subject filename', async () => {
    const { _id, userId } = await seedEmployee();
    const res = await request(buildApp({ id: userId, role: ROLES.THERAPIST })).get(
      '/me/data-export'
    );
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain(String(_id));
    expect(res.headers['content-disposition']).toContain('.json');
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('includes profile with RESTRICTED fields (no masking on self export)', async () => {
    const { userId } = await seedEmployee();
    const res = await request(buildApp({ id: userId, role: ROLES.THERAPIST })).get(
      '/me/data-export'
    );
    const body = JSON.parse(res.text);
    // national_id is RESTRICTED under masking, but export is self-access
    // unredacted by PDPL Art. 18.
    expect(body.sections.profile.national_id).toBeDefined();
    expect(body.sections.profile.national_id).not.toBe('[RESTRICTED]');
    expect(body.sections.profile.basic_salary).toBe(12000);
  });
});

describe('GET /me/data-export — audit trail', () => {
  it('fires a data.exported audit event with isSelfAccess=true', async () => {
    const { userId } = await seedEmployee();
    await request(buildApp({ id: userId, role: ROLES.THERAPIST })).get('/me/data-export');

    // wait for fire-and-forget
    await new Promise(r => setTimeout(r, 80));

    const exports = await AuditLog.find({
      userId,
      eventType: 'data.exported',
    }).lean();
    expect(exports.length).toBeGreaterThanOrEqual(1);
    expect(exports[0].metadata.custom.isSelfAccess).toBe(true);
    expect(exports[0].metadata.custom.format).toBe('json');
    expect(exports[0].severity).toBe('high');
  });

  it('includes the export event in the next access-log view (transparency)', async () => {
    const { _id, userId } = await seedEmployee();
    // First request: export
    await request(buildApp({ id: userId, role: ROLES.THERAPIST })).get('/me/data-export');
    await new Promise(r => setTimeout(r, 80));

    // Second request: access log — should see the export event
    const logRes = await request(buildApp({ id: userId, role: ROLES.THERAPIST })).get(
      '/me/access-log'
    );
    const events = logRes.body.events;
    expect(events.some(e => e.event_type === 'data.exported')).toBe(true);

    expect(_id).toBeDefined();
  });
});

// ─── Service-layer direct tests ─────────────────────────────────

describe('employeeDataExportService — direct calls', () => {
  it('buildExport throws when neither userId nor employeeId provided', async () => {
    const svc = createEmployeeDataExportService({ employeeModel: Employee });
    await expect(svc.buildExport({})).rejects.toThrow(/userId or employeeId/);
  });

  it('returns null when employee not found', async () => {
    const svc = createEmployeeDataExportService({ employeeModel: Employee });
    const out = await svc.buildExport({ userId: new mongoose.Types.ObjectId() });
    expect(out).toBeNull();
  });

  it('direct employeeId lookup works (admin path)', async () => {
    const { _id } = await seedEmployee();
    const svc = createEmployeeDataExportService({
      employeeModel: Employee,
      employmentContractModel: EmploymentContract,
      certificationModel: Certification,
      leaveBalanceModel: LeaveBalance,
      leaveModel: Leave,
      performanceReviewModel: PerformanceReview,
      changeRequestModel: HrChangeRequest,
    });
    const out = await svc.buildExport({ employeeId: _id });
    expect(out).not.toBeNull();
    expect(out.subject.employee_id).toBe(String(_id));
  });

  it('missing optional models return null sections', async () => {
    const { _id } = await seedEmployee();
    const svc = createEmployeeDataExportService({
      employeeModel: Employee,
      // all other models intentionally missing
    });
    const out = await svc.buildExport({ employeeId: _id });
    expect(out.sections.profile).toBeDefined();
    expect(out.sections.contracts).toBeNull();
    expect(out.sections.certifications).toBeNull();
    expect(out.sections.leaves).toBeNull();
    expect(out.sections.leave_balances).toBeNull();
    expect(out.sections.performance_reviews).toBeNull();
    expect(out.sections.change_requests).toBeNull();
    expect(out.sections.access_log).toBeNull();
  });
});
