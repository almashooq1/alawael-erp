'use strict';
/**
 * MFA Routes — المصادقة متعددة العوامل
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const safeError = require('../utils/safeError');

router.use(authenticate);

// Get current MFA status for user
router.get('/status', async (req, res) => {
  try {
    const MFASettings = require('../models/MFASettings');
    const settings = await MFASettings.findOne({ userId: req.user._id }).lean();
    res.json({
      success: true,
      data: {
        enabled: settings ? settings.enabled : false,
        methods: settings ? settings.methods : [],
        backupCodesRemaining: settings
          ? (settings.backupCodes || []).filter(c => !c.used).length
          : 0,
      },
    });
  } catch (err) {
    return safeError(res, err, 'mfa');
  }
});

// Enable MFA
router.post('/enable', async (req, res) => {
  try {
    const MFASettings = require('../models/MFASettings');
    const { method = 'totp' } = req.body;
    const settings = await MFASettings.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: { enabled: true, userId: req.user._id },
        $addToSet: { methods: method },
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    return safeError(res, err, 'mfa');
  }
});

// Disable MFA
router.post('/disable', async (req, res) => {
  try {
    const MFASettings = require('../models/MFASettings');
    await MFASettings.findOneAndUpdate(
      { userId: req.user._id },
      { enabled: false, methods: [], updatedAt: new Date() }
    );
    res.json({ success: true, message: 'MFA disabled' });
  } catch (err) {
    return safeError(res, err, 'mfa');
  }
});

// Generate TOTP secret (setup flow)
router.post('/totp/setup', async (req, res) => {
  try {
    // Placeholder — real implementation would use speakeasy or otpauth
    res.json({
      success: true,
      data: {
        secret: 'TOTP_SETUP_PENDING',
        otpauthUrl: 'otpauth://totp/Rehab:user?secret=PENDING',
        message: 'TOTP library integration required',
      },
    });
  } catch (err) {
    return safeError(res, err, 'mfa');
  }
});

// Verify TOTP code
router.post('/totp/verify', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'code required' });
    // Placeholder verification
    res.json({
      success: true,
      data: { verified: false, message: 'TOTP verification pending implementation' },
    });
  } catch (err) {
    return safeError(res, err, 'mfa');
  }
});

// Generate backup codes
router.post('/backup-codes/generate', async (req, res) => {
  try {
    const MFASettings = require('../models/MFASettings');
    // MFA backup codes BYPASS the second factor — they're auth-equivalent
    // to a password. `Math.random()` is a Mersenne-Twister derivative,
    // predictable from ~624 outputs; generating 10 codes from the same
    // sequence lets an attacker who observed ANY prior Math.random output
    // in the same process narrow the codes to a tractable search space.
    // crypto.randomBytes is the cryptographic-strength alternative the
    // rest of the codebase already uses for token/secret generation.
    const codes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase()
    );
    await MFASettings.findOneAndUpdate(
      { userId: req.user._id },
      { backupCodes: codes.map(c => ({ code: c, used: false })), updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true, data: { codes } });
  } catch (err) {
    return safeError(res, err, 'mfa');
  }
});

module.exports = router;
