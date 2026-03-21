/**
 * fieldEncryption — Unit Tests
 * اختبارات وحدة لتشفير وفك تشفير الحقول
 */
const { encrypt, decrypt, isEncrypted } = require('../utils/fieldEncryption');

/* Save and restore env */
const ORIGINAL_ENV = process.env.DATA_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.DATA_ENCRYPTION_KEY = 'test-key-for-unit-tests-32chars!';
});

afterAll(() => {
  if (ORIGINAL_ENV !== undefined) {
    process.env.DATA_ENCRYPTION_KEY = ORIGINAL_ENV;
  } else {
    delete process.env.DATA_ENCRYPTION_KEY;
  }
});

/* ═══════════════ isEncrypted ═══════════════ */
describe('isEncrypted', () => {
  test('detects encrypted value (enc: prefix)', () => {
    expect(isEncrypted('enc:abcdef1234:encrypted:tag')).toBe(true);
  });

  test('returns false for plain string', () => {
    expect(isEncrypted('hello world')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isEncrypted('')).toBe(false);
  });

  test('returns false for number', () => {
    expect(isEncrypted(123)).toBe(false);
  });

  test('returns false for null', () => {
    expect(isEncrypted(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isEncrypted(undefined)).toBe(false);
  });
});

/* ═══════════════ encrypt ═══════════════ */
describe('encrypt', () => {
  test('encrypts a string and adds enc: prefix', () => {
    const result = encrypt('سري جداً');
    expect(typeof result).toBe('string');
    expect(result.startsWith('enc:')).toBe(true);
  });

  test('returns null for null input', () => {
    expect(encrypt(null)).toBeNull();
  });

  test('returns undefined for undefined input', () => {
    expect(encrypt(undefined)).toBeUndefined();
  });

  test('does not double-encrypt already encrypted value', () => {
    const first = encrypt('test data');
    const second = encrypt(first);
    expect(second).toBe(first); // same value, no double-encrypt
  });

  test('produces different ciphertext each time (random IV)', () => {
    const a = encrypt('same data');
    const b = encrypt('same data');
    expect(a).not.toBe(b); // different IV = different output
  });

  test('encrypts non-string values (stringified)', () => {
    const result = encrypt(42);
    expect(result.startsWith('enc:')).toBe(true);
  });

  test('encrypts objects (JSON stringified)', () => {
    const result = encrypt({ key: 'value' });
    expect(result.startsWith('enc:')).toBe(true);
  });
});

/* ═══════════════ decrypt ═══════════════ */
describe('decrypt', () => {
  test('decrypts an encrypted string back to plaintext', () => {
    const original = 'بيانات سرية';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test('round-trips Arabic text', () => {
    const original = 'محمد بن عبدالله الأحمدي - 1044567890';
    expect(decrypt(encrypt(original))).toBe(original);
  });

  test('round-trips empty string', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  test('round-trips long text', () => {
    const long = 'أ'.repeat(10000);
    expect(decrypt(encrypt(long))).toBe(long);
  });

  test('round-trips objects (parsed back from JSON)', () => {
    const obj = { name: 'أحمد', age: 30 };
    const encrypted = encrypt(obj);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(obj);
  });

  test('returns plain value for non-encrypted input', () => {
    expect(decrypt('plain text')).toBe('plain text');
  });

  test('returns null for null input', () => {
    // decrypt returns value as-is if not encrypted
    expect(decrypt(null)).toBeNull();
  });

  test('handles tampered ciphertext gracefully', () => {
    const encrypted = encrypt('test');
    const tampered = encrypted.slice(0, -4) + 'xxxx';
    // Should return tampered value (graceful failure)
    const result = decrypt(tampered);
    expect(result).toBeDefined();
  });

  test('handles malformed enc: prefix gracefully', () => {
    const result = decrypt('enc:not-valid-format');
    expect(result).toBeDefined(); // returns as-is
  });
});

/* ═══════════════ Without encryption key ═══════════════ */
describe('without DATA_ENCRYPTION_KEY', () => {
  beforeAll(() => {
    delete process.env.DATA_ENCRYPTION_KEY;
  });

  afterAll(() => {
    process.env.DATA_ENCRYPTION_KEY = 'test-key-for-unit-tests-32chars!';
  });

  test('encrypt returns plaintext when no key', () => {
    const result = encrypt('sensitive data');
    expect(result).toBe('sensitive data');
    expect(isEncrypted(result)).toBe(false);
  });

  test('decrypt returns encrypted value as-is when no key', () => {
    // First encrypt with key
    process.env.DATA_ENCRYPTION_KEY = 'test-key-for-unit-tests-32chars!';
    const encrypted = encrypt('test');
    delete process.env.DATA_ENCRYPTION_KEY;

    // Try to decrypt without key - should return as-is
    const result = decrypt(encrypted);
    expect(result).toBe(encrypted);
  });
});
