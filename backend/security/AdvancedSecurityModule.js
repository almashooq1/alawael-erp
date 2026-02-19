/**
 * Advanced Security Module - Phase 9
 * Multi-Factor Authentication (MFA), OAuth, Field Encryption
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class SecurityManager {
  /**
   * Multi-Factor Authentication (MFA) Service
   */
  static class MFAService {
    /**
     * Generate TOTP secret for user
     */
    static generateSecret(userEmail) {
      return speakeasy.generateSecret({
        name: `HR System (${userEmail})`,
        issuer: 'HR Management System',
        length: 32
      });
    }

    /**
     * Generate QR Code for TOTP setup
     */
    static async generateQRCode(secret) {
      try {
        const qrCode = await QRCode.toDataURL(secret.otpauth_url);
        return qrCode;
      } catch (error) {
        console.error('QR Code generation failed:', error);
        throw new Error('Failed to generate QR code');
      }
    }

    /**
     * Verify TOTP token
     */
    static verifyToken(secret, token) {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
    }

    /**
     * Generate backup codes
     */
    static generateBackupCodes(count = 10) {
      const codes = [];
      for (let i = 0; i < count; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }
      return codes;
    }

    /**
     * Validate backup code
     */
    static validateBackupCode(code, storedCodes) {
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      return storedCodes.includes(hashedCode);
    }
  }

  /**
   * Advanced Role-Based Access Control (RBAC)
   */
  static class AdvancedRBAC {
    constructor() {
      this.roles = new Map();
      this.permissions = new Map();
      this.resources = new Map();
      this.initializeDefaultRoles();
    }

    /**
     * Initialize default roles with hierarchy
     */
    initializeDefaultRoles() {
      // Admin role - full access
      this.createRole('admin', {
        level: 1,
        inherits: [],
        description: 'System administrator with full access'
      });

      // Manager role - department management
      this.createRole('manager', {
        level: 2,
        inherits: [],
        description: 'Department manager with team oversight'
      });

      // Employee role - basic access
      this.createRole('employee', {
        level: 3,
        inherits: [],
        description: 'Employee with basic HR access'
      });

      // HR Admin role - HR-specific
      this.createRole('hr_admin', {
        level: 2,
        inherits: [],
        description: 'HR administrator'
      });

      // Finance role - financial operations
      this.createRole('finance', {
        level: 2,
        inherits: [],
        description: 'Finance team member'
      });
    }

    /**
     * Create a new role
     */
    createRole(roleName, config) {
      this.roles.set(roleName, {
        name: roleName,
        level: config.level,
        inherits: config.inherits,
        description: config.description,
        permissions: new Set(),
        createdAt: new Date()
      });
    }

    /**
     * Define resource-specific permissions
     */
    defineResourcePermission(resource, permission, roles = []) {
      const key = `${resource}:${permission}`;
      this.permissions.set(key, {
        resource,
        permission,
        allowedRoles: new Set(roles),
        createdAt: new Date()
      });
    }

    /**
     * Grant permission to role
     */
    grantPermission(roleName, resource, permission) {
      const role = this.roles.get(roleName);
      if (role) {
        role.permissions.add(`${resource}:${permission}`);
      }
    }

    /**
     * Check if user can perform action on resource
     */
    canAccess(userRole, resource, action, resourceData = {}) {
      const role = this.roles.get(userRole);
      if (!role) return false;

      // Admin can do anything
      if (userRole === 'admin') return true;

      const permissionKey = `${resource}:${action}`;
      return role.permissions.has(permissionKey);
    }

    /**
     * Get all permissions for role
     */
    getRolePermissions(roleName) {
      const role = this.roles.get(roleName);
      return role ? Array.from(role.permissions) : [];
    }
  }

  /**
   * Field-Level Encryption Service
   */
  static class FieldEncryption {
    constructor(encryptionKey) {
      this.encryptionKey = crypto
        .createHash('sha256')
        .update(encryptionKey)
        .digest();
    }

    /**
     * Encrypt sensitive field
     */
    encryptField(plaintext) {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        this.encryptionKey,
        iv
      );

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return `${iv.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt sensitive field
     */
    decryptField(encryptedData) {
      const [ivHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        this.encryptionKey,
        iv
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }

    /**
     * Encrypt object fields
     */
    encryptObject(obj, fieldsToEncrypt) {
      const encrypted = { ...obj };
      fieldsToEncrypt.forEach(field => {
        if (encrypted[field]) {
          encrypted[field] = this.encryptField(encrypted[field]);
        }
      });
      return encrypted;
    }

    /**
     * Decrypt object fields
     */
    decryptObject(obj, fieldsToDecrypt) {
      const decrypted = { ...obj };
      fieldsToDecrypt.forEach(field => {
        if (decrypted[field]) {
          try {
            decrypted[field] = this.decryptField(decrypted[field]);
          } catch (error) {
            console.error(`Failed to decrypt field ${field}:`, error);
          }
        }
      });
      return decrypted;
    }
  }

  /**
   * OAuth Integration Service
   */
  static class OAuthService {
    constructor(config = {}) {
      this.config = {
        googleClientId: config.googleClientId,
        googleClientSecret: config.googleClientSecret,
        microsoftClientId: config.microsoftClientId,
        microsoftClientSecret: config.microsoftClientSecret,
        callbackUrl: config.callbackUrl || 'http://localhost:3001/oauth/callback'
      };
    }

    /**
     * Generate OAuth URL for Google
     */
    getGoogleAuthURL() {
      const params = new URLSearchParams({
        client_id: this.config.googleClientId,
        redirect_uri: this.config.callbackUrl,
        response_type: 'code',
        scope: 'openid email profile'
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    }

    /**
     * Generate OAuth URL for Microsoft
     */
    getMicrosoftAuthURL() {
      const params = new URLSearchParams({
        client_id: this.config.microsoftClientId,
        redirect_uri: this.config.callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'login'
      });
      return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
    }

    /**
     * Exchange authorization code for token
     */
    async exchangeCodeForToken(provider, code) {
      // Implementation would call provider's token endpoint
      console.log(`Exchanging code for ${provider}`);
      return {
        accessToken: 'token',
        idToken: 'idtoken',
        refreshToken: 'refreshtoken'
      };
    }

    /**
     * Get user info from OAuth provider
     */
    async getUserInfo(provider, accessToken) {
      // Implementation would call provider's userinfo endpoint
      console.log(`Getting user info from ${provider}`);
      return {
        id: 'user_id',
        email: 'user@example.com',
        name: 'User Name',
        picture: 'picture_url'
      };
    }
  }

  /**
   * Session Security Manager
   */
  static class SessionSecurity {
    /**
     * Validate session and detect suspicious activity
     */
    static validateSession(sessionData, userIP, userAgent) {
      const issues = [];

      // Check if IP has changed significantly
      if (sessionData.lastIP && sessionData.lastIP !== userIP) {
        issues.push({
          type: 'IP_CHANGE',
          severity: 'medium',
          message: 'Login from different IP address'
        });
      }

      // Check if user agent has changed
      if (sessionData.userAgent && sessionData.userAgent !== userAgent) {
        issues.push({
          type: 'USER_AGENT_CHANGE',
          severity: 'medium',
          message: 'Login from different browser/device'
        });
      }

      // Check session age
      const sessionAge = Date.now() - sessionData.createdAt;
      if (sessionAge > 24 * 60 * 60 * 1000) {
        issues.push({
          type: 'SESSION_EXPIRED',
          severity: 'high',
          message: 'Session has expired'
        });
      }

      return {
        isValid: issues.length === 0,
        issues: issues
      };
    }

    /**
     * Generate secure session token
     */
    static generateSessionToken() {
      return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Hash password with salt
     */
    static hashPassword(password) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto
        .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
        .toString('hex');
      return `${salt}:${hash}`;
    }

    /**
     * Verify password
     */
    static verifyPassword(password, storedHash) {
      const [salt, hash] = storedHash.split(':');
      const calculatedHash = crypto
        .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
        .toString('hex');
      return calculatedHash === hash;
    }
  }

  /**
   * Audit Logging Service
   */
  static class AuditLogger {
    constructor(db) {
      this.db = db;
    }

    /**
     * Log security event
     */
    async logEvent(eventType, userId, details) {
      const auditEntry = {
        eventType,
        userId,
        timestamp: new Date(),
        details: details,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      };

      try {
        // Store in audit collection
        await this.db.collection('audit_logs').insertOne(auditEntry);
        return auditEntry;
      } catch (error) {
        console.error('Failed to log audit event:', error);
        throw error;
      }
    }

    /**
     * Get audit trail for user
     */
    async getUserAuditTrail(userId, limit = 100) {
      return await this.db
        .collection('audit_logs')
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    }

    /**
     * Get security events
     */
    async getSecurityEvents(eventType, days = 7) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      return await this.db
        .collection('audit_logs')
        .find({
          eventType: eventType,
          timestamp: { $gte: since }
        })
        .sort({ timestamp: -1 })
        .toArray();
    }
  }
}

module.exports = SecurityManager;
