/**
 * Unit Tests — EncryptionService
 * P#69 - Batch 30
 *
 * Singleton (crypto + config/secrets). Mock config/secrets.
 * Covers: encrypt/decrypt round-trip, hashPassword/verifyPassword,
 *         generateToken, encryptPII/decryptPII, createHMAC/verifyHMAC,
 *         generateKeyPair, encryptFileWithRSA/decryptFileWithRSA
 */

'use strict';

jest.mock('../../config/secrets', () => ({
  encryptionKey: 'test-encryption-key-32characters!',
  hmacKey: 'test-hmac-key-for-unit-tests-only',
}));

describe('EncryptionService', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/encryption-service');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  encrypt / decrypt                                                   */
  /* ------------------------------------------------------------------ */
  describe('encrypt', () => {
    it('returns iv, encryptedData, authTag', () => {
      const res = service.encrypt('hello');
      expect(res.iv).toBeDefined();
      expect(res.encryptedData).toBeDefined();
      expect(res.authTag).toBeDefined();
      expect(typeof res.iv).toBe('string');
      expect(typeof res.encryptedData).toBe('string');
      expect(typeof res.authTag).toBe('string');
    });

    it('encrypts objects via JSON.stringify', () => {
      const res = service.encrypt({ a: 1, b: 'two' });
      expect(res.encryptedData).toBeDefined();
    });

    it('produces different ciphertexts for same input (random IV)', () => {
      const a = service.encrypt('same');
      const b = service.encrypt('same');
      expect(a.encryptedData).not.toBe(b.encryptedData);
    });

    it('encrypts empty string', () => {
      const res = service.encrypt('');
      expect(res.encryptedData).toBeDefined();
    });
  });

  describe('decrypt', () => {
    it('round-trips a string', () => {
      const enc = service.encrypt('secret');
      const dec = service.decrypt(enc);
      expect(dec).toBe('secret');
    });

    it('round-trips an object', () => {
      const obj = { name: 'أحمد', age: 30 };
      const enc = service.encrypt(obj);
      const dec = service.decrypt(enc);
      expect(dec).toEqual(obj);
    });

    it('round-trips an array', () => {
      const arr = [1, 2, 3];
      const enc = service.encrypt(arr);
      expect(service.decrypt(enc)).toEqual(arr);
    });

    it('round-trips number', () => {
      const enc = service.encrypt(42);
      expect(service.decrypt(enc)).toBe(42);
    });

    it('round-trips boolean', () => {
      const enc = service.encrypt(true);
      expect(service.decrypt(enc)).toBe(true);
    });

    it('round-trips null', () => {
      const enc = service.encrypt(null);
      expect(service.decrypt(enc)).toBeNull();
    });

    it('throws on tampered encryptedData', () => {
      const enc = service.encrypt('data');
      enc.encryptedData = 'ff' + enc.encryptedData.slice(2);
      expect(() => service.decrypt(enc)).toThrow();
    });

    it('throws on wrong authTag', () => {
      const enc = service.encrypt('data');
      enc.authTag = 'a'.repeat(32);
      expect(() => service.decrypt(enc)).toThrow();
    });

    it('throws on wrong iv', () => {
      const enc = service.encrypt('data');
      enc.iv = 'b'.repeat(32);
      expect(() => service.decrypt(enc)).toThrow();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  hashPassword / verifyPassword                                       */
  /* ------------------------------------------------------------------ */
  describe('hashPassword', () => {
    it('returns salt.hash format', () => {
      const hashed = service.hashPassword('MyPass123');
      expect(hashed).toContain('.');
      const [salt, hash] = hashed.split('.');
      expect(salt.length).toBe(32); // 16 bytes hex
      expect(hash.length).toBe(128); // 64 bytes hex
    });

    it('produces different hashes for same password (random salt)', () => {
      const a = service.hashPassword('pass');
      const b = service.hashPassword('pass');
      expect(a).not.toBe(b);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', () => {
      const hashed = service.hashPassword('correct');
      expect(service.verifyPassword('correct', hashed)).toBe(true);
    });

    it('returns false for wrong password', () => {
      const hashed = service.hashPassword('correct');
      expect(service.verifyPassword('wrong', hashed)).toBe(false);
    });

    it('verifies Arabic passwords', () => {
      const hashed = service.hashPassword('كلمة_سر');
      expect(service.verifyPassword('كلمة_سر', hashed)).toBe(true);
      expect(service.verifyPassword('خطأ', hashed)).toBe(false);
    });

    it('verifies empty password', () => {
      const hashed = service.hashPassword('');
      expect(service.verifyPassword('', hashed)).toBe(true);
      expect(service.verifyPassword('x', hashed)).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateToken                                                       */
  /* ------------------------------------------------------------------ */
  describe('generateToken', () => {
    it('returns hex string of default 64 chars (32 bytes)', () => {
      const token = service.generateToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('respects custom length', () => {
      const token = service.generateToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('generates unique tokens', () => {
      const a = service.generateToken();
      const b = service.generateToken();
      expect(a).not.toBe(b);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  encryptPII / decryptPII                                             */
  /* ------------------------------------------------------------------ */
  describe('encryptPII', () => {
    it('encrypts known PII fields', () => {
      const pii = { email: 'a@b.com', phone: '+966', ssn: '1234', medicalRecord: 'MR-1' };
      const enc = service.encryptPII(pii);
      expect(enc.email).toHaveProperty('encryptedData');
      expect(enc.phone).toHaveProperty('encryptedData');
      expect(enc.ssn).toHaveProperty('encryptedData');
      expect(enc.medicalRecord).toHaveProperty('encryptedData');
    });

    it('leaves non-PII fields untouched', () => {
      const pii = { name: 'John', email: 'a@b.com' };
      const enc = service.encryptPII(pii);
      expect(enc.name).toBe('John');
      expect(enc.email).toHaveProperty('encryptedData');
    });

    it('skips missing PII fields', () => {
      const pii = { name: 'Ali' };
      const enc = service.encryptPII(pii);
      expect(enc.name).toBe('Ali');
      expect(enc.email).toBeUndefined();
    });
  });

  describe('decryptPII', () => {
    it('round-trips PII through encrypt then decrypt', () => {
      const original = { email: 'test@example.com', phone: '+966500000000', name: 'User' };
      const enc = service.encryptPII(original);
      const dec = service.decryptPII(enc);
      expect(dec.email).toBe('test@example.com');
      expect(dec.phone).toBe('+966500000000');
      expect(dec.name).toBe('User');
    });

    it('handles all 4 PII fields', () => {
      const orig = { email: 'e', phone: 'p', ssn: 's', medicalRecord: 'm' };
      const dec = service.decryptPII(service.encryptPII(orig));
      expect(dec).toEqual(orig);
    });

    it('ignores non-object fields during decrypt', () => {
      const data = { email: 'plain-string', phone: { encryptedData: 'x' } };
      // email is a string, not encrypted object, so decryptPII skips it
      const dec = service.decryptPII({ email: 'plain', name: 'A' });
      expect(dec.email).toBe('plain');
      expect(dec.name).toBe('A');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  createHMAC / verifyHMAC                                             */
  /* ------------------------------------------------------------------ */
  describe('createHMAC', () => {
    it('returns hex string', () => {
      const hmac = service.createHMAC({ msg: 'hello' });
      expect(typeof hmac).toBe('string');
      expect(/^[0-9a-f]+$/.test(hmac)).toBe(true);
      expect(hmac.length).toBe(64); // SHA-256 → 32 bytes → 64 hex
    });

    it('same input → same HMAC', () => {
      const a = service.createHMAC('data');
      const b = service.createHMAC('data');
      expect(a).toBe(b);
    });

    it('different input → different HMAC', () => {
      const a = service.createHMAC('foo');
      const b = service.createHMAC('bar');
      expect(a).not.toBe(b);
    });
  });

  describe('verifyHMAC', () => {
    it('returns true for valid signature', () => {
      const data = { key: 'value' };
      const sig = service.createHMAC(data);
      expect(service.verifyHMAC(data, sig)).toBe(true);
    });

    it('returns false for tampered signature', () => {
      const data = 'original';
      const sig = service.createHMAC(data);
      const tampered = 'a' + sig.slice(1);
      // timingSafeEqual may throw if lengths differ, but same length tampered should return false
      // If lengths match but content differs
      expect(service.verifyHMAC(data, tampered)).toBe(false);
    });

    it('throws for different-length signature', () => {
      const sig = service.createHMAC('x');
      expect(() => service.verifyHMAC('x', sig + 'extra')).toThrow();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateKeyPair                                                     */
  /* ------------------------------------------------------------------ */
  describe('generateKeyPair', () => {
    it('returns publicKey and privateKey in PEM format', () => {
      const { publicKey, privateKey } = service.generateKeyPair();
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  encryptFileWithRSA / decryptFileWithRSA                             */
  /* ------------------------------------------------------------------ */
  describe('RSA file encryption', () => {
    let publicKey, privateKey;

    beforeAll(() => {
      const pair = require('crypto').generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      publicKey = pair.publicKey;
      privateKey = pair.privateKey;
    });

    it('round-trips short data', () => {
      const data = 'Short secret file content';
      const encrypted = service.encryptFileWithRSA(data, publicKey);
      expect(Buffer.isBuffer(encrypted)).toBe(true);
      const decrypted = service.decryptFileWithRSA(encrypted, privateKey);
      expect(decrypted.toString()).toBe(data);
    });

    it('encrypted output differs from plaintext', () => {
      const data = 'plaintext';
      const encrypted = service.encryptFileWithRSA(data, publicKey);
      expect(encrypted.toString()).not.toBe(data);
    });

    it('throws with wrong private key', () => {
      const pair2 = require('crypto').generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const encrypted = service.encryptFileWithRSA('data', publicKey);
      expect(() => service.decryptFileWithRSA(encrypted, pair2.privateKey)).toThrow();
    });
  });
});
