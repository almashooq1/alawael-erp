/**
 * ensureAdmin.js — الحل الجذري لضمان وجود مستخدم admin
 *
 * يُشغَّل تلقائياً من server.js بعد connectDB().
 * يستخدم MongoDB native driver مباشرة (تجاوز كل Mongoose hooks/validators).
 *
 * البريد: admin@alawael.com.sa
 * كلمة المرور: Admin@2026
 */
'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const logger = require('./logger');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@alawael.com').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026';
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'مدير النظام';

// الإيميلات القديمة للحذف فقط (لا تشمل admin@alawael.com الذي هو الرئيسي)
const LEGACY_EMAILS = [
  'admin@alawael.org',
  'admin@rehab-center.sa',
  'admin@example.com',
  'admin@alaweal.org',
];

async function ensureAdmin() {
  try {
    // التأكد من أن الاتصال قائم
    if (mongoose.connection.readyState !== 1) {
      logger.warn(
        '[ensureAdmin] MongoDB not ready (state=%d) — skipping',
        mongoose.connection.readyState
      );
      return;
    }

    const collection = mongoose.connection.db.collection('users');

    // ─── تشفير كلمة المرور ──────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // التحقق من صحة الـ hash فوراً
    const hashOk = await bcrypt.compare(ADMIN_PASSWORD, hashedPassword);
    if (!hashOk) {
      logger.error('[ensureAdmin] ❌ bcrypt hash verification failed — aborting');
      return;
    }

    // ─── حذف الحسابات القديمة المتعارضة ────────────────────────────────────
    const del = await collection.deleteMany({
      email: { $in: LEGACY_EMAILS },
    });
    if (del.deletedCount > 0) {
      logger.info(`[ensureAdmin] 🗑️  Removed ${del.deletedCount} legacy admin account(s)`);
    }

    // ─── upsert مباشر عبر native driver (تجاوز Mongoose تماماً) ────────────
    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { email: ADMIN_EMAIL },
      {
        $set: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          fullName: ADMIN_FULL_NAME,
          role: 'admin',
          isActive: true,
          emailVerified: true,
          failedLoginAttempts: 0,
          tokenVersion: 0,
          customPermissions: [],
          deniedPermissions: [],
          updatedAt: now,
          requirePasswordChange: false,
        },
        $unset: {
          lockUntil: '',
          resetPasswordToken: '',
          resetPasswordExpires: '',
        },
        $setOnInsert: {
          createdAt: now,
          loginHistory: [],
          passwordHistory: [],
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const wasNew = result?.lastErrorObject?.updatedExisting === false;
    logger.info(`[ensureAdmin] ✅ Admin ${wasNew ? 'created' : 'updated'} — email: ${ADMIN_EMAIL}`);

    // ─── التحقق النهائي من قاعدة البيانات ──────────────────────────────────
    const verified = await collection.findOne({ email: ADMIN_EMAIL });

    if (!verified || !verified.password) {
      logger.error(
        '[ensureAdmin] ❌ Post-upsert verification FAILED — admin not found or no password!'
      );
      return;
    }

    const finalOk = await bcrypt.compare(ADMIN_PASSWORD, verified.password);
    if (!finalOk) {
      logger.error('[ensureAdmin] ❌ Post-upsert password check FAILED — hash mismatch!');
      return;
    }

    logger.info('[ensureAdmin] ✅ Final verification passed — login credentials confirmed');
    logger.info(`[ensureAdmin]    Email:  ${ADMIN_EMAIL}`);
    logger.info(`[ensureAdmin]    Role:   ${verified.role}`);
    logger.info(`[ensureAdmin]    Active: ${verified.isActive}`);
    logger.info(`[ensureAdmin]    Locked: ${verified.lockUntil ? '🔒 YES' : '🔓 NO'}`);
  } catch (err) {
    // لا نُوقف السيرفر بسبب هذا الخطأ — لكن نسجّله بوضوح
    logger.error('[ensureAdmin] ❌ FATAL ERROR:', err.message);
    logger.error('[ensureAdmin]', err.stack);
  }
}

module.exports = { ensureAdmin };
