'use strict';

const {
  redact,
  redactString,
  mask,
  SENSITIVE_KEYS,
  PARTIAL_MASK_KEYS,
  REDACTED,
} = require('../../utils/piiRedactor');

describe('piiRedactor — mask()', () => {
  test('masks all chars when value is shorter than keep', () => {
    expect(mask('abc', 4)).toBe('***');
  });

  test('masks all but last 4 chars by default', () => {
    expect(mask('0501234567')).toBe('******4567');
  });

  test('handles numbers (coerces to string)', () => {
    expect(mask(12345678, 4)).toBe('****5678');
  });

  test('returns null/undefined as-is', () => {
    expect(mask(null)).toBeNull();
    expect(mask(undefined)).toBeUndefined();
  });

  test('masks entire short string', () => {
    expect(mask('AB', 4)).toBe('**');
  });
});

describe('piiRedactor — redactString()', () => {
  test('non-string input returned as-is', () => {
    expect(redactString(42)).toBe(42);
    expect(redactString(null)).toBeNull();
  });

  test('redacts Saudi national ID (10 digits starting with 1)', () => {
    const result = redactString('ID: 1234567890');
    expect(result).toContain(REDACTED);
    expect(result).not.toContain('1234567890');
  });

  test('redacts Iqama (starts with 2)', () => {
    const result = redactString('iqama: 2987654321');
    expect(result).toContain(REDACTED);
  });

  test('redacts email addresses', () => {
    const result = redactString('contact: user@example.com for info');
    expect(result).toContain(REDACTED);
    expect(result).not.toContain('user@example.com');
  });

  test('redacts bearer tokens', () => {
    const result = redactString(
      'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    );
    expect(result).toContain('Bearer ' + REDACTED);
  });

  test('redacts JWT tokens', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(redactString(jwt)).toBe(REDACTED);
  });

  test('redacts Saudi IBAN', () => {
    const result = redactString('Transfer to SA1234567890123456789012');
    expect(result).toContain(REDACTED);
  });

  test('preserves non-sensitive text', () => {
    const result = redactString('Hello World, patient name: Ahmed');
    expect(result).toBe('Hello World, patient name: Ahmed');
  });
});

describe('piiRedactor — redact() objects', () => {
  test('redacts known sensitive key names completely', () => {
    const obj = { password: 'supersecret', username: 'admin' };
    const result = redact(obj);
    expect(result.password).toBe(REDACTED);
    expect(result.username).toBe('admin');
  });

  test('redacts accessToken and refreshToken', () => {
    const obj = { accessToken: 'abc123', refreshToken: 'xyz789' };
    const result = redact(obj);
    expect(result.accessToken).toBe(REDACTED);
    expect(result.refreshToken).toBe(REDACTED);
  });

  test('partially masks email field', () => {
    const obj = { email: 'user@test.com' };
    const result = redact(obj);
    expect(result.email).not.toBe('user@test.com');
    expect(result.email.endsWith('.com')).toBe(true); // last 4 chars kept
  });

  test('partially masks phone', () => {
    const obj = { phone: '0501234567' };
    const result = redact(obj);
    expect(result.phone).toBe('******4567');
  });

  test('partially masks nationalId', () => {
    const obj = { nationalId: '1234567890' };
    const result = redact(obj);
    expect(result.nationalId).toBe('******7890');
  });

  test('handles nested objects recursively', () => {
    const obj = { user: { password: 'secret', name: 'Ali' } };
    const result = redact(obj);
    expect(result.user.password).toBe(REDACTED);
    expect(result.user.name).toBe('Ali');
  });

  test('handles arrays', () => {
    const arr = [{ password: 'a' }, { name: 'test' }];
    const result = redact(arr);
    expect(result[0].password).toBe(REDACTED);
    expect(result[1].name).toBe('test');
  });

  test('handles circular references without crashing', () => {
    const obj = { name: 'test' };
    obj.self = obj;
    const result = redact(obj);
    expect(result.self).toBe('[CIRCULAR]');
  });

  test('returns primitive types as-is', () => {
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBeNull();
  });

  test('redacts iban key', () => {
    const obj = { iban: 'SA1234567890123456789012' };
    const result = redact(obj);
    expect(result.iban).toBe(REDACTED);
  });

  test('SENSITIVE_KEYS set contains expected keys', () => {
    expect(SENSITIVE_KEYS.has('password')).toBe(true);
    expect(SENSITIVE_KEYS.has('accessToken')).toBe(true);
    expect(SENSITIVE_KEYS.has('apiKey')).toBe(true);
    expect(SENSITIVE_KEYS.has('cvv')).toBe(true);
  });

  test('PARTIAL_MASK_KEYS set contains expected keys', () => {
    expect(PARTIAL_MASK_KEYS.has('phone')).toBe(true);
    expect(PARTIAL_MASK_KEYS.has('email')).toBe(true);
    expect(PARTIAL_MASK_KEYS.has('nationalId')).toBe(true);
  });
});
