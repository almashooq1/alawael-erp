/**
 * Smoke + structural tests for routes/parent-portal-v2-extras.routes.js
 *
 * Loads the real router (no jest.mock for express) and asserts the expected
 * 13 endpoints are registered. This is a regression guard — if a future edit
 * removes/renames a parent-portal endpoint, this test fails loudly instead of
 * the mobile/web client breaking silently in production.
 */

'use strict';

jest.mock('../../middleware/auth', () => {
  const mw = jest.fn((req, res, next) => next && next());
  mw.authenticate = mw;
  mw.authenticateToken = mw;
  mw.authorize = jest.fn(() => mw);
  return mw;
});

jest.mock('../../utils/safeError', () =>
  jest.fn((res, err, ctx) => res.status(500).json({ ok: false }))
);

jest.mock('../../models/Guardian', () => ({
  findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
}));
jest.mock('../../models/Beneficiary', () => ({
  findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  find: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
  }),
}));
jest.mock('../../models/Invoice', () => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  };
  return {
    find: jest.fn().mockReturnValue(chain),
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  };
});
jest.mock('../../models/Appointment', () => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  };
  return {
    find: jest.fn().mockReturnValue(chain),
    findById: jest.fn().mockResolvedValue(null),
    create: jest
      .fn()
      .mockResolvedValue({ _id: 'a1', appointmentNumber: 'APT-1', status: 'requested' }),
  };
});
jest.mock('../../models/ParentPortal', () => {
  const chain = () => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  });
  const ParentDevice = {
    findOneAndUpdate: jest
      .fn()
      .mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'd1' }) }),
    findOne: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue(chain()),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  };
  const ParentMessage = {
    find: jest.fn().mockReturnValue(chain()),
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({ _id: 'm1', createdAt: new Date() }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
  return { ParentDevice, ParentMessage };
});

const router = require('../../routes/parent-portal-v2-extras.routes');

function listRoutes(r) {
  const out = [];
  (r.stack || []).forEach(layer => {
    if (layer.route) {
      const method = Object.keys(layer.route.methods)[0].toUpperCase();
      out.push(`${method} ${layer.route.path}`);
    }
  });
  return out;
}

describe('routes/parent-portal-v2-extras.routes', () => {
  test('exports an Express router', () => {
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
    expect(Array.isArray(router.stack)).toBe(true);
  });

  test('registers exactly the expected 13 endpoints', () => {
    const got = listRoutes(router).sort();
    const want = [
      'DELETE /devices/:token',
      'GET /children/:id/appointments',
      'GET /children/:id/invoices',
      'GET /devices',
      'GET /invoices/:invoiceId',
      'GET /messages',
      'GET /settings',
      'POST /appointments/request',
      'POST /devices',
      'POST /messages',
      'PUT /appointments/:id/cancel',
      'PUT /messages/:id/read',
      'PUT /settings',
    ].sort();
    expect(got).toEqual(want);
  });

  test('GET /settings returns defaults when no devices registered', async () => {
    const layer = router.stack.find(
      l => l.route && l.route.path === '/settings' && l.route.methods.get
    );
    expect(layer).toBeTruthy();

    const handler = layer.route.stack[0].handle;
    let captured;
    const req = { user: { id: 'u1', role: 'parent' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(body => {
        captured = body;
        return res;
      }),
    };

    const Guardian = require('../../models/Guardian');
    Guardian.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({ _id: 'g1', language: 'ar', timezone: 'Asia/Riyadh' }),
    });

    await handler(req, res);
    expect(captured?.success).toBe(true);
    expect(captured?.data?.language).toBe('ar');
    expect(captured?.data?.notifications?.sessionReminders).toBe(true);
  });

  test('POST /appointments/request rejects missing childId', async () => {
    const layer = router.stack.find(
      l => l.route && l.route.path === '/appointments/request' && l.route.methods.post
    );
    const handler = layer.route.stack[0].handle;
    const req = { user: { id: 'u1', role: 'parent' }, body: { preferredDate: '2026-05-10' } };
    let status = 200;
    let captured;
    const res = {
      status: s => {
        status = s;
        return res;
      },
      json: b => {
        captured = b;
        return res;
      },
    };
    await handler(req, res);
    expect(status).toBe(400);
    expect(captured.success).toBe(false);
  });

  test('POST /devices rejects empty token', async () => {
    const layer = router.stack.find(
      l => l.route && l.route.path === '/devices' && l.route.methods.post
    );
    const handler = layer.route.stack[0].handle;
    const Guardian = require('../../models/Guardian');
    Guardian.findOne.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ _id: 'g1' }) });

    const req = { user: { id: 'u1', role: 'parent' }, body: { deviceToken: '' } };
    let status = 200;
    let captured;
    const res = {
      status: s => {
        status = s;
        return res;
      },
      json: b => {
        captured = b;
        return res;
      },
    };
    await handler(req, res);
    expect(status).toBe(400);
    expect(captured.success).toBe(false);
  });
});
