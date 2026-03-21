/**
 * Tests for middleware/maintenance.middleware.js
 *
 * Covers:
 *  - isMaintenanceMode: checks fs.existsSync
 *  - setMaintenanceMode: creates / deletes flag file
 *  - maintenanceMiddleware:
 *      - skips /api/auth routes
 *      - passes if maintenance off
 *      - allows ADMIN via req.user
 *      - allows ADMIN via JWT Bearer token
 *      - blocks non-admin with 503
 *      - blocks invalid token with 503
 */

jest.mock('fs');
jest.mock('jsonwebtoken');

const fs = require('fs');
const jwt = require('jsonwebtoken');

const {
  maintenanceMiddleware,
  isMaintenanceMode,
  setMaintenanceMode,
} = require('../middleware/maintenance.middleware');

// ── Helpers ──────────────────────────────────────────────────────────────────
const createReq = (overrides = {}) => ({
  path: '/api/data',
  headers: {},
  user: null,
  ...overrides,
});

const createRes = () => {
  const res = {
    set: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. isMaintenanceMode
// ═════════════════════════════════════════════════════════════════════════════

describe('isMaintenanceMode', () => {
  test('returns true when flag file exists', () => {
    fs.existsSync.mockReturnValue(true);
    expect(isMaintenanceMode()).toBe(true);
  });

  test('returns false when flag file does not exist', () => {
    fs.existsSync.mockReturnValue(false);
    expect(isMaintenanceMode()).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. setMaintenanceMode
// ═════════════════════════════════════════════════════════════════════════════

describe('setMaintenanceMode', () => {
  test('creates flag file when enabled and not already set', () => {
    fs.existsSync.mockReturnValue(false);
    setMaintenanceMode(true);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('maintenance.flag'),
      expect.any(String)
    );
  });

  test('does NOT create flag file when already in maintenance', () => {
    fs.existsSync.mockReturnValue(true);
    setMaintenanceMode(true);
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test('deletes flag file when disabled and currently set', () => {
    fs.existsSync.mockReturnValue(true);
    setMaintenanceMode(false);
    expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('maintenance.flag'));
  });

  test('does NOT delete when already disabled', () => {
    fs.existsSync.mockReturnValue(false);
    setMaintenanceMode(false);
    expect(fs.unlinkSync).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. maintenanceMiddleware
// ═════════════════════════════════════════════════════════════════════════════

describe('maintenanceMiddleware', () => {
  test('skips auth routes even when maintenance is on', () => {
    fs.existsSync.mockReturnValue(true);
    const req = createReq({ path: '/api/auth/login' });
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('passes through when maintenance is OFF', () => {
    fs.existsSync.mockReturnValue(false);
    const req = createReq();
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('allows ADMIN via req.user', () => {
    fs.existsSync.mockReturnValue(true);
    const req = createReq({ user: { role: 'ADMIN' } });
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.set).toHaveBeenCalledWith('X-System-Status', 'MAINTENANCE_MODE');
  });

  test('allows DEVELOPER via req.user', () => {
    fs.existsSync.mockReturnValue(true);
    const req = createReq({ user: { role: 'DEVELOPER' } });
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('allows ADMIN via Bearer JWT token', () => {
    fs.existsSync.mockReturnValue(true);
    jwt.verify.mockReturnValue({ role: 'ADMIN', id: '123' });
    const req = createReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ role: 'ADMIN', id: '123' });
    expect(res.set).toHaveBeenCalledWith('X-System-Status', 'MAINTENANCE_MODE');
  });

  test('blocks non-admin user with 503', () => {
    fs.existsSync.mockReturnValue(true);
    jwt.verify.mockReturnValue({ role: 'USER', id: '456' });
    const req = createReq({ headers: { authorization: 'Bearer some-token' } });
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('blocks when token is invalid', () => {
    fs.existsSync.mockReturnValue(true);
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = createReq({ headers: { authorization: 'Bearer bad-token' } });
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  test('blocks when no auth header and no user', () => {
    fs.existsSync.mockReturnValue(true);
    const req = createReq();
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: expect.stringContaining('maintenance'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('503 response includes timestamp', () => {
    fs.existsSync.mockReturnValue(true);
    const req = createReq();
    const res = createRes();
    maintenanceMiddleware(req, res, next);
    const body = res.json.mock.calls[0][0];
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
