/**
 * create-admin.js — سكربت CLI لإنشاء حساب مدير النظام
 *
 * الاستخدام:
 *   ADMIN_PASSWORD=MySecurePass123 node backend/create-admin.js
 *   node create-admin.js   (من مجلد backend — يقرأ من .env)
 *
 * ⚠️  يتطلب ADMIN_PASSWORD من متغيرات البيئة (بدون fallback مشفر)
 * ⚠️  يُنشئ حساب جديد فقط — لا يكتب فوق حساب موجود
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

// ─── بيانات المدير ───────────────────────────────────────────────────────────
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@alawael.com.sa').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_FULLNAME = process.env.ADMIN_FULL_NAME || 'مدير النظام';

async function createAdmin() {
  // ─── التحقق من وجود كلمة المرور ────────────────────────────────────────
  if (!ADMIN_PASSWORD) {
    console.error('');
    console.error('❌ خطأ: ADMIN_PASSWORD غير محدد في متغيرات البيئة');
    console.error('');
    console.error('الاستخدام:');
    console.error('  ADMIN_PASSWORD=YourSecurePass123 node backend/create-admin.js');
    console.error('  أو أضف ADMIN_PASSWORD في ملف .env');
    console.error('');
    process.exit(1);
  }

  if (ADMIN_PASSWORD.length < 8) {
    console.error('❌ خطأ: ADMIN_PASSWORD يجب أن يكون 8 أحرف على الأقل');
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('🔧 إنشاء حساب مدير النظام');
  console.log('══════════════════════════════════════════════');
  console.log('🔌 URI:', MONGODB_URI.replace(/:([^:@]{1,}?)@/, ':***@'));
  console.log('📧 Email:', ADMIN_EMAIL);
  console.log('');

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  console.log('✅ MongoDB متصل');

  const db = mongoose.connection.db;
  const collection = db.collection('users');

  // ─── التحقق من وجود حساب أدمن ─────────────────────────────────────────
  const existingAdmin = await collection.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    console.log('');
    console.log(`✅ حساب المدير موجود بالفعل: ${ADMIN_EMAIL}`);
    console.log('   لا حاجة لإنشاء حساب جديد.');
    console.log('   إذا نسيت كلمة المرور، استخدم خاصية "نسيت كلمة المرور" في التطبيق.');
    console.log('');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ─── تشفير كلمة المرور بـ bcrypt (12 rounds) ──────────────────────────
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // ─── التحقق من صحة الـ hash قبل الحفظ ─────────────────────────────────
  const verifyOk = await bcrypt.compare(ADMIN_PASSWORD, hashedPassword);
  if (!verifyOk) {
    throw new Error('❌ CRITICAL: bcrypt hash verification failed! Aborting.');
  }
  console.log('✅ تم تشفير كلمة المرور والتحقق منها');

  // ─── إنشاء المدير ─────────────────────────────────────────────────────
  const now = new Date();
  await collection.insertOne({
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
    requirePasswordChange: true,
    loginHistory: [],
    passwordHistory: [],
    createdAt: now,
    updatedAt: now,
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ تم إنشاء حساب المدير بنجاح');
  console.log('');
  console.log('📧 البريد الإلكتروني: ' + ADMIN_EMAIL);
  console.log('🔑 كلمة المرور:       (كما حددتها في ADMIN_PASSWORD)');
  console.log('⚠️  يجب تغيير كلمة المرور عند أول تسجيل دخول');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  await mongoose.disconnect();
  console.log('🔌 تم قطع الاتصال\n');
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('\n❌ خطأ:', err.message);
  process.exit(1);
});
