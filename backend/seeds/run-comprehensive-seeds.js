/**
 * @file run-comprehensive-seeds.js
 * @description Master Seed Runner — نظام إدارة مراكز تأهيل ذوي الإعاقة
 *
 * يُنفّذ جميع الـ seeds الشاملة بالترتيب الصحيح:
 *   1. الفروع الثلاثة (RUH-MAIN / JED-MAIN / DAM-MAIN)
 *   2. الموظفون + حسابات المستخدمين (30 موظف)
 *   3. المستفيدون + أولياء الأمور (50 مستفيد)
 *   4. الخطط العلاجية + الجلسات (100+ جلسة)
 *   5. الفواتير والمدفوعات
 *   6. المركبات والمسارات
 *
 * الاستخدام:
 *   node backend/seeds/run-comprehensive-seeds.js
 *   node backend/seeds/run-comprehensive-seeds.js --down   (حذف البيانات)
 *   node backend/seeds/run-comprehensive-seeds.js --force  (إعادة البناء)
 *
 * DEV/STAGING only — NOT for production
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

// ─── Seed Modules ──────────────────────────────────────────────────────────────
const employeesSeed = require('./comprehensive-employees.seed');
const benefSeed = require('./comprehensive-beneficiaries.seed');
const plansSeed = require('./treatment-plans-sessions.seed');
const invoicesSeed = require('./invoices-payments.seed');
const vehiclesSeed = require('./vehicles-transport.seed');

// ─── بيانات الفروع الثلاثة المستخدمة في الـ seeds الشاملة ──────────────────
const REHAB_BRANCHES = [
  {
    branchCode: 'RUH-MAIN',
    nameAr: 'فرع الرياض الرئيسي',
    nameEn: 'Riyadh Main Branch',
    city: 'الرياض',
    cityEn: 'Riyadh',
    region: 'riyadh',
    address: 'طريق الملك فهد، حي الملقا، الرياض',
    phone: '+966-11-4000001',
    email: 'riyadh@alawael.com.sa',
    coordinates: { lat: 24.7136, lng: 46.6753 },
    capacity: { maxDailySessions: 60, maxBeneficiaries: 150, therapyRooms: 15 },
    status: 'active',
    isActive: true,
  },
  {
    branchCode: 'JED-MAIN',
    nameAr: 'فرع جدة الرئيسي',
    nameEn: 'Jeddah Main Branch',
    city: 'جدة',
    cityEn: 'Jeddah',
    region: 'makkah',
    address: 'حي الروضة، شارع فلسطين، جدة',
    phone: '+966-12-4000002',
    email: 'jeddah@alawael.com.sa',
    coordinates: { lat: 21.5433, lng: 39.1728 },
    capacity: { maxDailySessions: 54, maxBeneficiaries: 130, therapyRooms: 14 },
    status: 'active',
    isActive: true,
  },
  {
    branchCode: 'DAM-MAIN',
    nameAr: 'فرع الدمام الرئيسي',
    nameEn: 'Dammam Main Branch',
    city: 'الدمام',
    cityEn: 'Dammam',
    region: 'eastern',
    address: 'حي الشاطئ، طريق الملك عبدالعزيز، الدمام',
    phone: '+966-13-4000003',
    email: 'dammam@alawael.com.sa',
    coordinates: { lat: 26.4207, lng: 50.0888 },
    capacity: { maxDailySessions: 48, maxBeneficiaries: 120, therapyRooms: 12 },
    status: 'active',
    isActive: true,
  },
];

// ─── إعدادات النظام الأساسية ──────────────────────────────────────────────────
const SYSTEM_SETTINGS = [
  // عام
  {
    group: 'general',
    key: 'center_name_ar',
    value: 'مركز الأوائل لتأهيل ذوي الإعاقة',
    type: 'string',
  },
  {
    group: 'general',
    key: 'center_name_en',
    value: 'Al-Awael Disability Rehabilitation Center',
    type: 'string',
  },
  { group: 'general', key: 'default_language', value: 'ar', type: 'string' },
  { group: 'general', key: 'timezone', value: 'Asia/Riyadh', type: 'string' },
  { group: 'general', key: 'phone', value: '920012345', type: 'string' },
  { group: 'general', key: 'email', value: 'info@alawael.com.sa', type: 'string' },
  { group: 'general', key: 'website', value: 'https://alawael.com.sa', type: 'string' },
  // ساعات العمل
  { group: 'working_hours', key: 'default_start', value: '07:30', type: 'time' },
  { group: 'working_hours', key: 'default_end', value: '16:30', type: 'time' },
  { group: 'working_hours', key: 'thursday_end', value: '14:00', type: 'time' },
  {
    group: 'working_hours',
    key: 'weekend_days',
    value: JSON.stringify(['friday', 'saturday']),
    type: 'json',
  },
  // المواعيد
  { group: 'appointments', key: 'default_duration', value: '45', type: 'integer' },
  { group: 'appointments', key: 'buffer_between_sessions', value: '15', type: 'integer' },
  { group: 'appointments', key: 'max_advance_booking_days', value: '30', type: 'integer' },
  { group: 'appointments', key: 'cancellation_hours_before', value: '24', type: 'integer' },
  { group: 'appointments', key: 'max_cancellations_per_month', value: '3', type: 'integer' },
  {
    group: 'appointments',
    key: 'reminder_hours_before',
    value: JSON.stringify([24, 2]),
    type: 'json',
  },
  // الفوترة
  { group: 'billing', key: 'currency', value: 'SAR', type: 'string' },
  { group: 'billing', key: 'vat_rate', value: '15', type: 'decimal' },
  { group: 'billing', key: 'payment_terms_days', value: '15', type: 'integer' },
  { group: 'billing', key: 'auto_generate_invoices', value: 'true', type: 'boolean' },
  { group: 'billing', key: 'invoice_prefix', value: 'INV', type: 'string' },
  // ZATCA
  { group: 'zatca', key: 'seller_name', value: 'مركز الأوائل لتأهيل ذوي الإعاقة', type: 'string' },
  { group: 'zatca', key: 'vat_registration_number', value: '3100XXXXXXXXXX3', type: 'string' },
  { group: 'zatca', key: 'environment', value: 'sandbox', type: 'string' },
  // NPHIES
  { group: 'nphies', key: 'provider_id', value: 'NPHIES-PROV-XXXXX', type: 'string' },
  { group: 'nphies', key: 'api_base_url', value: 'https://hsb.nphies.sa', type: 'string' },
  { group: 'nphies', key: 'enabled', value: 'true', type: 'boolean' },
  // النقل
  { group: 'transport', key: 'coverage_radius_km', value: '30', type: 'integer' },
  { group: 'transport', key: 'morning_departure_time', value: '06:30', type: 'time' },
  { group: 'transport', key: 'afternoon_departure_time', value: '14:00', type: 'time' },
  { group: 'transport', key: 'gps_update_interval_seconds', value: '30', type: 'integer' },
  { group: 'transport', key: 'arrival_notification_meters', value: '500', type: 'integer' },
  // الإشعارات
  { group: 'notifications', key: 'sms_enabled', value: 'true', type: 'boolean' },
  { group: 'notifications', key: 'email_enabled', value: 'true', type: 'boolean' },
  { group: 'notifications', key: 'push_enabled', value: 'true', type: 'boolean' },
  { group: 'notifications', key: 'whatsapp_enabled', value: 'false', type: 'boolean' },
  { group: 'notifications', key: 'quiet_hours_start', value: '22:00', type: 'time' },
  { group: 'notifications', key: 'quiet_hours_end', value: '07:00', type: 'time' },
  // الذكاء الاصطناعي
  { group: 'ai', key: 'predictions_enabled', value: 'true', type: 'boolean' },
  { group: 'ai', key: 'smart_reports_enabled', value: 'true', type: 'boolean' },
  { group: 'ai', key: 'openai_model', value: 'gpt-4', type: 'string' },
  { group: 'ai', key: 'auto_scheduling_enabled', value: 'false', type: 'boolean' },
  // caseload
  { group: 'caseload', key: 'max_per_specialist', value: '15', type: 'integer' },
  { group: 'caseload', key: 'max_sessions_per_day', value: '8', type: 'integer' },
  { group: 'caseload', key: 'alert_threshold_percentage', value: '90', type: 'integer' },
];

// ─── الأدوار والصلاحيات ────────────────────────────────────────────────────────
const ROLES_PERMISSIONS = [
  {
    roleKey: 'super_admin',
    nameAr: 'مدير النظام',
    nameEn: 'Super Administrator',
    level: 1,
    permissions: ['*'], // all permissions
  },
  {
    roleKey: 'manager',
    nameAr: 'مدير الفرع',
    nameEn: 'Branch Manager',
    level: 2,
    permissions: [
      'beneficiaries.*',
      'sessions.*',
      'plans.*',
      'assessments.*',
      'appointments.*',
      'employees.view',
      'employees.manage_attendance',
      'finance.view_invoices',
      'finance.create_invoices',
      'finance.view_reports',
      'transport.*',
      'reports.*',
      'tickets.*',
      'ai.view_predictions',
    ],
  },
  {
    roleKey: 'therapist',
    nameAr: 'أخصائي تأهيل',
    nameEn: 'Rehabilitation Specialist',
    level: 3,
    permissions: [
      'beneficiaries.view',
      'sessions.view',
      'sessions.create',
      'sessions.update',
      'plans.view',
      'plans.create',
      'plans.update',
      'assessments.view',
      'assessments.create',
      'assessments.update',
      'appointments.view',
      'appointments.create',
      'reports.view_clinical',
      'tickets.view',
      'tickets.create',
    ],
  },
  {
    roleKey: 'receptionist',
    nameAr: 'موظف استقبال',
    nameEn: 'Receptionist',
    level: 4,
    permissions: [
      'beneficiaries.view',
      'beneficiaries.create',
      'beneficiaries.update',
      'appointments.view_all',
      'appointments.create',
      'appointments.update',
      'appointments.cancel',
      'finance.view_invoices',
      'finance.create_invoices',
      'finance.manage_payments',
      'transport.view',
      'tickets.view',
      'tickets.create',
    ],
  },
  {
    roleKey: 'accountant',
    nameAr: 'محاسب',
    nameEn: 'Accountant',
    level: 4,
    permissions: [
      'beneficiaries.view',
      'finance.view_invoices',
      'finance.create_invoices',
      'finance.manage_payments',
      'finance.view_reports',
      'finance.manage_insurance',
      'finance.manage_refunds',
      'finance.manage_zatca',
      'finance.export_financial',
      'reports.view_financial',
      'tickets.view',
      'tickets.create',
    ],
  },
  {
    roleKey: 'hr_officer',
    nameAr: 'موارد بشرية',
    nameEn: 'HR Officer',
    level: 4,
    permissions: [
      'employees.view',
      'employees.create',
      'employees.update',
      'employees.view_salary',
      'employees.manage_attendance',
      'employees.manage_leave',
      'reports.view_operational',
      'tickets.view_all',
      'tickets.assign',
    ],
  },
  {
    roleKey: 'driver',
    nameAr: 'سائق',
    nameEn: 'Driver',
    level: 5,
    permissions: ['transport.view', 'transport.update_location'],
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────
function log(msg, type = 'info') {
  const icons = { info: 'ℹ️ ', success: '✅', warning: '⚠️ ', error: '❌', step: '📋' };
  const icon = icons[type] || icons.info;
  console.log(`  ${icon} ${msg}`);
}

function logHeader(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function logSection(title) {
  console.log(`\n  ── ${title} ──`);
}

// ─── Seed Steps ────────────────────────────────────────────────────────────────

async function seedRoles(db) {
  logSection('الأدوار والصلاحيات');
  const col = db.collection('roles');
  const now = new Date();
  let created = 0,
    skipped = 0;

  for (const role of ROLES_PERMISSIONS) {
    const exists = await col.findOne({ roleKey: role.roleKey });
    if (exists) {
      skipped++;
      continue;
    }
    await col.insertOne({
      ...role,
      metadata: { isComprehensiveSeed: true, seededAt: now },
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }
  log(`Roles: ${created} created, ${skipped} skipped`, 'success');
}

async function seedBranches(db) {
  logSection('الفروع الثلاثة');
  const col = db.collection('branches');
  const now = new Date();
  let created = 0,
    skipped = 0;

  for (const branch of REHAB_BRANCHES) {
    const exists = await col.findOne({ branchCode: branch.branchCode });
    if (exists) {
      skipped++;
      continue;
    }
    await col.insertOne({
      ...branch,
      metadata: { isComprehensiveSeed: true, seededAt: now },
      createdAt: now,
      updatedAt: now,
    });
    created++;
  }
  log(`Branches: ${created} created, ${skipped} skipped`, 'success');
}

async function seedSettings(db) {
  logSection('إعدادات النظام');
  const col = db.collection('settings');
  const now = new Date();
  let upserted = 0;

  for (const setting of SYSTEM_SETTINGS) {
    await col.updateOne(
      { group: setting.group, key: setting.key },
      { $set: { ...setting, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    upserted++;
  }
  log(`Settings: ${upserted} upserted`, 'success');
}

async function seedAdminUser(db) {
  logSection('مدير النظام (Super Admin)');
  const bcrypt = require('bcryptjs');
  const col = db.collection('users');
  const now = new Date();

  const exists = await col.findOne({ email: 'admin@alawael.com.sa' });
  if (exists) {
    log('Super admin already exists, skipping', 'warning');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin@2026', 12);
  await col.insertOne({
    email: 'admin@alawael.com.sa',
    phone: '0501234567',
    fullName: 'عبدالله بن سعود المطيري',
    password: passwordHash,
    role: 'super_admin',
    branch: 'RUH-MAIN',
    employeeRef: 'ADMIN-001',
    isActive: true,
    metadata: { isComprehensiveSeed: true, seededAt: now },
    createdAt: now,
    updatedAt: now,
  });
  log('Super admin created: admin@alawael.com.sa / Admin@2026', 'success');
}

// ─── Down (حذف البيانات) ───────────────────────────────────────────────────────
async function runDown(db) {
  logHeader('🗑️  حذف البيانات التجريبية الشاملة');
  const filter = { 'metadata.isComprehensiveSeed': true };

  const collections = [
    'sessions',
    'treatmentplans',
    'invoices',
    'payments',
    'vehicles',
    'transportroutes',
    'beneficiaries',
    'employees',
    'users',
    'branches',
    'roles',
    'settings',
  ];

  for (const colName of collections) {
    const result = await db.collection(colName).deleteMany(filter);
    if (result.deletedCount > 0) {
      log(`${colName}: deleted ${result.deletedCount}`, 'success');
    }
  }

  log('تم حذف جميع البيانات التجريبية الشاملة بنجاح', 'success');
}

// ─── Main Runner ───────────────────────────────────────────────────────────────
async function main() {
  const isDown = process.argv.includes('--down');
  const isForce = process.argv.includes('--force');

  const mongoUri =
    process.env.MONGODB_URI ||
    'mongodb://admin:adminpassword@localhost:27017/alawael_erp?authSource=admin';

  logHeader('🏗️  Al-Awael ERP — Comprehensive Seed Runner');
  console.log(`  📡 MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':***@')}`);
  console.log(`  🔧 Mode: ${isDown ? 'DOWN (delete)' : isForce ? 'FORCE (re-seed)' : 'SEED'}`);

  let client;
  try {
    client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    log('Connected to MongoDB', 'success');

    const db = client.db();

    // ─── وضع الحذف ────────────────────────────────────────────────────────
    if (isDown) {
      await runDown(db);
      return;
    }

    // ─── وضع إعادة البناء ──────────────────────────────────────────────────
    if (isForce) {
      logSection('Force mode: حذف البيانات السابقة');
      await runDown(db);
    }

    // ─── تنفيذ الـ Seeds بالترتيب ──────────────────────────────────────────
    const startTime = Date.now();

    logHeader('🌱 بدء إنشاء البيانات التجريبية');

    // 1. الأدوار
    await seedRoles(db);

    // 2. الفروع
    await seedBranches(db);

    // 3. الإعدادات
    await seedSettings(db);

    // 4. مدير النظام
    await seedAdminUser(db);

    // 5. الموظفون (30 موظف + حسابات مستخدمين)
    logSection('الموظفون وحسابات المستخدمين');
    await employeesSeed.seed(db);

    // 6. المستفيدون (50 مستفيد + أولياء أمور)
    logSection('المستفيدون');
    await benefSeed.seed(db);

    // 7. الخطط العلاجية + الجلسات (100+ جلسة)
    logSection('الخطط العلاجية والجلسات');
    await plansSeed.seed(db);

    // 8. الفواتير والمدفوعات
    logSection('الفواتير والمدفوعات');
    await invoicesSeed.seed(db);

    // 9. المركبات والمسارات
    logSection('المركبات والمسارات');
    await vehiclesSeed.seed(db);

    // ─── ملخص ────────────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    logHeader('✅ اكتمل إنشاء البيانات التجريبية بنجاح!');

    const summary = [
      ['الفروع', '3'],
      ['الأدوار', '7'],
      ['إعدادات النظام', `${SYSTEM_SETTINGS.length}+`],
      ['الموظفون', '30+'],
      ['المستفيدون', '50'],
      ['الخطط العلاجية', '20+'],
      ['الجلسات', '100+'],
      ['الفواتير', '30+'],
      ['المركبات', '5'],
      ['المسارات', '3'],
    ];

    console.log('\n  ┌─────────────────────────┬──────────┐');
    console.log('  │ العنصر                  │ العدد    │');
    console.log('  ├─────────────────────────┼──────────┤');
    summary.forEach(([item, count]) => {
      console.log(`  │ ${item.padEnd(23)} │ ${count.padEnd(8)} │`);
    });
    console.log('  └─────────────────────────┴──────────┘');

    console.log('\n  🔑 بيانات الدخول:');
    console.log('  ┌───────────────────────────────────────────────────────┐');
    console.log('  │ الدور            │ البريد الإلكتروني         │ كلمة المرور  │');
    console.log('  ├──────────────────┼───────────────────────────┼──────────────┤');
    console.log('  │ مدير النظام      │ admin@alawael.com.sa       │ Admin@2026   │');
    console.log('  │ مدير فرع الرياض  │ ahmed.omari@alawael.com.sa │ Alawael@2026 │');
    console.log('  │ أخصائي نطق       │ noura.qahtani@alawael.com.sa│ Alawael@2026│');
    console.log('  │ استقبال          │ maha.rajhi@alawael.com.sa  │ Alawael@2026 │');
    console.log('  │ محاسب            │ adel.namri@alawael.com.sa  │ Alawael@2026 │');
    console.log('  └──────────────────────────────────────────────────────┘');

    console.log(`\n  ⏱️  Completed in ${elapsed}s`);
  } catch (err) {
    console.error('\n  ❌ Seed failed:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      log('Disconnected from MongoDB', 'info');
    }
  }
}

// ─── Entry Point ───────────────────────────────────────────────────────────────
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { main, REHAB_BRANCHES, SYSTEM_SETTINGS, ROLES_PERMISSIONS };
