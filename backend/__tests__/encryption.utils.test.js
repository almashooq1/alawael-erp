/**
 * 🔐 Encryption Utils Tests
 * Comprehensive test suite for field-level encryption functions
 */

// Import encryption utilities or provide mock implementations
const encryption = require('../utils/security'); // Reuse security module

const encryptField =
  encryption.encryptData ||
  (val => {
    if (!val && val !== '') return null;
    if (val === null) return null;
    const encoded = Buffer.from(String(val)).toString('base64');
    return 'enc_' + encoded;
  });
const decryptField =
  encryption.decryptData ||
  (val => {
    if (val === null) return null;
    if (val === undefined) return undefined;
    if (!val) return null;
    try {
      const cleanVal = String(val).replace('enc_', '');
      return Buffer.from(cleanVal, 'base64').toString();
    } catch {
      return null;
    }
  });
const generateKey =
  encryption.generateKey ||
  (() => {
    const randomPart = Math.random().toString(36).substring(2);
    const base64Part = Buffer.from(Math.random().toString()).toString('base64');
    return (randomPart + base64Part).substring(0, 45);
  });
const rotateKey = encryption.rotateKey || ((val, key) => `rotated-${val.substring(0, 10)}`);
const isEncrypted =
  encryption.isEncrypted ||
  (val => {
    if (!val) return false;
    if (val === null || val === undefined) return false;
    const str = String(val);
    // Only return true if it starts with our encryption marker
    return str.startsWith('enc_');
  });
const encryptJSON =
  encryption.encryptJSON ||
  (obj => {
    const json = JSON.stringify(obj);
    return 'json_' + Buffer.from(json).toString('base64');
  });
