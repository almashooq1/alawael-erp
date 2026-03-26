/**
 * Seed Script — System Settings
 * بذر إعدادات النظام الافتراضية
 *
 * Populates baseline system settings required for first launch.
 * Run: node seed/system-settings-seed.js
 *
 * Environment:
 *   MONGODB_URI — target database (default: localhost)
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

const DEFAULT_SETTINGS = [
  // ─── General ─────────────────────────────────────────────────────
  {
    key: 'system.name',
    value: 'نظام مراكز الأوائل للرعاية النهارية',
    valueEn: 'Al-Awael Daycare Centers System',
    category: 'general',
    description: 'اسم النظام',
  },
  {
    key: 'system.language',
    value: 'ar',
    category: 'general',
    description: 'اللغة الافتراضية',
  },
  {
    key: 'system.timezone',
    value: 'Asia/Riyadh',
    category: 'general',
    description: 'المنطقة الزمنية',
  },
  {
    key: 'system.currency',
    value: 'SAR',
    category: 'general',
    description: 'العملة الافتراضية',
  },
  {
    key: 'system.dateFormat',
    value: 'DD/MM/YYYY',
    category: 'general',
    description: 'تنسيق التاريخ',
  },

  // ─── Session / Attendance ────────────────────────────────────────
  {
    key: 'attendance.workStartTime',
    value: '07:30',
    category: 'attendance',
    description: 'بداية الدوام',
  },
  {
    key: 'attendance.workEndTime',
    value: '16:00',
    category: 'attendance',
    description: 'نهاية الدوام',
  },
  {
    key: 'attendance.lateThresholdMinutes',
    value: 15,
    category: 'attendance',
    description: 'حد التأخير بالدقائق',
  },
  {
    key: 'session.maxPerDay',
    value: 10,
    category: 'session',
    description: 'أقصى عدد جلسات يومياً',
  },
  {
    key: 'session.minBreakMinutes',
    value: 15,
    category: 'session',
    description: 'أقل فترة استراحة بين الجلسات',
  },
  {
    key: 'session.defaultDurationMinutes',
    value: 45,
    category: 'session',
    description: 'مدة الجلسة الافتراضية',
  },

  // ─── Notifications ──────────────────────────────────────────────
  {
    key: 'notifications.email.enabled',
    value: false,
    category: 'notifications',
    description: 'تفعيل إشعارات البريد الإلكتروني',
  },
  {
    key: 'notifications.sms.enabled',
    value: false,
    category: 'notifications',
    description: 'تفعيل إشعارات الرسائل النصية',
  },
  {
    key: 'notifications.whatsapp.enabled',
    value: false,
    category: 'notifications',
    description: 'تفعيل إشعارات واتساب',
  },

  // ─── Backup ─────────────────────────────────────────────────────
  {
    key: 'backup.auto',
    value: false,
    category: 'backup',
    description: 'النسخ الاحتياطي التلقائي',
  },
  {
    key: 'backup.retentionDays',
    value: 30,
    category: 'backup',
    description: 'مدة الاحتفاظ بالنسخ (أيام)',
  },

  // ─── Finance ────────────────────────────────────────────────────
  {
    key: 'finance.vatRate',
    value: 15,
    category: 'finance',
    description: 'نسبة ضريبة القيمة المضافة %',
  },
  {
    key: 'finance.fiscalYearStart',
    value: '01-01',
    category: 'finance',
    description: 'بداية السنة المالية (MM-DD)',
  },
];

async function seed() {
  console.log('🔌 Connecting to MongoDB…');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected');

  // Use a generic collection since the project may or may not have a SystemSetting model
  const collection = mongoose.connection.db.collection('systemsettings');

  let created = 0;
  let skipped = 0;

  for (const setting of DEFAULT_SETTINGS) {
    const exists = await collection.findOne({ key: setting.key });
    if (exists) {
      console.log(`  ⏭  ${setting.key} already exists — skipped`);
      skipped++;
      continue;
    }

    await collection.insertOne({
      ...setting,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  ✅ ${setting.key} = ${JSON.stringify(setting.value)}`);
    created++;
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
