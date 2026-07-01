'use strict';

/**
 * therapist-clinical-signals-wave237.test.js — Wave 237.
 *
 * Tests the per-therapist roll-up of W214 reassessment tasks + W221
 * measure alerts. Verifies:
 *
 *   1. No caseload → []
 *   2. Caseload with NO open tasks/alerts → []
 *   3. Open tasks aggregate per beneficiary
 *   4. BREACHED + ESCALATED phases counted separately
 *   5. nextDueAt is min(dueAt) across that beneficiary's tasks
 *   6. Open alerts aggregate per beneficiary
 *   7. critical/high severity counted into criticalAlerts
 *   8. alertTypes collected as distinct set
 *   9. Sort priority: criticalAlerts > breachedTasks > escalatedTasks >
 *      openAlerts > openTasks
 *  10. Beneficiaries with zero signals filtered out
 *  11. Service tolerates invalid employeeId → []
 *
 * Route-level: /clinical-signals matches admin-viewer pattern (returns
 * [] for admin_no_target, 404 for therapist orphan).
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
}));
jest.mock('../models/Appointment', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  distinct: jest.fn(),
  aggregate: jest.fn(),
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
};
  m.MeasureReassessmentTask = m;
  return m;
});
jest.mock('../domains/goals/models/MeasureAlert', () => {
  const m = {
  aggregate: jest.fn(),
};
  m.MeasureAlert = m;
  return m;
});

const Employee = require('../models/HR/Employee');
const Beneficiary = require('../models/Beneficiary');
const Appointment = require('../models/Appointment');
const MeasureReassessmentTask = require('../domains/goals/models/MeasureReassessmentTask');
const MeasureAlert = require('../domains/goals/models/MeasureAlert');
const service = require('../services/therapistClinicalSignals.service');

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
const BEN_1 = '507f1f77bcf86cd799439021';
const BEN_2 = '507f1f77bcf86cd799439022';
const BEN_3 = '507f1f77bcf86cd799439023';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('W237 — therapistClinicalSignals service', () => {
  describe('getSignalsForTherapist', () => {
    test('returns [] for invalid employeeId', async () => {
      const result = await service.getSignalsForTherapist({ employeeId: 'not-an-objectid' });
      expect(result).toEqual([]);
      expect(Appointment.distinct).not.toHaveBeenCalled();
    });

    test('returns [] when caseload is empty', async () => {
      Appointment.distinct.mockResolvedValueOnce([]);
      const result = await service.getSignalsForTherapist({ employeeId: EMP_ID });
      expect(result).toEqual([]);
      // No task/alert lookups if no beneficiaries
      expect(MeasureReassessmentTask.aggregate).not.toHaveBeenCalled();
      expect(MeasureAlert.aggregate).not.toHaveBeenCalled();
    });

    test('returns [] when caseload has no open tasks or alerts', async () => {
      Appointment.distinct.mockResolvedValueOnce([BEN_1, BEN_2]);
      MeasureReassessmentTask.aggregate.mockResolvedValueOnce([]);
      MeasureAlert.aggregate.mockResolvedValueOnce([]);
      const result = await service.getSignalsForTherapist({ employeeId: EMP_ID });
      expect(result).toEqual([]);
      // Names lookup should not run when there are no signals
      expect(Beneficiary.find).not.toHaveBeenCalled();
    });

    test('aggregates open tasks + escalated/breached phases per beneficiary', async () => {
      Appointment.distinct.mockResolvedValueOnce([BEN_1, BEN_2]);
      MeasureReassessmentTask.aggregate.mockResolvedValueOnce([
        {
          _id: BEN_1,
          openTasks: 3,
          breachedTasks: 1,
          escalatedTasks: 1,
          nextDueAt: new Date('2026-05-15'),
        },
      ]);
      MeasureAlert.aggregate.mockResolvedValueOnce([]);
      Beneficiary.find.mockReturnValueOnce(
        chain([
          { _id: BEN_1, firstName_ar: 'علي', lastName_ar: 'محمد', beneficiaryNumber: 'B-001' },
        ])
      );

      const result = await service.getSignalsForTherapist({ employeeId: EMP_ID });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        beneficiaryId: BEN_1,
        beneficiaryNameAr: 'علي محمد',
        beneficiaryNumber: 'B-001',
        openTasks: 3,
        breachedTasks: 1,
        escalatedTasks: 1,
        openAlerts: 0,
        criticalAlerts: 0,
        alertTypes: [],
      });
      expect(result[0].nextDueAt).toMatch(/^2026-05-15/);
    });

    test('aggregates open alerts + collects distinct alertTypes', async () => {
      Appointment.distinct.mockResolvedValueOnce([BEN_1]);
      MeasureReassessmentTask.aggregate.mockResolvedValueOnce([]);
      MeasureAlert.aggregate.mockResolvedValueOnce([
        {
          _id: BEN_1,
          openAlerts: 4,
          criticalAlerts: 2,
          alertTypes: ['REGRESSION_DETECTED', 'PLATEAU_DETECTED'],
        },
      ]);
      Beneficiary.find.mockReturnValueOnce(
        chain([{ _id: BEN_1, firstName_ar: 'سارة', lastName_ar: '' }])
      );

      const result = await service.getSignalsForTherapist({ employeeId: EMP_ID });
      expect(result[0]).toMatchObject({
        beneficiaryNameAr: 'سارة',
        openAlerts: 4,
        criticalAlerts: 2,
        alertTypes: expect.arrayContaining(['REGRESSION_DETECTED', 'PLATEAU_DETECTED']),
      });
    });

    test('sort priority: critical alerts > breached tasks > escalated tasks > open alerts > open tasks', async () => {
      Appointment.distinct.mockResolvedValueOnce([BEN_1, BEN_2, BEN_3]);
      MeasureReassessmentTask.aggregate.mockResolvedValueOnce([
        // BEN_1: only open tasks
        { _id: BEN_1, openTasks: 5, breachedTasks: 0, escalatedTasks: 0, nextDueAt: null },
        // BEN_2: breached tasks
        {
          _id: BEN_2,
          openTasks: 2,
          breachedTasks: 2,
          escalatedTasks: 0,
          nextDueAt: new Date('2026-04-01'),
        },
        // BEN_3: open tasks + escalated
        {
          _id: BEN_3,
          openTasks: 3,
          breachedTasks: 0,
          escalatedTasks: 1,
          nextDueAt: new Date('2026-05-01'),
        },
      ]);
      MeasureAlert.aggregate.mockResolvedValueOnce([
        // BEN_1: 1 critical alert
        { _id: BEN_1, openAlerts: 1, criticalAlerts: 1, alertTypes: ['REGRESSION_DETECTED'] },
      ]);
      Beneficiary.find.mockReturnValueOnce(
        chain([
          { _id: BEN_1, firstName_ar: 'أ' },
          { _id: BEN_2, firstName_ar: 'ب' },
          { _id: BEN_3, firstName_ar: 'ج' },
        ])
      );

      const result = await service.getSignalsForTherapist({ employeeId: EMP_ID });
      expect(result.map(r => r.beneficiaryId)).toEqual([
        BEN_1, // critical alert wins
        BEN_2, // breached tasks
        BEN_3, // escalated tasks
      ]);
    });

    test('filters out beneficiaries with zero signals even when in caseload', async () => {
      Appointment.distinct.mockResolvedValueOnce([BEN_1, BEN_2, BEN_3]);
      // Only BEN_2 has any signal
      MeasureReassessmentTask.aggregate.mockResolvedValueOnce([
        { _id: BEN_2, openTasks: 1, breachedTasks: 0, escalatedTasks: 0, nextDueAt: null },
      ]);
      MeasureAlert.aggregate.mockResolvedValueOnce([]);
      Beneficiary.find.mockReturnValueOnce(chain([{ _id: BEN_2, firstName_ar: 'ب' }]));

      const result = await service.getSignalsForTherapist({ employeeId: EMP_ID });
      expect(result).toHaveLength(1);
      expect(result[0].beneficiaryId).toBe(BEN_2);
      // The find should only query the beneficiaries that appeared in
      // either rollup, not the whole caseload.
      const findFilter = Beneficiary.find.mock.calls[0][0];
      expect(findFilter._id.$in).toHaveLength(1);
      expect(findFilter._id.$in[0]).toBe(BEN_2);
    });
  });
});

describe('W237 — /clinical-signals route', () => {
  test('admin without target → 200 []', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .get('/api/v1/therapist/clinical-signals')
      .set(asUser('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    // Service must not be invoked without a target.
    expect(Appointment.distinct).not.toHaveBeenCalled();
  });

  test('therapist without Employee → 404', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .get('/api/v1/therapist/clinical-signals')
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('EmployeeNotFound');
  });

  test('admin with ?employeeId routes signals through the target', async () => {
    Employee.findById.mockReturnValueOnce(
      chain({ _id: EMP_ID, name_ar: 'محمد', specialization: 'ot' })
    );
    Appointment.distinct.mockResolvedValueOnce([BEN_1]);
    MeasureReassessmentTask.aggregate.mockResolvedValueOnce([
      { _id: BEN_1, openTasks: 1, breachedTasks: 0, escalatedTasks: 0, nextDueAt: null },
    ]);
    MeasureAlert.aggregate.mockResolvedValueOnce([]);
    Beneficiary.find.mockReturnValueOnce(chain([{ _id: BEN_1, firstName_ar: 'يوسف' }]));

    const res = await request(buildApp())
      .get(`/api/v1/therapist/clinical-signals?employeeId=${EMP_ID}`)
      .set(asUser('admin'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].beneficiaryNameAr).toBe('يوسف');
    // The distinct call must use the targeted employee, not the admin.
    expect(String(Appointment.distinct.mock.calls[0][1].therapist)).toBe(EMP_ID);
  });

  test('therapist self-view returns the rolled-up signals', async () => {
    Employee.findOne.mockReturnValueOnce(
      chain({ _id: EMP_ID, name_ar: 'فهد', specialization: 'pt' })
    );
    Appointment.distinct.mockResolvedValueOnce([BEN_1, BEN_2]);
    MeasureReassessmentTask.aggregate.mockResolvedValueOnce([
      { _id: BEN_1, openTasks: 2, breachedTasks: 1, escalatedTasks: 0, nextDueAt: null },
    ]);
    MeasureAlert.aggregate.mockResolvedValueOnce([
      { _id: BEN_2, openAlerts: 1, criticalAlerts: 1, alertTypes: ['MCID_NOT_MET'] },
    ]);
    Beneficiary.find.mockReturnValueOnce(
      chain([
        { _id: BEN_1, firstName_ar: 'أحمد' },
        { _id: BEN_2, firstName_ar: 'سعد' },
      ])
    );

    const res = await request(buildApp())
      .get('/api/v1/therapist/clinical-signals')
      .set(asUser('therapist'));
    expect(res.status).toBe(200);
    // Critical alert (BEN_2) ranks above breached task (BEN_1).
    expect(res.body[0].beneficiaryId).toBe(BEN_2);
    expect(res.body[1].beneficiaryId).toBe(BEN_1);
  });
});
