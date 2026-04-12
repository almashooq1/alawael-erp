/**
 * setup.routes.js — مسار إعداد أولي (يُستخدم مرة واحدة فقط)
 *
 * يوفر endpoint لإنشاء حساب الأدمن عن بُعد.
 * محمي بـ SETUP_SECRET_KEY ومحظور في Production ما لم يُفعّل صراحة.
 *
 * الاستخدام:
 *   POST https://alaweal.org/api/setup/init-admin
 *   Headers: { "x-setup-key": "YOUR_SETUP_SECRET" }
 *   Body: { "secretKey": "YOUR_SETUP_SECRET" }
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * GET /api/setup/status
 * التحقق من حالة السيرفر والـ DB (آمن — لا يكشف أسراراً)
 */
router.get('/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
const safeError = require('../utils/safeError');
    const dbState = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    return res.json({
      success: true,
      server: 'running',
      db: states[dbState] || 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.json({ success: false, error: 'Internal error' });
  }
});

/**
 * POST /api/setup/init-admin
 *
 * يُنشئ حساب أدمن جديد فقط إذا لم يكن موجوداً.
 * لا يكتب فوق حساب موجود أبداً.
 *
 * ⚠️ محظور في Production ما لم يكن ALLOW_ADMIN_INIT=true
 * ⚠️ يتطلب SETUP_SECRET_KEY و ADMIN_PASSWORD من متغيرات البيئة
 */
router.post('/init-admin', async (req, res) => {
  try {
    // ─── حظر في Production ما لم يُفعّل صراحة ───────────────────────────
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && process.env.ALLOW_ADMIN_INIT !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is disabled in production. Set ALLOW_ADMIN_INIT=true to enable.',
      });
    }

    // ─── التحقق من المفتاح السري (إلزامي — بدون fallback) ────────────────
    const SETUP_SECRET = process.env.SETUP_SECRET_KEY;
    if (!SETUP_SECRET) {
      safeError(res, error, '[setup] SETUP_SECRET_KEY env var is not set');
    }

    const providedKey = req.body?.secretKey || req.headers['x-setup-key'];
    if (!providedKey || providedKey !== SETUP_SECRET) {
      logger.warn(`[setup] Unauthorized init-admin attempt from ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized — invalid secret key',
      });
    }

    // ─── التحقق من ADMIN_PASSWORD (إلزامي — بدون fallback) ────────────────
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
      safeError(res, error, 'setup');
    }

    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@alawael.com.sa').toLowerCase().trim();

    // ─── تحميل الـ User model ─────────────────────────────────────────────
    let User;
    try {
      User = require('../models/User');
    } catch (err) {
      safeError(res, err, 'setup');
    }

    // ─── التحقق من اتصال MongoDB ─────────────────────────────────────────
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB not connected',
      });
    }

    // ─── التحقق من وجود أدمن ─────────────────────────────────────────────
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      return res.json({
        success: true,
        action: 'already_exists',
        message: 'Admin account already exists — no changes made',
        email: ADMIN_EMAIL,
      });
    }

    // ─── إنشاء أدمن جديد ─────────────────────────────────────────────────
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      fullName: process.env.ADMIN_FULL_NAME || 'مدير النظام',
      role: 'admin',
      isActive: true,
      failedLoginAttempts: 0,
      requirePasswordChange: true,
    });

    logger.info(`[setup] ✅ Admin created: ${ADMIN_EMAIL}`);
    return res.json({
      success: true,
      action: 'created',
      message: 'Admin account created successfully. Password change required on first login.',
      email: ADMIN_EMAIL,
    });
  } catch (err) {
    safeError(res, err, '[setup] init-admin error');
  }
});

module.exports = router;
