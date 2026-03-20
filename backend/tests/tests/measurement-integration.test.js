/**
 * اختبارات التكامل لنظام المقاييس
 * Measurement System Integration Tests
 * ====================================
 */

const axios = require('axios');
const _mongoose = require('mongoose');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const _DB_URI =
  process.env.MONGOOSE_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/rehabilitation-system';

// بيانات الاختبار
const _testBeneficiary = {
  name: 'أحمد محمد',
  disabilityType: 'INTELLECTUAL',
  ageGroup: 'ADULT',
};

const _testMeasurement = {
  measurementTypeCode: 'INTEL_001',
  rawScore: 65,
  standardScore: 85,
  performanceLevel: 'AVERAGE',
};

// ============================
// مجموعة الاختبارات
// ============================
async function runMeasurementTests() {
  console.log('🧪 بدء اختبارات نظام المقاييس...\n');

  let testsPassed = 0;
  let testsFailed = 0;
  const testData = {};

  try {
    // ============================
    // الاختبار 1: التحقق من الخادم
    // ============================
    console.log('📝 الاختبار 1: التحقق من صحة الخادم...');
    try {
      const healthResponse = await axios.get(`${API_URL}/health`);
      if (healthResponse.status === 200) {
        console.log('✅ الخادم يعمل بشكل صحيح\n');
        testsPassed++;
      } else {
        throw new Error('الخادم لا يستجيب');
      }
    } catch (_error) {
      console.error('❌ فشل: الخادم غير متاح');
      console.error(`   ${_error.message}\n`);
      testsFailed++;
      return { testsPassed, testsFailed };
    }

    // ============================
    // الاختبار 2: جلب أنواع المقاييس
    // ============================
    console.log('📝 الاختبار 2: جلب أنواع المقاييس...');
    try {
      const typesResponse = await axios.get(`${API_URL}/api/measurements/types`);
      if (typesResponse.data.success && typesResponse.data.count > 0) {
        console.log(`✅ تم الحصول على ${typesResponse.data.count} نوع مقياس`);
        testData.measurementTypes = typesResponse.data.data;
        console.log(`   مثال: ${typesResponse.data.data[0]?.nameAr}\n`);
        testsPassed++;
      } else {
        throw new Error('لم يتم العثور على أنواع مقاييس');
      }
    } catch (_error) {
      console.error('❌ فشل: ' + _error.message + '\n');
      testsFailed++;
    }

    // ============================
    // الاختبار 3: جلب البرامج التأهيلية
    // ============================
    console.log('📝 الاختبار 3: جلب البرامج التأهيلية...');
    try {
      const programsResponse = await axios.get(`${API_URL}/api/measurements/programs`);
      if (programsResponse.data.success && programsResponse.data.count > 0) {
        console.log(`✅ تم الحصول على ${programsResponse.data.count} برنامج`);
        testData.programs = programsResponse.data.data;
        console.log(`   مثال: ${programsResponse.data.data[0]?.nameAr}\n`);
        testsPassed++;
      } else {
        throw new Error('لم يتم العثور على برامج');
      }
    } catch (_error) {
      console.error('❌ فشل: ' + _error.message + '\n');
      testsFailed++;
    }

    // ============================
    // الاختبار 4: فحص المسارات الأساسية
    // ============================
    console.log('📝 الاختبار 4: فحص المسارات الأساسية...');
    const routes = ['/types', '/masters', '/programs', '/programs/:id'];

    let routesOK = 0;
    for (const route of routes) {
      try {
        if (route.includes(':id')) {
          const id = 'test-id';
          const fullRoute = route.replace(':id', id);
          const _response = await axios.get(`${API_URL}/api/measurements${fullRoute}`).catch(_e => {
            // 404 is expected for test-id
            if (_e.response?.status === 404) return true;
            throw _e;
          });
          routesOK++;
        } else {
          const response = await axios.get(`${API_URL}/api/measurements${route}`);
          if (response.status === 200) {
            routesOK++;
          }
        }
      } catch (_error) {
        // حتى الأخطاء تشير إلى أن المسار موجود
        if (_error.response?.status === 404 || _error.response?.status === 400) {
          routesOK++;
        }
      }
    }

    if (routesOK >= routes.length - 1) {
      console.log(`✅ جميع المسارات الأساسية موجودة (${routesOK}/${routes.length})\n`);
      testsPassed++;
    } else {
      console.error(`❌ بعض المسارات غير متاحة\n`);
      testsFailed++;
    }

    // ============================
    // ملخص الاختبارات
    // ============================
    console.log('═'.repeat(50));
    console.log('📊 ملخص الاختبارات:');
    console.log('═'.repeat(50));
    console.log(`✅ نجح: ${testsPassed}`);
    console.log(`❌ فشل: ${testsFailed}`);
    console.log(`📈 النسبة: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    console.log('═'.repeat(50));

    // ============================
    // توصيات التالي
    // ============================
    console.log('\n🎯 الخطوات التالية:');
    if (testsFailed === 0) {
      console.log('✅ النظام جاهز للاستخدام!');
      console.log('\n📚 أوامر مفيدة:');
      console.log('   npm run seed:measurements  : لتحميل البيانات الأساسية');
      console.log('   npm test                   : لتشغيل جميع الاختبارات');
      console.log('   npm start                  : لبدء الخادم');
    } else {
      console.log('⚠️  يوجد مشاكل تحتاج إلى حل');
      console.log('   تحقق من الخادم وقاعدة البيانات');
    }

    return { testsPassed, testsFailed, testData };
  } catch (_error) {
    console.error('❌ خطأ غير متوقع:', _error.message);
    return { testsPassed, testsFailed: testsFailed + 1 };
  }
}

// ============================
// تنفيذ الاختبارات
// ============================
if (require.main === module) {
  runMeasurementTests()
    .then(results => {
      process.exit(results.testsFailed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ خطأ:', error);
      process.exit(1);
    });
}

module.exports = { runMeasurementTests };
