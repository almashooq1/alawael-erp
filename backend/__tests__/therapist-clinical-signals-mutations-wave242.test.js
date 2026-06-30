'use strict';

/**
 * therapist-clinical-signals-mutations-wave242.test.js — Wave 242.
 *
 * Tests the acknowledge/resolve mutations on the therapist clinical
 * signals surface:
 *
 *   POST /clinical-signals/tasks/:taskId/ack
 *   POST /clinical-signals/alerts/:alertId/ack
 *   POST /clinical-signals/alerts/:alertId/resolve
 *
 * Coverage:
 *   - admin_no_target → 404 NoTargetTherapist (no mutation leak)
 *   - therapist orphan → 404 EmployeeNotFound
 *   - invalid id → 400 InvalidId
 *   - task/alert not found or caseload mismatch → 404 NotFound
 *   - admin_targeted skips caseload check
 *   - service success → 200 with normalized status payload
 *   - alert.acknowledge throw (already resolved) → 409 Conflict
 *
 * The lifecycle/engine services (`reassessmentLifecycle`,
 * `measureAlertEngine`) are mocked — they have their own test suites.
 * This file proves only the route-level wiring + authorization.
 */

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    const raw = req.headers['x-test-user'];
    if (raw) req.user = JSON.parse(raw);
    next();
  },
  generateToken: () => 'test-token',
}));

jest.mock('../middleware/rbac.v2.middleware', () => ({
  requireRole:
    (..._roles) =>
    (_req, _res, next) =>
      next(),
}));

jest.mock('../middleware/idempotency.middleware', () => () => (_req, _res, next) => next());
jest.mock('../middleware/mutationIdAdapter.middleware', () => (_req, _res, next) => next());

jest.mock('../models/HR/Employee', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../models/Beneficiary', () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../models/Appointment', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  distinct: jest.fn(),
  aggregate: jest.fn(),
  exists: jest.fn(),
}));
jest.mock('../models/RedFlagState', () => ({ find: jest.fn(), create: jest.fn() }));
jest.mock('../models/CarePlan', () => ({ findOne: jest.fn() }));
jest.mock('../models/GoalProgressEntry', () => ({ create: jest.fn(), find: jest.fn() }));
jest.mock('../models/User', () => ({ find: jest.fn() }));
jest.mock('../models/Notification', () => ({ insertMany: jest.fn() }));
jest.mock('../models/auditLog.model', () => ({ create: jest.fn(() => ({ catch: () => null })) }), {
  virtual: true,
});

jest.mock('../domains/goals/models/MeasureReassessmentTask', () => {
  const m = {
  aggregate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
};
  m.MeasureReassessmentTask = m;
  return m;
});
jest.mock('../domains/goals/models/MeasureAlert', () => {
  const m = {
  aggregate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
};
  m.MeasureAlert = m;
  return m;
});
jest.mock('../domains/goals/models/Measure', () => ({ find: jest.fn() }));

jest.mock('../services/reassessmentLifecycle.service', () => ({
  acknowledgeTask: jest.fn(),
}));
jest.mock('../services/measureAlertEngine.service', () => ({
  acknowledge: jest.fn(),
  resolve: jest.fn(),
}));

const Employee = require('../models/HR/Employee');
const Appointment = require('../models/Appointment');
const MeasureReassessmentTask = require('../domains/goals/models/MeasureReassessmentTask');
const MeasureAlert = require('../domains/goals/models/MeasureAlert');
const lifecycle = require('../services/reassessmentLifecycle.service');
const engine = require('../services/measureAlertEngine.service');

function chain(result) {
  const c = {
    select: jest.fn(() => c),
    sort: jest.fn(() => c),
    limit: jest.fn(() => c),
    populate: jest.fn(() => c),
    lean: jest.fn().mockResolvedValue(result),
  };
  return c;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  const router = require('../routes/therapist-portal.routes');
  app.use('/api/v1/therapist', router);
  return app;
}

function asUser(role, extras = {}) {
  return {
    'x-test-user': JSON.stringify({ id: 'u1', email: 'u1@test.local', role, ...extras }),
  };
}

const EMP_ID = '507f1f77bcf86cd799439011';
const BEN_ID = '507f1f77bcf86cd799439021';
const TASK_ID = '507f1f77bcf86cd799439041';
const ALERT_ID = '507f1f77bcf86cd799439051';
const BAD_ID = 'not-an-objectid';

beforeEach(() => {
  jest.resetAllMocks();
});

// ─── /clinical-signals/tasks/:taskId/ack ─────────────────────────────────────

