/**
 * setup.routes.js — مسار إعداد أولي (يُستخدم مرة واحدة فقط)
 *
 * يوفر endpoint لإنشاء/إعادة تعيين حساب الأدمن عن بُعد.
 * محمي بـ SETUP_SECRET_KEY لمنع الوصول غير المصرح.
 *
 * الاستخدام:
 *   POST https://alaweal.org/api/setup/init-admin
 *   Body: { "secretKey": "YOUR_SETUP_SECRET" }
 *
 *   أو:
 *   GET https://alaweal.org/api/setup/init-admin?key=YOUR_SETUP_SECRET
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// المفتاح السري — يُضبط في متغيرات البيئة أو يستخدم قيمة افتراضية
const SETUP_SECRET = process.env.SETUP_SECRET_KEY || 'alawael-init-2026';

// بيانات الأدمن
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@alawael.com.sa';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026';
const ADMIN_FULL_NAME = 'مدير النظام';

/**
 * GET /api/setup/status
 * التحقق من حالة السيرفر والـ DB
 */
router.get('/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    return res.json({
      success: true,
      server: 'running',
      db: states[dbState] || 'unknown',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

/**
 * POST /api/setup/init-admin
 * GET  /api/setup/init-admin?key=SECRET
 *
 * ينشئ أو يُعيد تعيين حساب الأدمن
 */
const initAdminHandler = async (req, res) => {
  try {
    // التحقق من المفتاح السري
    const providedKey = req.body?.secretKey || req.query?.key || req.headers['x-setup-key'];

    if (providedKey !== SETUP_SECRET) {
      logger.warn(`[setup] Unauthorized init-admin attempt from ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized — invalid secret key',
      });
    }

    // تحميل الـ User model
    let User;
    try {
      User = require('../models/User');
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: 'User model not found: ' + err.message });
    }

    // التحقق من اتصال MongoDB
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB not connected. State: ' + mongoose.connection.readyState,
      });
    }

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // البحث عن الأدمن أو إنشائه
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      // تحديث كلمة المرور والدور
      await User.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            failedLoginAttempts: 0,
            updatedAt: new Date(),
          },
          $unset: { lockUntil: '' },
        }
      );

      logger.info(`[setup] ✅ Admin password reset for: ${ADMIN_EMAIL}`);
      return res.json({
        success: true,
        action: 'updated',
        message: `Admin account updated successfully`,
        credentials: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        },
      });
    } else {
      // إنشاء أدمن جديد
      await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullName: ADMIN_FULL_NAME,
        role: 'admin',
        isActive: true,
        failedLoginAttempts: 0,
      });

      logger.info(`[setup] ✅ Admin created: ${ADMIN_EMAIL}`);
      return res.json({
        success: true,
        action: 'created',
        message: `Admin account created successfully`,
        credentials: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        },
      });
    }
  } catch (err) {
    logger.error('[setup] init-admin error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

router.post('/init-admin', initAdminHandler);
router.get('/init-admin', initAdminHandler);

module.exports = router;
