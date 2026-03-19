/**
 * MFA Controller
 * تحكم المصادقة متعددة العوامل
 */

const crypto = require('crypto');
const mfaService = require('../services/mfaService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const {
  MFASettings,
  MFASession,
  OTPLog,
  MFAAuditLog,
  TrustedDevice,
  _MFARecoveryLog,
} = require('../models/mfa.models');
const { User } = require('../models/schemas');

// ============ SETUP ENDPOINTS ============

/**
 * Get MFA Setup Guide
 * الحصول على دليل إعداد MFA
 */
exports.getMFASetupGuide = async (req, res) => {
  try {
    const guide = mfaService.getMFASetupGuide();
    res.status(200).json({
      success: true,
      data: guide,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Initialize TOTP Setup
 * بدء إعداد TOTP
 */
exports.initiateTOTPSetup = async (req, res) => {
  try {
    const userId = req.user._id;

    // Generate TOTP secret and QR code
    const totpData = await mfaService.generateTOTPSecret(req.user.email);

    // Create MFA settings if doesn't exist
    let mfaSettings = await MFASettings.findOne({ userId });
    if (!mfaSettings) {
      mfaSettings = await MFASettings.create({ userId });
    }

    // Log the setup initiation
    await MFAAuditLog.create({
      userId,
      action: 'mfa_setup',
      status: 'success',
      method: 'totp',
      details: {
        reason: 'User initiated TOTP setup',
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'TOTP setup initiated',
      data: {
        qrCode: totpData.qrCode,
        manualEntryKey: totpData.manualEntryKey,
        secret: totpData.secret,
        setupInstructions: {
          step1: 'Download an authenticator app',
          step2: 'Scan the QR code or enter the manual key',
          step3: 'Enter the 6-digit code to verify',
          step4: 'Save your backup codes in a safe place',
        },
      },
    });
  } catch (error) {
    await MFAAuditLog.create({
      userId: req.user._id,
      action: 'mfa_setup',
      status: 'failed',
      method: 'totp',
      error: error.message,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Verify TOTP and Enable
 * التحقق من TOTP وتفعيله
 */
exports.verifyAndEnableTOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { token, secret } = req.body;

    if (!token || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Token and secret are required',
      });
    }

    // Verify TOTP token
    const isValid = mfaService.verifyTOTP(token, secret);
    if (!isValid) {
      await MFAAuditLog.create({
        userId,
        action: 'verification_failed',
        status: 'failed',
        method: 'totp',
        error: 'Invalid TOTP token',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid TOTP token',
      });
    }

    // Generate backup codes
    const backupCodes = mfaService.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map((code) => ({
      code: mfaService.hashBackupCode(code),
      used: false,
    }));

    // Update MFA settings
    let _mfaSettings = await MFASettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          totp: {
            enabled: true,
            secret,
            verifiedAt: new Date(),
            backupCodesGenerated: true,
          },
          primaryMethod: 'totp',
        },
        $push: {
          backupCodes: { $each: hashedBackupCodes },
        },
      },
      { new: true, upsert: true }
    );

    // Update user
    await User.findByIdAndUpdate(userId, {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
    });

    // Log success
    await MFAAuditLog.create({
      userId,
      action: 'mfa_enable',
      status: 'success',
      method: 'totp',
      details: {
        reason: 'User enabled TOTP authentication',
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'TOTP enabled successfully',
      data: {
        backupCodes,
        message: 'Save these backup codes in a safe place. You can use them to regain access if you lose your authenticator.',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Start Email OTP Verification
 * بدء التحقق من OTP عبر البريد الإلكتروني
 */
exports.initiateEmailOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Generate OTP
    const otpData = mfaService.generateEmailOTP();

    // Hash OTP for storage
    const otpHash = crypto.createHash('sha256').update(otpData.code).digest('hex');

    // Create MFA settings if doesn't exist
    let mfaSettings = await MFASettings.findOne({ userId });
    if (!mfaSettings) {
      mfaSettings = await MFASettings.create({ userId });
    }

    // Log OTP
    await OTPLog.create({
      userId,
      method: 'email',
      recipient: user.email,
      otpHash,
      expiresAt: otpData.expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      reason: 'mfa_setup',
    });

    // Send OTP email
    await emailService.sendOTPEmail(user.email, otpData.code, {
      name: user.name,
      purpose: 'Multi-Factor Authentication Setup',
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      data: {
        expiresIn: otpData.expiresIn,
        recipient: `${user.email.substring(0, 5)}***`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Verify Email OTP and Enable
 * التحقق من OTP البريدي وتفعيله
 */
exports.verifyAndEnableEmailOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'OTP code is required',
      });
    }

    // Find the most recent OTP log
    const otpLog = await OTPLog.findOne({ userId, method: 'email' })
      .sort({ createdAt: -1 });

    if (!otpLog) {
      return res.status(400).json({
        success: false,
        message: 'No OTP request found',
      });
    }

    // Verify OTP
    const _codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const verification = mfaService.verifyOTP(code, otpLog.otpHash, otpLog.expiresAt);

    if (!verification.isValid) {
      otpLog.verificationAttempts += 1;
      await otpLog.save();

      await MFAAuditLog.create({
        userId,
        action: 'verification_failed',
        status: 'failed',
        method: 'email',
        error: verification.message,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }

    // Update OTP log
    otpLog.status = 'verified';
    otpLog.verifiedAt = new Date();
    await otpLog.save();

    // Update MFA settings
    let _mfaSettings = await MFASettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          emailOTP: {
            enabled: true,
            verifiedAt: new Date(),
          },
          primaryMethod: 'email',
        },
      },
      { new: true, upsert: true }
    );

    // Log success
    await MFAAuditLog.create({
      userId,
      action: 'mfa_enable',
      status: 'success',
      method: 'email',
      details: {
        reason: 'User enabled Email OTP authentication',
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Email OTP enabled successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Initiate SMS OTP Verification
 * بدء التحقق من OTP عبر الرسائل النصية
 */
exports.initiateSMSOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phoneNumber, countryCode } = req.body;

    if (!phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and country code are required',
      });
    }

    const user = await User.findById(userId);

    // Generate OTP
    const otpData = mfaService.generateSMSOTP();
    const otpHash = crypto.createHash('sha256').update(otpData.code).digest('hex');

    // Create MFA settings if doesn't exist
    let mfaSettings = await MFASettings.findOne({ userId });
    if (!mfaSettings) {
      mfaSettings = await MFASettings.create({ userId });
    }

    // Log OTP
    await OTPLog.create({
      userId,
      method: 'sms',
      recipient: phoneNumber,
      otpHash,
      expiresAt: otpData.expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      reason: 'mfa_setup',
    });

    // Send OTP SMS
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    await smsService.sendOTP(fullPhoneNumber, otpData.code, {
      name: user.name,
      purpose: 'Multi-Factor Authentication',
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your phone',
      data: {
        expiresIn: otpData.expiresIn,
        recipient: `${phoneNumber.substring(0, 3)}***`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Verify SMS OTP and Enable
 * التحقق من OTP الرسائل النصية وتفعيله
 */
exports.verifyAndEnableSMSOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { code, phoneNumber, countryCode } = req.body;

    if (!code || !phoneNumber || !countryCode) {
      return res.status(400).json({
        success: false,
        message: 'Code, phone number, and country code are required',
      });
    }

    // Find the most recent OTP log
    const otpLog = await OTPLog.findOne({ userId, method: 'sms' })
      .sort({ createdAt: -1 });

    if (!otpLog) {
      return res.status(400).json({
        success: false,
        message: 'No OTP request found',
      });
    }

    // Verify OTP
    const verification = mfaService.verifyOTP(code, otpLog.otpHash, otpLog.expiresAt);

    if (!verification.isValid) {
      otpLog.verificationAttempts += 1;
      await otpLog.save();

      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }

    // Update OTP log
    otpLog.status = 'verified';
    otpLog.verifiedAt = new Date();
    await otpLog.save();

    // Update MFA settings
    const _mfaSettings = await MFASettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          smsOTP: {
            enabled: true,
            phoneNumber,
            countryCode,
            verifiedAt: new Date(),
          },
          primaryMethod: 'sms',
        },
      },
      { new: true, upsert: true }
    );

    // Log success
    await MFAAuditLog.create({
      userId,
      action: 'mfa_enable',
      status: 'success',
      method: 'sms',
      details: {
        reason: 'User enabled SMS OTP authentication',
        phoneNumber,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'SMS OTP enabled successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============ VERIFICATION ENDPOINTS ============

/**
 * Verify MFA During Login
 * التحقق من MFA أثناء تسجيل الدخول
 */
exports.verifyMFALogin = async (req, res) => {
  try {
    const { sessionId, token, method } = req.body;

    if (!sessionId || !token || !method) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, token, and method are required',
      });
    }

    // Find MFA session
    const mfaSession = await MFASession.findOne({ sessionId });
    if (!mfaSession) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MFA session',
      });
    }

    // Validate session
    const validation = mfaService.validateMFASession(mfaSession);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // Get user and MFA settings
    const user = await User.findById(mfaSession.userId).select('+twoFactorSecret');
    const mfaSettings = await MFASettings.findOne({ userId: mfaSession.userId });

    let isValid = false;

    // Verify based on method
    if (method === 'totp') {
      isValid = mfaService.verifyTOTP(token, user.twoFactorSecret);
    } else if (method === 'backup') {
      // Verify backup code
      const backupCode = mfaSettings.backupCodes.find(
        (bc) => !bc.used && mfaService.verifyBackupCode(token, bc.code)
      );
      if (backupCode) {
        backupCode.used = true;
        backupCode.usedAt = new Date();
        await mfaSettings.save();
        isValid = true;

        // Log backup code usage
        await MFAAuditLog.create({
          userId: mfaSession.userId,
          action: 'backup_code_used',
          status: 'success',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
    }

    if (!isValid) {
      mfaSession.attempts += 1;
      await mfaSession.save();

      await MFAAuditLog.create({
        userId: mfaSession.userId,
        action: 'verification_failed',
        status: 'failed',
        method,
        error: 'Invalid MFA token',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid MFA token',
        attemptsRemaining: validation.attemptsRemaining - 1,
      });
    }

    // MFA verified
    mfaSession.status = 'verified';
    mfaSession.verifiedAt = new Date();
    await mfaSession.save();

    // Log success
    await MFAAuditLog.create({
      userId: mfaSession.userId,
      action: 'verification_success',
      status: 'success',
      method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      data: {
        sessionId,
        userId: mfaSession.userId,
        verified: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============ SETTINGS ENDPOINTS ============

/**
 * Get MFA Settings
 * الحصول على إعدادات MFA
 */
exports.getMFASettings = async (req, res) => {
  try {
    const userId = req.user._id;

    let mfaSettings = await MFASettings.findOne({ userId });
    if (!mfaSettings) {
      mfaSettings = await MFASettings.create({ userId });
    }

    // Remove sensitive data
    const secureSettings = mfaSettings.toObject();
    if (secureSettings.totp) delete secureSettings.totp.secret;
    if (secureSettings.recovery) delete secureSettings.recovery.recoveryKey;
    secureSettings.backupCodes = secureSettings.backupCodes.map(({ used, usedAt }) => ({
      used,
      usedAt,
    }));

    res.status(200).json({
      success: true,
      data: secureSettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Disable MFA Method
 * تعطيل طريقة MFA
 */
exports.disableMFAMethod = async (req, res) => {
  try {
    const userId = req.user._id;
    const { method } = req.body;

    if (!['totp', 'email', 'sms'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid MFA method',
      });
    }

    const mfaSettings = await MFASettings.findOne({ userId });

    // Cannot disable all methods
    const enabledMethods = [
      mfaSettings?.totp?.enabled,
      mfaSettings?.emailOTP?.enabled,
      mfaSettings?.smsOTP?.enabled,
    ].filter(Boolean);

    if (enabledMethods.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'At least one MFA method must remain enabled',
      });
    }

    // Disable method
    const methodField = method === 'totp' ? 'totp' : method === 'email' ? 'emailOTP' : 'smsOTP';
    const updateData = {};
    updateData[`${methodField}.enabled`] = false;

    const _updated = await MFASettings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    );

    // Log action
    await MFAAuditLog.create({
      userId,
      action: 'mfa_disable',
      status: 'success',
      method,
      details: {
        reason: `User disabled ${method} authentication`,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: `${method} MFA method disabled successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============ TRUSTED DEVICE ENDPOINTS ============

/**
 * Trust Current Device
 * وضع علامة على الجهاز الحالي كموثوق
 */
exports.trustDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { deviceName, deviceFingerprint } = req.body;

    if (!deviceFingerprint) {
      return res.status(400).json({
        success: false,
        message: 'Device fingerprint is required',
      });
    }

    // Generate device token
    const deviceToken = mfaService.generateTrustedDeviceToken(userId, deviceFingerprint);

    const _trustedDevice = await TrustedDevice.create({
      userId,
      deviceId: crypto.randomBytes(12).toString('hex'),
      deviceName: deviceName || 'Unknown Device',
      fingerprint: deviceFingerprint,
      token: deviceToken.token,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      expiresAt: deviceToken.expiresAt,
    });

    // Log action
    await MFAAuditLog.create({
      userId,
      action: 'device_trusted',
      status: 'success',
      details: {
        deviceName: deviceName || 'Unknown Device',
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Device trusted successfully',
      data: {
        deviceToken: deviceToken.token,
        expiresAt: deviceToken.expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Trusted Devices
 * الحصول على قائمة الأجهزة الموثوقة
 */
exports.getTrustedDevices = async (req, res) => {
  try {
    const userId = req.user._id;

    const devices = await TrustedDevice.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).select('-token');

    res.status(200).json({
      success: true,
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Revoke Trusted Device
 * إلغاء وضع العلامة على جهاز
 */
exports.revokeTrustedDevice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { deviceId } = req.params;

    const device = await TrustedDevice.findOneAndUpdate(
      { _id: deviceId, userId },
      {
        isActive: false,
        revokedAt: new Date(),
        revokeReason: 'User revoked trust',
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Log action
    await MFAAuditLog.create({
      userId,
      action: 'device_revoked',
      status: 'success',
      details: {
        deviceName: device.deviceName,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Device revoked successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = exports;