describe('W242 — POST /clinical-signals/tasks/:taskId/ack', () => {
  test('therapist orphan → 404 EmployeeNotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/tasks/${TASK_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('EmployeeNotFound');
  });

  test('admin_no_target → 404 NoTargetTherapist (no leak)', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/tasks/${TASK_ID}/ack`)
      .set(asUser('admin'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NoTargetTherapist');
    expect(lifecycle.acknowledgeTask).not.toHaveBeenCalled();
  });

  test('invalid taskId → 400 InvalidId', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/tasks/${BAD_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('InvalidId');
  });

  test('caseload mismatch → 404 NotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureReassessmentTask.findById.mockReturnValueOnce(
      chain({ _id: TASK_ID, beneficiaryId: BEN_ID, status: 'pending' })
    );
    Appointment.exists.mockResolvedValueOnce(null);
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/tasks/${TASK_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
    expect(lifecycle.acknowledgeTask).not.toHaveBeenCalled();
  });

  test('task missing → 404 NotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureReassessmentTask.findById.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/tasks/${TASK_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
  });

  test('happy path: returns normalized payload', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureReassessmentTask.findById.mockReturnValueOnce(
      chain({ _id: TASK_ID, beneficiaryId: BEN_ID, status: 'pending' })
    );
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    const ackedAt = new Date('2026-05-21T10:00:00Z');
    lifecycle.acknowledgeTask.mockResolvedValueOnce({
      _id: TASK_ID,
      status: 'acknowledged',
      acknowledgedAt: ackedAt,
    });
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/tasks/${TASK_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('acknowledged');
    expect(res.body.acknowledgedAt).toBe(ackedAt.toISOString());
    // The lifecycle service must receive the JWT userId as actor.
    expect(lifecycle.acknowledgeTask).toHaveBeenCalledWith({
      taskId: TASK_ID,
      actor: { userId: 'u1' },
    });
  });

  test('admin_targeted skips caseload check', async () => {
    Employee.findById.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureReassessmentTask.findById.mockReturnValueOnce(
      chain({ _id: TASK_ID, beneficiaryId: BEN_ID, status: 'pending' })
    );
    lifecycle.acknowledgeTask.mockResolvedValueOnce({
      _id: TASK_ID,
      status: 'acknowledged',
      acknowledgedAt: new Date(),
    });
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/tasks/${TASK_ID}/ack?employeeId=${EMP_ID}`)
      .set(asUser('admin'));
    expect(res.status).toBe(200);
    expect(Appointment.exists).not.toHaveBeenCalled();
  });
});

// ─── /clinical-signals/alerts/:alertId/ack ────────────────────────────────────

describe('W242 — POST /clinical-signals/alerts/:alertId/ack', () => {
  test('happy path returns 200 with status=acknowledged', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'open' })
    );
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    const ackedAt = new Date('2026-05-21T11:00:00Z');
    engine.acknowledge.mockResolvedValueOnce({
      _id: ALERT_ID,
      status: 'acknowledged',
      acknowledgedAt: ackedAt,
    });
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('acknowledged');
    expect(engine.acknowledge).toHaveBeenCalledWith(ALERT_ID, 'u1');
  });

  test('engine throws (already resolved) → 409 Conflict', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'resolved' })
    );
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    engine.acknowledge.mockRejectedValueOnce(new Error('cannot acknowledge from status=resolved'));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict');
  });

  test('caseload mismatch → 404 NotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'open' })
    );
    Appointment.exists.mockResolvedValueOnce(null);
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/ack`)
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
    expect(engine.acknowledge).not.toHaveBeenCalled();
  });
});

// ─── /clinical-signals/alerts/:alertId/resolve ────────────────────────────────

describe('W242 — POST /clinical-signals/alerts/:alertId/resolve', () => {
  test('happy path returns 200 with status=resolved', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'acknowledged' })
    );
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    const resolvedAt = new Date('2026-05-21T12:00:00Z');
    engine.resolve.mockResolvedValueOnce({
      _id: ALERT_ID,
      status: 'resolved',
      resolvedAt,
    });
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/resolve`)
      .set(asUser('therapist'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
    expect(res.body.resolvedAt).toBe(resolvedAt.toISOString());
    expect(engine.resolve).toHaveBeenCalledWith(ALERT_ID, {
      actorId: 'u1',
      mode: 'manual',
    });
  });

  test('admin_targeted skips caseload, still passes admin userId as actor', async () => {
    Employee.findById.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'open' })
    );
    engine.resolve.mockResolvedValueOnce({
      _id: ALERT_ID,
      status: 'resolved',
      resolvedAt: new Date(),
    });
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/resolve?employeeId=${EMP_ID}`)
      .set(asUser('admin', { id: 'admin-1' }));
    expect(res.status).toBe(200);
    expect(Appointment.exists).not.toHaveBeenCalled();
    expect(engine.resolve.mock.calls[0][1].actorId).toBe('admin-1');
  });

  test('alert missing → 404 NotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/resolve`)
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
  });
});
