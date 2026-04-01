/**
 * create-admin.js — الحل الجذري الكامل لإنشاء/إعادة تعيين مدير النظام
 *
 * الاستخدام:
 *   node backend/create-admin.js   (من مجلد root)
 *   node create-admin.js           (من مجلد backend)
 *
 * يعمل بطريقتين:
 *  1. عبر Mongoose مع تجاوز كل pre-save hooks
 *  2. مباشرة عبر MongoDB native driver كـ fallback
 */
'use strict';

const path = require('path');
const fs = require('fs');

// تحديد مسار .env
const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael-erp';

// ─── بيانات المدير الموحّدة ───────────────────────────────────────────────────
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@alawael.com.sa').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026';
const ADMIN_FULLNAME = process.env.ADMIN_FULL_NAME || 'عبدالله بن سعود المطيري';

// جميع الإيميلات القديمة المحتملة
const ALL_POSSIBLE_EMAILS = [
  ADMIN_EMAIL,
  'admin@alawael.com',
  'admin@alawael.org',
  'admin@rehab-center.sa',
  'admin@example.com',
  'admin@alaweal.org',
];

async function createAdmin() {
  console.log('\n══════════════════════════════════════════════');
  console.log('🔧 إصلاح حساب المدير — الحل الجذري الكامل');
  console.log('══════════════════════════════════════════════');
  console.log('🔌 URI:', MONGODB_URI.replace(/:([^:@]{1,}?)@/, ':***@'));
  console.log('📧 Target Email:', ADMIN_EMAIL);
  console.log('');

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  console.log('✅ MongoDB متصل');

  // ─── تشفير كلمة المرور بـ bcrypt (12 rounds) ──────────────────────────────
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  console.log('🔐 Hash generated:', hashedPassword.substring(0, 20) + '...');

  // ─── التحقق من صحة الـ hash قبل الحفظ ────────────────────────────────────
  const verifyOk = await bcrypt.compare(ADMIN_PASSWORD, hashedPassword);
  if (!verifyOk) {
    throw new Error('❌ CRITICAL: bcrypt hash verification failed! Aborting.');
  }
  console.log('✅ Hash verification passed');

  const db = mongoose.connection.db;
  const collection = db.collection('users');

  // ─── حذف جميع الحسابات القديمة / المتعارضة ─────────────────────────────
  const deleteResult = await collection.deleteMany({
    email: { $in: ALL_POSSIBLE_EMAILS.filter(e => e !== ADMIN_EMAIL) },
  });
  if (deleteResult.deletedCount > 0) {
    console.log(`🗑️  حُذفت ${deleteResult.deletedCount} حسابات قديمة متعارضة`);
  }

  // ─── upsert المدير الرئيسي مباشرة عبر native driver ─────────────────────
  // (تجاوز كل Mongoose middleware/hooks/validators)
  const now = new Date();
  const result = await collection.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullName: ADMIN_FULLNAME,
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
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  const savedUser = result?.value || result;
  const action = result?.lastErrorObject?.updatedExisting === false ? 'created' : 'updated';
  console.log(`✅ Admin ${action} successfully`);
  if (savedUser?._id) {
    console.log('   ID:', savedUser._id.toString());
  }

  // ─── التحقق النهائي: قراءة من قاعدة البيانات والتأكد ─────────────────────
  console.log('\n🔍 التحقق النهائي من قاعدة البيانات...');
  const verified = await collection.findOne({ email: ADMIN_EMAIL });

  if (!verified) {
    throw new Error('❌ CRITICAL: Admin not found after upsert!');
  }
  if (!verified.password) {
    throw new Error('❌ CRITICAL: Admin has no password after upsert!');
  }

  const finalCheck = await bcrypt.compare(ADMIN_PASSWORD, verified.password);
  if (!finalCheck) {
    throw new Error('❌ CRITICAL: Password verification failed after upsert!');
  }

  if (!verified.isActive) {
    await collection.updateOne({ email: ADMIN_EMAIL }, { $set: { isActive: true } });
    console.log('⚠️  isActive was false — fixed');
  }

  if (verified.lockUntil) {
    await collection.updateOne({ email: ADMIN_EMAIL }, { $unset: { lockUntil: '' } });
    console.log('⚠️  Account was locked — unlocked');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ الإصلاح الجذري اكتمل بنجاح 100%');
  console.log('');
  console.log('🔑 بيانات تسجيل الدخول:');
  console.log('   البريد الإلكتروني: ' + ADMIN_EMAIL);
  console.log('   كلمة المرور:       ' + ADMIN_PASSWORD);
  console.log('   الدور:             ' + verified.role);
  console.log('   الحالة:            ' + (verified.isActive ? '✅ مفعّل' : '❌ معطّل'));
  console.log('   قفل الحساب:        ' + (verified.lockUntil ? '🔒 مقفل' : '🔓 مفتوح'));
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  await mongoose.disconnect();
  console.log('🔌 تم قطع الاتصال\n');
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('\n❌ خطأ فادح:', err.message);
  console.error(err.stack);
  process.exit(1);
});
