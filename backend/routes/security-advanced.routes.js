/**
 * Advanced Security Module - 2FA/MFA Implementation
 * Two-Factor Authentication & Multi-Factor Authentication
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

/**
 * Generate TOTP Secret for 2FA
 * POST /api/security/2fa/setup
 */
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `نظام التأهيل (${user.email})`,
      issuer: 'Rehabilitation System',
      length: 32,
    });

    // Generate QR Code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Save temporary secret (not verified yet)
    user.twoFaSecret = secret.base32;
    user.twoFaBackupCodes = generateBackupCodes();
    user.twoFaVerified = false;
    await user.save();

    res.json({
      success: true,
      secret: secret.base32,
      qrCode,
      backupCodes: user.twoFaBackupCodes,
      message: 'تم إنشاء رمز QR. يرجى مسحه ضوئياً باستخدام تطبيق مصادقة',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify TOTP Code
 * POST /api/security/2fa/verify
 */
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.twoFaSecret) {
      return res.status(400).json({ error: 'لم يتم إعداد المصادقة الثنائية' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ error: 'الرمز غير صحيح' });
    }

    // Enable 2FA
    user.twoFaEnabled = true;
    user.twoFaVerified = true;
    user.twoFaLastUsed = new Date();
    user.securityLog = user.securityLog || [];
    user.securityLog.push({
      action: 'enabled_2fa',
      timestamp: new Date(),
      ipAddress: req.ip,
    });
    await user.save();

    res.json({
      success: true,
      message: 'تم تفعيل المصادقة الثنائية بنجاح',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Authenticate with 2FA
 * POST /api/security/2fa/authenticate
 */
router.post('/2fa/authenticate', async (req, res) => {
  try {
    const { email, password, token } = req.body;

    // First validate email and password
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'بيانات اعتماد غير صحيحة' });
    }

    if (!user.twoFaEnabled) {
      // Regular login
      const jwtToken = user.generateJWT();
      return res.json({ success: true, token: jwtToken });
    }

    // Verify 2FA token
    if (!token) {
      return res.status(401).json({
        error: 'يرجى إدخال رمز المصادقة الثنائية',
        requiresTwoFa: true,
      });
    }

    // Check backup code
    let verified = false;
    if (user.twoFaBackupCodes && user.twoFaBackupCodes.includes(token)) {
      user.twoFaBackupCodes = user.twoFaBackupCodes.filter(code => code !== token);
      verified = true;
    } else {
      // Verify TOTP token
      verified = speakeasy.totp.verify({
        secret: user.twoFaSecret,
        encoding: 'base32',
        token,
        window: 2,
      });
    }

    if (!verified) {
      return res.status(401).json({ error: 'رمز المصادقة غير صحيح' });
    }

    // Generate JWT token
    const jwtToken = user.generateJWT();
    user.twoFaLastUsed = new Date();
    user.securityLog.push({
      action: '2fa_login_success',
      timestamp: new Date(),
      ipAddress: req.ip,
    });
    await user.save();

    res.json({
      success: true,
      token: jwtToken,
      message: 'تم تسجيل الدخول بنجاح',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Backup Codes
 * GET /api/security/2fa/backup-codes
 */
router.get('/2fa/backup-codes', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.twoFaEnabled) {
      return res.status(400).json({ error: 'المصادقة الثنائية غير مفعلة' });
    }

    res.json({
      success: true,
      backupCodes: user.twoFaBackupCodes || [],
      message: 'أكواد النسخ الاحتياطية (احفظها في مكان آمن)',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Regenerate Backup Codes
 * POST /api/security/2fa/regenerate-codes
 */
router.post('/2fa/regenerate-codes', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.twoFaEnabled) {
      return res.status(400).json({ error: 'المصادقة الثنائية غير مفعلة' });
    }

    const newCodes = generateBackupCodes();
    user.twoFaBackupCodes = newCodes;
    user.securityLog.push({
      action: 'regenerated_backup_codes',
      timestamp: new Date(),
      ipAddress: req.ip,
    });
    await user.save();

    res.json({
      success: true,
      backupCodes: newCodes,
      message: 'تم إعادة إنشاء الأكواد الاحتياطية',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Disable 2FA
 * POST /api/security/2fa/disable
 */
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);

    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }

    user.twoFaEnabled = false;
    user.twoFaVerified = false;
    user.securityLog.push({
      action: 'disabled_2fa',
      timestamp: new Date(),
      ipAddress: req.ip,
    });
    await user.save();

    res.json({
      success: true,
      message: 'تم تعطيل المصادقة الثنائية',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Security Log
 * GET /api/security/log
 */
router.get('/log', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const logs = (user.securityLog || []).slice(-50); // Last 50 logs

    res.json({
      success: true,
      logs: logs.reverse(),
      total: logs.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Security Status
 * GET /api/security/status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      security: {
        twoFaEnabled: user.twoFaEnabled || false,
        passwordLastChanged: user.passwordChangedAt,
        lastLoginAt: user.lastLogin,
        activeSessions: 1,
        recentLogins: (user.securityLog || [])
          .filter(log => log.action === '2fa_login_success' || log.action === 'login')
          .slice(-10),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enable Login Alerts
 * POST /api/security/alerts/enable
 */
router.post('/alerts/enable', authenticate, async (req, res) => {
  try {
    const { email, sms, push } = req.body;
    const user = await User.findById(req.user.id);

    user.securityAlerts = {
      emailAlerts: email || false,
      smsAlerts: sms || false,
      pushAlerts: push || false,
    };
    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث تنبيهات الأمان',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper function to generate backup codes
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

module.exports = router;

