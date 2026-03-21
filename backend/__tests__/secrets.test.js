/**
 * @file secrets.test.js
 * @description Tests for centralized secret management
 *
 * Source: backend/config/secrets.js (82 lines)
 * Batch 8 — pure env-var resolver, zero external deps
 */

'use strict';

describe('secrets', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    // Reset to clean env state
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.NOTIFICATION_JWT_SECRET;
    delete process.env.ENCRYPTION_KEY;
    delete process.env.HMAC_KEY;
    delete process.env.BACKUP_ENCRYPTION_PASSWORD;
    delete process.env.GPS_ENCRYPTION_KEY;
    delete process.env.SESSION_SECRET;
    delete process.env.FCM_SERVER_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ─── secret() function behaviour ──────────────────────────────────
  describe('secret() resolver function', () => {
    it('should return env var value when present', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'my-production-secret';
      process.env.JWT_REFRESH_SECRET = 'prod-refresh';
      process.env.ENCRYPTION_KEY = 'prod-encrypt';
      process.env.SESSION_SECRET = 'prod-session';
      const secrets = require('../config/secrets');
      expect(secrets.jwtSecret).toBe('my-production-secret');
    });

    it('should return dev fallback in non-production when env var is missing', () => {
      process.env.NODE_ENV = 'test';
      const secrets = require('../config/secrets');
      expect(secrets.jwtSecret).toBe('dev-only-jwt-secret-do-not-use-in-prod');
    });

    it('should throw in production when required secret is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      expect(() => require('../config/secrets')).toThrow(/Missing required env var/);
    });

    it('should NOT throw in production for non-required secrets', () => {
      process.env.NODE_ENV = 'production';
      // Provide all required secrets
      process.env.JWT_SECRET = 'prod-jwt';
      process.env.JWT_REFRESH_SECRET = 'prod-refresh';
      process.env.ENCRYPTION_KEY = 'prod-encrypt';
      process.env.SESSION_SECRET = 'prod-session';
      // Non-required: NOTIFICATION_JWT_SECRET, HMAC_KEY, BACKUP_ENCRYPTION_PASSWORD, GPS_ENCRYPTION_KEY, FCM_SERVER_KEY
      const secrets = require('../config/secrets');
      // Should use fallback for non-required
      expect(secrets.notificationJwtSecret).toBe('dev-only-notification-secret');
    });
  });

  // ─── Exported secrets (test/dev mode) ─────────────────────────────
  describe('exported secrets (dev/test mode)', () => {
    it('should export all 9 expected secrets', () => {
      process.env.NODE_ENV = 'test';
      const secrets = require('../config/secrets');
      const expected = [
        'jwtSecret',
        'jwtRefreshSecret',
        'notificationJwtSecret',
        'encryptionKey',
        'hmacKey',
        'backupEncryptionPassword',
        'gpsEncryptionKey',
        'sessionSecret',
        'fcmServerKey',
      ];
      for (const key of expected) {
        expect(secrets).toHaveProperty(key);
      }
    });

    it('should have stable dev fallback values', () => {
      process.env.NODE_ENV = 'test';
      const secrets = require('../config/secrets');
      expect(secrets.jwtSecret).toContain('dev-only');
      expect(secrets.jwtRefreshSecret).toContain('dev-only');
      expect(secrets.encryptionKey).toContain('dev-only');
      expect(secrets.sessionSecret).toContain('dev-only');
    });

    it('fcmServerKey should fallback to empty string', () => {
      process.env.NODE_ENV = 'test';
      const secrets = require('../config/secrets');
      expect(secrets.fcmServerKey).toBe('');
    });
  });

  // ─── Env var override ─────────────────────────────────────────────
  describe('env var overrides', () => {
    it('should prefer env var over fallback', () => {
      process.env.NODE_ENV = 'test';
      process.env.ENCRYPTION_KEY = 'custom-key';
      const secrets = require('../config/secrets');
      expect(secrets.encryptionKey).toBe('custom-key');
    });

    it('should allow overriding all secrets via env', () => {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'j1';
      process.env.JWT_REFRESH_SECRET = 'j2';
      process.env.NOTIFICATION_JWT_SECRET = 'n1';
      process.env.ENCRYPTION_KEY = 'e1';
      process.env.HMAC_KEY = 'h1';
      process.env.BACKUP_ENCRYPTION_PASSWORD = 'b1';
      process.env.GPS_ENCRYPTION_KEY = 'g1';
      process.env.SESSION_SECRET = 's1';
      process.env.FCM_SERVER_KEY = 'f1';

      const secrets = require('../config/secrets');
      expect(secrets.jwtSecret).toBe('j1');
      expect(secrets.jwtRefreshSecret).toBe('j2');
      expect(secrets.notificationJwtSecret).toBe('n1');
      expect(secrets.encryptionKey).toBe('e1');
      expect(secrets.hmacKey).toBe('h1');
      expect(secrets.backupEncryptionPassword).toBe('b1');
      expect(secrets.gpsEncryptionKey).toBe('g1');
      expect(secrets.sessionSecret).toBe('s1');
      expect(secrets.fcmServerKey).toBe('f1');
    });
  });

  // ─── Production safety ────────────────────────────────────────────
  describe('production safety', () => {
    it('should throw descriptive error with env var name', () => {
      process.env.NODE_ENV = 'production';
      try {
        require('../config/secrets');
        // Should not reach here
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toContain('JWT_SECRET');
        expect(err.message).toContain('production');
      }
    });

    it('should succeed in production when all required secrets are provided', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'prod-secret-1';
      process.env.JWT_REFRESH_SECRET = 'prod-secret-2';
      process.env.ENCRYPTION_KEY = 'prod-secret-3';
      process.env.SESSION_SECRET = 'prod-secret-4';

      expect(() => require('../config/secrets')).not.toThrow();
    });
  });
});
