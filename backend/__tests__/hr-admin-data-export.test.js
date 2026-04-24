'use strict';

/**
 * hr-admin-data-export.test.js — Phase 11 Commit 18 (4.0.35).
 *
 * Supertest coverage for GET /api/v1/hr/employees/:id/data-export
 * (admin counterpart to /me/data-export). Verifies tier gate +
 * branch scope + download header + audit with action='data_export_admin'.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createEmployeeAdminRouter } = require('../routes/hr/employee-admin.routes');
const { createEmployeeAdminService } = require('../services/hr/employeeAdminService');
const { createEmployeeDataExportService } = require('../services/hr/employeeDataExportService');
const { createHrAccessAuditService } = require('../services/hr/hrAccessAuditService');
const { ROLES } = require('../config/rbac.config');

let mongoServer;
let Employee;
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'admin-export-test' });
  Employee = require('../models/HR/Employee');
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
  await AuditLog.deleteMany({});
});

let empSeq = 1;
async function seedEmployee({ branchId = new mongoose.Types.ObjectId() } = {}) {
  const seq = empSeq++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `AE-${seq}`,
    user_id: new mongoose.Types.ObjectId(),
    national_id: `AE${String(seq).padStart(8, '0')}`,
    email: `ae-${seq}-${Date.now()}@t.local`,
    name_ar: `Emp-${seq}`,
    branch_id: branchId,
    department: 'clinical',
    status: 'active',
    basic_salary: 11000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, branchId };
}

function buildApp(user) {
  const adminSvc = createEmployeeAdminService({ employeeModel: Employee });
  const auditService = createHrAccessAuditService({ auditLogModel: AuditLog });
  const dataExportService = createEmployeeDataExportService({
    employeeModel: Employee,
    auditService,
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(
    createEmployeeAdminRouter({
      service: adminSvc,
      auditService,
      dataExportService,
    })
  );
  return app;
}

// ─── Auth + tier ────────────────────────────────────────────────

describe('GET /employees/:id/data-export — authorization', () => {
  it('401 without auth', async () => {
    const adminSvc = createEmployeeAdminService({ employeeModel: Employee });
    const dataExportService = createEmployeeDataExportService({
      employeeModel: Employee,
    });
    const app = express();
    app.use(express.json());
    app.use(createEmployeeAdminRouter({ service: adminSvc, dataExportService }));
    const res = await request(app).get(`/employees/${new mongoose.Types.ObjectId()}/data-export`);
    expect(res.status).toBe(401);
  });

  it('THERAPIST → 403', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.THERAPIST })
    ).get(`/employees/${emp._id}/data-export`);
    expect(res.status).toBe(403);
  });

  it('503 when dataExportService not wired', async () => {
    const emp = await seedEmployee();
    const adminSvc = createEmployeeAdminService({ employeeModel: Employee });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.user = { id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER };
      next();
    });
    app.use(createEmployeeAdminRouter({ service: adminSvc })); // no dataExportService
    const res = await request(app).get(`/employees/${emp._id}/data-export`);
    expect(res.status).toBe(503);
  });

  it('400 on invalid ObjectId', async () => {
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get('/employees/bad-id/data-export');
    expect(res.status).toBe(400);
  });

  it('404 on unknown employee', async () => {
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${new mongoose.Types.ObjectId()}/data-export`);
    expect(res.status).toBe(404);
  });

  it('BRANCH_MANAGER in branch A gets 403 on branch-B employee', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({
        id: new mongoose.Types.ObjectId(),
        role: ROLES.BRANCH_MANAGER,
        branch_id: new mongoose.Types.ObjectId(),
      })
    ).get(`/employees/${emp._id}/data-export`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('out_of_branch_scope');
  });

  it('HR_MANAGER can export cross-branch', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/data-export`);
    expect(res.status).toBe(200);
  });
});

// ─── Payload + headers ──────────────────────────────────────────

describe('GET /employees/:id/data-export — payload', () => {
  it('returns full export JSON with correct subject + download header', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/data-export`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain(String(emp._id));
    expect(res.headers['content-disposition']).toContain('admin');

    const body = JSON.parse(res.text);
    expect(body.subject.employee_id).toBe(String(emp._id));
    expect(body.export_metadata.pdpl_article).toBe('PDPL Art. 18');
    expect(body.sections.profile).toBeDefined();
    expect(String(body.sections.profile._id)).toBe(String(emp._id));
    // Admin export also includes full (non-masked) identity fields
    expect(body.sections.profile.national_id).toBeDefined();
    expect(body.sections.profile.basic_salary).toBe(11000);
  });
});

// ─── Audit trail ────────────────────────────────────────────────

describe('GET /employees/:id/data-export — audit', () => {
  it('fires data.exported event with action=data_export_admin + isSelfAccess=false', async () => {
    const emp = await seedEmployee();
    const adminId = new mongoose.Types.ObjectId();
    await request(buildApp({ id: adminId, role: ROLES.HR_MANAGER })).get(
      `/employees/${emp._id}/data-export`
    );

    await new Promise(r => setTimeout(r, 80));

    const rows = await AuditLog.find({
      userId: adminId,
      eventType: 'data.exported',
    }).lean();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const row = rows[0];
    expect(row.metadata.custom.action).toBe('data_export_admin');
    expect(row.metadata.custom.isSelfAccess).toBe(false);
    expect(row.metadata.custom.format).toBe('json');
    expect(row.severity).toBe('high');
    // Resource now includes employee id (C17 fix)
    expect(row.resource).toContain(String(emp._id));
  });
});
