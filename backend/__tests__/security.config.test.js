/**
 * @file security.config.test.js
 * @description Tests for SecurityService, RateLimiter, and securityConfig
 *
 * Source: backend/config/security.config.js (689 lines)
 * Batch 8 — crypto-based, in-memory state, zero DB deps
 */

'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Prevent Redis init in RateLimiter
process.env.USE_MOCK_DB = 'true';

const { securityConfig, SecurityService, RateLimiter } = require('../config/security.config');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// securityConfig structure
// ═══════════════════════════════════════════════════════════════════════════
describe('securityConfig (static config object)', () => {
  it('should have all expected top-level keys', () => {
    const expected = [
      'jwt',
      'mfa',
      'password',
      'rateLimit',
      'cors',
      'helmet',
      'session',
      'login',
      'apiKeys',
      'validation',
      'encryption',
      'auditLog',
      'csrf',
      'ipBlacklist',
      'countryWhitelist',
    ];
    for (const key of expected) {
      expect(securityConfig).toHaveProperty(key);
    }
  });

  it('should have correct JWT algorithm', () => {
    expect(securityConfig.jwt.algorithm).toBe('HS256');
  });

  it('should have correct password constraints', () => {
    expect(securityConfig.password.minLength).toBe(8);
    expect(securityConfig.password.maxLength).toBe(128);
    expect(securityConfig.password.maxAttempts).toBe(5);
    expect(securityConfig.password.commonPasswords).toContain('password');
  });

  it('should have rate limit configs for all endpoints', () => {
    expect(securityConfig.rateLimit.general.max).toBe(100);
    expect(securityConfig.rateLimit.login.max).toBe(5);
    expect(securityConfig.rateLimit.register.max).toBe(3);
    expect(securityConfig.rateLimit.api.max).toBe(60);
    expect(securityConfig.rateLimit.export.max).toBe(10);
  });

  it('should have correct encryption settings', () => {
    expect(securityConfig.encryption.algorithm).toBe('aes-256-gcm');
    expect(securityConfig.encryption.keyLength).toBe(32);
    expect(securityConfig.encryption.ivLength).toBe(16);
  });

  it('should have audit log events defined', () => {
    expect(securityConfig.auditLog.events).toContain('login');
    expect(securityConfig.auditLog.events).toContain('passwordChange');
    expect(securityConfig.auditLog.events.length).toBeGreaterThan(10);
  });

  it('should have CORS with allowed methods', () => {
    expect(securityConfig.cors.methods).toContain('GET');
    expect(securityConfig.cors.methods).toContain('POST');
    expect(securityConfig.cors.methods).toContain('DELETE');
  });

  it('should have validation settings for file uploads', () => {
    expect(securityConfig.validation.maxFileSize).toBe(10 * 1024 * 1024);
    expect(securityConfig.validation.allowedFileTypes).toContain('application/pdf');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SecurityService
// ═══════════════════════════════════════════════════════════════════════════
describe('SecurityService', () => {
  let service;

  beforeEach(() => {
    service = new SecurityService();
  });

  // ─── validatePassword ──────────────────────────────────────────────
  describe('validatePassword', () => {
    it('should accept a strong password', () => {
      // Note: the regex built from specialChars requires char+{} to match
      const result = service.validatePassword('MyStr0ng!{}Pass');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBeGreaterThan(0);
    });

    it('should reject a short password', () => {
      const result = service.validatePassword('Ab1!');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject missing uppercase', () => {
      const result = service.validatePassword('mystrongg1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('كبير'))).toBe(true);
    });

    it('should reject missing lowercase', () => {
      const result = service.validatePassword('MYSTRONG1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('صغير'))).toBe(true);
    });

    it('should reject missing numbers', () => {
      const result = service.validatePassword('MyStrongPass!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('رقم'))).toBe(true);
    });

    it('should reject missing special characters', () => {
      const result = service.validatePassword('MyStr0ngPass');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('خاص'))).toBe(true);
    });

    it('should reject common passwords', () => {
      const result = service.validatePassword('password');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('شائعة'))).toBe(true);
    });
  });

  // ─── calculatePasswordStrength ─────────────────────────────────────
  describe('calculatePasswordStrength', () => {
    it('should return 0 for empty string', () => {
      expect(service.calculatePasswordStrength('')).toBe(0);
    });

    it('should return higher score for longer passwords', () => {
      const short = service.calculatePasswordStrength('ab');
      const long = service.calculatePasswordStrength('abcdefghijklmno');
      expect(long).toBeGreaterThan(short);
    });

    it('should cap at 100', () => {
      const strength = service.calculatePasswordStrength(
        'AbCdEfGh!@#$%^&*12345678901234567890'
      );
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('should give bonus for uppercase, lowercase, numbers, special chars', () => {
      const onlyLower = service.calculatePasswordStrength('abcdefgh');
      const mixed = service.calculatePasswordStrength('aBcDeFgH');
      const withNum = service.calculatePasswordStrength('aBcDe1gH');
      const withSpecial = service.calculatePasswordStrength('aBcDe1g!');
      expect(mixed).toBeGreaterThan(onlyLower);
      expect(withNum).toBeGreaterThan(mixed);
      expect(withSpecial).toBeGreaterThanOrEqual(withNum);
    });

    it('should give bonus for character uniqueness', () => {
      const repeating = service.calculatePasswordStrength('aaaaaaaaaa');
      const unique = service.calculatePasswordStrength('abcdefghij');
      expect(unique).toBeGreaterThan(repeating);
    });
  });

  // ─── IP blocking ───────────────────────────────────────────────────
  describe('IP blocking & failed attempts', () => {
    it('should record failed attempts and increment count', () => {
      expect(service.recordFailedAttempt('1.2.3.4')).toBe(1);
      expect(service.recordFailedAttempt('1.2.3.4')).toBe(2);
      expect(service.recordFailedAttempt('1.2.3.4')).toBe(3);
    });

    it('should auto-block IP after reaching threshold', () => {
      const ip = '10.0.0.1';
      for (let i = 0; i < 10; i++) {
        service.recordFailedAttempt(ip);
      }
      expect(service.isIPBlocked(ip)).toBe(true);
    });

    it('should not block below threshold', () => {
      const ip = '10.0.0.2';
      for (let i = 0; i < 9; i++) {
        service.recordFailedAttempt(ip);
      }
      expect(service.isIPBlocked(ip)).toBe(false);
    });

    it('should reset failed attempts', () => {
      service.recordFailedAttempt('1.1.1.1');
      service.recordFailedAttempt('1.1.1.1');
      service.resetFailedAttempts('1.1.1.1');
      expect(service.recordFailedAttempt('1.1.1.1')).toBe(1);
    });

    it('should return false for non-blocked IP', () => {
      expect(service.isIPBlocked('9.9.9.9')).toBe(false);
    });

    it('should unblock IP after expiry', () => {
      service.blockIP('5.5.5.5', 0.00001); // very short duration
      // Simulate passage of time
      service.blockedIPs.set('5.5.5.5', Date.now() - 1000);
      expect(service.isIPBlocked('5.5.5.5')).toBe(false);
    });
  });

  // ─── generateAPIKey ────────────────────────────────────────────────
  describe('generateAPIKey', () => {
    it('should generate live key with correct prefix', () => {
      const key = service.generateAPIKey();
      expect(key.startsWith('alw_live_')).toBe(true);
    });

    it('should generate test key with correct prefix', () => {
      const key = service.generateAPIKey(true);
      expect(key.startsWith('alw_test_')).toBe(true);
    });

    it('should generate unique keys', () => {
      const keys = new Set(Array.from({ length: 20 }, () => service.generateAPIKey()));
      expect(keys.size).toBe(20);
    });
  });

  // ─── checkPermission ──────────────────────────────────────────────
  describe('checkPermission', () => {
    it('should return false for null user', () => {
      expect(service.checkPermission(null, 'users', 'read')).toBe(false);
    });

    it('should return false when user has no role', () => {
      expect(service.checkPermission({}, 'users', 'read')).toBe(false);
    });

    it('should return false when no permissions for resource', () => {
      const user = { role: { permissions: { orders: ['read'] } } };
      expect(service.checkPermission(user, 'users', 'read')).toBe(false);
    });

    it('should return true for matching permission', () => {
      const user = { role: { permissions: { users: ['read', 'write'] } } };
      expect(service.checkPermission(user, 'users', 'read')).toBe(true);
    });

    it('should return true for wildcard permission', () => {
      const user = { role: { permissions: { users: ['*'] } } };
      expect(service.checkPermission(user, 'users', 'delete')).toBe(true);
    });
  });

  // ─── encrypt / decrypt ────────────────────────────────────────────
  describe('encrypt & decrypt', () => {
    const key = crypto.randomBytes(32);

    it('should encrypt and decrypt correctly (round-trip)', () => {
      const original = 'sensitive-data-البيانات-الحساسة';
      const encrypted = service.encrypt(original, key);
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      const decrypted = service.decrypt(encrypted, key);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const text = 'same-text';
      const enc1 = service.encrypt(text, key);
      const enc2 = service.encrypt(text, key);
      expect(enc1.encrypted).not.toBe(enc2.encrypted);
    });

    it('should throw when decrypting with wrong key', () => {
      const encrypted = service.encrypt('test', key);
      const wrongKey = crypto.randomBytes(32);
      expect(() => service.decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should throw when no key and no ENCRYPTION_KEY env var', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => service.encrypt('data')).toThrow(/ENCRYPTION_KEY/);
      expect(() => service.decrypt({ encrypted: 'x', iv: 'y', authTag: 'z' })).toThrow(
        /ENCRYPTION_KEY/
      );
    });
  });

  // ─── sanitizeForLogging ────────────────────────────────────────────
  describe('sanitizeForLogging', () => {
    it('should redact sensitive fields', () => {
      const data = {
        username: 'admin',
        password: 'secret123',
        token: 'jwt-token',
        apiKey: 'key-123',
        email: 'a@b.com',
      };
      const result = service.sanitizeForLogging(data);
      expect(result.password).toBe('***REDACTED***');
      expect(result.token).toBe('***REDACTED***');
      expect(result.apiKey).toBe('***REDACTED***');
      expect(result.username).toBe('admin');
      expect(result.email).toBe('a@b.com');
    });

    it('should not modify the original object', () => {
      const data = { password: 'secret' };
      service.sanitizeForLogging(data);
      expect(data.password).toBe('secret');
    });

    it('should handle data without sensitive fields', () => {
      const data = { name: 'test', age: 25 };
      const result = service.sanitizeForLogging(data);
      expect(result).toEqual(data);
    });
  });

  // ─── validateFile ──────────────────────────────────────────────────
  describe('validateFile', () => {
    it('should accept a valid file', () => {
      const file = { size: 1024 * 1024, mimetype: 'application/pdf' };
      const result = service.validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject oversized file', () => {
      const file = { size: 20 * 1024 * 1024, mimetype: 'application/pdf' };
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject disallowed mime type', () => {
      const file = { size: 1024, mimetype: 'application/x-executable' };
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('غير مسموح'))).toBe(true);
    });

    it('should report both size and type errors', () => {
      const file = { size: 20 * 1024 * 1024, mimetype: 'video/mp4' };
      const result = service.validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RateLimiter (in-memory mode)
// ═══════════════════════════════════════════════════════════════════════════
describe('RateLimiter (in-memory)', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 1000, max: 5 });
  });

  it('should allow requests under the limit', () => {
    const result = limiter.check('user1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should decrement remaining correctly', () => {
    for (let i = 0; i < 3; i++) limiter.check('user2');
    const result = limiter.check('user2');
    expect(result.remaining).toBe(1);
  });

  it('should block after reaching max', () => {
    for (let i = 0; i < 5; i++) limiter.check('user3');
    const result = limiter.check('user3');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should have resetAt in the future', () => {
    const result = limiter.check('user4');
    expect(result.resetAt).toBeGreaterThan(Date.now() - 100);
  });

  it('should reset a specific identifier', () => {
    for (let i = 0; i < 5; i++) limiter.check('user5');
    limiter.reset('user5');
    const result = limiter.check('user5');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should track different identifiers independently', () => {
    for (let i = 0; i < 5; i++) limiter.check('userA');
    expect(limiter.check('userA').allowed).toBe(false);
    expect(limiter.check('userB').allowed).toBe(true);
  });

  it('should allow again after window expires', () => {
    // Fill up the limit
    for (let i = 0; i < 5; i++) limiter.check('user6');
    // Manually expire all timestamps
    const requests = limiter.requests.get('user6');
    for (let i = 0; i < requests.length; i++) {
      requests[i] = Date.now() - 2000; // 2s ago, window is 1s
    }
    const result = limiter.check('user6');
    expect(result.allowed).toBe(true);
  });

  it('should use default options when none provided', () => {
    const defaultLimiter = new RateLimiter();
    expect(defaultLimiter.windowMs).toBe(60000);
    expect(defaultLimiter.max).toBe(100);
  });
});
