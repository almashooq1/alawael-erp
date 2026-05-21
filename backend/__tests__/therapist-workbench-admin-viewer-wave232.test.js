'use strict';

/**
 * therapist-workbench-admin-viewer-wave232.test.js — Wave 232.
 *
 * Validates the admin-viewer mode added to /api/therapist-workbench:
 *
 *   - GET /therapists — admin-only picker source (403 for therapists).
 *   - GET /me, /today, /week, /caseload — admins without a linked Employee
 *     no longer 404. They now receive an empty `viewerMode: 'admin_no_target'`
 *     payload so the UI can render a therapist picker.
 *   - GET /today?employeeId=<id> — admins can target any clinical employee.
 *   - Invalid/unknown employeeId falls back to admin_no_target (not 404).
 *   - Non-admin (therapist/specialist) without an Employee record still 404s
 *     (that is a real auth issue, not a previewer state).
 *
 * Models are mocked at the module boundary so the suite runs without a live
 * Mongo instance. Auth middleware is mocked to lift req.user from a header.
 */

const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    const raw = req.headers['x-test-user'];
    if (raw) req.user = JSON.parse(raw);
    next();
  },
}));

jest.mock('../models/HR/Employee', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../models/TherapySession', () => ({
  find: jest.fn(),
  aggregate: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));
jest.mock('../models/Beneficiary', () => ({
  find: jest.fn(),
}));

const Employee = require('../models/HR/Employee');
const TherapySession = require('../models/TherapySession');
const Beneficiary = require('../models/Beneficiary');

// Chainable lean-mock helper. Mirrors `.select(...).sort(...).populate(...).lean()`
// patterns used throughout the route handler.
function chain(result) {
  const c = {
    select: jest.fn(() => c),
    sort: jest.fn(() => c),
    populate: jest.fn(() => c),
    lean: jest.fn().mockResolvedValue(result),
  };
  return c;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  const router = require('../routes/therapist-workbench.routes');
  app.use('/api/therapist-workbench', router);
  return app;
}

function asUser(role, extras = {}) {
  return {
    'x-test-user': JSON.stringify({ id: 'u1', email: 'u1@test.local', role, ...extras }),
  };
}

