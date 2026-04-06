/**
 * ensureAdmin.js — ضمان وجود مستخدم admin عند أول تشغيل فقط
 *
 * يُشغَّل تلقائياً من server.js بعد connectDB().
 * يستخدم MongoDB native driver مباشرة (تجاوز كل Mongoose hooks/validators).
 *
 * ⚠️  SECURITY RULES:
 *   1. Creates admin ONLY if no admin exists (never overwrites existing)
 *   2. Requires ADMIN_PASSWORD from environment (no hardcoded fallback)
 *   3. Forces requirePasswordChange: true on first creation
 *   4. Never logs sensitive credentials
 */
'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const logger = require('./logger');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@alawael.com').toLowerCase().trim();
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'مدير النظام';

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

    // ─── Check if ANY admin already exists ─────────────────────────────────
    const existingAdmin = await collection.findOne({
      $or: [{ email: ADMIN_EMAIL }, { role: 'admin', isActive: true }],
    });

    if (existingAdmin) {
      logger.info(
        `[ensureAdmin] ✅ Admin account exists (${existingAdmin.email}) — no changes made`
      );
      return; // ⚠️ NEVER overwrite existing admin
    }

    // ─── Admin doesn't exist — create one ──────────────────────────────────
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
      logger.warn(
        '[ensureAdmin] ⚠️  No admin exists and ADMIN_PASSWORD env var is not set. ' +
          'Set ADMIN_PASSWORD in .env to create the initial admin account.'
      );
      return;
    }

    if (ADMIN_PASSWORD.length < 8) {
      logger.error('[ensureAdmin] ❌ ADMIN_PASSWORD must be at least 8 characters');
      return;
    }

    // ─── تشفير كلمة المرور ──────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // التحقق من صحة الـ hash فوراً
    const hashOk = await bcrypt.compare(ADMIN_PASSWORD, hashedPassword);
    if (!hashOk) {
      logger.error('[ensureAdmin] ❌ bcrypt hash verification failed — aborting');
      return;
    }

    // ─── إنشاء حساب المدير (insert فقط — لا update) ──────────────────────
    const now = new Date();
    await collection.insertOne({
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
      requirePasswordChange: true, // ⚠️ Force password change on first login
      createdAt: now,
      updatedAt: now,
      loginHistory: [],
      passwordHistory: [],
    });

    logger.info(`[ensureAdmin] ✅ Initial admin account created — email: ${ADMIN_EMAIL}`);
    logger.info(
      '[ensureAdmin]    ⚠️  requirePasswordChange: true — admin must change password on first login'
    );
  } catch (err) {
    // Duplicate key error (admin was created between our check and insert)
    if (err.code === 11000) {
      logger.info('[ensureAdmin] ✅ Admin account already exists (concurrent creation)');
      return;
    }
    // لا نُوقف السيرفر بسبب هذا الخطأ — لكن نسجّله بوضوح
    logger.error('[ensureAdmin] ❌ Error:', err.message);
  }
}

module.exports = { ensureAdmin };
