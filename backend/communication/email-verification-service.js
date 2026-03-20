/* eslint-disable no-unused-vars */
/**
 * Email Verification Service
 * خدمة التحقق من البريد الإلكتروني
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const dns = require('dns').promises;
const { promisify } = require('util');
const logger = require('../utils/logger');

// Email Verification Schema
const EmailVerificationSchema = new mongoose.Schema({
  verificationId: { type: String, required: true, unique: true },
  email: { type: String, required: true, index: true },
  token: { type: String, required: true },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset', 'email_change', 'account_activation'],
    default: 'email_verification',
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired', 'used'],
    default: 'pending',
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  expiresAt: { type: Date, required: true },
  verifiedAt: { type: Date },
  metadata: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    ipAddress: String,
    userAgent: String,
    oldEmail: String, // For email change
    newEmail: String,
  },
  createdAt: { type: Date, default: Date.now },
});

// Indexes
EmailVerificationSchema.index({ email: 1, type: 1, status: 1 });
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification = mongoose.model('EmailVerification', EmailVerificationSchema);

// Email Bounce Schema
const EmailBounceSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  bounceType: {
    type: String,
    enum: ['hard', 'soft', 'spam', 'complaint'],
    required: true,
  },
  reason: String,
  providerResponse: mongoose.Schema.Types.Mixed,
  lastBounceAt: { type: Date, default: Date.now },
  bounceCount: { type: Number, default: 1 },
  isSuppressed: { type: Boolean, default: false },
  suppressedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

EmailBounceSchema.index({ email: 1 });
EmailBounceSchema.index({ isSuppressed: 1 });

const EmailBounce = mongoose.model('EmailBounce', EmailBounceSchema);

class EmailVerificationService {
  constructor(config = {}) {
    this.tokenLength = config.tokenLength || 32;
    this.otpLength = config.otpLength || 6;
    this.defaultExpiryMinutes = config.expiryMinutes || 24 * 60; // 24 hours
    this.otpExpiryMinutes = config.otpExpiryMinutes || 10; // 10 minutes for OTP
  }

  /**
   * Generate verification token
   */
  generateToken(length = this.tokenLength) {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Generate OTP code
   */
  generateOTP(length = this.otpLength) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Create email verification request
   */
  async createVerification(email, options = {}) {
    const {
      type = 'email_verification',
      userId,
      expiryMinutes = this.defaultExpiryMinutes,
      ipAddress,
      userAgent,
      useOTP = false,
    } = options;

    // Invalidate any existing pending verifications
    await EmailVerification.updateMany({ email, type, status: 'pending' }, { status: 'expired' });

    const verificationId = `ver_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const token = useOTP ? this.generateOTP() : this.generateToken();
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const verification = await EmailVerification.create({
      verificationId,
      email,
      token,
      type,
      expiresAt,
      metadata: {
        userId,
        ipAddress,
        userAgent,
      },
    });

    return {
      verificationId,
      token,
      expiresAt,
      isOTP: useOTP,
    };
  }

  /**
   * Verify email with token
   */
  async verifyToken(email, token, options = {}) {
    const { type = 'email_verification', incrementAttempt = true } = options;

    const verification = await EmailVerification.findOne({
      email,
      type,
      status: 'pending',
    });

    if (!verification) {
      return {
        success: false,
        error: 'VERIFICATION_NOT_FOUND',
        message: 'لم يتم العثور على طلب تحقق',
      };
    }

    // Check expiry
    if (verification.expiresAt < new Date()) {
      verification.status = 'expired';
      await verification.save();
      return {
        success: false,
        error: 'VERIFICATION_EXPIRED',
        message: 'انتهت صلاحية رابط التحقق',
      };
    }

    // Increment attempts
    if (incrementAttempt) {
      verification.attempts += 1;
      await verification.save();
    }

    // Check max attempts
    if (verification.attempts > verification.maxAttempts) {
      verification.status = 'expired';
      await verification.save();
      return {
        success: false,
        error: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'تم تجاوز الحد الأقصى من المحاولات',
      };
    }

    // Verify token
    if (verification.token !== token) {
      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: 'رمز التحقق غير صحيح',
        attemptsRemaining: verification.maxAttempts - verification.attempts,
      };
    }

    // Mark as verified
    verification.status = 'verified';
    verification.verifiedAt = new Date();
    await verification.save();

    return {
      success: true,
      message: 'تم التحقق من البريد الإلكتروني بنجاح',
      verificationId: verification.verificationId,
      userId: verification.metadata.userId,
    };
  }

  /**
   * Validate email format
   */
  validateEmailFormat(email) {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }

  /**
   * Validate email domain (DNS MX lookup)
   */
  async validateEmailDomain(email) {
    try {
      const domain = email.split('@')[1];
      if (!domain) return { valid: false, reason: 'Invalid email format' };

      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return { valid: false, reason: 'No MX records found for domain' };
      }

      return {
        valid: true,
        domain,
        mxRecords: mxRecords.map(r => r.exchange),
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        return { valid: false, reason: 'Domain not found' };
      }
      logger.error('MX record verification failed:', error.message);
      return { valid: false, reason: 'فشل التحقق من النطاق' };
    }
  }

  /**
   * Full email validation
   */
  async validateEmail(email) {
    // Format validation
    if (!this.validateEmailFormat(email)) {
      return { valid: false, reason: 'صيغة البريد الإلكتروني غير صحيحة' };
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is suppressed
    const bounce = await EmailBounce.findOne({ email: normalizedEmail, isSuppressed: true });
    if (bounce) {
      return {
        valid: false,
        reason: 'هذا البريد الإلكتروني محظور بسبب مشاكل سابقة',
        bounceType: bounce.bounceType,
      };
    }

    // Domain validation
    const domainCheck = await this.validateEmailDomain(normalizedEmail);

    return {
      valid: domainCheck.valid,
      email: normalizedEmail,
      domain: domainCheck.domain,
      mxRecords: domainCheck.mxRecords,
      reason: domainCheck.valid ? null : domainCheck.reason,
    };
  }

  /**
   * Record bounce
   */
  async recordBounce(email, bounceData) {
    const { type, reason, providerResponse } = bounceData;

    let bounce = await EmailBounce.findOne({ email });

    if (bounce) {
      bounce.bounceCount += 1;
      bounce.lastBounceAt = new Date();
      bounce.reason = reason;
      bounce.providerResponse = providerResponse;

      // Auto-suppress after 3 hard bounces
      if (type === 'hard' && bounce.bounceCount >= 3) {
        bounce.isSuppressed = true;
        bounce.suppressedAt = new Date();
      }
    } else {
      bounce = await EmailBounce.create({
        email,
        bounceType: type,
        reason,
        providerResponse,
        isSuppressed: type === 'hard' || type === 'spam',
      });
      if (bounce.isSuppressed) {
        bounce.suppressedAt = new Date();
      }
    }

    await bounce.save();
    return bounce;
  }

  /**
   * Remove from suppression list
   */
  async removeFromSuppression(email) {
    const result = await EmailBounce.updateOne(
      { email },
      { isSuppressed: false, suppressedAt: null }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get suppressed emails
   */
  async getSuppressedEmails(page = 1, limit = 100) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      EmailBounce.find({ isSuppressed: true }).sort({ suppressedAt: -1 }).skip(skip).limit(limit),
      EmailBounce.countDocuments({ isSuppressed: true }),
    ]);

    return {
      data: emails,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Check if email is suppressed
   */
  async isSuppressed(email) {
    const bounce = await EmailBounce.findOne({ email, isSuppressed: true });
    return !!bounce;
  }

  /**
   * Cleanup expired verifications
   */
  async cleanupExpired() {
    const result = await EmailVerification.deleteMany({
      status: 'pending',
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}

module.exports = {
  EmailVerificationService,
  EmailVerification,
  EmailBounce,
};
