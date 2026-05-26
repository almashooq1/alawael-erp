'use strict';

/**
 * therapist-portal-caseload-guard-wave269d.test.js — Wave 269d.
 *
 * Verifies the caseload-guard fix on two therapist-portal write
 * endpoints uncovered by the post-W269b audit:
 *
 *   POST /goals/:goalId/progress
 *     — without the fix, any authenticated therapist could log
 *       progress on any goal in the system by knowing its ObjectId
 *       (no caseload check on plan.beneficiary).
 *
 *   POST /red-flags
 *     — without the fix, any authenticated therapist could raise a
 *       red flag against any beneficiary's record (audit-trail-
 *       tagged event surfacing on supervisor dashboards) by knowing
 *       only their beneficiaryId.
 *
 * Pattern: direct-exec handler invocation w/ jest.doMock to stub the
 * Appointment + GoalProgressEntry + RedFlagState + CarePlan models +
 * the resolveEmployeeId / findCarePlanByGoalId helpers exported from
 * the route file. Mirrors the W269 / W269b pattern, scaled to this
 * file's slightly more interleaved module-level helpers.
 *
 * The route file uses a `lazy model loader` pattern (Appointment() is
 * a function returning the model). We replace that function on the
 * required module's internals via jest.spyOn after require.
 */

describe('W269d — therapist-portal caseload-guard fixes', () => {
  let router;
  let appointmentMock;
  let goalProgressEntryMock;
  let redFlagStateMock;
  let beneficiaryMock;
  let carePlanMock;
  let userMock;

  beforeAll(() => {
    jest.resetModules();

    // Build mongoose.model spy BEFORE requiring the route file, so the
    // closure-captured _models.Appointment etc. resolve to our mocks.
    const mongoose = require('mongoose');
    appointmentMock = {
      countDocuments: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      exists: jest.fn(),
    };
    goalProgressEntryMock = { create: jest.fn() };
    redFlagStateMock = { create: jest.fn(), find: jest.fn(), findOne: jest.fn() };
    beneficiaryMock = { findById: jest.fn(), find: jest.fn() };
    carePlanMock = { findOne: jest.fn(), find: jest.fn() };
    userMock = { findById: jest.fn() };

    const originalModel = mongoose.model.bind(mongoose);
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'Appointment') return appointmentMock;
      if (name === 'GoalProgressEntry') return goalProgressEntryMock;
      if (name === 'RedFlagState') return redFlagStateMock;
      if (name === 'Beneficiary') return beneficiaryMock;
      if (name === 'CarePlan') return carePlanMock;
      if (name === 'User') return userMock;
      if (name === 'Employee') {
        return {
          findOne: jest.fn().mockReturnValue({
            select: () => ({
              lean: () => Promise.resolve({ _id: 'emp-1' }),
            }),
            lean: () => Promise.resolve({ _id: 'emp-1' }),
          }),
        };
      }
      return originalModel(name);
    });

    // Stub the auth middleware to no-op pass-through so the handler
    // body executes; we attach req.user manually in each test. The
    // requireTherapistRole is defined inline in the route file and
    // not invoked under direct-exec (we reach the handler directly).
    jest.doMock('../middleware/auth', () => ({
      authenticate: (req, _res, next) => next(),
    }));

    router = require('../routes/therapist-portal.routes');
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.dontMock('../middleware/auth');
    jest.resetModules();
  });

  beforeEach(() => {
    appointmentMock.countDocuments.mockReset();
    appointmentMock.findById.mockReset();
    appointmentMock.create.mockReset();
    appointmentMock.exists.mockReset();
    goalProgressEntryMock.create.mockReset();
    redFlagStateMock.create.mockReset();
    beneficiaryMock.findById.mockReset();
    carePlanMock.findOne.mockReset();
  });

  function _findHandler(method, path) {
    const layer = router.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method]
    );
    return layer && layer.route.stack[layer.route.stack.length - 1].handle;
  }

  function _mockRes() {
    const res = {};
    res.status = jest.fn(code => {
      res._status = code;
      return res;
    });
    res.json = jest.fn(body => {
      res._body = body;
      return res;
    });
    return res;
  }

  // ─── /goals/:goalId/progress ──────────────────────────────────

  test('POST /goals/:goalId/progress returns 403 when therapist has no caseload assignment', async () => {
    // findCarePlanByGoalId helper hits CarePlan().findOne($or...).lean()
    // — set up a goal-bearing care plan owned by some other therapist's
    // beneficiary.
    carePlanMock.findOne = jest.fn().mockReturnValue({
      lean: () =>
        Promise.resolve({
          _id: 'plan-1',
          beneficiary: 'ben-foreign',
          therapeutic: {
            domains: {
              speech: {
                goals: [
                  {
                    _id: '507f1f77bcf86cd799439011',
                    title: 't',
                    status: 'IN_PROGRESS',
                    targetDate: null,
                  },
                ],
              },
            },
          },
        }),
    });
    // resolveEmployeeId resolves; caseload check returns 0 (no
    // appointment) → 403.
    appointmentMock.countDocuments.mockResolvedValue(0);

    const handler = _findHandler('post', '/goals/:goalId/progress');
    expect(handler).toBeTruthy();
    const req = {
      params: { goalId: '507f1f77bcf86cd799439011' },
      body: { progressPct: 75, note: 'forged' },
      user: { _id: 'user-attacker', id: 'user-attacker' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(res._body.error).toBe('Forbidden');
    expect(goalProgressEntryMock.create).not.toHaveBeenCalled();
  });

  test('POST /goals/:goalId/progress 400s on invalid ObjectId without touching anything', async () => {
    const handler = _findHandler('post', '/goals/:goalId/progress');
    const req = {
      params: { goalId: 'not-a-real-objectid' },
      body: { progressPct: 50 },
      user: { _id: 'u' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(appointmentMock.countDocuments).not.toHaveBeenCalled();
    expect(goalProgressEntryMock.create).not.toHaveBeenCalled();
  });

  // ─── /red-flags ────────────────────────────────────────────────

  test('POST /red-flags returns 403 when therapist has no caseload assignment to the target beneficiary', async () => {
    appointmentMock.countDocuments.mockResolvedValue(0);

    const handler = _findHandler('post', '/red-flags');
    expect(handler).toBeTruthy();
    const req = {
      body: {
        beneficiaryId: '507f1f77bcf86cd799439011',
        code: 'aggressive_behavior',
        priority: 'HIGH',
        notes: 'forged red flag attempt to surface on supervisor dashboard',
      },
      user: { _id: 'user-attacker', id: 'user-attacker' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(redFlagStateMock.create).not.toHaveBeenCalled();
  });

  test('POST /red-flags 400s on invalid beneficiaryId without touching caseload', async () => {
    const handler = _findHandler('post', '/red-flags');
    const req = {
      body: {
        beneficiaryId: 'not-an-objectid',
        code: 'aggressive_behavior',
        priority: 'HIGH',
        notes: 'should never reach caseload check',
      },
      user: { _id: 'u' },
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(appointmentMock.countDocuments).not.toHaveBeenCalled();
  });

  test('POST /red-flags 401s when user missing from token (no token info)', async () => {
    const handler = _findHandler('post', '/red-flags');
    const req = {
      body: { beneficiaryId: '507f1f77bcf86cd799439011', code: 'x', priority: 'HIGH', notes: 'x' },
      user: {}, // empty
    };
    const res = _mockRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });
});
