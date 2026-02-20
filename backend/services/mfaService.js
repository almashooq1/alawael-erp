/**
 * Multi-Factor Authentication Service
 * تطوير نظام المصادقة متعددة العوامل
 * 
 * Supports: TOTP (Google Authenticator), Email OTP, SMS OTP, Backup Codes
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class MFAService {
  constructor() {
    this.otpExpiration = 5 * 60 * 1000; // 5 minutes
    this.backupCodesCount = 10;
  }

  /**
   * Generate TOTP Secret and QR Code
   * إنشاء رمز TOTP وكود QR
   */
  async generateTOTPSecret(userEmail, appName = 'ERP System') {
    try {
      const secret = speakeasy.generateSecret({
        name: `${appName} (${userEmail})`,
        issuer: appName,
        length: 32,
      });

      // Generate QR Code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode,
        otpauth_url: secret.otpauth_url,
        manualEntryKey: secret.base32,
      };
    } catch (error) {
      throw new Error(`Failed to generate TOTP secret: ${error.message}`);
    }
  }

  /**
   * Verify TOTP Token
   * التحقق من رمز TOTP
   */
  verifyTOTP(token, secret, window = 2) {
    try {
      const isValid = speakeasy.totp.verify({
        secret,
        encodingType: 'base32',
        token,
        window, // Allow 30 seconds before and after
      });

      return isValid;
    } catch (error) {
      throw new Error(`Failed to verify TOTP token: ${error.message}`);
    }
  }

  /**
   * Generate Email OTP
   * توليد رمز OTP عبر البريد الإلكتروني
   */
  generateEmailOTP() {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + this.otpExpiration);

    return {
      code: otp,
      expiresAt,
      expiresIn: this.otpExpiration / 1000, // seconds
    };
  }

  /**
   * Generate SMS OTP
   * توليد رمز OTP عبر الرسائل النصية
   */
  generateSMSOTP() {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + this.otpExpiration);

    return {
      code: otp,
      expiresAt,
      expiresIn: this.otpExpiration / 1000,
    };
  }

  /**
   * Verify OTP Code
   * التحقق من رمز OTP
   */
  verifyOTP(providedCode, storedCode, expiresAt) {
    try {
      // Check if OTP has expired
      if (new Date() > new Date(expiresAt)) {
        return {
          isValid: false,
          message: 'OTP has expired',
          error: 'EXPIRED',
        };
      }

      // Check if code matches (constant time comparison)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(providedCode.toString()),
        Buffer.from(storedCode.toString())
      );

      return {
        isValid,
        message: isValid ? 'OTP verified successfully' : 'Invalid OTP',
        error: isValid ? null : 'INVALID_OTP',
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'OTP verification failed',
        error: 'VERIFICATION_FAILED',
      };
    }
  }

  /**
   * Generate Backup Codes
   * توليد أكواد احتياطية
   */
  generateBackupCodes(count = this.backupCodesCount) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Hash Backup Code (for storage)
   * تشفير رمز احتياطي للتخزين
   */
  hashBackupCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Verify Backup Code
   * التحقق من الرمز الاحتياطي
   */
  verifyBackupCode(providedCode, hashedCode) {
    const hash = crypto.createHash('sha256').update(providedCode).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hashedCode)
    );
  }

  /**
   * Generate MFA Recovery Key
   * إنشاء مفتاح استرجاع MFA
   */
  generateRecoveryKey() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Create MFA Session
   * إنشاء جلسة MFA
   */
  createMFASession(userId, method = 'totp', metadata = {}) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    return {
      sessionId,
      userId,
      method,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      metadata,
    };
  }

  /**
   * Validate MFA Session
   * التحقق من جلسة MFA
   */
  validateMFASession(session) {
    if (!session) {
      return {
        isValid: false,
        message: 'MFA session not found',
      };
    }

    if (new Date() > new Date(session.expiresAt)) {
      return {
        isValid: false,
        message: 'MFA session has expired',
      };
    }

    if (session.attempts >= session.maxAttempts) {
      return {
        isValid: false,
        message: 'Maximum verification attempts exceeded',
      };
    }

    return {
      isValid: true,
      message: 'MFA session is valid',
      attemptsRemaining: session.maxAttempts - session.attempts,
    };
  }

  /**
   * Generate Trusted Device Token
   * إنشاء رمز جهاز موثوق
   */
  generateTrustedDeviceToken(userId, deviceFingerprint) {
    const token = crypto
      .createHash('sha256')
      .update(`${userId}:${deviceFingerprint}:${Date.now()}`)
      .digest('hex');

    return {
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  }

  /**
   * Get MFA Setup Guide
   * الحصول على دليل إعداد MFA
   */
  getMFASetupGuide() {
    return {
      totp: {
        name: 'Time-based One-Time Password (TOTP)',
        description: 'Use an authenticator app like Google Authenticator or Authy',
        steps: [
          'Download an authenticator app (Google Authenticator, Microsoft Authenticator, or Authy)',
          'Scan the QR code displayed on the setup page',
          'Enter the 6-digit code from your authenticator app',
          'Save your backup codes in a safe place',
        ],
        advantages: [
          'Works offline',
          'No need for SMS or email',
          'Widely supported',
        ],
      },
      email: {
        name: 'Email One-Time Password',
        description: 'Receive a code via email for verification',
        steps: [
          'When logging in, you will receive a 6-digit code via email',
          'Enter the code in the verification prompt',
          'The code expires after 5 minutes',
        ],
        advantages: [
          'No additional app needed',
          'Works on any device',
        ],
      },
      sms: {
        name: 'SMS One-Time Password',
        description: 'Receive a code via text message for verification',
        steps: [
          'When logging in, you will receive a 6-digit code via SMS',
          'Enter the code in the verification prompt',
          'The code expires after 5 minutes',
        ],
        advantages: [
          'Works on any phone',
          'Fast delivery',
        ],
      },
    };
  }

  /**
   * Calculate Security Score
   * حساب درجة الأمان
   */
  calculateSecurityScore(mfaMethods) {
    let score = 0;
    const maxScore = 100;

    if (mfaMethods.totp) score += 40;
    if (mfaMethods.email) score += 30;
    if (mfaMethods.sms) score += 20;
    if (mfaMethods.backupCodes && mfaMethods.backupCodes.length > 0) score += 10;

    return Math.min(score, maxScore);
  }

  /**
   * Generate MFA Audit Log
   * إنشاء سجل تدقيق MFA
   */
  createAuditLog(userId, action, status, metadata = {}) {
    return {
      userId,
      action,
      status,
      timestamp: new Date(),
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      deviceInfo: metadata.deviceInfo || null,
    };
  }
}

module.exports = new MFAService();
