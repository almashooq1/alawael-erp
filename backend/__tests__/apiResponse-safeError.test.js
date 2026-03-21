/**
 * apiResponse-safeError.test.js — ApiResponse, ApiError, safeError
 * اختبار الاستجابات الموحدة وإخفاء الأخطاء في الإنتاج
 */
const { ApiResponse, ApiError } = require('../utils/apiResponse');

/* ===============================================================
   ApiResponse
   =============================================================== */
describe('ApiResponse', () => {
  test('200 — success flag is true', () => {
    const r = new ApiResponse(200, { id: 1 });
    expect(r.statusCode).toBe(200);
    expect(r.data).toEqual({ id: 1 });
    expect(r.success).toBe(true);
    expect(r.message).toBe('Success');
  });

  test('201 — still success', () => {
    const r = new ApiResponse(201, null, 'Created');
    expect(r.success).toBe(true);
    expect(r.message).toBe('Created');
  });

  test('400 — success is false', () => {
    const r = new ApiResponse(400, null, 'Bad Request');
    expect(r.success).toBe(false);
  });

  test('500 — success is false', () => {
    expect(new ApiResponse(500, null).success).toBe(false);
  });

  test('399 — last success boundary', () => {
    expect(new ApiResponse(399, null).success).toBe(true);
  });
});

/* ===============================================================
   ApiError
   =============================================================== */
describe('ApiError', () => {
  test('inherits from Error', () => {
    const e = new ApiError(404, 'Not Found');
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Not Found');
    expect(e.statusCode).toBe(404);
    expect(e.success).toBe(false);
    expect(e.isOperational).toBe(true);
    expect(e.data).toBeNull();
  });

  test('default message', () => {
    const e = new ApiError(500);
    expect(e.message).toBe('Something went wrong');
  });

  test('custom errors array', () => {
    const errors = [{ field: 'email', msg: 'required' }];
    const e = new ApiError(422, 'Validation failed', errors);
    expect(e.errors).toEqual(errors);
  });

  test('custom stack', () => {
    const e = new ApiError(500, 'boom', [], 'custom-stack');
    expect(e.stack).toBe('custom-stack');
  });

  test('auto-captures stack when none provided', () => {
    const e = new ApiError(500);
    expect(typeof e.stack).toBe('string');
    expect(e.stack.length).toBeGreaterThan(0);
  });
});

/* ===============================================================
   safeError
   =============================================================== */
describe('safeError', () => {
  // The module evaluates NODE_ENV at require-time, so we isolate each mode.

  afterEach(() => {
    jest.resetModules();
  });

  test('in development — returns Error message', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { safeError } = require('../utils/safeError');
    expect(safeError(new Error('db failed'))).toBe('db failed');
  });

  test('in test env — returns string error', () => {
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    const { safeError } = require('../utils/safeError');
    expect(safeError('something broke')).toBe('something broke');
  });

  test('in development — uses fallback when error has no message', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { safeError } = require('../utils/safeError');
    expect(safeError({}, 'خطأ')).toBe('خطأ');
  });

  test('in development — uses default Arabic fallback', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { safeError } = require('../utils/safeError');
    expect(safeError({})).toBe('حدث خطأ داخلي');
  });

  test('in production — returns undefined', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { safeError } = require('../utils/safeError');
    expect(safeError(new Error('secret info'))).toBeUndefined();
  });

  test('in production — ignores fallback', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { safeError } = require('../utils/safeError');
    expect(safeError('err', 'fallback')).toBeUndefined();
  });
});
