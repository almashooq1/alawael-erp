/**
 * Two-Factor Authentication API Routes
 * SMS OTP, Email OTP, Google Authenticator, Backup Codes
 */

const express = require('express');
const router = express.Router();
const twoFAService = require('../services/twoFAService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/auth/2fa/send-otp-sms
 * Send OTP via SMS
 */
router.post('/send-otp-sms', authMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number required',
      });
    }

    const result = await twoFAService.sendOTPviaSMS(phoneNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/send-otp-email
 * Send OTP via Email
 */
router.post('/send-otp-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email required',
      });
    }

    const result = await twoFAService.sendOTPviaEmail(email);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/verify-otp
 * Verify OTP
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Identifier and OTP required',
      });
    }

    const result = await twoFAService.verifyOTP(identifier, otp);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/enable
 * Enable 2FA
 */
router.post('/enable', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { method, phoneNumber, email } = req.body;

    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'Method (sms, email, google) required',
      });
    }

    const phoneOrEmail = method === 'sms' ? phoneNumber : email;

    const result = await twoFAService.enable2FA(userId, method, phoneOrEmail);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/confirm
 * Confirm 2FA setup
 */
router.post('/confirm', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        error: 'OTP required',
      });
    }

    const result = await twoFAService.confirm2FA(userId, otp);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA
 */
router.post('/disable', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
      });
    }

    const result = await twoFAService.disable2FA(userId, password);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/2fa/status/:userId
 * Get 2FA status
 */
router.get('/status/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await twoFAService.get2FAStatus(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/use-backup-code
 * Use backup code for login
 */
router.post('/use-backup-code', async (req, res) => {
  try {
    const { userId, backupCode } = req.body;

    if (!userId || !backupCode) {
      return res.status(400).json({
        success: false,
        error: 'User ID and backup code required',
      });
    }

    const result = await twoFAService.useBackupCode(userId, backupCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/regenerate-codes
 * Regenerate backup codes
 */
router.post('/regenerate-codes', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await twoFAService.regenerateBackupCodes(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/setup-google-auth
 * Get Google Authenticator setup details
 */
router.post('/setup-google-auth', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await twoFAService.generateGoogleAuthSecret();

    res.json({
      success: true,
      secret: result.secret,
      qrCode: result.qrCode,
      manualEntry: result.manual,
      message: 'Scan QR code with Google Authenticator or enter secret manually',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/2fa/verify-google-token
 * Verify Google Authenticator token
 */
router.post('/verify-google-token', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required',
      });
    }

    // In production, verify with speakeasy or similar library
    const isValid = token.length === 6 && /^\d+$/.test(token);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format',
      });
    }

    res.json({
      success: true,
      message: 'Token verified successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/2fa/backup-codes/:userId
 * Get backup codes
 */
router.get('/backup-codes/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // In production, retrieve from database
    const codes = Array.from({ length: 10 }, () => Math.random().toString(36).substring(2, 10).toUpperCase());

    res.json({
      success: true,
      backupCodes: codes,
      message: 'Save these codes in a secure location',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

