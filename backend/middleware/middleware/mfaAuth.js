/**
 * MFA Authentication Middleware
 * تحقق من MFA على المسارات المحمية
 */

const { MFASettings, MFASession, TrustedDevice } = require('../models/mfa.models');
const logger = require('../utils/logger');

/**
 * Check if user has MFA enabled
 * التحقق من تفعيل MFA للمستخدم
 */
const checkMFAStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const mfaSettings = await MFASettings.findOne({ userId: req.user.id });

    // Check if any MFA method is enabled
    const isMFAEnabled =
      (mfaSettings?.totp?.enabled) ||
      (mfaSettings?.emailOTP?.enabled) ||
      (mfaSettings?.smsOTP?.enabled);

    req.mfaStatus = {
      enabled: isMFAEnabled,
      requireMFA: mfaSettings?.requireMFA || false,
      primaryMethod: mfaSettings?.primaryMethod || 'none',
      methods: {
        totp: mfaSettings?.totp?.enabled || false,
        email: mfaSettings?.emailOTP?.enabled || false,
        sms: mfaSettings?.smsOTP?.enabled || false,
      },
    };

    next();
  } catch (error) {
    logger.error('MFA status check failed:', error);
    next();
  }
};

/**
 * Require MFA verification
 * طلب التحقق من MFA
 * Use this middleware on sensitive endpoints
 */
const requireMFA = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const mfaSettings = await MFASettings.findOne({ userId: req.user.id });

    // Check if any MFA method is enabled
    const isMFAEnabled =
      (mfaSettings?.totp?.enabled) ||
      (mfaSettings?.emailOTP?.enabled) ||
      (mfaSettings?.smsOTP?.enabled);

    if (!isMFAEnabled) {
      return res.status(403).json({
        success: false,
        message: 'MFA authentication required for this action',
        code: 'MFA_REQUIRED',
      });
    }

    // Check if request has MFA session token
    const mfaToken = req.headers['x-mfa-token'] || req.body.mfaToken;

    if (!mfaToken) {
      // Create MFA session and ask for verification
      const sessionId = require('crypto').randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await MFASession.create({
        sessionId,
        userId: req.user.id,
        method: mfaSettings.primaryMethod,
        status: 'pending',
        expiresAt,
      });

      return res.status(403).json({
        success: false,
        message: 'MFA verification required',
        code: 'MFA_REQUIRED',
        data: {
          sessionId,
          methods: Object.keys(
            mfaSettings.totp?.enabled ? { totp: true } : {}
          ).concat(mfaSettings.emailOTP?.enabled ? 'email' : [])
            .concat(mfaSettings.smsOTP?.enabled ? 'sms' : []),
        },
      });
    }

    // Verify MFA token
    const mfaSession = await MFASession.findOne({
      sessionId: mfaToken,
      userId: req.user.id,
      status: 'verified',
    });

    if (!mfaSession) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or unverified MFA session',
        code: 'MFA_INVALID',
      });
    }

    // Check session expiration
    if (new Date() > new Date(mfaSession.expiresAt)) {
      return res.status(403).json({
        success: false,
        message: 'MFA session expired',
        code: 'MFA_EXPIRED',
      });
    }

    // MFA verified
    req.mfaVerified = true;
    req.mfaMethod = mfaSession.method;

    next();
  } catch (error) {
    logger.error('MFA verification failed:', error);
    res.status(500).json({
      success: false,
      message: 'MFA verification error',
      error: error.message,
    });
  }
};

/**
 * Check trusted device
 * التحقق من جهاز موثوق
 */
const checkTrustedDevice = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const deviceToken = req.headers['x-device-token'] || req.body.deviceToken;

    if (deviceToken) {
      const device = await TrustedDevice.findOne({
        userId: req.user.id,
        token: deviceToken,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (device) {
        // Update last used
        device.lastUsedAt = new Date();
        device.loginCount = (device.loginCount || 0) + 1;
        await device.save();

        req.trustedDevice = {
          id: device._id,
          name: device.deviceName,
          isTrusted: true,
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Trusted device check failed:', error);
    next();
  }
};

/**
 * Verify MFA for sensitive actions
 * التحقق من MFA للإجراءات الحساسة
 */
const verifyMFAForAction = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const mfaSettings = await MFASettings.findOne({ userId: req.user.id });

      // Check if action requires MFA
      const actionMFARequired = {
        passwordChange: mfaSettings?.security?.requireMFAForPasswordChange || true,
        sensitiveAction: mfaSettings?.security?.requireMFAForSensitiveActions || true,
        dataExport: mfaSettings?.security?.requireMFAForDataExport || true,
      };

      if (!actionMFARequired[action]) {
        return next();
      }

      // Check if MFA is enabled
      const isMFAEnabled =
        (mfaSettings?.totp?.enabled) ||
        (mfaSettings?.emailOTP?.enabled) ||
        (mfaSettings?.smsOTP?.enabled);

      if (!isMFAEnabled) {
        return next();
      }

      // Require MFA verification
      const mfaToken = req.headers['x-mfa-token'] || req.body.mfaToken;

      if (!mfaToken) {
        const sessionId = require('crypto').randomBytes(16).toString('hex');
        await MFASession.create({
          sessionId,
          userId: req.user.id,
          method: mfaSettings.primaryMethod,
          status: 'pending',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          metadata: { action },
        });

        return res.status(403).json({
          success: false,
          message: `MFA verification required for ${action}`,
          code: 'MFA_REQUIRED',
          data: { sessionId },
        });
      }

      // Verify MFA session
      const mfaSession = await MFASession.findOne({
        sessionId: mfaToken,
        userId: req.user.id,
        status: 'verified',
        'metadata.action': action,
      });

      if (!mfaSession) {
        return res.status(403).json({
          success: false,
          message: 'Invalid MFA verification',
          code: 'MFA_INVALID',
        });
      }

      req.mfaVerified = true;
      next();
    } catch (error) {
      logger.error('MFA action verification failed:', error);
      res.status(500).json({
        success: false,
        message: 'MFA verification error',
      });
    }
  };
};

module.exports = {
  checkMFAStatus,
  requireMFA,
  checkTrustedDevice,
  verifyMFAForAction,
};
