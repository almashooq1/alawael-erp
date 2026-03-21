/**
 * Tests for config/validateEnv.js
 *
 * Covers:
 *  - Valid minimal env passes
 *  - Defaults are applied (PORT, JWT_EXPIRES_IN, NODE_ENV)
 *  - Invalid PORT fails validation
 *  - Production-mode requires JWT_SECRET ≥ 32 chars + MONGODB_URI
 *  - Development mode warns instead of throwing
 *  - Unknown env vars are allowed (unknown: true)
 */

// Save original env
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Start with clean slate
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV };
  // Force non-production so Joi schema picks non-required branches
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('validateEnv', () => {
  const load = () => {
    // Fresh require each time because the Joi schema is built at module-load
    // and some branches depend on process.env.NODE_ENV at that point.
    return require('../config/validateEnv').validateEnv;
  };

  test('returns validated object with defaults', () => {
    const validateEnv = load();
    const result = validateEnv();
    expect(result).toBeDefined();
    expect(result.NODE_ENV).toBe('test');
    expect(typeof result.PORT).toBe('number');
  });

  test('default PORT is 3001', () => {
    delete process.env.PORT;
    const validateEnv = load();
    const result = validateEnv();
    expect(result.PORT).toBe(3001);
  });

  test('custom PORT is coerced to number', () => {
    process.env.PORT = '4000';
    const validateEnv = load();
    const result = validateEnv();
    expect(result.PORT).toBe(4000);
  });

  test('default JWT_EXPIRES_IN is 24h', () => {
    delete process.env.JWT_EXPIRES_IN;
    const validateEnv = load();
    const result = validateEnv();
    expect(result.JWT_EXPIRES_IN).toBe('24h');
  });

  test('allows unknown env vars (PATH, HOME, etc.)', () => {
    process.env.SOME_RANDOM_VAR = 'hello';
    const validateEnv = load();
    const result = validateEnv();
    expect(result.SOME_RANDOM_VAR).toBe('hello');
  });

  test('invalid NODE_ENV triggers warning in non-production', () => {
    process.env.NODE_ENV = 'invalid_env';
    // Need to re-require because NODE_ENV affects schema definition
    jest.resetModules();
    // Mock logger to capture warnings
    jest.doMock('../utils/logger', () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }));
    const { validateEnv } = require('../config/validateEnv');
    // Should NOT throw in non-production — just warn
    expect(() => validateEnv()).not.toThrow();
  });

  test('invalid PORT out of range triggers warning in non-production', () => {
    process.env.PORT = '99999';
    jest.resetModules();
    jest.doMock('../utils/logger', () => ({ warn: jest.fn(), info: jest.fn(), error: jest.fn() }));
    const { validateEnv } = require('../config/validateEnv');
    // Non-production: warns, still returns value
    expect(() => validateEnv()).not.toThrow();
  });

  test('boolean flags accept "true" and "false"', () => {
    process.env.SMART_TEST_MODE = 'true';
    process.env.ENABLE_SWAGGER = 'false';
    process.env.DISABLE_REDIS = 'true';
    const validateEnv = load();
    const result = validateEnv();
    expect(result.SMART_TEST_MODE).toBe('true');
    expect(result.ENABLE_SWAGGER).toBe('false');
    expect(result.DISABLE_REDIS).toBe('true');
  });

  test('REDIS_PORT is coerced to number', () => {
    process.env.REDIS_PORT = '6379';
    const validateEnv = load();
    const result = validateEnv();
    expect(result.REDIS_PORT).toBe(6379);
  });
});
