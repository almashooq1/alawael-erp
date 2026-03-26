/* eslint-disable no-unused-vars */
/**
 * Security Services — Comprehensive Test Suite
 * AlAwael ERP — Jest 29
 *
 * Covers:
 *   A. Rate Limiter         (middleware/rateLimiter.js)
 *   B. Input Sanitization   (middleware/sanitize.js)
 *   C. Encryption Service   (services/encryption-service.js)
 *   D. Password Security    (services/securityService.js — bcrypt helpers)
 *   E. Backup Service       (config/backup.js)
 */

// ─── Top-level mocks (before any require) ──────────────────────────────────

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
}));

jest.mock('../config/redis.config', () => ({
  getRedisClient: jest.fn(() => null),
}));

jest.mock('../config/secrets', () => ({
  jwtSecret: 'test-jwt-secret-32charslong!!!!!',
  jwtRefreshSecret: 'test-refresh-secret-32charslong!',
  notificationJwtSecret: 'test-notif-secret',
  encryptionKey: 'test-encryption-key-32charslong!',
  hmacKey: 'test-hmac-key-32chars-long!!!!!!',
  backupEncryptionPassword: 'test-backup-pw',
  gpsEncryptionKey: 'test-gps-key',
  sessionSecret: 'test-session-secret',
  fcmServerKey: '',
}));

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('express-mongo-sanitize', () => {
  return jest.fn(opts => {
    // Return a middleware that strips keys starting with $ or containing .
    return (req, _res, next) => {
      const sanitize = obj => {
        if (!obj || typeof obj !== 'object') return obj;
        for (const key of Object.keys(obj)) {
          if (key.startsWith('$') || key.includes('.')) {
            if (opts && opts.onSanitize) opts.onSanitize({ req, key });
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            sanitize(obj[key]);
          }
        }
        return obj;
      };
      if (req.body) req.body = sanitize(req.body);
      if (req.query) req.query = sanitize(req.query);
      if (req.params) req.params = sanitize(req.params);
      next();
    };
  });
});

jest.mock('express-xss-sanitizer', () => ({
  xss: jest.fn(() => (req, _res, next) => {
    // Minimal XSS stripping: remove <script> tags from string values
    const strip = obj => {
      if (typeof obj === 'string') return obj.replace(/<script[^>]*>.*?<\/script>/gi, '');
      if (obj && typeof obj === 'object') {
        for (const k of Object.keys(obj)) obj[k] = strip(obj[k]);
      }
      return obj;
    };
    if (req.body) req.body = strip(req.body);
    if (req.query) req.query = strip(req.query);
    next();
  }),
}));

