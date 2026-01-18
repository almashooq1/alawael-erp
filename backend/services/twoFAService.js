/**
 * Two-Factor Authentication (2FA) Service
 * Supports SMS OTP, Email OTP, Google Authenticator
 */

const crypto = require('crypto');
const emailService = require('./emailService');
const smsService = require('./smsService');

// In-memory storage (replace with MongoDB)
let otpStore = new Map();
let twoFASettings = new Map();
let backupCodes = new Map();

class TwoFAService {
  /**
   * Generate OTP (One-Time Password)
   */
  generateOTP(length = 6) {
    const chars = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
  }

  /**
   * Send OTP via SMS
   */
  async sendOTPviaSMS(phoneNumber) {
    try {
      const otp = this.generateOTP(6);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      otpStore.set(phoneNumber, {
        otp,
        expiresAt,
        attempts: 0,
        maxAttempts: 3,
        type: 'sms',
      });

      // Send OTP via SMS
      await smsService.sendSMSWithTemplate(phoneNumber, 'verificationCode', {
        code: otp,
      });

      return {
        success: true,
        message: 'OTP sent to phone',
        expiresIn: '5 minutes',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send OTP via Email
   */
  async sendOTPviaEmail(email) {
    try {
      const otp = this.generateOTP(6);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      otpStore.set(email, {
        otp,
        expiresAt,
        attempts: 0,
        maxAttempts: 3,
        type: 'email',
      });

      // Send OTP via Email
      await emailService.sendEmail(email, 'emailVerification', {
        code: otp,
        expiresIn: '5 minutes',
      });

      return {
        success: true,
        message: 'OTP sent to email',
        expiresIn: '5 minutes',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(identifier, otp) {
    try {
      const otpData = otpStore.get(identifier);

      if (!otpData) {
        return {
          success: false,
          error: 'OTP not found. Request a new one.',
        };
      }

      // Check if OTP expired
      if (new Date() > otpData.expiresAt) {
        otpStore.delete(identifier);
        return {
          success: false,
          error: 'OTP expired. Request a new one.',
        };
      }

      // Check attempts
      if (otpData.attempts >= otpData.maxAttempts) {
        otpStore.delete(identifier);
        return {
          success: false,
          error: 'Maximum attempts exceeded. Request a new OTP.',
        };
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        otpData.attempts++;
        return {
          success: false,
          error: `Invalid OTP. ${otpData.maxAttempts - otpData.attempts} attempts remaining.`,
        };
      }

      // OTP verified
      otpStore.delete(identifier);

      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate Google Authenticator Secret
   */
  generateGoogleAuthSecret() {
    const secret = crypto.randomBytes(32).toString('base64');
    return {
      secret,
      qrCode: this.generateQRCode(secret),
    };
  }

  /**
   * Generate QR Code for Google Authenticator
   */
  generateQRCode(secret) {
    // In production, use qrcode library
    // For now, return placeholder
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`otpauth://totp/${secret}`)}`;
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId, method = 'sms', phoneOrEmail) {
    try {
      const twoFAData = {
        userId,
        method, // 'sms', 'email', or 'google-auth'
        phoneOrEmail,
        enabled: false,
        enabledAt: null,
        backupCodes: [],
        createdAt: new Date(),
      };

      if (method === 'google-auth') {
        const authData = this.generateGoogleAuthSecret();
        twoFAData.secret = authData.secret;
        twoFAData.qrCode = authData.qrCode;
      }

      twoFASettings.set(`${userId}-temp`, twoFAData);

      return {
        success: true,
        message: '2FA setup started',
        twoFAData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Confirm 2FA setup
   */
  async confirm2FA(userId, otp) {
    try {
      const tempData = twoFASettings.get(`${userId}-temp`);

      if (!tempData) {
        return {
          success: false,
          error: '2FA setup not found',
        };
      }

      // Verify OTP first
      if (tempData.method === 'sms' || tempData.method === 'email') {
        const verification = await this.verifyOTP(tempData.phoneOrEmail, otp);
        if (!verification.success) {
          return verification;
        }
      }

      // Generate backup codes
      const codes = this.generateBackupCodes();
      tempData.backupCodes = codes;
      tempData.enabled = true;
      tempData.enabledAt = new Date();

      // Save to permanent store
      twoFASettings.set(userId, tempData);
      twoFASettings.delete(`${userId}-temp`);

      // Store backup codes
      backupCodes.set(userId, codes);

      return {
        success: true,
        message: '2FA enabled successfully',
        backupCodes: codes,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId, password) {
    try {
      // In production, verify password
      // For now, just remove 2FA settings

      twoFASettings.delete(userId);
      backupCodes.delete(userId);

      return {
        success: true,
        message: '2FA disabled successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(userId) {
    try {
      const twoFAData = twoFASettings.get(userId);

      return {
        success: true,
        enabled: !!twoFAData?.enabled,
        method: twoFAData?.method || null,
        phoneOrEmail: twoFAData?.phoneOrEmail || null,
        enabledAt: twoFAData?.enabledAt || null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate Backup Codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Use backup code
   */
  async useBackupCode(userId, code) {
    try {
      const codes = backupCodes.get(userId);

      if (!codes || !codes.includes(code)) {
        return {
          success: false,
          error: 'Invalid backup code',
        };
      }

      // Remove used code
      const index = codes.indexOf(code);
      codes.splice(index, 1);

      return {
        success: true,
        message: 'Backup code verified',
        remainingCodes: codes.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId) {
    try {
      const codes = this.generateBackupCodes();
      backupCodes.set(userId, codes);

      return {
        success: true,
        message: 'Backup codes regenerated',
        backupCodes: codes,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = TwoFAService;
