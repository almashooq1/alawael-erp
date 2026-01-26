/**
 * Encryption Service - Data Protection
 * Handles encryption/decryption for sensitive data
 */

const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'secure-key-2025', 'salt', 32);
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedPayload) {
    try {
      const { iv, encryptedData, authTag } = encryptedPayload;

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash password with salt
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}.${hash}`;
  }

  /**
   * Verify password
   */
  verifyPassword(password, hashedPassword) {
    const [salt, hash] = hashedPassword.split('.');
    const hashVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
  }

  /**
   * Generate secure token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt PII (Personally Identifiable Information)
   */
  encryptPII(piiData) {
    const fieldsToEncrypt = ['email', 'phone', 'ssn', 'medicalRecord'];
    const encrypted = { ...piiData };

    fieldsToEncrypt.forEach(field => {
      if (piiData[field]) {
        encrypted[field] = this.encrypt(piiData[field]);
      }
    });

    return encrypted;
  }

  /**
   * Decrypt PII
   */
  decryptPII(encryptedPII) {
    const fieldsToDecrypt = ['email', 'phone', 'ssn', 'medicalRecord'];
    const decrypted = { ...encryptedPII };

    fieldsToDecrypt.forEach(field => {
      if (encryptedPII[field] && typeof encryptedPII[field] === 'object') {
        decrypted[field] = this.decrypt(encryptedPII[field]);
      }
    });

    return decrypted;
  }

  /**
   * Create HMAC for data integrity verification
   */
  createHMAC(data) {
    const hmacKey = crypto.scryptSync(process.env.HMAC_KEY || 'hmac-key-2025', 'salt', 32);
    return crypto.createHmac('sha256', hmacKey).update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data, signature) {
    const expectedSignature = this.createHMAC(data);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Generate RSA key pair for file encryption
   */
  generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
  }

  /**
   * Encrypt file with RSA
   */
  encryptFileWithRSA(fileData, publicKey) {
    return crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(fileData)
    );
  }

  /**
   * Decrypt file with RSA
   */
  decryptFileWithRSA(encryptedData, privateKey) {
    return crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encryptedData)
    );
  }
}

module.exports = new EncryptionService();
