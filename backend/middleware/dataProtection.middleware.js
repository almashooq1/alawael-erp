/**
 * Data Protection & GDPR Compliance Middleware
 * Handles PII masking, data encryption, and user privacy
 */

const crypto = require('crypto');

/**
 * Encryption keys (should be in environment variables)
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * Personally Identifiable Information (PII) fields
 */
const PII_FIELDS = {
  email: true,
  phoneNumber: true,
  ssn: true,
  nationalId: true,
  dateOfBirth: true,
  address: true,
  bankAccount: true,
  creditCard: true,
  firstName: true,
  lastName: true,
  fullName: true
};

/**
 * Data Protection Manager
 */
class DataProtectionManager {
  /**
   * Encrypt sensitive data
   */
  static encrypt(data) {
    try {
      if (!data) return null;

      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      const stringData = typeof data === 'string' ? data : JSON.stringify(data);
      
      let encrypted = cipher.update(stringData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData) {
    try {
      if (!encryptedData) return null;

      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt object properties
   */
  static encryptObject(obj, fieldsToEncrypt = PII_FIELDS) {
    if (!obj) return null;

    const encrypted = { ...obj };

    for (const field in fieldsToEncrypt) {
      if (fieldsToEncrypt[field] && encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object properties
   */
  static decryptObject(obj, fieldsToDecrypt = PII_FIELDS) {
    if (!obj) return null;

    const decrypted = { ...obj };

    for (const field in fieldsToDecrypt) {
      if (fieldsToDecrypt[field] && decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          // Keep original if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Mask PII fields (show only partial data)
   */
  static maskPII(data) {
    if (!data) return null;

    const masked = typeof data === 'string' ? JSON.parse(data) : { ...data };

    if (masked.email) {
      const [name, domain] = masked.email.split('@');
      const visibleChars = Math.max(1, Math.floor(name.length / 3));
      masked.email = name.substring(0, visibleChars) + '*'.repeat(name.length - visibleChars) + '@' + domain;
    }

    if (masked.phoneNumber) {
      masked.phoneNumber = masked.phoneNumber.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
    }

    if (masked.ssn) {
      masked.ssn = masked.ssn.replace(/\d/g, '*');
    }

    if (masked.nationalId) {
      masked.nationalId = masked.nationalId.replace(/\d(?=.*\d{4})/g, '*');
    }

    if (masked.creditCard) {
      masked.creditCard = masked.creditCard.replace(/\d(?=.*\d{4})/g, '*');
    }

    if (masked.bankAccount) {
      masked.bankAccount = masked.bankAccount.replace(/\d(?=.*\d{4})/g, '*');
    }

    if (masked.firstName) {
      masked.firstName = masked.firstName[0] + '*'.repeat(masked.firstName.length - 1);
    }

    if (masked.lastName) {
      masked.lastName = masked.lastName[0] + '*'.repeat(masked.lastName.length - 1);
    }

    return masked;
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hash(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Create export of user data (GDPR compliance)
   */
  static createUserDataExport(user) {
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          address: user.address,
          dateOfBirth: user.dateOfBirth
        }
      },
      activities: [],
      settings: user.settings || {},
      consents: {
        dataProcessing: user.consentDataProcessing || false,
        marketing: user.consentMarketing || false,
        analytics: user.consentAnalytics || false
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Anonymize user data (GDPR right to be forgotten)
   */
  static anonymizeUserData(user) {
    const anonymized = {
      ...user,
      firstName: '[ANONYMIZED]',
      lastName: '[ANONYMIZED]',
      email: `anonymized-${this.hash(user.id).substring(0, 16))}@anonymized.local`,
      phoneNumber: null,
      address: null,
      dateOfBirth: null,
      ssn: null,
      nationalId: null,
      bankAccount: null,
      creditCard: null,
      anonymizedAt: new Date(),
      anonymized: true
    };

    return anonymized;
  }

  /**
   * Get data retention period (in days)
   */
  static getDataRetentionPeriod(dataType) {
    const retentionPolicies = {
      personalData: 365,        // 1 year
      transactionData: 1825,    // 5 years (legal requirement)
      auditLogs: 90,           // 3 months
      accessLogs: 30,          // 1 month
      deletedUserData: 30      // 1 month before hard delete
    };

    return retentionPolicies[dataType] || 365;
  }

  /**
   * Check if data should be retained
   */
  static shouldRetainData(createdDate, dataType) {
    const createdTime = new Date(createdDate).getTime();
    const now = new Date().getTime();
    const retentionMs = this.getDataRetentionPeriod(dataType) * 24 * 60 * 60 * 1000;

    return (now - createdTime) < retentionMs;
  }

  /**
   * Create audit log entry
   */
  static createAuditLogEntry(userId, action, resource, changes, ip) {
    return {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      changes,
      ip,
      userAgent: global.userAgent || 'unknown'
    };
  }
}

/**
 * Express middleware for data protection
 */
const dataProtectionMiddleware = (req, res, next) => {
  // Attach data protection manager to request
  res.locals.dataProtection = DataProtectionManager;

  // Log access to sensitive endpoints
  if (isSensitiveEndpoint(req.path)) {
    const logEntry = DataProtectionManager.createAuditLogEntry(
      req.user?.id || 'anonymous',
      req.method,
      req.path,
      { query: req.query, body: req.method !== 'GET' ? '[REDACTED]' : null },
      req.ip
    );
    console.log('Sensitive endpoint access:', JSON.stringify(logEntry));
  }

  next();
};

/**
 * Middleware to mask PII in responses
 */
const sensitiveDateMaskingMiddleware = (req, res, next) => {
  // Only mask if user doesn't have full permission
  if (!req.user || !req.user.roles?.includes('admin')) {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      if (data && typeof data === 'object') {
        data = DataProtectionManager.maskPII(data);
      }
      return originalJson(data);
    };
  }

  next();
};

/**
 * Check if endpoint contains sensitive data
 */
const isSensitiveEndpoint = (path) => {
  const sensitivePatterns = [
    '/user/',
    '/profile',
    '/personal',
    '/sensitive',
    '/financial',
    '/medical',
    '/export',
    '/delete-account'
  ];

  return sensitivePatterns.some(pattern => path.includes(pattern));
};

/**
 * Consent management
 */
class ConsentManager {
  /**
   * Get user consents
   */
  static getUserConsents(userId) {
    // Implementation would fetch from database
    return {
      userId,
      dataProcessing: false,
      marketing: false,
      analytics: false,
      thirdPartySharing: false,
      updatedAt: new Date()
    };
  }

  /**
   * Set user consent
   */
  static setUserConsent(userId, consentType, value) {
    // Implementation would update database
    return {
      success: true,
      consentType,
      value,
      updatedAt: new Date()
    };
  }

  /**
   * Check if action requires consent
   */
  static requiresConsent(action) {
    const consentRequired = {
      'marketing-email': 'marketing',
      'analytics-tracking': 'analytics',
      'data-sharing': 'dataProcessing',
      'third-party-integration': 'thirdPartySharing'
    };

    return consentRequired[action];
  }
}

/**
 * Request body logging (without sensitive fields)
 */
const sanitizeBodyForLogging = (body) => {
  if (!body) return null;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'confirmPassword',
    'token',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
    'nationalId',
    'bankAccount'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

module.exports = {
  // Manager classes
  DataProtectionManager,
  ConsentManager,

  // Middleware
  dataProtectionMiddleware,
  sensitiveDateMaskingMiddleware,

  // Utilities
  sanitizeBodyForLogging,
  isSensitiveEndpoint,
  PII_FIELDS
};