jest.mock('hpp', () => {
  return jest.fn(() => (req, _res, next) => next());
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const buildReqResMocks = (overrides = {}) => {
  const req = {
    method: 'GET',
    path: '/',
    ip: '127.0.0.1',
    headers: {},
    body: {},
    query: {},
    params: {},
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getHeader: jest.fn(() => 60),
  };
  const next = jest.fn();
  return { req, res, next };
};

// ═════════════════════════════════════════════════════════════════════════════
//  A. Rate Limiter
// ═════════════════════════════════════════════════════════════════════════════
describe('Rate Limiter (middleware/rateLimiter)', () => {
  let rateLimiter;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require so NODE_ENV changes take effect
    jest.isolateModules(() => {
      rateLimiter = require('../middleware/rateLimiter');
    });
  });

  it('should export generalLimiter as a function', () => {
    expect(typeof rateLimiter.generalLimiter).toBe('function');
  });

  it('should export loginLimiter as a function', () => {
    expect(typeof rateLimiter.loginLimiter).toBe('function');
  });

  it('should export registerLimiter as a function', () => {
    expect(typeof rateLimiter.registerLimiter).toBe('function');
  });

  it('should export apiLimiter as a function', () => {
    expect(typeof rateLimiter.apiLimiter).toBe('function');
  });

  it('should export exportLimiter as a function', () => {
    expect(typeof rateLimiter.exportLimiter).toBe('function');
  });

  it('should export sensitiveOperationLimiter as a function', () => {
    expect(typeof rateLimiter.sensitiveOperationLimiter).toBe('function');
  });

  it('createCustomLimiter should return a middleware function', () => {
    const limiter = rateLimiter.createCustomLimiter({ max: 10, windowMs: 5000 });
    expect(typeof limiter).toBe('function');
  });

  it('userBasedLimiter should return a middleware function', () => {
    const limiter = rateLimiter.userBasedLimiter(50, 30000);
    expect(typeof limiter).toBe('function');
  });

  it('roleBasedLimiter should delegate to correct role limiter', () => {
    const mw = rateLimiter.roleBasedLimiter({
      admin: { max: 200, windowMs: 60000 },
      user: { max: 50, windowMs: 60000 },
    });
    // When no user role, should just call next()
    const { req, res, next } = buildReqResMocks();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('checkLimit should return allowed=true for unknown type', () => {
    const result = rateLimiter.checkLimit('nonexistent', '1.2.3.4');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it('checkLimit should return an object with allowed, remaining, resetAt', () => {
    const result = rateLimiter.checkLimit('general', '10.0.0.1');
    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('resetAt');
  });

  it('resetLimiter should not throw for valid type', () => {
    expect(() => rateLimiter.resetLimiter('general', '10.0.0.1')).not.toThrow();
  });

  it('resetLimiter should not throw for unknown type', () => {
    expect(() => rateLimiter.resetLimiter('bogus', '10.0.0.1')).not.toThrow();
  });

  it('adaptiveLimiter should return a middleware function', () => {
    const limiter = rateLimiter.adaptiveLimiter(100, 60000);
    expect(typeof limiter).toBe('function');
  });

  it('backward-compat alias authLimiter = loginLimiter', () => {
    expect(rateLimiter.authLimiter).toBe(rateLimiter.loginLimiter);
  });

  it('backward-compat alias createAccountLimiter = registerLimiter', () => {
    expect(rateLimiter.createAccountLimiter).toBe(rateLimiter.registerLimiter);
  });

  it('passwordLimiter should be a function', () => {
    expect(typeof rateLimiter.passwordLimiter).toBe('function');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  B. Input Sanitization
// ═════════════════════════════════════════════════════════════════════════════
describe('Input Sanitization (middleware/sanitize)', () => {
  let sanitizeInput;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      sanitizeInput = require('../middleware/sanitize');
    });
  });

  const runMiddlewareChain = async (middlewares, req, res) => {
    for (const mw of middlewares) {
      await new Promise((resolve, reject) => {
        mw(req, res, err => (err ? reject(err) : resolve()));
      });
    }
  };

  it('should export an array of middleware functions', () => {
    expect(Array.isArray(sanitizeInput)).toBe(true);
    expect(sanitizeInput.length).toBe(3); // mongoSanitize, xss, hpp
    sanitizeInput.forEach(mw => expect(typeof mw).toBe('function'));
  });

  it('should strip XSS from request body', async () => {
    const { req, res } = buildReqResMocks({
      body: { name: 'hello<script>alert(1)</script>world' },
    });
    await runMiddlewareChain(sanitizeInput, req, res);
    expect(req.body.name).not.toContain('<script>');
    expect(req.body.name).toContain('hello');
    expect(req.body.name).toContain('world');
  });

  it('should strip XSS from query params', async () => {
    const { req, res } = buildReqResMocks({
      query: { search: '<script>alert("xss")</script>safe' },
    });
    await runMiddlewareChain(sanitizeInput, req, res);
    expect(req.query.search).not.toContain('<script>');
    expect(req.query.search).toContain('safe');
  });

  it('should remove NoSQL injection keys ($gt) from body', async () => {
    const { req, res } = buildReqResMocks({
      body: { email: 'test@test.com', $gt: '' },
    });
    await runMiddlewareChain(sanitizeInput, req, res);
    expect(req.body.$gt).toBeUndefined();
    expect(req.body.email).toBe('test@test.com');
  });

  it('should remove dot-notation NoSQL injection from body', async () => {
    const { req, res } = buildReqResMocks({
      body: { 'password.gt': 'injected' },
    });
    await runMiddlewareChain(sanitizeInput, req, res);
    expect(req.body['password.gt']).toBeUndefined();
  });

  it('should leave safe body data untouched', async () => {
    const { req, res } = buildReqResMocks({
      body: { name: 'Ahmad', age: 25, active: true },
    });
    await runMiddlewareChain(sanitizeInput, req, res);
    expect(req.body).toEqual({ name: 'Ahmad', age: 25, active: true });
  });

  it('should handle empty body gracefully', async () => {
    const { req, res } = buildReqResMocks({ body: {} });
    await expect(runMiddlewareChain(sanitizeInput, req, res)).resolves.toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  C. Encryption Service
// ═════════════════════════════════════════════════════════════════════════════
describe('Encryption Service (services/encryption-service)', () => {
  let encryptionService;

  beforeAll(() => {
    jest.isolateModules(() => {
      encryptionService = require('../services/encryption-service');
    });
  });

  beforeEach(() => jest.clearAllMocks());

  // ── encrypt / decrypt round-trip ──
  it('should encrypt and decrypt a string round-trip', () => {
    const plaintext = 'Hello, AlAwael!';
    const encrypted = encryptionService.encrypt(plaintext);

    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('encryptedData');
    expect(encrypted).toHaveProperty('authTag');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.encryptedData).toBe('string');

    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt and decrypt an object round-trip', () => {
    const data = { user: 'admin', role: 'superuser', id: 42 };
    const encrypted = encryptionService.encrypt(data);
    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toEqual(data);
  });

  it('should produce different ciphertext for same plaintext (IV randomization)', () => {
    const plaintext = 'deterministic test';
    const a = encryptionService.encrypt(plaintext);
    const b = encryptionService.encrypt(plaintext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.encryptedData).not.toBe(b.encryptedData);
  });

  it('should throw when decrypting with tampered authTag', () => {
    const encrypted = encryptionService.encrypt('tamper test');
    encrypted.authTag = 'ff'.repeat(16); // wrong tag
    expect(() => encryptionService.decrypt(encrypted)).toThrow();
  });

  it('should throw when decrypting with tampered IV', () => {
    const encrypted = encryptionService.encrypt('iv tamper');
    encrypted.iv = 'aa'.repeat(16); // wrong IV
    expect(() => encryptionService.decrypt(encrypted)).toThrow();
  });

  it('should throw when decrypting with tampered ciphertext', () => {
    const encrypted = encryptionService.encrypt('cipher tamper');
    encrypted.encryptedData = 'deadbeef' + encrypted.encryptedData.slice(8);
    expect(() => encryptionService.decrypt(encrypted)).toThrow();
  });

  // ── hashPassword / verifyPassword ──
  it('should hash a password with salt (pbkdf2)', () => {
    const hashed = encryptionService.hashPassword('MyP@ss123');
    expect(typeof hashed).toBe('string');
    expect(hashed).toContain('.'); // salt.hash format
    const [salt, hash] = hashed.split('.');
    expect(salt.length).toBeGreaterThan(0);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should produce different hashes for the same password', () => {
    const h1 = encryptionService.hashPassword('SamePass!');
    const h2 = encryptionService.hashPassword('SamePass!');
    expect(h1).not.toBe(h2); // different salts
  });

  it('should verify a correct password', () => {
    const password = 'CorrectHorse!1';
    const hashed = encryptionService.hashPassword(password);
    expect(encryptionService.verifyPassword(password, hashed)).toBe(true);
  });

  it('should reject an incorrect password', () => {
    const hashed = encryptionService.hashPassword('Right1!');
    expect(encryptionService.verifyPassword('Wrong2@', hashed)).toBe(false);
  });

  // ── generateToken ──
  it('should generate a hex token of default length', () => {
    const token = encryptionService.generateToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes → 64 hex chars
  });

  it('should generate tokens of custom length', () => {
    const token = encryptionService.generateToken(16);
    expect(token.length).toBe(32); // 16 bytes → 32 hex chars
  });

  it('should generate unique tokens', () => {
    const t1 = encryptionService.generateToken();
    const t2 = encryptionService.generateToken();
    expect(t1).not.toBe(t2);
  });

  // ── PII encryption ──
  it('should encrypt PII fields and leave others intact', () => {
    const pii = { email: 'a@b.com', phone: '+123', name: 'Ahmad' };
    const encrypted = encryptionService.encryptPII(pii);
    // email and phone should be encrypted objects
    expect(typeof encrypted.email).toBe('object');
    expect(encrypted.email).toHaveProperty('iv');
    expect(typeof encrypted.phone).toBe('object');
    // name is not in fieldsToEncrypt, stays as-is
    expect(encrypted.name).toBe('Ahmad');
  });

  it('should decrypt PII fields round-trip', () => {
    const pii = { email: 'test@example.com', phone: '+9665551234' };
    const encrypted = encryptionService.encryptPII(pii);
    const decrypted = encryptionService.decryptPII(encrypted);
    expect(decrypted.email).toBe('test@example.com');
    expect(decrypted.phone).toBe('+9665551234');
  });

  // ── HMAC ──
  it('should create a deterministic HMAC for the same data', () => {
    const hmac1 = encryptionService.createHMAC({ a: 1 });
    const hmac2 = encryptionService.createHMAC({ a: 1 });
    expect(hmac1).toBe(hmac2);
  });

  it('should create different HMACs for different data', () => {
    const h1 = encryptionService.createHMAC({ a: 1 });
    const h2 = encryptionService.createHMAC({ a: 2 });
    expect(h1).not.toBe(h2);
  });

  it('should verify correct HMAC', () => {
    const data = { important: true };
    const sig = encryptionService.createHMAC(data);
    expect(encryptionService.verifyHMAC(data, sig)).toBe(true);
  });

  it('should reject incorrect HMAC', () => {
    const data = { important: true };
    const sig = encryptionService.createHMAC(data);
    // Tamper one character — same length so timingSafeEqual returns false
    const bad = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1);
    const result = encryptionService.verifyHMAC(data, bad);
    expect(result).toBe(false);
  });

  // ── RSA Key Pair ──
  it('should generate an RSA key pair (4096-bit)', () => {
    const { publicKey, privateKey } = encryptionService.generateKeyPair();
    expect(publicKey).toContain('BEGIN PUBLIC KEY');
    expect(privateKey).toContain('BEGIN PRIVATE KEY');
  });

  // ── RSA file encrypt/decrypt ──
  it('should encrypt and decrypt data with RSA key pair', () => {
    const { publicKey, privateKey } = encryptionService.generateKeyPair();
    const original = 'Sensitive file data';
    const encrypted = encryptionService.encryptFileWithRSA(original, publicKey);
    expect(Buffer.isBuffer(encrypted)).toBe(true);
    const decrypted = encryptionService.decryptFileWithRSA(encrypted, privateKey);
    expect(decrypted.toString()).toBe(original);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  D. Password Security (securityService — private helpers)
// ═════════════════════════════════════════════════════════════════════════════
describe('Password Security (SecurityService policy validation)', () => {
  let SecurityService;

  beforeAll(() => {
    // We need to mock mongoose models used inside securityService
    jest.isolateModules(() => {
      // Provide minimal mongoose model stubs so the module loads
      jest.doMock('mongoose', () => {
        const actualMongoose = jest.requireActual('mongoose');
        const stubModel = name => {
          // Return a fake model constructor with static methods
          const M = function () {};
          M.modelName = name;
          M.find = jest
            .fn()
            .mockReturnValue({
              sort: jest
                .fn()
                .mockReturnValue({
                  skip: jest
                    .fn()
                    .mockReturnValue({
                      limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
                    }),
                }),
            });
          M.findById = jest.fn().mockResolvedValue(null);
          M.findOne = jest.fn().mockResolvedValue(null);
          M.findOneAndUpdate = jest.fn().mockResolvedValue({});
          M.countDocuments = jest.fn().mockResolvedValue(0);
          M.create = jest.fn().mockResolvedValue({ toObject: () => ({}) });
          M.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
          M.aggregate = jest.fn().mockResolvedValue([]);
          M.schema = new actualMongoose.Schema({});
          return M;
        };
        return {
          ...actualMongoose,
          models: {},
          model: jest.fn(name => stubModel(name)),
        };
      });

      jest.doMock('../models/User', () => {
        const M = function () {};
        M.findById = jest.fn().mockResolvedValue(null);
        M.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
        M.countDocuments = jest.fn().mockResolvedValue(0);
        return M;
      });
      jest.doMock('../models/Session', () => {
        const M = function () {};
        M.find = jest
          .fn()
          .mockReturnValue({
            sort: jest
              .fn()
              .mockReturnValue({
                skip: jest
                  .fn()
                  .mockReturnValue({
                    limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
                  }),
              }),
          });
        M.findOne = jest.fn().mockResolvedValue(null);
        M.countDocuments = jest.fn().mockResolvedValue(0);
        M.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
        return M;
      });
      jest.doMock('../models/securityLog.model', () => {
        const M = function () {};
        M.find = jest
          .fn()
          .mockReturnValue({
            sort: jest
              .fn()
              .mockReturnValue({
                skip: jest
                  .fn()
                  .mockReturnValue({
                    limit: jest
                      .fn()
                      .mockReturnValue({
                        populate: jest
                          .fn()
                          .mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
                      }),
                  }),
              }),
          });
        M.findOne = jest.fn().mockResolvedValue(null);
        M.countDocuments = jest.fn().mockResolvedValue(0);
        M.create = jest.fn().mockResolvedValue({});
        M.aggregate = jest.fn().mockResolvedValue([]);
        return M;
      });

      ({ SecurityService } = require('../services/securityService'));
    });
  });

  beforeEach(() => jest.clearAllMocks());

  // Access the private helper via prototype
  const validate = (password, policy) => {
    const svc = new SecurityService();
    return svc._validatePasswordPolicy(password, policy);
  };

  const defaultPolicy = {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
  };

  it('should accept a strong password meeting all criteria', () => {
    expect(() => validate('Str0ng!Pass', defaultPolicy)).not.toThrow();
  });

  it('should reject a password shorter than minLength', () => {
    expect(() => validate('Ab1!', defaultPolicy)).toThrow();
  });

  it('should reject password missing uppercase', () => {
    expect(() => validate('nouppercase1!', defaultPolicy)).toThrow();
  });

  it('should reject password missing lowercase', () => {
    expect(() => validate('NOLOWERCASE1!', defaultPolicy)).toThrow();
  });

  it('should reject password missing numbers', () => {
    expect(() => validate('NoNumbers!!A', defaultPolicy)).toThrow();
  });

  it('should reject password missing special characters', () => {
    expect(() => validate('NoSpecial1A', defaultPolicy)).toThrow();
  });

  it('should pass when policy does not require uppercase', () => {
    const policy = { ...defaultPolicy, passwordRequireUppercase: false };
    expect(() => validate('noupperbut1!', policy)).not.toThrow();
  });

  it('should respect custom minLength', () => {
    const policy = { ...defaultPolicy, passwordMinLength: 12 };
    expect(() => validate('Sh0rt!', policy)).toThrow();
    expect(() => validate('LongEnoughPa$$1', policy)).not.toThrow();
  });

  it('_generateBackupCodes should produce unique codes', () => {
    const svc = new SecurityService();
    const codes = svc._generateBackupCodes(8);
    expect(codes.length).toBe(8);
    expect(new Set(codes).size).toBe(8); // all unique
    codes.forEach(c => {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    });
  });

  it('_mapActionToEventType should categorize login actions', () => {
    const svc = new SecurityService();
    expect(svc._mapActionToEventType('login_success')).toBe('login');
    expect(svc._mapActionToEventType('auth_failed')).toBe('login');
  });

  it('_mapActionToEventType should categorize logout actions', () => {
    const svc = new SecurityService();
    expect(svc._mapActionToEventType('logout')).toBe('logout');
  });

  it('_mapActionToEventType should categorize password/mfa actions', () => {
    const svc = new SecurityService();
    expect(svc._mapActionToEventType('password_changed')).toBe('modification');
    expect(svc._mapActionToEventType('mfa_enabled')).toBe('modification');
  });

  it('_mapActionToEventType should categorize deletion actions', () => {
    const svc = new SecurityService();
    expect(svc._mapActionToEventType('delete_user')).toBe('deletion');
  });

  it('_mapActionToEventType should return access for unknown actions', () => {
    const svc = new SecurityService();
    expect(svc._mapActionToEventType('unknown_action')).toBe('access');
  });

  it('_calculateSecurityScore should return 100 for perfect metrics', () => {
    const svc = new SecurityService();
    const score = svc._calculateSecurityScore({
      totalUsers: 10,
      mfaEnabledUsers: 10,
      failedLogins24h: 0,
      criticalEvents: 0,
    });
    expect(score).toBe(100);
  });

  it('_calculateSecurityScore should penalize low MFA adoption', () => {
    const svc = new SecurityService();
    const score = svc._calculateSecurityScore({
      totalUsers: 100,
      mfaEnabledUsers: 10, // 10% — below 50%
      failedLogins24h: 0,
      criticalEvents: 0,
    });
    expect(score).toBeLessThan(100);
  });

  it('_calculateSecurityScore should penalize many failed logins', () => {
    const svc = new SecurityService();
    const score = svc._calculateSecurityScore({
      totalUsers: 10,
      mfaEnabledUsers: 10,
      failedLogins24h: 25,
      criticalEvents: 0,
    });
    expect(score).toBeLessThan(100);
  });

  it('_calculateSecurityScore should never go below 0', () => {
    const svc = new SecurityService();
    const score = svc._calculateSecurityScore({
      totalUsers: 100,
      mfaEnabledUsers: 0,
      failedLogins24h: 100,
      criticalEvents: 100,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  E. Backup Service
// ═════════════════════════════════════════════════════════════════════════════
describe('Backup Service (config/backup)', () => {
  const fs = require('fs');
  const path = require('path');
  const { execFile } = require('child_process');

  let backup;
  let BACKUP_DIR;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.isolateModules(() => {
      backup = require('../config/backup');
    });
    BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'config', '..', 'backups');
  });

  // ── ensureBackupDir ──
  it('should create backup directory if it does not exist', () => {
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    backup.ensureBackupDir();
    expect(mkdirSpy).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    existsSpy.mockRestore();
    mkdirSpy.mockRestore();
  });

  it('should not create directory if it already exists', () => {
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    backup.ensureBackupDir();
    expect(mkdirSpy).not.toHaveBeenCalled();
    existsSpy.mockRestore();
    mkdirSpy.mockRestore();
  });

  // ── backupMongoDB ──
  it('should call execFile with mongodump and resolve with backup path', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    execFile.mockImplementation((_cmd, _args, cb) => cb(null, 'ok', ''));

    const result = await backup.backupMongoDB();
    expect(execFile).toHaveBeenCalledWith(
      'mongodump',
      expect.arrayContaining(['--gzip']),
      expect.any(Function)
    );
    expect(typeof result).toBe('string');
    expect(result).toContain('mongodb-backup-');
    expect(result).toContain('.gz');
  });

  it('should reject when mongodump fails', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    execFile.mockImplementation((_cmd, _args, cb) => cb(new Error('mongodump not found')));

    await expect(backup.backupMongoDB()).rejects.toThrow('mongodump not found');
  });

  it('backup file name should include a timestamp', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    execFile.mockImplementation((_cmd, _args, cb) => cb(null, '', ''));

    const result = await backup.backupMongoDB();
    // Timestamp format: YYYY-MM-DDTHH-MM-SS-mmmZ → contains year
    expect(result).toMatch(/mongodb-backup-\d{4}-\d{2}-\d{2}/);
  });

  // ── cleanOldBackups ──
  it('should delete files older than retention period', () => {
    const now = Date.now();
    const oldTime = now - 10 * 24 * 60 * 60 * 1000; // 10 days ago
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['old-backup.gz']);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: oldTime });
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    backup.cleanOldBackups();
    expect(unlinkSpy).toHaveBeenCalledTimes(1);
  });

  it('should keep files within retention period', () => {
    const now = Date.now();
    const recentTime = now - 1 * 24 * 60 * 60 * 1000; // 1 day ago
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['recent-backup.gz']);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: recentTime });
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    backup.cleanOldBackups();
    expect(unlinkSpy).not.toHaveBeenCalled();
  });

  it('should handle empty backup directory', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    backup.cleanOldBackups();
    expect(unlinkSpy).not.toHaveBeenCalled();
  });

  it('should delete multiple old files', () => {
    const old = Date.now() - 15 * 24 * 60 * 60 * 1000;
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readdirSync').mockReturnValue(['a.gz', 'b.gz', 'c.gz']);
    jest.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: old });
    const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    backup.cleanOldBackups();
    expect(unlinkSpy).toHaveBeenCalledTimes(3);
  });

  // ── scheduleBackups ──
  it('should not schedule when ENABLE_AUTO_BACKUP is not set', () => {
    const orig = process.env.ENABLE_AUTO_BACKUP;
    delete process.env.ENABLE_AUTO_BACKUP;
    const spy = jest.spyOn(global, 'setInterval');
    backup.scheduleBackups();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    if (orig) process.env.ENABLE_AUTO_BACKUP = orig;
  });

  it('should export all expected functions', () => {
    expect(typeof backup.backupMongoDB).toBe('function');
    expect(typeof backup.cleanOldBackups).toBe('function');
    expect(typeof backup.scheduleBackups).toBe('function');
    expect(typeof backup.ensureBackupDir).toBe('function');
  });
});
