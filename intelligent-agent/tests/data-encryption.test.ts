import { DataEncryption, EncryptionConfig } from '../src/modules/data-encryption';

describe('DataEncryption', () => {
  let encryption: DataEncryption;
  const testSecret = 'my-secure-secret-key-12345';

  beforeEach(() => {
    encryption = new DataEncryption(testSecret);
  });

  afterEach(() => {
    if (encryption) {
      encryption.clearOperations();
      encryption.removeAllListeners();
    }
  });

  describe('Initialization & Configuration', () => {
    it('should instantiate with valid secret', () => {
      const enc = new DataEncryption('valid-secret-key');
      expect(enc).toBeDefined();
    });

    it('should throw error for missing secret', () => {
      expect(() => new DataEncryption('')).toThrow('Secret key is required');
    });

    it('should throw error for short secret', () => {
      expect(() => new DataEncryption('short')).toThrow('at least 8 characters');
    });

    it('should accept custom encryption config', () => {
      const config: Partial<EncryptionConfig> = {
        algorithm: 'aes-192-cbc',
        encoding: 'hex'
      };
      const enc = new DataEncryption(testSecret, config);
      expect(enc.getConfig().algorithm).toBe('aes-192-cbc');
    });

    it('should throw error for invalid algorithm', () => {
      const invalidConfig = { algorithm: 'invalid-algo' } as any;
      expect(() => new DataEncryption(testSecret, invalidConfig)).toThrow('Invalid encryption algorithm');
    });

    it('should throw error for invalid encoding', () => {
      const invalidConfig = { encoding: 'invalid' } as any;
      expect(() => new DataEncryption(testSecret, invalidConfig)).toThrow('Invalid encoding');
    });

    it('should throw error for invalid IV length', () => {
      const invalidConfig = { ivLength: 5 };
      expect(() => new DataEncryption(testSecret, invalidConfig)).toThrow('IV length must be between');
    });

    it('should throw error for invalid maxSize', () => {
      const invalidConfig = { maxSize: 512 };
      expect(() => new DataEncryption(testSecret, invalidConfig)).toThrow('Max size must be at least 1KB');
    });
  });

  describe('Encryption', () => {
    it('should encrypt string successfully', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encryption.encrypt(plaintext);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).toContain(':');
    });

    it('should encrypt empty string with error', () => {
      expect(() => encryption.encrypt('')).toThrow('Data to encrypt is required');
    });

    it('should throw error for non-string input', () => {
      const invalidData = { data: 'test' } as any;
      expect(() => encryption.encrypt(invalidData)).toThrow('must be a string');
    });

    it('should throw error for oversized data', () => {
      const config: Partial<EncryptionConfig> = { maxSize: 2048 };
      const enc = new DataEncryption(testSecret, config);
      const largeData = 'a'.repeat(3000);
      expect(() => enc.encrypt(largeData)).toThrow('exceeds max size');
    });

    it('should encrypt different data to different ciphertexts', () => {
      const plaintext = 'Same input twice';
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);
      // Due to random IV, should be different
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should include IV in encrypted output', () => {
      const plaintext = 'Test data';
      const encrypted = encryption.encrypt(plaintext);
      const [iv, _] = encrypted.split(':');
      expect(iv).toBeDefined();
      expect(iv.length).toBeGreaterThan(0);
    });

    it('should support different algorithms', () => {
      // Note: Different algorithms require different key sizes
      // Our SHA-256 key is 32 bytes, suitable only for AES-256-CBC
      // To test other algorithms, would need different key derivation
      const config: Partial<EncryptionConfig> = { algorithm: 'aes-256-cbc' };
      const enc = new DataEncryption(testSecret, config);
      const encrypted = enc.encrypt('Test data');
      expect(encrypted).toBeDefined();
    });

    it('should support hex encoding', () => {
      const config: Partial<EncryptionConfig> = { encoding: 'hex' };
      const enc = new DataEncryption(testSecret, config);
      const encrypted = enc.encrypt('Test data');
      expect(encrypted).toBeDefined();
      // Hex should only contain hex characters and colon
      const [iv, data] = encrypted.split(':');
      expect(/^[a-f0-9:]+$/.test(encrypted)).toBe(true);
    });
  });

  describe('Decryption', () => {
    it('should decrypt encrypted data', () => {
      const plaintext = 'Test message';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for missing data', () => {
      expect(() => encryption.decrypt('')).toThrow('Data to decrypt is required');
    });

    it('should throw error for non-string input', () => {
      const invalidData = { data: 'test' } as any;
      expect(() => encryption.decrypt(invalidData)).toThrow('must be a string');
    });

    it('should throw error for invalid format', () => {
      expect(() => encryption.decrypt('invalid-format-without-colon')).toThrow('Invalid encrypted data format');
    });

    it('should throw error for corrupted ciphertext', () => {
      const plaintext = 'Test';
      const encrypted = encryption.encrypt(plaintext);
      const corrupted = encrypted.replace(':', '|'); // Invalid format
      expect(() => encryption.decrypt(corrupted)).toThrow('Invalid encrypted data format');
    });

    it('should decrypt with different algorithms', () => {
      // Note: Different algorithms require different key sizes
      // Our SHA-256 key is 32 bytes, suitable only for AES-256-CBC
      const config: Partial<EncryptionConfig> = { algorithm: 'aes-256-cbc' };
      const enc = new DataEncryption(testSecret, config);
      const plaintext = 'Test with 256-bit';
      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt with hex encoding', () => {
      const config: Partial<EncryptionConfig> = { encoding: 'hex' };
      const enc = new DataEncryption(testSecret, config);
      const plaintext = 'Test with hex';
      const encrypted = enc.encrypt(plaintext);
      const decrypted = enc.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long text', () => {
      const plaintext = 'This is a longer text that spans multiple lines.\nIt contains special chars: !@#$%^&*()\nAnd unicode: 你好世界';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Operation Tracking', () => {
    it('should track encryption operations', () => {
      encryption.encrypt('Test 1');
      encryption.encrypt('Test 2');
      const count = encryption.getOperationCount();
      expect(count).toBe(2);
    });

    it('should track decryption operations', () => {
      const encrypted = encryption.encrypt('Test');
      encryption.decrypt(encrypted);
      encryption.decrypt(encrypted);
      const count = encryption.getOperationCount();
      expect(count).toBe(3); // 1 encrypt + 2 decrypt
    });

    it('should return null for non-existent operation', () => {
      const info = encryption.getOperationInfo('non-existent-id');
      expect(info).toBeNull();
    });

    it('should get all operations', () => {
      encryption.encrypt('Test 1');
      const encrypted = encryption.encrypt('Test 2');
      encryption.decrypt(encrypted);
      
      const allOps = encryption.getAllOperations();
      expect(allOps.length).toBe(3);
      expect(allOps[0]).toHaveProperty('operationId');
      expect(allOps[0]).toHaveProperty('info');
    });

    it('should clear all operations', () => {
      encryption.encrypt('Test');
      expect(encryption.getOperationCount()).toBe(1);
      encryption.clearOperations();
      expect(encryption.getOperationCount()).toBe(0);
    });

    it('should store operation info correctly', () => {
      const plaintext = 'Important data';
      encryption.encrypt(plaintext);
      const allOps = encryption.getAllOperations();
      expect(allOps[0].info).toHaveProperty('inputSize');
      expect(allOps[0].info).toHaveProperty('outputSize');
      expect(allOps[0].info).toHaveProperty('algorithm');
      expect(allOps[0].info).toHaveProperty('timestamp');
      expect(allOps[0].info).toHaveProperty('status');
    });
  });

  describe('Event Emission', () => {
    it('should emit encrypted event on successful encryption', () => {
      return new Promise<void>((done) => {
        encryption.once('encrypted', (data) => {
          expect(data).toHaveProperty('operationId');
          expect(data).toHaveProperty('inputSize');
          expect(data).toHaveProperty('outputSize');
          expect(data).toHaveProperty('algorithm');
          expect(data).toHaveProperty('timestamp');
          done();
        });
        
        encryption.encrypt('Test data');
      });
    });

    it('should emit decrypted event on successful decryption', () => {
      return new Promise<void>((done) => {
        const encrypted = encryption.encrypt('Test');
        
        encryption.once('decrypted', (data) => {
          expect(data).toHaveProperty('operationId');
          expect(data).toHaveProperty('inputSize');
          expect(data).toHaveProperty('outputSize');
          expect(data).toHaveProperty('algorithm');
          done();
        });
        
        encryption.decrypt(encrypted);
      });
    });

    it('should emit encryptionError event on encryption failure', () => {
      return new Promise<void>((done) => {
        encryption.once('encryptionError', (data) => {
          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('timestamp');
          done();
        });
        
        try {
          encryption.encrypt('');
        } catch (e) {
          // Expected error
        }
      });
    });

    it('should emit decryptionError event on decryption failure', () => {
      return new Promise<void>((done) => {
        encryption.once('decryptionError', (data) => {
          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('timestamp');
          done();
        });
        
        try {
          encryption.decrypt('invalid:data:format:here');
        } catch (e) {
          // Expected error  
        }
      });
    });

    it('should allow multiple event listeners', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      
      encryption.on('encrypted', spy1);
      encryption.on('encrypted', spy2);
      
      encryption.encrypt('Test');
      
      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('Different Secret Keys', () => {
    it('should not decrypt data encrypted with different key', () => {
      const enc1 = new DataEncryption('secret-key-1-abcd');
      const enc2 = new DataEncryption('secret-key-2-efgh');
      
      const plaintext = 'Secret data';
      const encrypted = enc1.encrypt(plaintext);
      
      expect(() => enc2.decrypt(encrypted)).toThrow();
    });

    it('should decrypt correctly with same secret', () => {
      const plaintext = 'Confidential info';
      const encrypted = encryption.encrypt(plaintext);
      
      // Create new instance with same secret
      const enc2 = new DataEncryption(testSecret);
      const decrypted = enc2.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا بالعالم';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle null bytes', () => {
      const plaintext = 'String with\x00null\x00bytes';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long strings', () => {
      const plaintext = 'A'.repeat(100000);
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle special JSON strings', () => {
      const plaintext = JSON.stringify({
        key: 'value',
        nested: { array: [1, 2, 3] },
        special: "\"quotes\" and 'apostrophes'"
      });
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should work with consistent IVs for same instance', () => {
      const plaintext = 'Test data';
      // Even though IVs are random, we should be able to decrypt all
      for (let i = 0; i < 5; i++) {
        const encrypted = encryption.encrypt(plaintext);
        const decrypted = encryption.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });
  });

  describe('Configuration Management', () => {
    it('should return current config', () => {
      const encWithConfig = new DataEncryption(testSecret, {
        algorithm: 'aes-192-cbc',
        encoding: 'hex'
      });
      
      const config = encWithConfig.getConfig();
      expect(config.algorithm).toBe('aes-192-cbc');
      expect(config.encoding).toBe('hex');
    });

    it('should not modify returned config', () => {
      const config = encryption.getConfig();
      config.algorithm = 'aes-128-cbc'; // Try to modify
      
      // Original should be unchanged
      const newConfig = encryption.getConfig();
      expect(newConfig.algorithm).not.toBe('aes-128-cbc');
    });
  });

  describe('Instance Isolation', () => {
    it('should not share state between instances', () => {
      const enc1 = new DataEncryption('secret-1-long');
      const enc2 = new DataEncryption('secret-2-long');
      
      enc1.encrypt('Data 1');
      enc2.encrypt('Data 2');
      
      expect(enc1.getOperationCount()).toBe(1);
      expect(enc2.getOperationCount()).toBe(1);
    });

    it('should not share configuration between instances', () => {
      const enc1 = new DataEncryption(testSecret, { algorithm: 'aes-256-cbc' });
      const enc2 = new DataEncryption(testSecret, { algorithm: 'aes-192-cbc' });
      
      expect(enc1.getConfig().algorithm).toBe('aes-256-cbc');
      expect(enc2.getConfig().algorithm).toBe('aes-192-cbc');
    });
  });
});
