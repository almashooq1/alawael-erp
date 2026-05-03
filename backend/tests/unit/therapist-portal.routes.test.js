/**
 * therapist-portal.routes — behavioral tests
 *
 * Mounts the router on a bare Express app and exercises the cross-cutting
 * concerns we just added: auth gating, role gating, mutation-id → idempotency
 * adapter, body validation, and the catalog endpoints that need no DB.
 *
 * The full DB-backed paths (today, schedule, beneficiaries, sessions/sign,
 * red-flags POST) are covered by integration tests against the real Mongo
 * suite — here we only test the route-level guards.
 */
'use strict';

const express = require('express');
const request = require('supertest');

// Mock auth so we can flip req.user from test to test.
let mockCurrentUser = null;
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    if (mockCurrentUser) req.user = mockCurrentUser;
    if (!req.user) return _res.status(401).json({ error: 'Unauthorized' });
    next();
  },
  generateToken: jest.fn(() => 'mock.jwt.token'),
}));

// Permissive RBAC so role-gating runs but lets the configured role through.
jest.mock('../../middleware/rbac.v2.middleware', () => ({
  requireRole:
    (...roles) =>
    (req, res, next) => {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const flat = roles.flat();
      if (!flat.includes(user.role) && user.role !== 'super_admin') {
        return res
          .status(403)
          .json({ error: 'InsufficientRole', required: flat, current: user.role });
      }
      return next();
    },
}));

// In-memory idempotency store so we can assert replay behavior without Redis.
const mockIdemStore = new Map();
jest.mock('../../infrastructure/idempotencyStore', () => ({
  DEFAULT_TTL_MS: 60_000,
  recordOutcome: jest.fn(),
  getStore: () => ({
    get: async k => mockIdemStore.get(k) || null,
    reserve: async k => (mockIdemStore.has(k) ? 'done' : (mockIdemStore.set(k, null), 'reserved')),
    put: async (k, v) => {
      mockIdemStore.set(k, v);
    },
    release: async k => {
      mockIdemStore.delete(k);
    },
  }),
}));

// Stub all models to fast-fail in a predictable way; tests that need real
// behavior set jest.spyOn at runtime.
jest.mock('../../models/HR/Employee', () => ({
  findOne: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(null),
  })),
}));
jest.mock('../../models/Beneficiary', () => ({}));
jest.mock('../../models/Appointment', () => ({}));
jest.mock('../../models/RedFlagState', () => ({ create: jest.fn() }));
jest.mock('../../models/CarePlan', () => ({}));
jest.mock('../../models/GoalProgressEntry', () => ({}));
jest.mock('../../models/User', () => ({
  findOne: jest.fn(() => ({ select: jest.fn().mockResolvedValue(null) })),
  find: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  })),
}));
jest.mock('../../models/Notification', () => ({
  find: jest.fn(() => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  })),
  insertMany: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../models/auditLog.model', () => ({
  create: jest.fn().mockResolvedValue({}),
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/therapist', require('../../routes/therapist-portal.routes'));
  return app;
}

beforeEach(() => {
  mockCurrentUser = null;
  mockIdemStore.clear();
});

describe('therapist-portal route guards', () => {
  test('rejects unauthenticated requests on /me', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/v1/therapist/me');
    expect(res.status).toBe(401);
  });

  test('rejects non-clinical roles with 403', async () => {
    mockCurrentUser = { id: 'u1', role: 'finance_clerk' };
    const app = makeApp();
    const res = await request(app).get('/api/v1/therapist/red-flags/catalog');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('InsufficientRole');
  });

  test('lets therapist role hit the static catalog', async () => {
    mockCurrentUser = { id: 'u1', role: 'therapist' };
    const app = makeApp();
    const res = await request(app).get('/api/v1/therapist/red-flags/catalog');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(8);
    const codes = res.body.map(r => r.code);
    expect(codes).toContain('SAFEGUARDING_CONCERN');
  });

  test('assessment templates returns the 5-item catalog', async () => {
    mockCurrentUser = { id: 'u1', role: 'therapist' };
    const app = makeApp();
    const res = await request(app).get('/api/v1/therapist/assessments/templates');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body.map(t => t.code)).toEqual([
      'REEL-4',
      'PLS-5',
      'GFTA-3',
      'VB-MAPP',
      'FUNCTIONAL',
    ]);
  });
});

describe('/auth/login validation', () => {
  test('rejects missing body fields', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/v1/therapist/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('InvalidBody');
  });

  test('returns 401 when user is not found', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/v1/therapist/auth/login')
      .send({ identifier: 'nobody@x.com', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('InvalidCredentials');
  });
});

describe('mutation-id adapter + idempotency', () => {
  test('replays a POST when the same x-client-mutation-id arrives twice', async () => {
    mockCurrentUser = { id: 'u1', role: 'therapist' };

    // Make red-flag POST short-circuit on InvalidBody so we can observe the
    // dedup behavior without going through the full DB path. We send the same
    // mutation id twice; the second call must be served from the idem cache
    // (Idempotent-Replay header set).
    const app = makeApp();
    const send = () =>
      request(app)
        .post('/api/v1/therapist/red-flags')
        .set('x-client-mutation-id', 'mut-12345-abcdef-0001')
        .send({}); // intentionally invalid → 400

    const r1 = await send();
    const r2 = await send();
    expect(r1.status).toBe(400);
    expect(r2.status).toBe(400);
    // The second response should bear the idempotency replay header.
    expect(r2.headers['idempotent-replay']).toBe('true');
  });
});
