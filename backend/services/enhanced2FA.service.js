/**
 * Enhanced 2FA/MFA Service
 * خدمة المصادقة الثنائية المحسّنة
 *
 * Features:
 * - TOTP (Time-based One-Time Password) support
 * - Backup codes generation and validation
 * - Remember device for 30 days
 * - SMS/Email 2FA fallback
 * - QR code generation for authenticator apps
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const AuditLogger = require('./audit-logger');
const emailService = require('./emailService');
const smsService = require('./smsService');

class Enhanced2FAService {
  /**
   * Generate TOTP secret for user
   */
  async generateTOTPSecret(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `AlAwael ERP (${user.email})`,
        issuer: 'AlAwael ERP',
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Store secret (not enabled yet)
      user.mfa = user.mfa || {};
      user.mfa.secret = secret.base32;
      user.mfa.enabled = false; // Will be enabled after verification
      await user.save();

      await AuditLogger.log({
        action: '2fa.secret_generated',
        userId,
        metadata: { method: 'totp' },
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url,
      };
    } catch (error) {
      console.error('Error generating TOTP secret:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
    });
  }

  /**
   * Enable 2FA for user (after token verification)
   */
  async enable2FA(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa || !user.mfa.secret) {
        throw new Error('2FA not initialized');
      }

      // Verify token
      const isValid = this.verifyTOTP(user.mfa.secret, token);
      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(8);

      // Enable 2FA
      user.mfa.enabled = true;
      user.mfa.backupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
      );
      user.mfa.enabledAt = new Date();
      await user.save();

      await AuditLogger.log({
        action: '2fa.enabled',
        userId,
        metadata: { method: 'totp', backupCodesGenerated: backupCodes.length },
      });

      // Send confirmation email
      try {
        await emailService.send2FAEnabledEmail(user.email, user.username);
      } catch (emailError) {
        console.warn('Failed to send 2FA enabled email:', emailError);
      }

      return {
        success: true,
        backupCodes, // Return plain codes (only time they're shown)
      };
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId, password) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Disable 2FA
      user.mfa = {
        enabled: false,
        secret: null,
        backupCodes: [],
      };
      await user.save();

      await AuditLogger.log({
        action: '2fa.disabled',
        userId,
        metadata: { method: 'totp' },
      });

      // Send notification
      try {
        await emailService.send2FADisabledEmail(user.email, user.username);
      } catch (emailError) {
        console.warn('Failed to send 2FA disabled email:', emailError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA token during login
   */
  async verify2FALogin(userId, token, method = 'totp') {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa || !user.mfa.enabled) {
        throw new Error('2FA not enabled');
      }

      let isValid = false;

      if (method === 'totp') {
        // Verify TOTP token
        isValid = this.verifyTOTP(user.mfa.secret, token);
      } else if (method === 'backup') {
        // Verify backup code
        isValid = await this.verifyBackupCode(userId, token);
      }

      if (isValid) {
        await AuditLogger.log({
          action: '2fa.verified',
          userId,
          metadata: { method, success: true },
        });
      } else {
        await AuditLogger.log({
          action: '2fa.verification_failed',
          userId,
          metadata: { method, success: false },
        });
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, code) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa || !user.mfa.backupCodes) {
        return false;
      }

      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      const index = user.mfa.backupCodes.indexOf(hashedCode);

      if (index !== -1) {
        // Remove used backup code
        user.mfa.backupCodes.splice(index, 1);
        await user.save();

        await AuditLogger.log({
          action: '2fa.backup_code_used',
          userId,
          metadata: { remainingCodes: user.mfa.backupCodes.length },
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId, password) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Generate new backup codes
      const backupCodes = this.generateBackupCodes(8);
      user.mfa.backupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
      );
      await user.save();

      await AuditLogger.log({
        action: '2fa.backup_codes_regenerated',
        userId,
        metadata: { count: backupCodes.length },
      });

      return {
        success: true,
        backupCodes,
      };
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw error;
    }
  }

  /**
   * Send 2FA code via SMS
   */
  async sendSMS2FA(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.phone) {
        throw new Error('User or phone not found');
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code temporarily (5 minutes expiration)
      user.mfa = user.mfa || {};
      user.mfa.smsCode = crypto.createHash('sha256').update(code).digest('hex');
      user.mfa.smsCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      // Send SMS
      await smsService.sendVerificationCode(user.phone, code);

      await AuditLogger.log({
        action: '2fa.sms_sent',
        userId,
        metadata: { phone: user.phone.slice(-4) },
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending SMS 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify SMS 2FA code
   */
  async verifySMS2FA(userId, code) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa || !user.mfa.smsCode) {
        return false;
      }

      // Check expiration
      if (new Date() > user.mfa.smsCodeExpires) {
        return false;
      }

      // Verify code
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      if (hashedCode === user.mfa.smsCode) {
        // Clear SMS code
        user.mfa.smsCode = null;
        user.mfa.smsCodeExpires = null;
        await user.save();

        await AuditLogger.log({
          action: '2fa.sms_verified',
          userId,
          metadata: { success: true },
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying SMS 2FA:', error);
      return false;
    }
  }

  /**
   * Remember device for 30 days
   */
  async rememberDevice(userId, deviceFingerprint) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.mfa = user.mfa || {};
      user.mfa.trustedDevices = user.mfa.trustedDevices || [];

      // Add device
      const deviceToken = crypto.randomBytes(32).toString('hex');
      user.mfa.trustedDevices.push({
        fingerprint: deviceFingerprint,
        token: crypto.createHash('sha256').update(deviceToken).digest('hex'),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      await user.save();

      await AuditLogger.log({
        action: '2fa.device_remembered',
        userId,
        metadata: { deviceFingerprint },
      });

      return { deviceToken };
    } catch (error) {
      console.error('Error remembering device:', error);
      throw error;
    }
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId, deviceFingerprint, deviceToken) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.mfa || !user.mfa.trustedDevices) {
        return false;
      }

      const hashedToken = crypto.createHash('sha256').update(deviceToken).digest('hex');

      const device = user.mfa.trustedDevices.find(
        d =>
          d.fingerprint === deviceFingerprint && d.token === hashedToken && new Date() < d.expiresAt
      );

      return !!device;
    } catch (error) {
      console.error('Error checking trusted device:', error);
      return false;
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        enabled: user.mfa?.enabled || false,
        method: user.mfa?.enabled ? 'totp' : null,
        backupCodesCount: user.mfa?.backupCodes?.length || 0,
        trustedDevicesCount: user.mfa?.trustedDevices?.length || 0,
        enabledAt: user.mfa?.enabledAt || null,
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw error;
    }
  }
}

module.exports = new Enhanced2FAService();
