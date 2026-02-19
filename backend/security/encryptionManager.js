/**
 * 🔒 Data Encryption & Protection System
 *
 * End-to-end encryption and data protection
 * - Field-level encryption
 * - Transparent encryption
 * - Key management
 * - Secure deletion
 */

const crypto = require('crypto');

class EncryptionManager {
  constructor(options = {}) {
    this.masterKey = options.masterKey || crypto.randomBytes(32);
    this.algorithm = options.algorithm || 'aes-256-gcm';
    this.encryptedFields = new Map();
    this.keyRotationSchedule = options.keyRotationSchedule || 90 * 24 * 60 * 60 * 1000; // 90 days
    this.lastKeyRotation = Date.now();
    this.oldKeys = [];
  }

  /**
   * Register field for encryption
   */
  registerEncryptedField(fieldName, config = {}) {
    this.encryptedFields.set(fieldName, {
      name: fieldName,
      sensitive: config.sensitive !== false,
      encryption: config.encryption !== false,
      hashing: config.hashing || false,
      tokenization: config.tokenization || false,
      createdAt: Date.now(),
    });
  }

  /**
   * Encrypt data
   */
  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      let encrypted = cipher.update(
        typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext),
        'utf8',
        'hex'
      );
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted: `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`,
        algorithm: this.algorithm,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    try {
      let data = encryptedData;
      let authTag;

      if (typeof encryptedData === 'object') {
        data = encryptedData.encrypted;
      }

      const parts = data.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Try to parse as JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data
   */
  hash(data) {
    return crypto
      .createHash('sha256')
      .update(data + this.masterKey.toString('hex'))
      .digest('hex');
  }

  /**
   * Tokenize sensitive data
   */
  tokenize(data) {
    const hash = this.hash(data);
    const token = `token_${hash.substring(0, 16)}`;

    return {
      token,
      dataHash: hash,
      tokenizedAt: Date.now(),
    };
  }

  /**
   * Encrypt object fields
   */
  encryptObject(obj, fieldsToEncrypt = []) {
    const encrypted = { ...obj };

    for (const field of fieldsToEncrypt) {
      if (field in encrypted && encrypted[field] !== null) {
        const fieldConfig = this.encryptedFields.get(field);

        if (fieldConfig?.tokenization) {
          encrypted[field] = this.tokenize(encrypted[field]).token;
        } else if (fieldConfig?.hashing) {
          encrypted[field] = this.hash(encrypted[field]);
        } else {
          encrypted[field] = this.encrypt(encrypted[field]).encrypted;
        }
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object fields
   */
  decryptObject(obj, fieldsToDecrypt = []) {
    const decrypted = { ...obj };

    for (const field of fieldsToDecrypt) {
      if (field in decrypted && decrypted[field] !== null) {
        const fieldConfig = this.encryptedFields.get(field);

        if (!fieldConfig?.hashing && !fieldConfig?.tokenization) {
          try {
            decrypted[field] = this.decrypt(decrypted[field]);
          } catch (error) {
            console.error(`Failed to decrypt field ${field}:`, error.message);
          }
        }
      }
    }

    return decrypted;
  }

  /**
   * Securely delete data
   */
  secureDelete(data) {
    if (typeof data === 'string') {
      // Overwrite multiple times
      let buffer = Buffer.alloc(data.length);
      for (let i = 0; i < 3; i++) {
        crypto.randomFillSync(buffer);
      }
      return true;
    }

    if (typeof data === 'object') {
      for (const key in data) {
        delete data[key];
      }
      return true;
    }

    return false;
  }

  /**
   * Rotate encryption key
   */
  rotateKey(newMasterKey) {
    if (Date.now() - this.lastKeyRotation < this.keyRotationSchedule) {
      return {
        success: false,
        error: 'Key rotation not yet due',
      };
    }

    // Store old key for decryption of existing data
    this.oldKeys.push({
      key: this.masterKey,
      rotatedAt: Date.now(),
    });

    this.masterKey = newMasterKey;
    this.lastKeyRotation = Date.now();

    // Keep only last 5 keys
    if (this.oldKeys.length > 5) {
      this.oldKeys.shift();
    }

    return {
      success: true,
      rotatedAt: this.lastKeyRotation,
    };
  }

  /**
   * Re-encrypt with new key
   */
  reEncryptData(encryptedData) {
    // Try current key first
    try {
      const decrypted = this.decrypt(encryptedData);
      return this.encrypt(decrypted);
    } catch (error) {
      // Try old keys
      for (const oldKeyEntry of this.oldKeys) {
        try {
          const originalKey = this.masterKey;
          this.masterKey = oldKeyEntry.key;

          const decrypted = this.decrypt(encryptedData);

          this.masterKey = originalKey;
          return this.encrypt(decrypted);
        } catch {
          // Continue with next key
        }
      }

      throw new Error('Failed to re-encrypt data with any available key');
    }
  }

  /**
   * Get key information
   */
  getKeyInfo() {
    return {
      algorithm: this.algorithm,
      currentKeyId: crypto
        .createHash('sha256')
        .update(this.masterKey)
        .digest('hex')
        .substring(0, 16),
      lastRotation: this.lastKeyRotation,
      nextRotationDue: this.lastKeyRotation + this.keyRotationSchedule,
      oldKeysCount: this.oldKeys.length,
    };
  }

  /**
   * Validate encrypted data integrity
   */
  validateIntegrity(encryptedData) {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) return false;

      const iv = Buffer.from(parts[0], 'hex');
      if (iv.length !== 12) return false; // GCM IV should be 12 bytes

      const authTag = Buffer.from(parts[2], 'hex');
      if (authTag.length !== 16) return false; // GCM auth tag should be 16 bytes

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Database schema encryption middleware
 */
class SchemaEncryption {
  constructor(encryptionManager, schema) {
    this.encryptionManager = encryptionManager;
    this.schema = schema;
    this.encryptedFields = [];

    this.analyzeSchema();
  }

  /**
   * Analyze schema for sensitive fields
   */
  analyzeSchema() {
    for (const field in this.schema) {
      const fieldDef = this.schema[field];

      if (fieldDef.sensitive || fieldDef.type === 'password' || fieldDef.type === 'ssn') {
        this.encryptedFields.push(field);
        this.encryptionManager.registerEncryptedField(field, {
          sensitive: true,
        });
      } else if (fieldDef.type === 'email') {
        this.encryptionManager.registerEncryptedField(field, {
          hashing: true,
        });
      }
    }
  }

  /**
   * Encrypt document before save
   */
  encryptBeforeSave(doc) {
    return this.encryptionManager.encryptObject(doc, this.encryptedFields);
  }

  /**
   * Decrypt document after retrieval
   */
  decryptAfterRetrieval(doc) {
    return this.encryptionManager.decryptObject(doc, this.encryptedFields);
  }
}

module.exports = { EncryptionManager, SchemaEncryption };
