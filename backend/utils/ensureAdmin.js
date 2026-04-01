/**
 * ensureAdmin.js
 *
 * يُضمن وجود مستخدم admin في MongoDB عند كل بدء تشغيل.
 * يُشغَّل تلقائياً من server.js بعد connectDB().
 *
 * البريد: admin@alawael.com.sa
 * كلمة المرور: Admin@2026
 */

const bcrypt = require('bcryptjs');
const logger = require('./logger');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@alawael.com.sa';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026';
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'مدير النظام';

// الإيميلات القديمة التي قد تكون موجودة من seeders سابقة
const LEGACY_EMAILS = [
  'admin@alawael.com',
  'admin@alawael.org',
  'admin@rehab-center.sa',
  'admin@example.com',
];

async function ensureAdmin() {
  let User;
  try {
    User = require('../models/User');
  } catch (err) {
    logger.warn('[ensureAdmin] Could not load User model:', err.message);
    return;
  }

  try {
    // 1. البحث عن الأدمن بالإيميل الرئيسي
    const admin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

    if (admin) {
      // تحقق إذا كانت كلمة المرور المخزنة صحيحة
      const isValid = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
      if (!isValid) {
        logger.warn('[ensureAdmin] Admin password mismatch — resetting to default...');
        const salt = await bcrypt.genSalt(12);
        const hashed = await bcrypt.hash(ADMIN_PASSWORD, salt);
        await User.updateOne(
          { _id: admin._id },
          {
            $set: {
              password: hashed,
              role: 'admin',
              isActive: true,
              failedLoginAttempts: 0,
              updatedAt: new Date(),
            },
            $unset: { lockUntil: '' },
          }
        );
        logger.info('[ensureAdmin] ✅ Admin password reset successfully');
      } else {
        // تأكد من أن الدور صحيح وأن الحساب مفعّل
        if (admin.role !== 'admin' || admin.isActive === false) {
          await User.updateOne(
            { _id: admin._id },
            {
              $set: { role: 'admin', isActive: true, failedLoginAttempts: 0 },
              $unset: { lockUntil: '' },
            }
          );
          logger.info('[ensureAdmin] ✅ Admin role/status fixed');
        } else {
          logger.info('[ensureAdmin] ✅ Admin user OK — no changes needed');
        }
      }
      return;
    }

    // 2. الأدمن غير موجود — إنشاء جديد
    logger.warn('[ensureAdmin] Admin not found — creating default admin account...');

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // حذف أي حسابات legacy قديمة بنفس الإيميلات (تجنب التعارض)
    for (const legacyEmail of LEGACY_EMAILS) {
      const deleted = await User.deleteOne({ email: legacyEmail });
      if (deleted.deletedCount > 0) {
        logger.info(`[ensureAdmin] Removed legacy admin: ${legacyEmail}`);
      }
    }

    await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      fullName: ADMIN_FULL_NAME,
      role: 'admin',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`[ensureAdmin] ✅ Admin created successfully: ${ADMIN_EMAIL}`);
    logger.info(`[ensureAdmin] 🔑 Password: ${ADMIN_PASSWORD}`);
  } catch (err) {
    logger.error('[ensureAdmin] Error:', err.message);
    // لا نُوقف السيرفر بسبب هذا الخطأ
  }
}

module.exports = { ensureAdmin };
