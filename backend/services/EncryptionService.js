/**
 * ============================================
 * DATA ENCRYPTION & DECRYPTION SERVICE
 * خدمة تشفير البيانات الحساسة
 * ============================================
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class EncryptionService {
  constructor() {
    // Encryption key must be 32 bytes (256 bits)
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');

    // IV length for AES
    this.ivLength = 16;
    this.algorithm = 'aes-256-cbc';
  }

  /**
   * 1️⃣ PASSWORD HASHING & VERIFICATION
   */

  // Hash Password
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      return hashedPassword;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  // Verify Password
  async verifyPassword(password, hash) {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      throw new Error(`Password verification failed: ${error.message}`);
    }
  }

  /**
   * 2️⃣ SYMMETRIC ENCRYPTION (AES-256-CBC)
   */

  // Encrypt Data
  encryptData(data) {
    try {
      // Convert data to string if it's an object
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt data
      let encrypted = cipher.update(dataString, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine IV and encrypted data
      const result = iv.toString('hex') + ':' + encrypted;

      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt Data
  decryptData(encryptedData) {
    try {
      // Split IV and encrypted data
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Try to parse as JSON, otherwise return as string
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
   * 3️⃣ FIELD-LEVEL ENCRYPTION FOR SENSITIVE DATA
   */

  // Encrypt Sensitive Fields in Object
  encryptSensitiveFields(data, fieldsToEncrypt) {
    const encrypted = { ...data };

    fieldsToEncrypt.forEach(field => {
      if (encrypted[field]) {
        encrypted[`${field}_encrypted`] = this.encryptData(encrypted[field]);
        delete encrypted[field]; // Remove original field
      }
    });

    return encrypted;
  }

  // Decrypt Sensitive Fields in Object
  decryptSensitiveFields(data, fieldsToDecrypt) {
    const decrypted = { ...data };

    fieldsToDecrypt.forEach(field => {
      const encryptedField = `${field}_encrypted`;
      if (decrypted[encryptedField]) {
        decrypted[field] = this.decryptData(decrypted[encryptedField]);
        delete decrypted[encryptedField]; // Remove encrypted field
      }
    });

    return decrypted;
  }

  /**
   * 4️⃣ API KEY ENCRYPTION
   */

  // Generate Encrypted API Key
  generateEncryptedAPIKey(userId, permissions = []) {
    const keyData = {
      userId: userId,
      permissions: permissions,
      createdAt: new Date(),
      version: 1,
    };

    const encryptedKey = this.encryptData(keyData);
    const keyHash = this.hashAPIKey(encryptedKey);

    return {
      apiKey: encryptedKey, // Raw API key (to share once)
      keyHash: keyHash, // Hash to store in DB
      displayKey: encryptedKey.substring(0, 10) + '...', // For display
    };
  }

  // Verify API Key
  verifyAPIKey(providedKey, storedHash) {
    try {
      const providedHash = this.hashAPIKey(providedKey);
      return providedHash === storedHash;
    } catch {
      return false;
    }
  }

  // Hash API Key
  hashAPIKey(apiKey) {
    return crypto
      .createHash('sha256')
      .update(apiKey + process.env.JWT_SECRET)
      .digest('hex');
  }

  /**
   * 5️⃣ PERSONAL DATA ENCRYPTION (GDPR Compliance)
   */

  // Encrypt Personal Information
  encryptPersonalData(personalInfo) {
    const fieldsToEncrypt = [
      'ssn',
      'nationalId',
      'birthDate',
      'bankAccountNumber',
      'creditCardNumber',
    ];

    return this.encryptSensitiveFields(personalInfo, fieldsToEncrypt);
  }

  // Decrypt Personal Information
  decryptPersonalData(encryptedInfo) {
    const fieldsToDecrypt = [
      'ssn',
      'nationalId',
      'birthDate',
      'bankAccountNumber',
      'creditCardNumber',
    ];

    return this.decryptSensitiveFields(encryptedInfo, fieldsToDecrypt);
  }

  /**
   * 6️⃣ TOKEN ENCRYPTION
   */

  // Encrypt Refresh Token
  encryptRefreshToken(token) {
    return this.encryptData(token);
  }

  // Decrypt Refresh Token
  decryptRefreshToken(encryptedToken) {
    return this.decryptData(encryptedToken);
  }

  /**
   * 7️⃣ HASHING FOR VERIFICATION
   */

  // Create Hash (for verification, not passwords)
  createHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data) + process.env.JWT_SECRET)
      .digest('hex');
  }

  // Verify Hash
  verifyHash(data, hash) {
    const newHash = this.createHash(data);
    return newHash === hash;
  }

  /**
   * 8️⃣ RANDOM TOKEN GENERATION
   */

  // Generate Secure Token
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate Verification Code
  generateVerificationCode(length = 6) {
    const code = Math.random().toString(10).substr(2, length).padEnd(length, '0');
    return code;
  }

  /**
   * ENCRYPTION STATUS & INFO
   */

  // Get Encryption Info
  getEncryptionInfo() {
    return {
      algorithm: this.algorithm,
      keySize: this.encryptionKey.length * 8,
      ivLength: this.ivLength,
      status: 'ACTIVE',
      lastRotation: process.env.ENCRYPTION_KEY_ROTATION_DATE || 'Not set',
    };
  }

  // Check Encryption Health
  checkEncryptionHealth() {
    const health = {
      encryptionEnabled: !!process.env.ENCRYPTION_KEY,
      hashingAlgorithm: 'bcryptjs',
      bcryptRounds: 12,
      status: 'HEALTHY',
    };

    if (!health.encryptionEnabled) {
      health.status = 'WARNING - Encryption key not configured';
    }

    return health;
  }
}

module.exports = new EncryptionService();
