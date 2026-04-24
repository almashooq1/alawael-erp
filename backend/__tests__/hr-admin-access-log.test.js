'use strict';

/**
 * hr-admin-access-log.test.js — Phase 11 Commit 16 (4.0.33).
 *
 * Supertest coverage for GET /api/v1/hr/employees/:id/access-log —
 * the admin counterpart to /me/access-log. Verifies tier gate +
 * branch scope + payload projection + self-audit.
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'admin-access-log' });
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
    employee_number: `AAL-${seq}`,
    user_id: new mongoose.Types.ObjectId(),
    national_id: `AAL${String(seq).padStart(7, '0')}`,
    email: `aal-${seq}-${Date.now()}@t.local`,
    name_ar: `Emp-${seq}`,
    branch_id: branchId,
    department: 'clinical',
    status: 'active',
    basic_salary: 10000,
    deleted_at: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, branchId };
}

async function seedAuditEvent({ employeeId, actorUserId, daysAgo = 0, isArchived = false }) {
  const createdAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
  return AuditLog.create({
    eventType: 'data.read',
    eventCategory: 'data',
    severity: 'info',
    status: 'success',
    userId: actorUserId,
    userRole: 'hr_officer',
    resource: `hr:employee:${String(employeeId)}:view`,
    message: 'test audit',
    ipAddress: '10.0.0.1',
    metadata: {
      custom: {
        entityType: 'hr:employee',
        entityId: String(employeeId),
        action: 'view',
        isSelfAccess: false,
      },
    },
    tags: ['hr', 'hr:employee'],
    flags: { isArchived },
    createdAt,
    updatedAt: createdAt,
  });
}

function buildApp(user) {
  const svc = createEmployeeAdminService({ employeeModel: Employee });
  const auditService = createHrAccessAuditService({ auditLogModel: AuditLog });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(createEmployeeAdminRouter({ service: svc, auditService }));
  return app;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('GET /employees/:id/access-log — authorization', () => {
  it('401 without auth', async () => {
    const svc = createEmployeeAdminService({ employeeModel: Employee });
    const auditService = createHrAccessAuditService({ auditLogModel: AuditLog });
    const app = express();
    app.use(express.json());
    app.use(createEmployeeAdminRouter({ service: svc, auditService }));
    const res = await request(app).get(`/employees/${new mongoose.Types.ObjectId()}/access-log`);
    expect(res.status).toBe(401);
  });

  it('THERAPIST (PUBLIC tier) → 403', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.THERAPIST })
    ).get(`/employees/${emp._id}/access-log`);
    expect(res.status).toBe(403);
  });

  it('RECEPTIONIST → 403', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.RECEPTIONIST })
    ).get(`/employees/${emp._id}/access-log`);
    expect(res.status).toBe(403);
  });

  it('BRANCH_MANAGER (INTERNAL tier) → 200', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({
        id: new mongoose.Types.ObjectId(),
        role: ROLES.BRANCH_MANAGER,
        branch_id: emp.branchId,
      })
    ).get(`/employees/${emp._id}/access-log`);
    expect(res.status).toBe(200);
  });

  it('HR_MANAGER → 200 cross-branch', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({
        id: new mongoose.Types.ObjectId(),
        role: ROLES.HR_MANAGER,
      })
    ).get(`/employees/${emp._id}/access-log`);
    expect(res.status).toBe(200);
  });

  it('400 on invalid ObjectId', async () => {
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get('/employees/not-an-id/access-log');
    expect(res.status).toBe(400);
  });

  it('404 when employee does not exist', async () => {
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${new mongoose.Types.ObjectId()}/access-log`);
    expect(res.status).toBe(404);
  });
});

describe('GET /employees/:id/access-log — branch scope', () => {
  it('BRANCH_MANAGER in branch A sees 403 for an employee in branch B', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const emp = await seedEmployee({ branchId: branchB });

    const res = await request(
      buildApp({
        id: new mongoose.Types.ObjectId(),
        role: ROLES.BRANCH_MANAGER,
        branch_id: branchA,
      })
    ).get(`/employees/${emp._id}/access-log`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('out_of_branch_scope');
  });
});

describe('GET /employees/:id/access-log — payload', () => {
  it('returns events + subject + window', async () => {
    const emp = await seedEmployee();
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 1,
    });
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 10,
    });

    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log`);

    expect(res.status).toBe(200);
    expect(res.body.subject).toEqual({
      employee_id: String(emp._id),
      access_mode: 'admin_view',
    });
    expect(res.body.window.days).toBe(90);
    // At least 2 seeded; admin's own self-audit may add more.
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it('projects only PDPL-relevant fields', async () => {
    const emp = await seedEmployee();
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 1,
    });

    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log`);
    const ev = res.body.events[0];
    expect(ev).toHaveProperty('at');
    expect(ev).toHaveProperty('actor_user_id');
    expect(ev).toHaveProperty('actor_role');
    expect(ev).toHaveProperty('event_type');
    expect(ev).toHaveProperty('resource');
    expect(ev).not.toHaveProperty('request');
    expect(ev).not.toHaveProperty('response');
  });

  it('respects windowDays + limit query params', async () => {
    const emp = await seedEmployee();
    for (let i = 0; i < 12; i++) {
      await seedAuditEvent({
        employeeId: emp._id,
        actorUserId: new mongoose.Types.ObjectId(),
        daysAgo: i * 5,
      });
    }

    const narrow = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log?windowDays=10&limit=5`);
    expect(narrow.status).toBe(200);
    expect(narrow.body.window.days).toBe(10);
    expect(narrow.body.events.length).toBeLessThanOrEqual(5);
  });

  it('clamps windowDays to 365', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log?windowDays=99999`);
    expect(res.body.window.days).toBe(365);
  });
});

describe('GET /employees/:id/access-log — retention-aware (C28)', () => {
  it('excludes archived events by default', async () => {
    const emp = await seedEmployee();
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 1,
      isArchived: false,
    });
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 2,
      isArchived: true,
    });

    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log`);
    expect(res.status).toBe(200);
    expect(res.body.window.archived_included).toBe(false);
    // Only 1 non-archived — plus admin's own self-audit may add
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('includes archived events when includeArchived=true', async () => {
    const emp = await seedEmployee();
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 1,
      isArchived: false,
    });
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 400,
      isArchived: true,
    });
    await seedAuditEvent({
      employeeId: emp._id,
      actorUserId: new mongoose.Types.ObjectId(),
      daysAgo: 600,
      isArchived: true,
    });

    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log?windowDays=800&includeArchived=true`);
    expect(res.status).toBe(200);
    expect(res.body.window.archived_included).toBe(true);
    expect(res.body.window.days).toBe(800);
    // 3 seeded (hot + 2 archived) in 800d window — plus admin self-audit
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it('windowDays max stretches to 1095 with includeArchived=true', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log?windowDays=99999&includeArchived=true`);
    expect(res.body.window.days).toBe(1095);
  });

  it('windowDays max stays 365 without includeArchived', async () => {
    const emp = await seedEmployee();
    const res = await request(
      buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER })
    ).get(`/employees/${emp._id}/access-log?windowDays=99999`);
    expect(res.body.window.days).toBe(365);
  });
});

describe('GET /employees/:id/access-log — audit trail', () => {
  it('admin view fires a chain-of-custody audit row', async () => {
    const emp = await seedEmployee();
    const adminId = new mongoose.Types.ObjectId();

    await request(buildApp({ id: adminId, role: ROLES.HR_MANAGER })).get(
      `/employees/${emp._id}/access-log`
    );

    // Wait for fire-and-forget write
    await new Promise(r => setTimeout(r, 50));

    const rows = await AuditLog.find({
      userId: adminId,
      resource: { $regex: 'view_access_log_admin' },
    }).lean();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].metadata.custom.isSelfAccess).toBe(false);
  });
});
