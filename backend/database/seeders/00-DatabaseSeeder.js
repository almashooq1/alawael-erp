#!/usr/bin/env node
/**
 * 00-DatabaseSeeder.js — المُشغّل الرئيسي لجميع Seeders
 * =========================================================
 * الأمر: node backend/database/seeders/00-DatabaseSeeder.js
 * أو عبر npm: npm run db:seed (من مجلد backend)
 *
 * يُنشئ البيانات التجريبية بالترتيب الصحيح:
 *   1. إعدادات النظام
 *   2. الفروع (3 فروع)
 *   3. الموظفون (31+)
 *   4. المستفيدون (50)
 *   5. الجلسات (100+)
 *   6. الفواتير (30+)
 *   7. المركبات والمسارات (5 + 4)
 *   8. الإعدادات (70+ إعداد)
 */

'use strict';

const mongoose = require('mongoose');
const path = require('path');

// ===== تحميل متغيرات البيئة =====
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
} catch {
  // dotenv اختياري
}

// ===== استيراد وظائف الـ Seeders =====
// الـ Seeders القديمة تصدّر { run }
const { run: seedBranches } = require('./01-BranchSeeder');
const { run: seedUsers } = require('./02-UsersSeeder');
const { run: seedBeneficiaries } = require('./03-BeneficiariesSeeder');
const { run: seedSessions } = require('./04-SessionsSeeder');
// الـ Seeders الجديدة تصدّر أسماء صريحة
const { seedInvoices } = require('./05-InvoicesSeeder');
const { seedVehicles } = require('./06-VehiclesSeeder');
const { seedSettings } = require('./07-SettingsSeeder');

// ===== استيراد النماذج الأساسية =====
// تسجيل النماذج قبل استخدامها في الـ Seeders
require('../../models/Branch');
require('../../models/User');
require('../../models/Beneficiary');

// ===== الاتصال بقاعدة البيانات =====
async function connectDB() {
  const uri =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/alawael_erp';

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });

  console.log(`🔗 متصل بقاعدة البيانات: ${mongoose.connection.db.databaseName}`);
}

// ===== دالة عرض الفاصل =====
function separator(char = '─', length = 55) {
  return char.repeat(length);
}

// ===== المُشغّل الرئيسي =====
async function runSeeders() {
  const startTime = Date.now();

  console.log('');
  console.log(separator('═'));
  console.log('  🌱 نظام Seeding الشامل — Rehab-ERP v2.0');
  console.log('  مركز الأمل للتأهيل | Al-Amal Rehab Center');
  console.log(separator('═'));
  console.log('');

  try {
    // ===== 1. الاتصال بالقاعدة =====
    console.log('🔌 الاتصال بقاعدة البيانات...');
    await connectDB();
    console.log('');

    // ===== 2. الإعدادات =====
    console.log(separator());
    console.log('⚙️  [1/7] إعدادات النظام...');
    await seedSettings();

    // ===== 3. الفروع =====
    console.log(separator());
    console.log('🏢 [2/7] الفروع الثلاثة...');
    await seedBranches();

    // ===== 4. الموظفون =====
    console.log(separator());
    console.log('👥 [3/7] الموظفون (31+ موظف)...');
    await seedUsers();

    // ===== 5. المستفيدون =====
    console.log(separator());
    console.log('🧒 [4/7] المستفيدون (50 مستفيد)...');
    await seedBeneficiaries();

    // ===== 6. الجلسات =====
    console.log(separator());
    console.log('📅 [5/7] جلسات الشهر الأخير (100+ جلسة)...');
    await seedSessions();

    // ===== 7. الفواتير =====
    console.log(separator());
    console.log('💰 [6/7] الفواتير والمدفوعات (30+ فاتورة)...');
    await seedInvoices();

    // ===== 8. المركبات =====
    console.log(separator());
    console.log('🚐 [7/7] المركبات والمسارات (5 مركبات + 4 مسارات)...');
    await seedVehicles();

    // ===== ملخص نهائي =====
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log(separator('═'));
    console.log('');
    console.log('✅ تم إنشاء جميع البيانات التجريبية بنجاح!');
    console.log(`⏱️  الوقت المستغرق: ${elapsed} ثانية`);
    console.log('');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│           ملخص البيانات المُنشأة          │');
    console.log('├─────────────────────────────────────────┤');
    console.log('│  الفروع           :  3 فروع              │');
    console.log('│  الموظفون         :  31+ موظف             │');
    console.log('│  المستفيدون       :  50 مستفيد            │');
    console.log('│  الجلسات          :  100+ جلسة            │');
    console.log('│  الفواتير         :  30+ فاتورة           │');
    console.log('│  المركبات         :  5 مركبات             │');
    console.log('│  المسارات         :  4 مسارات             │');
    console.log('│  الإعدادات        :  70+ إعداد            │');
    console.log('└─────────────────────────────────────────┘');
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  بيانات تسجيل الدخول:');
    console.log('═══════════════════════════════════════════');
    console.log('  🔑 مدير النظام:');
    console.log('     البريد  : admin@alawael.com');
    console.log('     كلمة المرور: Admin@2026');
    console.log('');
    console.log('  🔑 مدير فرع الرياض:');
    console.log('     البريد  : ahmed.amri@rehab-center.sa');
    console.log('     كلمة المرور: Manager@2026');
    console.log('');
    console.log('  🔑 أخصائية نطق (الرياض):');
    console.log('     البريد  : noura.qahtani@rehab-center.sa');
    console.log('     كلمة المرور: Specialist@2026');
    console.log('');
    console.log('  🔑 موظفة استقبال:');
    console.log('     البريد  : maha.rajhi@rehab-center.sa');
    console.log('     كلمة المرور: Reception@2026');
    console.log('');
    console.log('  🔑 محاسب:');
    console.log('     البريد  : adel.namri@rehab-center.sa');
    console.log('     كلمة المرور: Account@2026');
    console.log('═══════════════════════════════════════════');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ خطأ أثناء تشغيل Seeders:');
    console.error(error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 تم قطع الاتصال بقاعدة البيانات');
    console.log('');
  }
}

// تشغيل إذا استُدعي مباشرةً
if (require.main === module) {
  runSeeders();
}

module.exports = { runSeeders };
