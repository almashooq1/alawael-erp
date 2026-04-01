/**
 * Create / Reset Admin User
 * يُنشئ أو يُعيد تعيين كلمة مرور مدير النظام
 *
 * الاستخدام:
 *   node backend/create-admin.js
 */
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:adminpassword@localhost:27017/alawael_erp?authSource=admin';

// ─── بيانات المدير الموحّدة ───────────────────────────────────────────────────
const ADMIN_EMAIL = 'admin@alawael.com.sa';
const ADMIN_EMAIL_LEGACY = 'admin@alawael.com'; // البريد القديم
const ADMIN_PASSWORD = 'Admin@2026';
const ADMIN_FULLNAME = 'عبدالله بن سعود المطيري';

async function createAdmin() {
  console.log('\n🔌 الاتصال بـ MongoDB...');
  console.log('   URI:', MONGODB_URI.replace(/:([^:@]+)@/, ':***@'));

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ تم الاتصال بنجاح\n');

  const User = require('./models/User');
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  // ─── التحقق من وجود المدير (البريد الجديد) ────────────────────────────────
  let admin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

  if (admin) {
    // إعادة تعيين كلمة المرور
    admin.password = hashedPassword;
    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined;
    admin.isActive = true;
    await admin.save();

    console.log('✅ تم إعادة تعيين كلمة مرور المدير');
    console.log('   البريد الإلكتروني:', admin.email);
  } else {
    // التحقق من البريد القديم
    const legacy = await User.findOne({ email: ADMIN_EMAIL_LEGACY }).select('+password');
    if (legacy) {
      legacy.email = ADMIN_EMAIL;
      legacy.password = hashedPassword;
      legacy.failedLoginAttempts = 0;
      legacy.lockUntil = undefined;
      legacy.isActive = true;
      await legacy.save();

      console.log('✅ تم تحديث المدير القديم وتغيير بريده الإلكتروني');
      console.log('   من:', ADMIN_EMAIL_LEGACY, '← إلى:', ADMIN_EMAIL);
    } else {
      // إنشاء مدير جديد
      admin = await User.create({
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullName: ADMIN_FULLNAME,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ تم إنشاء مدير النظام بنجاح');
      console.log('   ID:', admin.id);
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
