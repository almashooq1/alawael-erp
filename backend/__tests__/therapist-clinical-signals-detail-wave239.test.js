'use strict';

/**
 * therapist-clinical-signals-detail-wave239.test.js — Wave 239.
 *
 * Tests the drill-down endpoint for the ClinicalSignalsCard:
 *   GET /api/v1/therapist/clinical-signals/:beneficiaryId
 *
 * Service-level coverage:
 *   1. invalid beneficiaryId → null
 *   2. therapist without caseload claim → null (404 at the route)
 *   3. beneficiary not found → null
 *   4. admin viewer skipCaseloadCheck=true bypasses Appointment.exists
 *   5. open tasks + open alerts populated with measure names
 *   6. W232 interpreter failure does NOT break the page
 *   7. evidence object passed through unchanged
 *
 * Route-level:
 *   8. therapist orphan → 404 EmployeeNotFound
 *   9. invalid :beneficiaryId param → 400 InvalidId
 *  10. admin_no_target → 404 NoTargetTherapist (don't leak data)
 *  11. caseload mismatch → 404 NotFound
 *  12. happy path: target therapist + caseload member returns full detail
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
};
  m.MeasureReassessmentTask = m;
  return m;
});
jest.mock('../domains/goals/models/MeasureAlert', () => {
  const m = {
  aggregate: jest.fn(),
  find: jest.fn(),
};
  m.MeasureAlert = m;
  return m;
});
jest.mock('../domains/goals/models/Measure', () => ({
  find: jest.fn(),
}));
jest.mock('../services/measureProgressInterpreter.service', () => ({
  interpretAll: jest.fn(),
  interpret: jest.fn(),
}));

const Employee = require('../models/HR/Employee');
const Beneficiary = require('../models/Beneficiary');
const Appointment = require('../models/Appointment');
const MeasureReassessmentTask = require('../domains/goals/models/MeasureReassessmentTask');
const MeasureAlert = require('../domains/goals/models/MeasureAlert');
const Measure = require('../domains/goals/models/Measure');
const interpreter = require('../services/measureProgressInterpreter.service');
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
const BEN_ID = '507f1f77bcf86cd799439021';
const MEASURE_BERG = '507f1f77bcf86cd799439031';
const MEASURE_FIM = '507f1f77bcf86cd799439032';
const BAD_ID = 'not-an-objectid';

beforeEach(() => {
  // Use resetAllMocks (not clearAllMocks) so unconsumed mockReturnValueOnce
  // queues from prior tests don't leak forward — easy to hit when tests
  // pre-queue Measure.find returns that the codepath skips.
  jest.resetAllMocks();
});

describe('W239 — getBeneficiaryDetail service', () => {
  test('returns null for invalid beneficiaryId', async () => {
    const result = await service.getBeneficiaryDetail({
      employeeId: EMP_ID,
      beneficiaryId: BAD_ID,
    });
    expect(result).toBeNull();
    expect(Appointment.exists).not.toHaveBeenCalled();
  });

  test('therapist without caseload claim → null', async () => {
    Appointment.exists.mockResolvedValueOnce(null);
    const result = await service.getBeneficiaryDetail({
      employeeId: EMP_ID,
      beneficiaryId: BEN_ID,
    });
    expect(result).toBeNull();
    expect(Beneficiary.findById).not.toHaveBeenCalled();
  });

  test('beneficiary not found → null', async () => {
    Appointment.exists.mockResolvedValueOnce({ _id: 'someId' });
    Beneficiary.findById.mockReturnValueOnce(chain(null));
    const result = await service.getBeneficiaryDetail({
      employeeId: EMP_ID,
      beneficiaryId: BEN_ID,
    });
    expect(result).toBeNull();
    expect(MeasureReassessmentTask.find).not.toHaveBeenCalled();
  });

  test('admin viewer skipCaseloadCheck=true bypasses Appointment.exists', async () => {
    Beneficiary.findById.mockReturnValueOnce(
      chain({ _id: BEN_ID, firstName_ar: 'علي', lastName_ar: 'محمد', beneficiaryNumber: 'B-001' })
    );
    MeasureReassessmentTask.find.mockReturnValueOnce(chain([]));
    MeasureAlert.find.mockReturnValueOnce(chain([]));
    interpreter.interpretAll.mockResolvedValueOnce({ byMeasure: [], rollup: null });

    const result = await service.getBeneficiaryDetail({
      employeeId: EMP_ID,
      beneficiaryId: BEN_ID,
      skipCaseloadCheck: true,
    });
    expect(result).not.toBeNull();
    expect(Appointment.exists).not.toHaveBeenCalled();
    expect(result.beneficiary.nameAr).toBe('علي محمد');
  });

  test('populates tasks + alerts with measure names', async () => {
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    Beneficiary.findById.mockReturnValueOnce(
      chain({ _id: BEN_ID, firstName_ar: 'سارة', beneficiaryNumber: 'B-002' })
    );
    MeasureReassessmentTask.find.mockReturnValueOnce(
      chain([
        {
          _id: 't1',
          measureId: MEASURE_BERG,
          measureCode: 'BERG',
          status: 'pending',
          phase: 'BREACHED',
          dueAt: new Date('2026-04-01'),
          overdueDays: 50,
        },
      ])
    );
    MeasureAlert.find.mockReturnValueOnce(
      chain([
        {
          _id: 'a1',
          measureId: MEASURE_FIM,
          measureCode: 'FIM',
          alertType: 'REGRESSION_DETECTED',
          severity: 'high',
          status: 'open',
          evidence: { n: 4, slopePerMonth: -1.2, message_ar: 'تراجع ملحوظ' },
          firstSeenAt: new Date('2026-05-15'),
        },
      ])
    );
    Measure.find.mockReturnValueOnce(
      chain([
        { _id: MEASURE_BERG, code: 'BERG', name_ar: 'مقياس بيرغ' },
        { _id: MEASURE_FIM, code: 'FIM', name_ar: 'مقياس FIM' },
      ])
    );
    interpreter.interpretAll.mockResolvedValueOnce({ byMeasure: [], rollup: null });

    const result = await service.getBeneficiaryDetail({
      employeeId: EMP_ID,
      beneficiaryId: BEN_ID,
    });
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      measureCode: 'BERG',
      measureNameAr: 'مقياس بيرغ',
      phase: 'BREACHED',
      overdueDays: 50,
    });
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({
      measureCode: 'FIM',
      measureNameAr: 'مقياس FIM',
      alertType: 'REGRESSION_DETECTED',
      severity: 'high',
    });
    expect(result.alerts[0].evidence.message_ar).toBe('تراجع ملحوظ');
  });

  test('W232 interpreter failure does NOT break the response', async () => {
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    Beneficiary.findById.mockReturnValueOnce(chain({ _id: BEN_ID, firstName_ar: 'فهد' }));
    MeasureReassessmentTask.find.mockReturnValueOnce(chain([]));
    MeasureAlert.find.mockReturnValueOnce(chain([]));
    Measure.find.mockReturnValueOnce(chain([]));
    interpreter.interpretAll.mockRejectedValueOnce(new Error('interpreter exploded'));

    const result = await service.getBeneficiaryDetail({
      employeeId: EMP_ID,
      beneficiaryId: BEN_ID,
    });
    expect(result).not.toBeNull();
    expect(result.narratives).toEqual({ byMeasure: [], rollup: null });
  });

  test('passes interpreter narratives through unchanged', async () => {
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    Beneficiary.findById.mockReturnValueOnce(chain({ _id: BEN_ID, firstName_ar: 'فهد' }));
    MeasureReassessmentTask.find.mockReturnValueOnce(chain([]));
    MeasureAlert.find.mockReturnValueOnce(chain([]));
    Measure.find.mockReturnValueOnce(chain([]));
    interpreter.interpretAll.mockResolvedValueOnce({
      byMeasure: [
        {
          measureCode: 'BERG',
          category: 'SUSTAINED_IMPROVEMENT',
          sentenceAr: 'تحسّن مستدام على مقياس بيرغ',
          sentenceEn: 'Sustained improvement on Berg',
          confidence: 0.85,
        },
      ],
      rollup: { worstCategory: 'SUSTAINED_IMPROVEMENT', severity: 2 },
    });

    const result = await service.getBeneficiaryDetail({
      employeeId: EMP_ID,
      beneficiaryId: BEN_ID,
    });
    expect(result.narratives.byMeasure).toHaveLength(1);
    expect(result.narratives.byMeasure[0].sentenceAr).toBe('تحسّن مستدام على مقياس بيرغ');
    expect(result.narratives.rollup.worstCategory).toBe('SUSTAINED_IMPROVEMENT');
  });
});

describe('W239 — /clinical-signals/:beneficiaryId route', () => {
  test('therapist orphan → 404 EmployeeNotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .get(`/api/v1/therapist/clinical-signals/${BEN_ID}`)
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('EmployeeNotFound');
  });

  test('invalid :beneficiaryId param → 400 InvalidId', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    const res = await request(buildApp())
      .get(`/api/v1/therapist/clinical-signals/${BAD_ID}`)
      .set(asUser('therapist'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('InvalidId');
  });

  test('admin_no_target → 404 NoTargetTherapist (no data leak)', async () => {
    Employee.findOne.mockReturnValueOnce(chain(null));
    const res = await request(buildApp())
      .get(`/api/v1/therapist/clinical-signals/${BEN_ID}`)
      .set(asUser('admin'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NoTargetTherapist');
  });

  test('caseload mismatch (therapist not assigned) → 404 NotFound', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    Appointment.exists.mockResolvedValueOnce(null);
    const res = await request(buildApp())
      .get(`/api/v1/therapist/clinical-signals/${BEN_ID}`)
      .set(asUser('therapist'));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NotFound');
  });

  test('happy path: returns beneficiary + tasks + alerts + narratives', async () => {
    Employee.findOne.mockReturnValueOnce(chain({ _id: EMP_ID }));
    Appointment.exists.mockResolvedValueOnce({ _id: 'apt1' });
    Beneficiary.findById.mockReturnValueOnce(
      chain({ _id: BEN_ID, firstName_ar: 'يوسف', beneficiaryNumber: 'B-003' })
    );
    MeasureReassessmentTask.find.mockReturnValueOnce(
      chain([
        {
          _id: 't1',
          measureId: MEASURE_BERG,
          measureCode: 'BERG',
          status: 'pending',
          phase: 'OVERDUE',
          dueAt: new Date('2026-05-01'),
          overdueDays: 20,
        },
      ])
    );
    MeasureAlert.find.mockReturnValueOnce(chain([]));
    Measure.find.mockReturnValueOnce(
      chain([{ _id: MEASURE_BERG, code: 'BERG', name_ar: 'مقياس بيرغ' }])
    );
    interpreter.interpretAll.mockResolvedValueOnce({ byMeasure: [], rollup: null });

    const res = await request(buildApp())
      .get(`/api/v1/therapist/clinical-signals/${BEN_ID}`)
      .set(asUser('therapist'));
    expect(res.status).toBe(200);
    expect(res.body.beneficiary.nameAr).toBe('يوسف');
    expect(res.body.beneficiary.beneficiaryNumber).toBe('B-003');
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].measureNameAr).toBe('مقياس بيرغ');
    expect(res.body.alerts).toEqual([]);
    expect(res.body.narratives).toEqual({ byMeasure: [], rollup: null });
  });

  test('admin with ?employeeId skips caseload check', async () => {
    Employee.findById.mockReturnValueOnce(chain({ _id: EMP_ID, name_ar: 'محمد' }));
    Beneficiary.findById.mockReturnValueOnce(
      chain({ _id: BEN_ID, firstName_ar: 'سعد', beneficiaryNumber: 'B-004' })
    );
    MeasureReassessmentTask.find.mockReturnValueOnce(chain([]));
    MeasureAlert.find.mockReturnValueOnce(chain([]));
    Measure.find.mockReturnValueOnce(chain([]));
    interpreter.interpretAll.mockResolvedValueOnce({ byMeasure: [], rollup: null });

    const res = await request(buildApp())
      .get(`/api/v1/therapist/clinical-signals/${BEN_ID}?employeeId=${EMP_ID}`)
      .set(asUser('admin'));
    expect(res.status).toBe(200);
    expect(res.body.beneficiary.nameAr).toBe('سعد');
    // Caseload gate skipped for admin_targeted.
    expect(Appointment.exists).not.toHaveBeenCalled();
  });
});
