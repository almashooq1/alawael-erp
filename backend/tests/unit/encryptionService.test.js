/**
 * Unit tests for services/EncryptionService.js
 * EncryptionService — Singleton (module.exports = new EncryptionService())
 * Pure logic — No DB dependencies (crypto + bcryptjs)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockCompare = jest.fn();
const mockBcryptHash = jest.fn();
const mockGenSalt = jest.fn();

jest.mock('bcryptjs', () => ({
  compare: (...a) => mockCompare(...a),
  hash: (...a) => mockBcryptHash(...a),
  genSalt: (...a) => mockGenSalt(...a),
}));

// Set required env before loading service
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex
process.env.JWT_SECRET = 'test-jwt-secret';

const service = require('../../services/EncryptionService');

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('EncryptionService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── hashPassword / verifyPassword ────────────────────────────────

  describe('hashPassword', () => {
    it('hashes password with bcrypt salt rounds 12', async () => {
      mockGenSalt.mockResolvedValue('salt12');
      mockBcryptHash.mockResolvedValue('$2a$hashed');

      const result = await service.hashPassword('secret');

      expect(mockGenSalt).toHaveBeenCalledWith(12);
      expect(mockBcryptHash).toHaveBeenCalledWith('secret', 'salt12');
      expect(result).toBe('$2a$hashed');
    });
  });

  describe('verifyPassword', () => {
    it('returns true for matching password', async () => {
      mockCompare.mockResolvedValue(true);
      expect(await service.verifyPassword('secret', '$2a$hashed')).toBe(true);
    });

    it('returns false for non-matching password', async () => {
      mockCompare.mockResolvedValue(false);
      expect(await service.verifyPassword('wrong', '$2a$hashed')).toBe(false);
    });
  });

  // ── encryptData / decryptData ────────────────────────────────────

  describe('encryptData', () => {
    it('encrypts string and returns iv:encrypted format', () => {
      const encrypted = service.encryptData('hello world');
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toContain(':');
    });

    it('encrypts object via JSON.stringify', () => {
      const encrypted = service.encryptData({ key: 'value' });
      expect(encrypted).toContain(':');
    });

    it('handles empty string', () => {
      const encrypted = service.encryptData('');
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decryptData', () => {
    it('roundtrips string data', () => {
      const original = 'sensitive information';
      const encrypted = service.encryptData(original);
      expect(service.decryptData(encrypted)).toBe(original);
    });

    it('roundtrips object data', () => {
      const obj = { name: 'Ahmed', age: 30 };
      const encrypted = service.encryptData(obj);
      const decrypted = service.decryptData(encrypted);
      expect(decrypted).toEqual(obj);
    });

    it('roundtrips unicode data', () => {
      const original = 'بيانات حساسة عربية';
      const encrypted = service.encryptData(original);
      expect(service.decryptData(encrypted)).toBe(original);
    });

    it('throws for malformed input', () => {
      expect(() => service.decryptData('not-valid')).toThrow();
    });
  });

  // ── encryptSensitiveFields / decryptSensitiveFields ──────────────

  describe('encryptSensitiveFields', () => {
    it('creates field_encrypted keys and removes originals', () => {
      const data = { name: 'Ahmed', phone: '0555', email: 'a@b.c' };
      const result = service.encryptSensitiveFields(data, ['phone', 'email']);

      expect(result.name).toBe('Ahmed'); // untouched
      expect(result.phone).toBeUndefined(); // deleted
      expect(result.phone_encrypted).toContain(':'); // encrypted
      expect(result.email).toBeUndefined();
      expect(result.email_encrypted).toContain(':');
    });

    it('skips falsy fields', () => {
      const data = { name: 'X', phone: null, email: '' };
      const result = service.encryptSensitiveFields(data, ['phone', 'email']);
      expect(result.phone).toBeNull(); // untouched (falsy)
      expect(result.phone_encrypted).toBeUndefined();
    });
  });

  describe('decryptSensitiveFields', () => {
    it('roundtrips encrypted fields', () => {
      const data = { name: 'Ahmed', ssn: '123456' };
      const encrypted = service.encryptSensitiveFields(data, ['ssn']);
      const decrypted = service.decryptSensitiveFields(encrypted, ['ssn']);
      expect(String(decrypted.ssn)).toBe('123456');
      expect(decrypted.ssn_encrypted).toBeUndefined();
      expect(decrypted.name).toBe('Ahmed');
    });
  });

  // ── generateEncryptedAPIKey / verifyAPIKey / hashAPIKey ──────────

  describe('generateEncryptedAPIKey', () => {
    it('returns apiKey, keyHash, and displayKey', () => {
      const result = service.generateEncryptedAPIKey('user1', ['read', 'write']);
      expect(result.apiKey).toBeDefined();
      expect(result.keyHash).toBeDefined();
      expect(result.displayKey).toContain('...');
    });
  });

  describe('verifyAPIKey', () => {
    it('verifies matching API key against stored hash', () => {
      const { apiKey, keyHash } = service.generateEncryptedAPIKey('u1', ['read']);
      expect(service.verifyAPIKey(apiKey, keyHash)).toBe(true);
    });

    it('rejects wrong API key', () => {
      const stored = service.hashAPIKey('real-key');
      expect(service.verifyAPIKey('fake-key', stored)).toBe(false);
    });
  });

  describe('hashAPIKey', () => {
    it('returns deterministic sha256 hash', () => {
      const h1 = service.hashAPIKey('test-key');
      const h2 = service.hashAPIKey('test-key');
      expect(h1).toBe(h2);
    });

    it('differs for different keys', () => {
      expect(service.hashAPIKey('key-a')).not.toBe(service.hashAPIKey('key-b'));
    });
  });

  // ── encryptPersonalData / decryptPersonalData ────────────────────

  describe('encryptPersonalData', () => {
    it('encrypts only PII fields (ssn, nationalId, birthDate, bankAccountNumber, creditCardNumber)', () => {
      const info = {
        name: 'Ahmed',
        nationalId: '1234567890',
        phone: '0555123456',
      };
      const result = service.encryptPersonalData(info);

      // nationalId is in the encrypted-field list
      expect(result.nationalId).toBeUndefined();
      expect(result.nationalId_encrypted).toContain(':');
      // phone is NOT in the list — stays as is
      expect(result.phone).toBe('0555123456');
      // name stays
      expect(result.name).toBe('Ahmed');
    });
  });

  describe('decryptPersonalData', () => {
    it('roundtrips personal data', () => {
      const info = { nationalId: '1234567890', ssn: 'SSN123', name: 'Ahmed' };
      const encrypted = service.encryptPersonalData(info);
      const decrypted = service.decryptPersonalData(encrypted);

      expect(String(decrypted.nationalId)).toBe('1234567890');
      expect(decrypted.ssn).toBe('SSN123');
      expect(decrypted.name).toBe('Ahmed');
    });
  });

  // ── encryptRefreshToken / decryptRefreshToken ────────────────────

  describe('encryptRefreshToken', () => {
    it('encrypts token string', () => {
      expect(service.encryptRefreshToken('refresh-token-value')).toContain(':');
    });
  });

  describe('decryptRefreshToken', () => {
    it('roundtrips refresh token', () => {
      const token = 'my-refresh-token-12345';
      const enc = service.encryptRefreshToken(token);
      expect(service.decryptRefreshToken(enc)).toBe(token);
    });
  });

  // ── createHash / verifyHash ──────────────────────────────────────

  describe('createHash', () => {
    it('creates deterministic hash', () => {
      expect(service.createHash('data')).toBe(service.createHash('data'));
    });

    it('differs for different data', () => {
      expect(service.createHash('a')).not.toBe(service.createHash('b'));
    });
  });

  describe('verifyHash', () => {
    it('returns true for matching data', () => {
      const hash = service.createHash('mydata');
      expect(service.verifyHash('mydata', hash)).toBe(true);
    });

    it('returns false for different data', () => {
      const hash = service.createHash('mydata');
      expect(service.verifyHash('other', hash)).toBe(false);
    });
  });

  // ── generateSecureToken ──────────────────────────────────────────

  describe('generateSecureToken', () => {
    it('generates default 32-byte hex token (64 chars)', () => {
      const token = service.generateSecureToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
    });

    it('generates custom-length token', () => {
      expect(service.generateSecureToken(16).length).toBe(32);
    });
  });

  // ── generateVerificationCode ─────────────────────────────────────

  describe('generateVerificationCode', () => {
    it('generates 6-digit code by default', () => {
      const code = service.generateVerificationCode();
      expect(code.length).toBe(6);
      expect(/^\d+$/.test(code)).toBe(true);
    });

    it('generates custom-length code', () => {
      expect(service.generateVerificationCode(4).length).toBe(4);
    });
  });

  // ── getEncryptionInfo ────────────────────────────────────────────

  describe('getEncryptionInfo', () => {
    it('returns algorithm, keySize, ivLength, and status ACTIVE', () => {
      const info = service.getEncryptionInfo();
      expect(info.algorithm).toBe('aes-256-cbc');
      expect(info.ivLength).toBe(16);
      expect(info.status).toBe('ACTIVE');
      expect(info.keySize).toBeGreaterThan(0);
    });
  });

  // ── checkEncryptionHealth ────────────────────────────────────────

  describe('checkEncryptionHealth', () => {
    it('returns HEALTHY when encryption key is set', () => {
      const health = service.checkEncryptionHealth();
      expect(health.status).toBe('HEALTHY');
      expect(health.encryptionEnabled).toBe(true);
      expect(health.hashingAlgorithm).toBe('bcryptjs');
      expect(health.bcryptRounds).toBe(12);
    });
  });
});