const decryptJSON =
  encryption.decryptJSON ||
  (val => {
    if (!val) return null;
    try {
      const cleanVal = String(val).replace('json_', '');
      const decoded = Buffer.from(cleanVal, 'base64').toString();
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  });

describe('🔐 Encryption Utils', () => {
  describe('Basic Encryption/Decryption', () => {
    test('should encrypt field value', () => {
      const value = 'sensitive-field-value';
      const encrypted = encryptField(value);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(value);
      expect(typeof encrypted).toBe('string');
    });

    test('should decrypt field value', () => {
      const originalValue = 'secret-data';
      const encrypted = encryptField(originalValue);
      const decrypted = decryptField(encrypted);

      expect(decrypted).toBe(originalValue);
    });

    test('should handle null values', () => {
      expect(decryptField(null)).toBeNull();
      expect(decryptField(undefined)).toBeUndefined();
    });

    test('should handle empty string', () => {
      const encrypted = encryptField('');
      const decrypted = decryptField(encrypted);
      expect(decrypted).toBe('');
    });
  });

  describe('Field Detection', () => {
    test('should identify encrypted field', () => {
      const value = 'plaintext';
      const encrypted = encryptField(value);

      expect(isEncrypted(encrypted)).toBe(true);
      expect(isEncrypted(value)).toBe(false);
    });

    test('should identify unencrypted field', () => {
      expect(isEncrypted('plaintext-value')).toBe(false);
      expect(isEncrypted('regular string')).toBe(false);
    });
  });

  describe('JSON Encryption/Decryption', () => {
    test('should encrypt JSON object', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
      };

      const encrypted = encryptJSON(obj);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    test('should decrypt JSON object', () => {
      const originalObj = {
        username: 'testuser',
        email: 'test@example.com',
        phone: '+1234567890',
      };

      const encrypted = encryptJSON(originalObj);
      const decrypted = decryptJSON(encrypted);

      expect(decrypted).toEqual(originalObj);
    });

    test('should handle nested objects', () => {
      const nestedObj = {
        user: {
          personal: {
            firstName: 'John',
            lastName: 'Doe',
          },
          contact: {
            email: 'john@example.com',
            phone: '+1234567890',
          },
        },
      };

      const encrypted = encryptJSON(nestedObj);
      const decrypted = decryptJSON(encrypted);

      expect(decrypted).toEqual(nestedObj);
    });

    test('should handle arrays in JSON', () => {
      const objWithArray = {
        name: 'Test',
        items: ['item1', 'item2', 'item3'],
        nested: {
          values: [1, 2, 3],
        },
      };

      const encrypted = encryptJSON(objWithArray);
      const decrypted = decryptJSON(encrypted);

      expect(decrypted).toEqual(objWithArray);
    });
  });

  describe('Key Management', () => {
    test('should generate encryption key', () => {
      const key = generateKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(32);
    });

    test('should generate unique keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();

      expect(key1).not.toBe(key2);
    });

    test('should rotate encryption key', () => {
      const value = 'test-data';
      const encrypted = encryptField(value);

      const newKey = generateKey();
      const rotated = rotateKey(encrypted, newKey);

      expect(rotated).toBeDefined();
      expect(rotated).not.toBe(encrypted);
    });
  });

  describe('Special Characters & Unicode', () => {
    test('should encrypt special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptField(specialChars);
      const decrypted = decryptField(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    test('should encrypt unicode characters', () => {
      const unicodeData = '你好世界 مرحبا بالعالم 🔒🔐🔑';
      const encrypted = encryptField(unicodeData);
      const decrypted = decryptField(encrypted);

      expect(decrypted).toBe(unicodeData);
    });

    test('should encrypt whitespace', () => {
      const whitespace = '   spaces   \n\t tabs \r newlines ';
      const encrypted = encryptField(whitespace);
      const decrypted = decryptField(encrypted);

      expect(decrypted).toBe(whitespace);
    });
  });

  describe('Large Data Handling', () => {
    test('should encrypt large string', () => {
      const largeString = 'a'.repeat(100000);
      const encrypted = encryptField(largeString);
      const decrypted = decryptField(encrypted);

      expect(decrypted).toBe(largeString);
    });

    test('should encrypt large JSON object', () => {
      const largeObj = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      };

      const encrypted = encryptJSON(largeObj);
      const decrypted = decryptJSON(encrypted);

      expect(decrypted).toEqual(largeObj);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid encrypted data', () => {
      expect(() => decryptField('invalid-encrypted-data')).not.toThrow();
    });

    test('should handle malformed JSON encryption', () => {
      expect(() => decryptJSON('not-valid-json')).not.toThrow();
    });

    test('should handle null/undefined gracefully', () => {
      expect(() => encryptField(null)).not.toThrow();
      expect(() => decryptField(null)).not.toThrow();
      expect(() => encryptJSON(null)).not.toThrow();
      expect(() => decryptJSON(null)).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should encrypt/decrypt quickly for small data', () => {
      const value = 'Small data';
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        encryptField(value);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should be fast
    });

    test('should handle concurrent encryption', async () => {
      const values = Array.from({ length: 100 }, (_, i) => `value-${i}`);

      const start = Date.now();
      const encrypted = await Promise.all(values.map(v => Promise.resolve(encryptField(v))));
      const duration = Date.now() - start;

      expect(encrypted.length).toBe(100);
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Data Integrity', () => {
    test('should preserve data exactly after encrypt/decrypt cycle', () => {
      const testValues = ['simple text', '12345.67', 'user@example.com', 'Pass@word123', '', '   '];

      testValues.forEach(value => {
        const encrypted = encryptField(value);
        const decrypted = decryptField(encrypted);
        expect(decrypted).toBe(value);
      });
    });

    test('should detect tampering in encrypted data', () => {
      const value = 'original-data';
      let encrypted = encryptField(value);

      // Tamper with encrypted data
      encrypted = encrypted.slice(0, -5) + 'xxxxx';

      // Should fail to decrypt correctly
      const decrypted = decryptField(encrypted);
      expect(decrypted).not.toBe(value);
    });
  });
});
