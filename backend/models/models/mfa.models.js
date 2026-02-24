/**
 * MFA Models
 * نماذج المصادقة متعددة العوامل
 */

const mongoose = require('mongoose');

// ============ MFA SETTINGS SCHEMA ============
/**
 * Stores user MFA configuration and preferences
 * تخزين إعدادات وتفضيلات MFA للمستخدم
 */
const mfaSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // TOTP Configuration
    totp: {
      enabled: {
        type: Boolean,
        default: false,
      },
      secret: String,
      verifiedAt: Date,
      backupCodesGenerated: {
        type: Boolean,
        default: false,
      },
    },
    // Email OTP Configuration
    emailOTP: {
      enabled: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
    },
    // SMS OTP Configuration
    smsOTP: {
      enabled: {
        type: Boolean,
        default: false,
      },
      phoneNumber: String,
      countryCode: String,
      verifiedAt: Date,
    },
    // Backup Codes
    backupCodes: [
      {
        code: String, // Hashed
        used: {
          type: Boolean,
          default: false,
        },
        usedAt: Date,
      },
    ],
    // MFA Enforcement
    requireMFA: {
      type: Boolean,
      default: false,
    },
    primaryMethod: {
      type: String,
      enum: ['totp', 'email', 'sms', 'none'],
      default: 'none',
    },
    // Trusted Devices
    trustedDevices: [
      {
        deviceId: String,
        deviceName: String,
        fingerprint: String,
        token: String,
        createdAt: Date,
        expiresAt: Date,
        lastUsedAt: Date,
        ipAddress: String,
        userAgent: String,
      },
    ],
    // Recovery Information
    recovery: {
      recoveryKey: String,
      recoveryEmail: String,
      recoveryPhone: String,
      recoveryCodeRequests: {
        type: Number,
        default: 0,
      },
    },
    // Security Settings
    security: {
      requireMFAForSensitiveActions: {
        type: Boolean,
        default: true,
      },
      requireMFAForDataExport: {
        type: Boolean,
        default: true,
      },
      requireMFAForPasswordChange: {
        type: Boolean,
        default: true,
      },
      rememberDeviceFor: {
        type: Number,
        default: 30, // days
      },
    },
    // Audit Trail
    auditLog: [
      {
        action: String,
        status: String,
        timestamp: Date,
        ipAddress: String,
        userAgent: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============ MFA SESSION SCHEMA ============
/**
 * Temporary sessions for MFA verification process
 * جلسات مؤقتة لعملية التحقق من MFA
 */
const mfaSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    method: {
      type: String,
      enum: ['totp', 'email', 'sms', 'backup', 'trustedDevice'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'failed'],
      default: 'pending',
    },
    // OTP Details
    otpCode: String,
    otpHash: String,
    expiresAt: Date,
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    // Session Metadata
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    loginAttemptId: mongoose.Schema.Types.ObjectId,
    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 900, // Auto-delete after 15 minutes
    },
    verifiedAt: Date,
  },
  { timestamps: true }
);

// ============ OTP LOG SCHEMA ============
/**
 * Log of all OTP codes sent and verification attempts
 * سجل جميع أكواد OTP المرسلة ومحاولات التحقق
 */
const otpLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    method: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
    },
    recipient: {
      type: String,
      required: true, // Email or phone
    },
    otpHash: String,
    status: {
      type: String,
      enum: ['sent', 'verified', 'expired', 'error'],
      default: 'sent',
    },
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    verifiedAt: Date,
    expiresAt: Date,
    // Delivery Information
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'bounced'],
      default: 'pending',
    },
    deliveryError: String,
    // Request Context
    ipAddress: String,
    userAgent: String,
    reason: String, // login, passwordReset, etc.
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000, // Auto-delete after 30 days
    },
  },
  { timestamps: true }
);

// ============ MFA AUDIT LOG SCHEMA ============
/**
 * Audit log for all MFA-related activities
 * سجل التدقيق لجميع أنشطة MFA
 */
const mfaAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'mfa_setup',
        'mfa_enable',
        'mfa_disable',
        'verification_attempt',
        'verification_success',
        'verification_failed',
        'backup_code_generated',
        'backup_code_used',
        'device_trusted',
        'device_revoked',
        'recovery_initiated',
        'recovery_completed',
        'settings_changed',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
    },
    method: {
      type: String,
      enum: ['totp', 'email', 'sms', 'backup', 'recovery'],
    },
    // Details of the action
    details: {
      reason: String,
      changedSettings: Object,
      previousValues: Object,
      newValues: Object,
    },
    // Request Context
    ipAddress: String,
    userAgent: String,
    location: String,
    deviceInfo: String,
    // Error Information
    error: String,
    errorCode: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============ TRUSTED DEVICE SCHEMA ============
/**
 * Tracks trusted devices to allow skipping MFA on known devices
 * تتبع الأجهزة الموثوقة للسماح بتخطي MFA على الأجهزة المعروفة
 */
const trustedDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
    },
    deviceName: String,
    deviceType: {
      type: String,
      enum: ['web', 'mobile', 'desktop', 'tablet'],
    },
    fingerprint: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    ipAddress: String,
    userAgent: String,
    location: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    // Trust Status
    isTrusted: {
      type: Boolean,
      default: true,
    },
    trustVerifiedAt: Date,
    // Activity
    lastUsedAt: Date,
    loginCount: {
      type: Number,
      default: 1,
    },
    // Expiration
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    revokedAt: Date,
    revokeReason: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ============ MFA RECOVERY LOG SCHEMA ============
/**
 * Logs account recovery attempts
 * سجل محاولات استرجاع الحساب
 */
const mfaRecoveryLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recoveryMethod: {
      type: String,
      enum: ['recovery_key', 'backup_code', 'email', 'support'],
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'pending_verification', 'verified', 'completed', 'failed'],
      default: 'initiated',
    },
    recoveryToken: {
      type: String,
      required: true,
      unique: true,
    },
    tokenExpiresAt: Date,
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    ipAddress: String,
    userAgent: String,
    // Recovery Details
    mfaMethodRecovered: String,
    newSettingsApplied: Object,
    completedAt: Date,
    supportNotes: String,
    adminApprovedBy: mongoose.Schema.Types.ObjectId,
    adminApprovedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 7776000, // Auto-delete after 90 days
    },
  },
  { timestamps: true }
);

// Export Models
const MFASettings = mongoose.model('MFASettings', mfaSettingsSchema);
const MFASession = mongoose.model('MFASession', mfaSessionSchema);
const OTPLog = mongoose.model('OTPLog', otpLogSchema);
const MFAAuditLog = mongoose.model('MFAAuditLog', mfaAuditLogSchema);
const TrustedDevice = mongoose.model('TrustedDevice', trustedDeviceSchema);
const MFARecoveryLog = mongoose.model('MFARecoveryLog', mfaRecoveryLogSchema);

module.exports = {
  MFASettings,
  MFASession,
  OTPLog,
  MFAAuditLog,
  TrustedDevice,
  MFARecoveryLog,
  mfaSettingsSchema,
  mfaSessionSchema,
  otpLogSchema,
  mfaAuditLogSchema,
  trustedDeviceSchema,
  mfaRecoveryLogSchema,
};