// Real 24-hex Mongo ObjectId strings (mongoose.isValidObjectId returns true).
const TARGET_ID = '507f1f77bcf86cd799439011';
const UNKNOWN_ID = '507f1f77bcf86cd7994390aa';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('W232 — therapist-workbench admin viewer mode', () => {
  // ── Endpoint registration ─────────────────────────────────────────────
  test('router exposes /therapists picker endpoint', () => {
    const router = require('../routes/therapist-workbench.routes');
    const paths = router.stack
      .filter(layer => layer.route)
      .map(layer => {
        const m = Object.keys(layer.route.methods)[0];
        return `${m.toUpperCase()} ${layer.route.path}`;
      });
    expect(paths).toEqual(
      expect.arrayContaining([
        'GET /me',
        'GET /today',
        'GET /week',
        'GET /caseload',
        'GET /therapists',
      ])
    );
  });

  // ── /therapists picker ────────────────────────────────────────────────
  describe('GET /therapists', () => {
    test('forbids non-admin roles', async () => {
      const res = await request(buildApp())
        .get('/api/therapist-workbench/therapists')
        .set(asUser('therapist'));
      expect(res.status).toBe(403);
    });

    test('returns clinical employees for admin', async () => {
      Employee.find.mockReturnValueOnce(
        chain([
          { _id: 'e1', name_ar: 'علي', specialization: 'pt' },
          { _id: 'e2', name_ar: 'سارة', specialization: 'speech' },
        ])
      );
      const res = await request(buildApp())
        .get('/api/therapist-workbench/therapists')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(2);
      // Asserts the find filter pinned to clinical specializations.
      const callArgs = Employee.find.mock.calls[0][0];
      expect(callArgs.specialization).toBeDefined();
      expect(callArgs.specialization.$in).toEqual(
        expect.arrayContaining(['pt', 'ot', 'speech', 'aba'])
      );
    });
  });

  // ── /today — the load-failure reproducer ──────────────────────────────
  describe('GET /today', () => {
    test('admin with no linked Employee + no ?employeeId → 200 admin_no_target (NOT 404)', async () => {
      // Admin email is the previewer's; resolveTargetEmployee will find no match.
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/therapist-workbench/today')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.viewerMode).toBe('admin_no_target');
      expect(res.body.items).toEqual([]);
      expect(res.body.totals).toEqual({ total: 0, completed: 0, inProgress: 0, upcoming: 0 });
      // No therapist lookups should run when no target was resolved.
      expect(TherapySession.find).not.toHaveBeenCalled();
    });

    test('admin with valid ?employeeId loads target therapist data', async () => {
      Employee.findById.mockReturnValueOnce(
        chain({ _id: TARGET_ID, name_ar: 'محمد', specialization: 'ot' })
      );
      TherapySession.find.mockReturnValueOnce(
        chain([
          { _id: 's1', status: 'COMPLETED', therapist: TARGET_ID },
          { _id: 's2', status: 'IN_PROGRESS', therapist: TARGET_ID },
          { _id: 's3', status: 'SCHEDULED', therapist: TARGET_ID },
        ])
      );
      const res = await request(buildApp())
        .get(`/api/therapist-workbench/today?employeeId=${TARGET_ID}`)
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_targeted');
      expect(res.body.viewing._id).toBe(TARGET_ID);
      expect(res.body.viewing.name_ar).toBe('محمد');
      expect(res.body.totals).toEqual({
        total: 3,
        completed: 1,
        inProgress: 1,
        upcoming: 1,
      });
      // Find must scope by the chosen therapist, not the admin user.
      const filter = TherapySession.find.mock.calls[0][0];
      expect(String(filter.therapist)).toBe(TARGET_ID);
    });

    test('admin with unknown ?employeeId falls back to admin_no_target (NOT 404)', async () => {
      Employee.findById.mockReturnValueOnce(chain(null));
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get(`/api/therapist-workbench/today?employeeId=${UNKNOWN_ID}`)
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
    });

    test('therapist without linked Employee still 404s (auth issue, not preview)', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/therapist-workbench/today')
        .set(asUser('therapist', { email: 'orphan@test.local' }));
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('therapist with linked Employee loads own data (viewerMode=self)', async () => {
      Employee.findOne.mockReturnValueOnce(
        chain({ _id: 'self-id', name_ar: 'فهد', specialization: 'pt' })
      );
      TherapySession.find.mockReturnValueOnce(chain([]));
      const res = await request(buildApp())
        .get('/api/therapist-workbench/today')
        .set(asUser('therapist', { email: 'fahad@test.local' }));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('self');
      expect(res.body.viewing._id).toBe('self-id');
    });
  });

  // ── /me admin viewer ──────────────────────────────────────────────────
  describe('GET /me', () => {
    test('admin without target returns null data + admin_no_target', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp()).get('/api/therapist-workbench/me').set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
      expect(res.body.data).toBeNull();
    });

    test('therapist without linked Employee 404s (unchanged)', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/therapist-workbench/me')
        .set(asUser('therapist'));
      expect(res.status).toBe(404);
    });
  });

  // ── /week + /caseload ─────────────────────────────────────────────────
  describe('GET /week + /caseload admin viewer (no target)', () => {
    test('/week empty grouped under admin_no_target', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/therapist-workbench/week')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
      expect(res.body.items).toEqual([]);
      expect(res.body.grouped).toEqual({});
    });

    test('/caseload empty items under admin_no_target', async () => {
      Employee.findOne.mockReturnValueOnce(chain(null));
      const res = await request(buildApp())
        .get('/api/therapist-workbench/caseload')
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_no_target');
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
      // Aggregation should not run without a target.
      expect(TherapySession.aggregate).not.toHaveBeenCalled();
      expect(Beneficiary.find).not.toHaveBeenCalled();
    });
  });

  // ── /caseload targeted ────────────────────────────────────────────────
  describe('GET /caseload (admin targeted)', () => {
    test('aggregates sessions for the chosen therapist + populates beneficiaries', async () => {
      Employee.findById.mockReturnValueOnce(
        chain({ _id: TARGET_ID, name_ar: 'منى', specialization: 'speech' })
      );
      TherapySession.aggregate.mockResolvedValueOnce([
        {
          _id: 'b1',
          sessionCount: 5,
          completed: 3,
          upcoming: 1,
          lastSession: new Date('2026-04-01'),
        },
      ]);
      Beneficiary.find.mockReturnValueOnce(
        chain([
          {
            _id: 'b1',
            firstName_ar: 'يوسف',
            beneficiaryNumber: 'B-001',
            disability: { primaryType: 'autism' },
          },
        ])
      );
      const res = await request(buildApp())
        .get(`/api/therapist-workbench/caseload?employeeId=${TARGET_ID}`)
        .set(asUser('admin'));
      expect(res.status).toBe(200);
      expect(res.body.viewerMode).toBe('admin_targeted');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].beneficiary.firstName_ar).toBe('يوسف');
      expect(res.body.items[0].sessionCount).toBe(5);
      // Aggregation must filter by the targeted therapist.
      const pipeline = TherapySession.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.therapist).toBe(TARGET_ID);
    });
  });
});
