'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const mockCreate = jest.fn().mockResolvedValue({ _id: 'log-1' });
jest.mock('../../models/auditLog.model', () => ({
  AuditLog: { create: (...args) => mockCreate(...args) },
}));

const logPiiAccess = require('../../middleware/piiAccess.middleware');

function makeReq(overrides = {}) {
  return {
    method: 'GET',
    path: '/api/beneficiaries/abc',
    user: { _id: 'user-1' },
    params: { id: 'abc' },
    query: {},
    headers: { 'user-agent': 'jest' },
    ip: '203.0.113.5',
    ...overrides,
  };
}

function makeRes(statusCode = 200) {
  const listeners = {};
  return {
    statusCode,
    on: (evt, fn) => {
      listeners[evt] = fn;
    },
    _trigger: () => listeners.finish && listeners.finish(),
    _listeners: listeners,
  };
}

describe('middleware/piiAccess', () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  test('logs successful 2xx access with full envelope', async () => {
    const req = makeReq();
    const res = makeRes(200);
    const next = jest.fn();

    const mw = logPiiAccess('Beneficiary');
    mw(req, res, next);
    expect(next).toHaveBeenCalled();

    res._trigger();
    await new Promise(r => setImmediate(r));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const entry = mockCreate.mock.calls[0][0];
    expect(entry.eventType).toBe('pii.access.read');
    expect(entry.userId).toBe('user-1');
    expect(entry.ipAddress).toBe('203.0.113.5');
    expect(entry.userAgent).toBe('jest');
    expect(entry.metadata.targetType).toBe('Beneficiary');
    expect(entry.metadata.targetId).toBe('abc');
    expect(entry.metadata.method).toBe('GET');
    expect(entry.tags).toContain('pdpl');
    expect(entry.tags).toContain('target:Beneficiary');
  });

  test('skips 4xx responses (denied access is not a disclosure)', async () => {
    const res = makeRes(403);
    const mw = logPiiAccess('Beneficiary');
    mw(makeReq(), res, jest.fn());
    res._trigger();
    await new Promise(r => setImmediate(r));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('skips 5xx responses', async () => {
    const res = makeRes(500);
    const mw = logPiiAccess('Beneficiary');
    mw(makeReq(), res, jest.fn());
    res._trigger();
    await new Promise(r => setImmediate(r));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('skips anonymous requests (no req.user)', async () => {
    const res = makeRes(200);
    const mw = logPiiAccess('Beneficiary');
    mw(makeReq({ user: null }), res, jest.fn());
    res._trigger();
    await new Promise(r => setImmediate(r));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('skips OPTIONS / HEAD by default', async () => {
    const res = makeRes(200);
    const mw = logPiiAccess('Beneficiary');
    mw(makeReq({ method: 'OPTIONS' }), res, jest.fn());
    res._trigger();
    await new Promise(r => setImmediate(r));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('honors a custom eventType', async () => {
    const res = makeRes(200);
    const mw = logPiiAccess('Invoice', { eventType: 'pii.access.financial' });
    mw(makeReq(), res, jest.fn());
    res._trigger();
    await new Promise(r => setImmediate(r));
    expect(mockCreate.mock.calls[0][0].eventType).toBe('pii.access.financial');
  });

  test('honors a custom idParam', async () => {
    const res = makeRes(200);
    const mw = logPiiAccess('Invoice', { idParam: 'invoiceId' });
    const req = makeReq({ params: { invoiceId: 'inv-99' } });
    mw(req, res, jest.fn());
    res._trigger();
    await new Promise(r => setImmediate(r));
    expect(mockCreate.mock.calls[0][0].metadata.targetId).toBe('inv-99');
  });

  test('falls back to x-forwarded-for when req.ip missing', async () => {
    const res = makeRes(200);
    const mw = logPiiAccess('Beneficiary');
    mw(
      makeReq({
        ip: undefined,
        headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1', 'user-agent': 'x' },
      }),
      res,
      jest.fn()
    );
    res._trigger();
    await new Promise(r => setImmediate(r));
    expect(mockCreate.mock.calls[0][0].ipAddress).toBe('198.51.100.7');
  });

  test('AuditLog.create rejection is swallowed (best-effort)', async () => {
    mockCreate.mockRejectedValueOnce(new Error('mongo-down'));
    const res = makeRes(200);
    const mw = logPiiAccess('Beneficiary');
    mw(makeReq(), res, jest.fn());
    // Should not throw + next() already returned synchronously
    expect(() => res._trigger()).not.toThrow();
    await new Promise(r => setImmediate(r));
    // Test passes if no unhandled rejection escaped.
  });

  test('does not block the response — next() called synchronously', () => {
    const res = makeRes(200);
    const next = jest.fn();
    logPiiAccess('Beneficiary')(makeReq(), res, next);
    expect(next).toHaveBeenCalled();
    // Hook is res.on('finish'), not awaited.
    expect(res._listeners.finish).toBeDefined();
  });
});
