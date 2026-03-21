/**
 * @file audit.middleware.test.js
 * @description Tests for audit middleware factories
 */

jest.mock('../services/audit.service', () => ({
  log: jest.fn().mockResolvedValue(undefined),
}));

const AuditService = require('../services/audit.service');
const {
  auditMiddleware,
  auditAuthMiddleware,
  auditCrudMiddleware,
  auditBruteForceMiddleware,
} = require('../middleware/audit.middleware');

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildReq = (overrides = {}) => ({
  params: {},
  user: { _id: 'user123', email: 'test@example.com' },
  ip: '127.0.0.1',
  method: 'GET',
  originalUrl: '/api/test',
  get: jest.fn().mockReturnValue('Mozilla/5.0'),
  ...overrides,
});

const buildRes = (statusCode = 200) => {
  const res = {
    statusCode,
    send: jest.fn(),
    on: jest.fn(),
  };
  return res;
};

const buildNext = () => jest.fn();

// Helper to invoke middleware and trigger the monkey-patched send
const invokeAndSend = (middleware, req, res, next, body = '{"ok":true}') => {
  middleware(req, res, next);
  // The middleware replaced res.send — call the new one
  res.send(body);
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── auditMiddleware ──────────────────────────────────────────────────────────
describe('auditMiddleware(actionName, moduleName)', () => {
  it('should call next()', () => {
    const mw = auditMiddleware('TEST_ACTION', 'TEST_MODULE');
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should log SUCCESS when statusCode < 400', () => {
    const mw = auditMiddleware('TEST_ACTION', 'TEST_MODULE');
    const req = buildReq({ params: { id: 'entity-1' } });
    const res = buildRes(200);
    const next = buildNext();

    invokeAndSend(mw, req, res, next);

    expect(AuditService.log).toHaveBeenCalledTimes(1);
    const call = AuditService.log.mock.calls[0];
    expect(call[1]).toBe('TEST_ACTION');
    expect(call[2]).toBe('TEST_MODULE');
    expect(call[5]).toBe('SUCCESS');
  });

  it('should log FAILURE when statusCode >= 400', () => {
    const mw = auditMiddleware('FAIL_ACTION', 'FAIL_MODULE');
    const req = buildReq();
    const res = buildRes(403);
    const next = buildNext();

    invokeAndSend(mw, req, res, next);

    expect(AuditService.log).toHaveBeenCalledTimes(1);
    const call = AuditService.log.mock.calls[0];
    expect(call[1]).toBe('FAIL_ACTION');
    expect(call[2]).toBe('FAIL_MODULE');
    expect(call[5]).toBe('FAILURE');
  });

  it('should still call the original res.send with the body', () => {
    const mw = auditMiddleware('A', 'M');
    const req = buildReq();
    const originalSend = jest.fn();
    const res = { ...buildRes(), send: originalSend };
    const next = buildNext();

    mw(req, res, next);
    // After monkey-patching, res.send is replaced
    const patchedSend = res.send;
    patchedSend('data');

    // originalSend should have been called by the patched version
    expect(originalSend).toHaveBeenCalledWith('data');
  });
});

// ── auditAuthMiddleware ──────────────────────────────────────────────────────
describe('auditAuthMiddleware(actionName)', () => {
  it('should default module to AUTHENTICATION', () => {
    const mw = auditAuthMiddleware('LOGIN');
    const req = buildReq();
    const res = buildRes(200);
    const next = buildNext();

    invokeAndSend(mw, req, res, next);

    expect(AuditService.log).toHaveBeenCalledTimes(1);
    const call = AuditService.log.mock.calls[0];
    expect(call[1]).toBe('LOGIN');
    expect(call[2]).toBe('AUTHENTICATION');
  });

  it('should use default action name when none provided', () => {
    const mw = auditAuthMiddleware();
    const req = buildReq();
    const res = buildRes(200);
    const next = buildNext();

    invokeAndSend(mw, req, res, next);

    expect(AuditService.log).toHaveBeenCalledTimes(1);
    const call = AuditService.log.mock.calls[0];
    expect(call[1]).toBe('AUTH_ACTION');
    expect(call[2]).toBe('AUTHENTICATION');
  });
});

// ── auditCrudMiddleware ──────────────────────────────────────────────────────
describe('auditCrudMiddleware(entityType)', () => {
  const cases = [
    ['POST', 'CREATE'],
    ['PUT', 'UPDATE'],
    ['PATCH', 'UPDATE'],
    ['DELETE', 'DELETE'],
    ['GET', 'READ'],
  ];

  it.each(cases)(
    'should map HTTP method %s to CRUD action %s',
    (method, expectedAction) => {
      const mw = auditCrudMiddleware('order');
      const req = buildReq({ method });
      const res = buildRes(200);
      const next = buildNext();

      invokeAndSend(mw, req, res, next);

      expect(AuditService.log).toHaveBeenCalledTimes(1);
      const call = AuditService.log.mock.calls[0];
      expect(call[1]).toBe(`${expectedAction}_ORDER`);
    }
  );
});

// ── auditBruteForceMiddleware ────────────────────────────────────────────────
describe('auditBruteForceMiddleware()', () => {
  it('should log AUTH_FAILED on 401', () => {
    const mw = auditBruteForceMiddleware();
    const req = buildReq();
    const res = buildRes(401);
    const next = buildNext();

    invokeAndSend(mw, req, res, next);

    expect(AuditService.log).toHaveBeenCalledTimes(1);
    const call = AuditService.log.mock.calls[0];
    expect(call[1]).toBe('AUTH_FAILED');
  });

  it('should log RATE_LIMIT_EXCEEDED on 429', () => {
    const mw = auditBruteForceMiddleware();
    const req = buildReq();
    const res = buildRes(429);
    const next = buildNext();

    invokeAndSend(mw, req, res, next);

    expect(AuditService.log).toHaveBeenCalledTimes(1);
    const call = AuditService.log.mock.calls[0];
    expect(call[1]).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should NOT log on 200 (success)', () => {
    const mw = auditBruteForceMiddleware();
    const req = buildReq();
    const res = buildRes(200);
    const next = buildNext();

    invokeAndSend(mw, req, res, next);

    expect(AuditService.log).not.toHaveBeenCalled();
  });
});
