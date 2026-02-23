/**
 * Two-Factor Authentication (2FA) Module
 * نظام المصادقة الثنائية
 */

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const express = require('express');
const router = express.Router();

// في الذاكرة - In-Memory 2FA Storage
const twoFAUsers = new Map();

/**
 * Generate 2FA Secret
 */
router.post('/generate', async (req, res) => {
  try {
    const { userId, email } = req.body;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Alawael (${email})`,
      issuer: 'Alawael',
      length: 32,
    });

    // Generate QR Code
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    // Store temporary secret
    if (!twoFAUsers.has(userId)) {
      twoFAUsers.set(userId, {});
    }
    twoFAUsers.get(userId).tempSecret = secret;

    res.json({
      secret: secret.base32,
      qrCode,
      backupCodes: generateBackupCodes(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify 2FA Token
 */
router.post('/verify', (req, res) => {
  try {
    const { userId, token } = req.body;
    const userData = twoFAUsers.get(userId);

    if (!userData || !userData.tempSecret) {
      return res.status(400).json({ error: 'No 2FA setup found' });
    }

    const verified = speakeasy.totp.verify({
      secret: userData.tempSecret.base32,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      userData.active = true;
      userData.secret = userData.tempSecret;
      delete userData.tempSecret;

      res.json({
        success: true,
        message: '2FA activated successfully',
      });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify Login Token
 */
router.post('/login-verify', (req, res) => {
  try {
    const { userId, token } = req.body;
    const userData = twoFAUsers.get(userId);

    if (!userData || !userData.active) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: userData.secret.base32,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified) {
      res.json({
        success: true,
        authenticated: true,
      });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Disable 2FA
 */
router.post('/disable', (req, res) => {
  try {
    const { userId } = req.body;
    const userData = twoFAUsers.get(userId);

    if (!userData) {
      return res.status(400).json({ error: 'User not found' });
    }

    userData.active = false;
    delete userData.secret;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get 2FA Status
 */
router.get('/:userId/status', (req, res) => {
  try {
    const { userId } = req.params;
    const userData = twoFAUsers.get(userId);

    res.json({
      enabled: userData?.active || false,
      userId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Generate Backup Codes
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(
      Math.random().toString(36).substring(2, 10).toUpperCase() +
        Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  }
  return codes;
}

module.exports = router;
