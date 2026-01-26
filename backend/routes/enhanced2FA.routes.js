/**
 * Enhanced 2FA Routes
 * مسارات المصادقة الثنائية المحسّنة
 */

const express = require('express');
const router = express.Router();
const enhanced2FAService = require('../services/enhanced2FA.service');
const { authenticateToken } = require('../middleware/auth.middleware');

/**
 * Get 2FA status
 * @route GET /api/2fa-enhanced/status
 * @access Private
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = await enhanced2FAService.get2FAStatus(req.userId);
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get 2FA status',
      message: error.message,
    });
  }
});

/**
 * Generate TOTP secret and QR code
 * @route POST /api/2fa-enhanced/setup
 * @access Private
 */
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const result = await enhanced2FAService.generateTOTPSecret(req.userId);
    res.json({
      success: true,
      message: 'Scan QR code with authenticator app',
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to setup 2FA',
      message: error.message,
    });
  }
});

/**
 * Enable 2FA (verify token)
 * @route POST /api/2fa-enhanced/enable
 * @access Private
 */
router.post('/enable', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification code required',
      });
    }

    const result = await enhanced2FAService.enable2FA(req.userId, token);
    res.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to enable 2FA',
      message: error.message,
    });
  }
});

/**
 * Disable 2FA
 * @route POST /api/2fa-enhanced/disable
 * @access Private
 */
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
      });
    }

    await enhanced2FAService.disable2FA(req.userId, password);
    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to disable 2FA',
      message: error.message,
    });
  }
});

/**
 * Verify 2FA token (during login)
 * @route POST /api/2fa-enhanced/verify
 * @access Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { userId, token, method = 'totp' } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'User ID and token required',
      });
    }

    const isValid = await enhanced2FAService.verify2FALogin(userId, token, method);

    if (isValid) {
      res.json({
        success: true,
        message: '2FA verified successfully',
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid verification code',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message,
    });
  }
});

/**
 * Regenerate backup codes
 * @route POST /api/2fa-enhanced/backup-codes/regenerate
 * @access Private
 */
router.post('/backup-codes/regenerate', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
      });
    }

    const result = await enhanced2FAService.regenerateBackupCodes(req.userId, password);
    res.json({
      success: true,
      message: 'Backup codes regenerated',
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to regenerate backup codes',
      message: error.message,
    });
  }
});

/**
 * Send SMS 2FA code
 * @route POST /api/2fa-enhanced/sms/send
 * @access Public
 */
router.post('/sms/send', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required',
      });
    }

    await enhanced2FAService.sendSMS2FA(userId);
    res.json({
      success: true,
      message: 'SMS code sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
      message: error.message,
    });
  }
});

/**
 * Verify SMS 2FA code
 * @route POST /api/2fa-enhanced/sms/verify
 * @access Public
 */
router.post('/sms/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'User ID and code required',
      });
    }

    const isValid = await enhanced2FAService.verifySMS2FA(userId, code);

    if (isValid) {
      res.json({
        success: true,
        message: 'SMS code verified',
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired code',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message,
    });
  }
});

/**
 * Remember device
 * @route POST /api/2fa-enhanced/device/remember
 * @access Private
 */
router.post('/device/remember', authenticateToken, async (req, res) => {
  try {
    const { deviceFingerprint } = req.body;

    if (!deviceFingerprint) {
      return res.status(400).json({
        success: false,
        error: 'Device fingerprint required',
      });
    }

    const result = await enhanced2FAService.rememberDevice(req.userId, deviceFingerprint);
    res.json({
      success: true,
      message: 'Device remembered for 30 days',
      deviceToken: result.deviceToken,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to remember device',
      message: error.message,
    });
  }
});

/**
 * Check if device is trusted
 * @route POST /api/2fa-enhanced/device/check
 * @access Public
 */
router.post('/device/check', async (req, res) => {
  try {
    const { userId, deviceFingerprint, deviceToken } = req.body;

    if (!userId || !deviceFingerprint || !deviceToken) {
      return res.status(400).json({
        success: false,
        error: 'User ID, device fingerprint, and token required',
      });
    }

    const isTrusted = await enhanced2FAService.isDeviceTrusted(
      userId,
      deviceFingerprint,
      deviceToken
    );

    res.json({
      success: true,
      trusted: isTrusted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check device',
      message: error.message,
    });
  }
});

module.exports = router;
