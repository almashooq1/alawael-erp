/* eslint-disable no-unused-vars */
/**
 * Encryption Controller
 * Handles encryption, decryption, and cryptographic operations
 * Maps requests to EncryptionService methods
 */

const EncryptionService = require('../services/encryptionService');

class EncryptionController {
  constructor() {
    this.encryptionService = new EncryptionService();
  }

  /**
   * Encrypt data
   * POST /api/v1/security/encrypt
   */
  async encrypt(req, res, next) {
    try {
      const { plaintext, keyId = 'default' } = req.body;

      if (!plaintext) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Plaintext is required',
          code: 'MISSING_PLAINTEXT',
        });
      }

      const result = this.encryptionService.encrypt(plaintext, keyId);

      res.status(201).json({
        success: true,
        data: {
          encryptedId: result.id,
          ciphertext: result.ciphertext,
          iv: result.iv,
          algorithm: 'aes-256-gcm',
          keyId,
        },
      });
    } catch (error) {
      if ((error.message || '').includes('Key not found')) {
        return res.status(400).json({
          error: 'invalid_key',
          message: 'حدث خطأ داخلي',
          code: 'KEY_NOT_FOUND',
        });
      }
      next(error);
    }
  }

  /**
   * Decrypt data
   * POST /api/v1/security/decrypt
   */
  async decrypt(req, res, next) {
    try {
      const { encryptedId, keyId = 'default' } = req.body;

      if (!encryptedId) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Encrypted ID is required',
          code: 'MISSING_ENCRYPTED_ID',
        });
      }

      const plaintext = this.encryptionService.decrypt(encryptedId, keyId);

      res.json({
        success: true,
        data: {
          plaintext,
          algorithm: 'aes-256-gcm',
        },
      });
    } catch (error) {
      if ((error.message || '').includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: 'حدث خطأ داخلي',
          code: 'ENCRYPTED_DATA_NOT_FOUND',
        });
      }
      if ((error.message || '').includes('Failed to decrypt')) {
        return res.status(400).json({
          error: 'decryption_failed',
          message: 'حدث خطأ داخلي',
          code: 'DECRYPTION_ERROR',
        });
      }
      next(error);
    }
  }

  /**
   * Hash data
   * POST /api/v1/security/hash
   */
  async hash(req, res, next) {
    try {
      const { data, algorithm = 'sha256' } = req.body;

      if (!data) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Data is required',
          code: 'MISSING_DATA',
        });
      }

      const hash = this.encryptionService.hash(data, algorithm);

      res.status(201).json({
        success: true,
        data: {
          hash,
          algorithm: algorithm,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Hash data with salt
   * POST /api/v1/security/hash-with-salt
   */
  async hashWithSalt(req, res, next) {
    try {
      const { data, salt } = req.body;

      if (!data) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Data is required',
          code: 'MISSING_DATA',
        });
      }

      const result = this.encryptionService.hashWithSalt(data, salt);

      res.status(201).json({
        success: true,
        data: {
          hash: result.hash,
          salt: result.salt,
          algorithm: 'sha256',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify hash
   * POST /api/v1/security/verify-hash
   */
  async verifyHash(req, res, next) {
    try {
      const { data, hash, salt } = req.body;

      if (!data || !hash) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Data and hash are required',
          code: 'MISSING_FIELDS',
        });
      }

      const isValid = this.encryptionService.verifyHash(data, hash, salt);

      res.json({
        success: true,
        data: {
          valid: isValid,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sign data
   * POST /api/v1/security/sign
   */
  async sign(req, res, next) {
    try {
      const { data, keyId = 'default' } = req.body;

      if (!data) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Data is required',
          code: 'MISSING_DATA',
        });
      }

      const signature = this.encryptionService.sign(data, keyId);

      res.status(201).json({
        success: true,
        data: {
          signature,
          algorithm: 'hmac-sha256',
          keyId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify signature
   * POST /api/v1/security/verify-signature
   */
  async verifySignature(req, res, next) {
    try {
      const { data, signature, keyId = 'default' } = req.body;

      if (!data || !signature) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Data and signature are required',
          code: 'MISSING_FIELDS',
        });
      }

      const isValid = this.encryptionService.verifySignature(data, signature, keyId);

      res.json({
        success: true,
        data: {
          valid: isValid,
          algorithm: 'hmac-sha256',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate key
   * POST /api/v1/security/keys/generate
   */
  async generateKey(req, res, next) {
    try {
      const { length = 32 } = req.body;

      const key = this.encryptionService.generateKey(length);

      res.status(201).json({
        success: true,
        data: {
          key,
          length,
          algorithm: 'aes-256',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Store key
   * POST /api/v1/security/keys
   */
  async storeKey(req, res, next) {
    try {
      const { keyId, key } = req.body;

      if (!keyId || !key) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Key ID and key are required',
          code: 'MISSING_FIELDS',
        });
      }

      this.encryptionService.storeKey(keyId, key);

      res.status(201).json({
        success: true,
        data: {
          keyId,
          message: 'Key stored successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rotate key
   * POST /api/v1/security/keys/:keyId/rotate
   */
  async rotateKey(req, res, next) {
    try {
      const { keyId } = req.params;

      const result = this.encryptionService.rotateKey(keyId);

      res.json({
        success: true,
        data: {
          keyId,
          newKey: result.newKey,
          rotatedAt: new Date(),
          message: 'Key rotated successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate certificate
   * POST /api/v1/security/certificates
   */
  async generateCertificate(req, res, next) {
    try {
      const { commonName, organization, countryCode = 'US' } = req.body;

      if (!commonName) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Common name is required',
          code: 'MISSING_CN',
        });
      }

      const cert = this.encryptionService.generateCertificate({
        commonName,
        organization: organization || 'Organization',
        countryCode,
      });

      res.status(201).json({
        success: true,
        data: cert,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EncryptionController;
