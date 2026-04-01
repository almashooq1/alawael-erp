/**
 * Create / Reset Admin User
 * يُنشئ أو يُعيد تعيين كلمة مرور مدير النظام
 *
 * الاستخدام:
 *   node backend/create-admin.js   (من مجلد root)
 *   node create-admin.js           (من مجلد backend)
 */
'use strict';

// تحديد مسار .env تلقائياً (يعمل من root أو backend)
const path = require('path');
const fs = require('fs');
const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

// ─── بيانات المدير الموحّدة ───────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@alawael.com.sa';
// جميع الإيميلات القديمة المحتملة
const LEGACY_EMAILS = ['admin@alawael.com', 'admin@alawael.org', 'admin@rehab-center.sa'];
const ADMIN_PASSWORD = 'Admin@2026';
const ADMIN_FULLNAME = 'عبدالله بن سعود المطيري';

async function createAdmin() {
  console.log('\n🔌 الاتصال بـ MongoDB...');
  console.log('   URI:', MONGODB_URI.replace(/:([^:@]+)@/, ':***@'));

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ تم الاتصال بنجاح\n');

  const User = require('./models/User');

  // تشفير كلمة المرور (12 rounds)
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // ─── البحث عن المدير (البريد الجديد) ───────────────────────────────────────
  let existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    // إعادة تعيين كلمة المرور مباشرة بـ updateOne (تجاوز pre-save hooks)
    await User.updateOne(
      { _id: existing._id },
      {
        $set: {
          password: hashedPassword,
          isActive: true,
          failedLoginAttempts: 0,
          updatedAt: new Date(),
        },
        $unset: { lockUntil: '' },
      }
    );
    console.log('✅ تم إعادة تعيين كلمة مرور المدير');
    console.log('   ID:', existing._id);
    console.log('   البريد الإلكتروني:', ADMIN_EMAIL);
  } else {
    // البحث عن أي بريد إلكتروني قديم
    const legacy = await User.findOne({ email: { $in: LEGACY_EMAILS } });

    if (legacy) {
      await User.updateOne(
        { _id: legacy._id },
        {
          $set: {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            isActive: true,
            failedLoginAttempts: 0,
            updatedAt: new Date(),
          },
          $unset: { lockUntil: '' },
        }
      );
      console.log('✅ تم تحديث المدير القديم');
      console.log('   من:', legacy.email, '← إلى:', ADMIN_EMAIL);
    } else {
      // إنشاء مدير جديد — الإدخال المباشر عبر insertOne يتجاوز pre-save hooks
      const db = mongoose.connection.db;
      await db.collection('users').insertOne({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullName: ADMIN_FULLNAME,
        role: 'admin',
        isActive: true,
        failedLoginAttempts: 0,
        tokenVersion: 0,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        customPermissions: [],
        deniedPermissions: [],
      });
      console.log('✅ تم إنشاء مدير النظام بنجاح');
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('🔑 بيانات تسجيل الدخول:');
  console.log('   البريد الإلكتروني: ' + ADMIN_EMAIL);
  console.log('   كلمة المرور:       ' + ADMIN_PASSWORD);
  console.log('═══════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 تم قطع الاتصال\n');
}

createAdmin().catch(err => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
