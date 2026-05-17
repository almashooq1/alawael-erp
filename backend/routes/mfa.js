'use strict';
/**
 * MFA Routes — المصادقة متعددة العوامل
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

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
    res.status(500).json({ success: false, message: err.message });
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
    res.status(400).json({ success: false, message: err.message });
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
    res.status(400).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
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
    res.status(400).json({ success: false, message: err.message });
  }
});

// Generate backup codes
router.post('/backup-codes/generate', async (req, res) => {
  try {
    const MFASettings = require('../models/MFASettings');
    const codes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
    await MFASettings.findOneAndUpdate(
      { userId: req.user._id },
      { backupCodes: codes.map(c => ({ code: c, used: false })), updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true, data: { codes } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
