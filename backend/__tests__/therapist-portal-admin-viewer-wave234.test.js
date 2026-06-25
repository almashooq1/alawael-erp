'use strict';

/**
 * therapist-portal-admin-viewer-wave234.test.js — Wave 234.
 *
 * Extends the W232 admin-viewer fix from /api/therapist-workbench to the
 * /api/v1/therapist (therapist-portal.routes.js) surface. Six GET endpoints
 * that previously returned 404 EmployeeNotFound for admins without a linked
 * Employee record now signal viewer mode:
 *
 *   /me              — object payload, viewerMode in response
 *   /today           — object payload, viewerMode in response
 *   /beneficiaries   — bare array (returns [] for admin_no_target)
 *   /assessments     — bare array (returns [] for admin_no_target)
 *   /credentials     — object payload, viewerMode in response
 *
 * New /therapists picker (admin-only) returns the clinical Employee list.
 *
 * NOTE: /schedule and /sessions/* mutations were retired in Phase 8; they are
 * now served by the unified DDD Sessions surface /api/v1/sessions/therapist/*.
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

const Employee = require('../models/HR/Employee');
const Appointment = require('../models/Appointment');

// Chainable query mock: supports .select/.sort/.limit/.populate/.lean.
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

const TARGET_ID = '507f1f77bcf86cd799439011';
const UNKNOWN_ID = '507f1f77bcf86cd7994390aa';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('W234 — therapist-portal admin viewer mode', () => {
  // ── /therapists picker ────────────────────────────────────────────────
  describe('GET /therapists', () => {
    test('forbids non-admin roles', async () => {
      const res = await request(buildApp())
        .get('/api/v1/therapist/therapists')
        .set(asUser('therapist'));
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    test('returns clinical employees for admin', async () => {
      Employee.find.mockReturnValueOnce(
        chain([
          { _id: 'e1', name_ar: 'علي', specialization: 'pt', email: 'ali@x.com' },
          { _id: 'e2', name_ar: 'سارة', specialization: 'speech', email: 's@x.com' },
        ])
      );
      const res = await request(buildApp())
        .get('/api/v1/therapist/therapists')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0]).toMatchObject({ id: 'e1', nameAr: 'علي' });
      expect(res.body.total).toBe(2);
      // Filter must pin to clinical specializations.
      const filter = Employee.find.mock.calls[0][0];
      expect(filter.specialization.$in).toEqual(
        expect.arrayContaining(['pt', 'ot', 'speech', 'aba'])
      );
    });
  });

  // ── /me ───────────────────────────────────────────────────────────────
  describe('GET /me', () => {
    test('admin without linked Employee → 200 admin_no_target (was 404)', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp()).get('/api/v1/therapist/me').set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
      expect(res.body.profile).toBeNull();
    });

    test('admin with ?employeeId targets that Employee', async () => {
      Employee.findById.mockReturnValueOnce(
        chain({
          _id: TARGET_ID,
          employee_number: 'EMP-001',
          name_ar: 'محمد',
          specialization: 'ot',
          department: 'clinical',
          branch_id: { name_ar: 'فرع الرياض' },
          scfhs_number: 'SCFHS-12345',
          cpe_hours_ytd: 12,
          cpe_hours_required: 30,
        })
      );
      const res = await request(buildApp())
        .get(`/api/v1/therapist/me?employeeId=${TARGET_ID}`)
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_targeted');
      expect(res.body.viewing._id).toBe(TARGET_ID);
      expect(res.body.id).toBe(TARGET_ID);
      expect(res.body.nameAr).toBe('محمد');
    });

    test('admin with unknown ?employeeId falls back to admin_no_target', async () => {
      Employee.findById.mockReturnValueOnce(chain(null));
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get(`/api/v1/therapist/me?employeeId=${UNKNOWN_ID}`)
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
    });

    test('therapist without linked Employee still 404 (real auth issue)', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp()).get('/api/v1/therapist/me').set(asUser('therapist'));
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('EmployeeNotFound');
    });
  });

  // ── /today ────────────────────────────────────────────────────────────
  describe('GET /today', () => {
    test('admin without target → 200 empty envelope (was 404)', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp()).get('/api/v1/therapist/today').set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
      expect(res.body.sessions).toEqual([]);
      expect(res.body.counts).toMatchObject({ total: 0, upcoming: 0, inProgress: 0, completed: 0 });
      expect(Appointment.find).not.toHaveBeenCalled();
    });

    test('admin with ?employeeId loads target therapist data', async () => {
      Employee.findById.mockReturnValueOnce(
        chain({ _id: TARGET_ID, name_ar: 'منى', specialization: 'speech' })
      );
      Appointment.find.mockReturnValueOnce(
        chain([
          {
            _id: 'a1',
            therapist: TARGET_ID,
            date: new Date(),
            startTime: '09:00',
            status: 'CONFIRMED',
            type: 'علاج طبيعي',
            beneficiary: 'b1',
            beneficiaryName: 'فهد',
          },
        ])
      );
      const res = await request(buildApp())
        .get(`/api/v1/therapist/today?employeeId=${TARGET_ID}`)
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_targeted');
      expect(res.body.viewing._id).toBe(TARGET_ID);
      expect(res.body.therapist.nameAr).toBe('منى');
      expect(res.body.counts.total).toBe(1);
      // Find must filter by the chosen therapist.
      expect(String(Appointment.find.mock.calls[0][0].therapist)).toBe(TARGET_ID);
    });

    test('therapist without Employee still 404', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp()).get('/api/v1/therapist/today').set(asUser('therapist'));
      expect(res.status).toBe(404);
    });
  });

  // ── /beneficiaries (bare-array contract) ──────────────────────────────
  describe('GET /beneficiaries', () => {
    test('admin without target → 200 []', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/v1/therapist/beneficiaries')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual([]);
      // Aggregation should not run without a target.
      expect(Appointment.distinct).not.toHaveBeenCalled();
    });

    test('therapist without Employee still 404', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/v1/therapist/beneficiaries')
        .set(asUser('therapist'));
      expect(res.status).toBe(404);
    });
  });

  // ── /assessments (bare-array contract) ────────────────────────────────
  describe('GET /assessments', () => {
    test('admin without target → 200 []', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/v1/therapist/assessments')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('therapist without Employee still 404', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/v1/therapist/assessments')
        .set(asUser('therapist'));
      expect(res.status).toBe(404);
    });
  });

  // ── /credentials ──────────────────────────────────────────────────────
  describe('GET /credentials', () => {
    test('admin without target → 200 empty envelope', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/v1/therapist/credentials')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
      expect(res.body.credentials).toEqual([]);
      expect(res.body.cpe.required).toBe(30);
    });

    test('therapist without Employee still 404', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/v1/therapist/credentials')
        .set(asUser('therapist'));
      expect(res.status).toBe(404);
    });
  });
});
