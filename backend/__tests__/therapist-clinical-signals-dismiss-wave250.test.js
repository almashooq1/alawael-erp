'use strict';

/**
 * therapist-clinical-signals-dismiss-wave250.test.js — Wave 250.
 *
 * Tests the alert dismiss mutation:
 *   POST /clinical-signals/alerts/:alertId/dismiss
 *
 * Coverage:
 *   - therapist orphan → 404 EmployeeNotFound
 *   - admin_no_target → 404 NoTargetTherapist (no mutation leak)
 *   - invalid alertId → 400 InvalidId
 *   - missing reason → 400 InvalidReason
 *   - reason < 10 chars → 400 InvalidReason
 *   - caseload mismatch → 404 NotFound
 *   - service throws on terminal status → 409 Conflict
 *   - happy path → 200 with normalized payload + status=dismissed
 *   - admin_targeted skips caseload, actor stays the admin's userId
 *
 * The measureAlertEngine service is mocked — has its own test suite.
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
jest.mock('../models/Beneficiary', () => ({ find: jest.fn(), findById: jest.fn() }));
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
  dismiss: jest.fn(),
}));

const Employee = require('../models/HR/Employee');
const Appointment = require('../models/Appointment');
const MeasureAlert = require('../domains/goals/models/MeasureAlert');
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
const ALERT_ID = '507f1f77bcf86cd799439051';
const BAD_ID = 'not-an-objectid';
const VALID_REASON = 'مشكلة في القراءة، تم التحقق مع الأسرة';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('W250 — POST /clinical-signals/alerts/:alertId/dismiss', () => {
  test('therapist orphan → 404 EmployeeNotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss`)
      .set(asUser('therapist'))
      .send({ reason: VALID_REASON });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('EmployeeNotFound');
  });

  test('admin_no_target → 404 NoTargetTherapist (no leak)', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss`)
      .set(asUser('admin'))
      .send({ reason: VALID_REASON });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NoTargetTherapist');
    expect(engine.dismiss).not.toHaveBeenCalled();
  });

  test('invalid alertId → 400 InvalidId', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${BAD_ID}/dismiss`)
      .set(asUser('therapist'))
      .send({ reason: VALID_REASON });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('InvalidId');
  });

  test('missing reason → 400 InvalidReason', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss`)
      .set(asUser('therapist'))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('InvalidReason');
  });

  test('reason < 10 chars → 400 InvalidReason', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss`)
      .set(asUser('therapist'))
      .send({ reason: 'مكرر' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('InvalidReason');
    // Engine must never be touched for malformed requests.
    expect(engine.dismiss).not.toHaveBeenCalled();
  });

  test('caseload mismatch → 404 NotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'open' })
    );
    Appointment.exists.mockResolvedValueOnce(null);
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss`)
      .set(asUser('therapist'))
      .send({ reason: VALID_REASON });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
    expect(engine.dismiss).not.toHaveBeenCalled();
  });

  test('service throws on terminal status → 409 Conflict', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'resolved' })
    );
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    engine.dismiss.mockRejectedValueOnce(new Error('cannot dismiss from status=resolved'));
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss`)
      .set(asUser('therapist'))
      .send({ reason: VALID_REASON });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict');
  });

  test('happy path returns 200 with status=dismissed', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'open' })
    );
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    const dismissedAt = new Date('2026-05-21T13:00:00Z');
    engine.dismiss.mockResolvedValueOnce({
      _id: ALERT_ID,
      status: 'dismissed',
      dismissedAt,
      dismissalReason: VALID_REASON,
    });
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss`)
      .set(asUser('therapist'))
      .send({ reason: `  ${VALID_REASON}  ` });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dismissed');
    expect(res.body.dismissedAt).toBe(dismissedAt.toISOString());
    // Reason must be trimmed before reaching the service.
    expect(engine.dismiss).toHaveBeenCalledWith(ALERT_ID, {
      actorId: 'u1',
      reason: VALID_REASON,
    });
  });

  test('admin_targeted skips caseload + passes admin userId as actor', async () => {
    Employee.findById.mockReturnValueOnce(chain({ _id: EMP_ID }));
    MeasureAlert.findById.mockReturnValueOnce(
      chain({ _id: ALERT_ID, beneficiaryId: BEN_ID, status: 'open' })
    );
    engine.dismiss.mockResolvedValueOnce({
      _id: ALERT_ID,
      status: 'dismissed',
      dismissedAt: new Date(),
    });
    const res = await request(buildApp())
      .post(`/api/v1/therapist/clinical-signals/alerts/${ALERT_ID}/dismiss?employeeId=${EMP_ID}`)
      .set(asUser('admin', { id: 'admin-1' }))
      .send({ reason: VALID_REASON });
    expect(res.status).toBe(200);
    expect(Appointment.exists).not.toHaveBeenCalled();
    expect(engine.dismiss.mock.calls[0][1].actorId).toBe('admin-1');
  });
});
