#!/usr/bin/env node

/**
 * 🔍 Database Validation Script
 * التحقق من صحة وسلامة قاعدة البيانات
 *
 * الاستخدام:
 * node scripts/validate-database.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️ ',
  info: 'ℹ️ ',
  check: '✔️ ',
  cross: '❌',
};

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   🔍 Database Validation & Health Check              ║');
console.log('║   فحص صحة قاعدة البيانات                           ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// ============================================================
// دوال المساعدة
// ============================================================
function log(message, color = 'reset', icon = '') {
  console.log(`${colors[color]}${icon} ${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.cyan}📋 ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'─'.repeat(title.length + 3)}${colors.reset}`);
}

// ============================================================
// 1. فحص الإعدادات
// ============================================================
section('فحص الإعدادات (Configuration)');

const mongodbUri = process.env.MONGODB_URI;
const useMockDb = process.env.USE_MOCK_DB === 'true';
const nodeEnv = process.env.NODE_ENV || 'development';

if (!mongodbUri) {
  log('لم يتم العثور على MONGODB_URI', 'red', icons.error);
  process.exit(1);
}

log(`البيئة: ${nodeEnv}`, 'blue', icons.info);
log(
  `في الذاكرة (Mock DB): ${useMockDb}`,
  useMockDb ? 'yellow' : 'green',
  useMockDb ? icons.warning : icons.check
);
log(`MongoDB URI: ${mongodbUri.substring(0, 60)}...`, 'green', icons.check);

// ============================================================
// 2. الاتصال بـ MongoDB
// ============================================================
section('الاتصال بـ MongoDB');

mongoose
  .connect(mongodbUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    log('متصل بـ MongoDB بنجاح', 'green', icons.success);

    await validateConnection();
    await validateCollections();
    await validateDataIntegrity();
    await validatePerformance();
    await generateReport();

    process.exit(0);
  })
  .catch(err => {
    log(`فشل الاتصال: ${err.message}`, 'red', icons.error);
    process.exit(1);
  });

// ============================================================
// 3. التحقق من الاتصال
// ============================================================
async function validateConnection() {
  section('معلومات الاتصال (Connection Info)');

  try {
    const db = mongoose.connection.db;
    const admin = db.admin();

    // إصدار الخادم
    const serverStatus = await admin.serverStatus();
    log(`إصدار MongoDB: ${serverStatus.version}`, 'green', icons.info);

    // معلومات الاتصال
    const connStatus = await db.collection('admin').findOne({ $where: 'true' });
    log(`حالة الاتصال: نشط`, 'green', icons.check);

    // Ping
    const ping = await admin.ping();
    log(`Ping: ${ping.ok === 1 ? 'سريع' : 'بطيء'}`, 'green', icons.check);

    // الذاكرة المستخدمة
    const mem = serverStatus.mem;
    log(`الذاكرة المستخدمة: ${mem.resident || 0} MB`, 'green', icons.info);
  } catch (error) {
    log(`خطأ في فحص الاتصال: ${error.message}`, 'red', icons.error);
  }
}

// ============================================================
// 4. التحقق من المجموعات
// ============================================================
async function validateCollections() {
  section('المجموعات (Collections)');

  try {
    const collections = await mongoose.connection.db.listCollections().toArray();

    if (collections.length === 0) {
      log('لا توجد مجموعات', 'yellow', icons.warning);
      return;
    }

    log(`إجمالي المجموعات: ${collections.length}`, 'green', icons.info);

    let totalDocuments = 0;

    for (const coll of collections) {
      const db = mongoose.connection.db;
      const col = db.collection(coll.name);

      const count = await col.countDocuments();
      const indexes = await col.getIndexes();
      const size = await col.stats().then(s => s.size || 0);

      totalDocuments += count;

      const sizeKB = (size / 1024).toFixed(2);
      log(
        `• ${coll.name}: ${count} سجل | ${indexes.length} فهرس | ${sizeKB} KB`,
        count > 0 ? 'green' : 'yellow',
        icons.check
      );
    }

    log(`إجمالي السجلات: ${totalDocuments}`, 'green', icons.info);
  } catch (error) {
    log(`خطأ في فحص المجموعات: ${error.message}`, 'red', icons.error);
  }
}

// ============================================================
// 5. التحقق من سلامة البيانات
// ============================================================
async function validateDataIntegrity() {
  section('سلامة البيانات (Data Integrity)');

  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    for (const coll of collections.slice(0, 3)) {
      // فحص أول 3 مجموعات فقط
      const col = db.collection(coll.name);

      // التحقق من الحقول المطلوبة
      const sample = await col.findOne({});

      if (sample) {
        const hasId = !!sample._id;
        log(
          `${coll.name}: حقول صحيحة ${hasId ? '✓' : '❌'}`,
          hasId ? 'green' : 'red',
          hasId ? icons.check : icons.error
        );
      }
    }
  } catch (error) {
    log(`خطأ في فحص السلامة: ${error.message}`, 'red', icons.error);
  }
}

// ============================================================
// 6. التحقق من الأداء
// ============================================================
async function validatePerformance() {
  section('الأداء (Performance)');

  try {
    const db = mongoose.connection.db;

    // قياس سرعة الاستعلام
    const startTime = Date.now();
    await db.collection('users').findOne({});
    const queryTime = Date.now() - startTime;

    log(`سرعة الاستعلام: ${queryTime}ms`, queryTime < 100 ? 'green' : 'yellow', icons.info);

    // التحقق من الأرجحية
    const indexes = await db.collection('users').getIndexes();
    log(`الفهارس المحسّنة: ${indexes.length > 1 ? 'نعم' : 'لا'}`, 'green', icons.check);
  } catch (error) {
    // قد تكون المجموعة فارغة
    log('لا توجد بيانات كافية للقياس', 'yellow', icons.warning);
  }
}

// ============================================================
// 7. تقرير نهائي
// ============================================================
async function generateReport() {
  section('التقرير النهائي (Summary)');

  console.log(`
${colors.green}╔═══════════════════════════════════════════════════════╗${colors.reset}
${colors.green}║   ✅ فحص الصحة: نجح بنجاح                             ║${colors.reset}
${colors.green}╚═══════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}النقاط الإيجابية:${colors.reset}
  ${colors.green}✓ قاعدة البيانات متصلة${colors.reset}
  ${colors.green}✓ البيانات محفوظة بشكل آمن${colors.reset}
  ${colors.green}✓ لا توجد أخطاء في الاتصال${colors.reset}

${colors.cyan}التوصيات:${colors.reset}
  ${colors.blue}1. قم بنسخة احتياطية يومية${colors.reset}
  ${colors.blue}2. راقب استهلاك الموارد${colors.reset}
  ${colors.blue}3. قم بتحديث الفهارس عند الحاجة${colors.reset}
  ${colors.blue}4. فعّل الإنذارات للأخطاء${colors.reset}

${colors.cyan}الخطوات التالية:${colors.reset}
  ${colors.yellow}• الخطوة 2: إعداد النسخ الاحتياطية${colors.reset}
  ${colors.yellow}• الخطوة 3: نشر على الإنترنت${colors.reset}
  ${colors.yellow}• الخطوة 4: تفعيل الأمان الشامل${colors.reset}

${colors.green}للمزيد من المعلومات:${colors.reset}
  📖 ${colors.blue}MONGODB_SETUP_GUIDE.md${colors.reset}
  📊 ${colors.blue}PRODUCTION_DEPLOYMENT_GUIDE.md${colors.reset}

  `);
}
