'use strict';

/**
 * hr-change-requests-routes.test.js — Phase 11 Commit 12 (4.0.29).
 *
 * Route-layer tests for the approval workflow REST surface. Uses
 * express + supertest-style in-process invocation (no network) to
 * exercise auth gating, status-code mapping, and branch scope.
 * Real Mongoose models on mongodb-memory-server so the service
 * integration is end-to-end.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrChangeRequestsRouter } = require('../routes/hr/hr-change-requests.routes');
const { createHrChangeRequestService } = require('../services/hr/hrChangeRequestService');
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'cr-routes-test' });
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

// ─── test harness — in-process request runner ───────────────────
// Exercises the real express router without opening a socket.

function buildApp(user) {
  const svc = createHrChangeRequestService({
    changeRequestModel: HrChangeRequest,
    employeeModel: Employee,
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user; // inject pretend-authenticated user
    next();
  });
  app.use(
    createHrChangeRequestsRouter({
      changeRequestService: svc,
      changeRequestModel: HrChangeRequest,
    })
  );
  return { app, svc };
}

// Supertest driver — real express through the router stack.
async function runRoute(app, method, path, { body = null } = {}) {
  const agent = request(app);
  let call;
  switch (method) {
    case 'GET':
      call = agent.get(path);
      break;
    case 'POST':
      call = agent.post(path);
      break;
    case 'PATCH':
      call = agent.patch(path);
      break;
    default:
      throw new Error(`unsupported method: ${method}`);
  }
  if (body != null) call = call.send(body);
  const response = await call;
  return { status: response.status, body: response.body };
}

// ─── Fixtures ───────────────────────────────────────────────────

let empSeq = 1;
async function seedEmployee({ branchId = new mongoose.Types.ObjectId() } = {}) {
  const seq = empSeq++;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection(Employee.collection.collectionName).insertOne({
    _id,
    employee_number: `CRR-${seq}`,
    user_id: new mongoose.Types.ObjectId(),
    national_id: `CRR${String(seq).padStart(7, '0')}`,
    email: `crr-${seq}-${Date.now()}@t.local`,
    name_ar: `Emp-${seq}`,
    branch_id: branchId,
    basic_salary: 10000,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, branchId };
}

async function seedPendingRequest({
  employeeId,
  requestorUserId,
  branchId,
  proposedChanges,
  baseline,
  rulesTriggered,
}) {
  const svc = createHrChangeRequestService({
    changeRequestModel: HrChangeRequest,
    employeeModel: Employee,
  });
  const { request } = await svc.createRequest({
    employeeId,
    requestorUserId,
    requestorRole: ROLES.HR_MANAGER,
    proposedChanges,
    baseline,
    rulesTriggered,
    branchId,
  });
  return request;
}

// ─── GET /change-requests ───────────────────────────────────────

describe('GET /change-requests', () => {
  it('401 without auth user', async () => {
    const svc = createHrChangeRequestService({
      changeRequestModel: HrChangeRequest,
      employeeModel: Employee,
    });
    const app = express();
    app.use(express.json());
    app.use(
      createHrChangeRequestsRouter({
        changeRequestService: svc,
        changeRequestModel: HrChangeRequest,
      })
    );
    const res = await runRoute(app, 'GET', '/change-requests');
    expect(res.status).toBe(401);
  });

  it('OFFICER sees pending queue scoped to their branch', async () => {
    const emp = await seedEmployee();
    const otherBranch = new mongoose.Types.ObjectId();
    await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { status: 'terminated' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.termination'],
    });
    await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: otherBranch,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });

    const user = {
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_OFFICER,
      branch_id: emp.branchId,
    };
    const { app } = buildApp(user);
    const res = await runRoute(app, 'GET', '/change-requests');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('queue');
    expect(res.body.total).toBe(1);
  });

  it('MANAGER sees pending queue across branches', async () => {
    const emp = await seedEmployee();
    const otherBranch = new mongoose.Types.ObjectId();
    await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { status: 'terminated' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.termination'],
    });
    await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: otherBranch,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });

    const { app } = buildApp({
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
    });
    const res = await runRoute(app, 'GET', '/change-requests');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it('non-HR role sees only their OWN requests', async () => {
    const emp = await seedEmployee();
    const myUserId = new mongoose.Types.ObjectId();
    await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: myUserId,
      branchId: emp.branchId,
      proposedChanges: { status: 'terminated' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.termination'],
    });
    await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });

    const { app } = buildApp({
      id: myUserId,
      role: ROLES.THERAPIST,
    });
    const res = await runRoute(app, 'GET', '/change-requests');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('own');
    expect(res.body.items).toHaveLength(1);
  });
});

// ─── GET /change-requests/:id ───────────────────────────────────

describe('GET /change-requests/:id', () => {
  it('400 on invalid ObjectId', async () => {
    const { app } = buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER });
    const res = await runRoute(app, 'GET', '/change-requests/not-an-id');
    expect(res.status).toBe(400);
  });

  it('404 on unknown id', async () => {
    const { app } = buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.HR_MANAGER });
    const res = await runRoute(app, 'GET', `/change-requests/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });

  it('requestor can see their own even without HR tier', async () => {
    const emp = await seedEmployee();
    const myId = new mongoose.Types.ObjectId();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: myId,
      branchId: emp.branchId,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });

    const { app } = buildApp({ id: myId, role: ROLES.THERAPIST });
    const res = await runRoute(app, 'GET', `/change-requests/${r._id}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe('pending');
  });

  it('non-tier non-requestor gets 403', async () => {
    const emp = await seedEmployee();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });
    const { app } = buildApp({ id: new mongoose.Types.ObjectId(), role: ROLES.THERAPIST });
    const res = await runRoute(app, 'GET', `/change-requests/${r._id}`);
    expect(res.status).toBe(403);
  });

  it('OFFICER in different branch gets 403 out_of_branch_scope', async () => {
    const emp = await seedEmployee();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });
    const { app } = buildApp({
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_OFFICER,
      branch_id: new mongoose.Types.ObjectId(), // different branch
    });
    const res = await runRoute(app, 'GET', `/change-requests/${r._id}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('out_of_branch_scope');
  });
});

// ─── POST .../approve ───────────────────────────────────────────

describe('POST /change-requests/:id/approve', () => {
  it('OFFICER cannot approve (requires manager tier)', async () => {
    const emp = await seedEmployee();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });
    const { app } = buildApp({
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_OFFICER,
    });
    const res = await runRoute(app, 'POST', `/change-requests/${r._id}/approve`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('requires manager tier');
  });

  it('MANAGER approves + applies to Employee', async () => {
    const emp = await seedEmployee();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });
    const { app } = buildApp({
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
    });
    const res = await runRoute(app, 'POST', `/change-requests/${r._id}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('applied');
    const fromDb = await Employee.findById(emp._id).lean();
    expect(fromDb.basic_salary).toBe(15000);
  });

  it('self-approval returns 403', async () => {
    const emp = await seedEmployee();
    const myId = new mongoose.Types.ObjectId();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: myId,
      branchId: emp.branchId,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });
    const { app } = buildApp({ id: myId, role: ROLES.HR_MANAGER });
    const res = await runRoute(app, 'POST', `/change-requests/${r._id}/approve`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('self_approval_forbidden');
  });
});

// ─── POST .../reject ────────────────────────────────────────────

describe('POST /change-requests/:id/reject', () => {
  it('MANAGER rejects with reason', async () => {
    const emp = await seedEmployee();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: new mongoose.Types.ObjectId(),
      branchId: emp.branchId,
      proposedChanges: { basic_salary: 15000 },
      baseline: { basic_salary: 10000 },
      rulesTriggered: ['salary.increase_gt_15pct'],
    });
    const { app } = buildApp({
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
    });
    const res = await runRoute(app, 'POST', `/change-requests/${r._id}/reject`, {
      body: { reason: 'policy mismatch' },
    });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('rejected');
    expect(res.body.request.rejection_reason).toBe('policy mismatch');
  });
});

// ─── POST .../cancel ────────────────────────────────────────────

describe('POST /change-requests/:id/cancel', () => {
  it('requestor cancels their own request', async () => {
    const emp = await seedEmployee();
    const myId = new mongoose.Types.ObjectId();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: myId,
      branchId: emp.branchId,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });
    const { app } = buildApp({ id: myId, role: ROLES.HR_MANAGER });
    const res = await runRoute(app, 'POST', `/change-requests/${r._id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('cancelled');
  });

  it('non-requestor cannot cancel', async () => {
    const emp = await seedEmployee();
    const requestor = new mongoose.Types.ObjectId();
    const r = await seedPendingRequest({
      employeeId: emp._id,
      requestorUserId: requestor,
      branchId: emp.branchId,
      proposedChanges: { status: 'suspended' },
      baseline: { status: 'active' },
      rulesTriggered: ['employment.suspension'],
    });
    const { app } = buildApp({
      id: new mongoose.Types.ObjectId(),
      role: ROLES.HR_MANAGER,
    });
    const res = await runRoute(app, 'POST', `/change-requests/${r._id}/cancel`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('only_requestor_can_cancel');
  });
});
