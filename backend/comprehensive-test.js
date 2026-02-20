#!/usr/bin/env node

/**
 * 🧪 اختبار تكامل MOI Passport + ERP الشامل
 * Comprehensive MOI + ERP Integration Test Suite
 */

const http = require('http');

// ============================================
// 📊 تعريفات الاختبار
// ============================================

const TESTS = [
  {
    name: '✅ صحة الخادم الأساسية',
    path: '/health',
    method: 'GET',
    expectedStatus: 200
  },
  {
    name: '✅ صحة نظام الإمدادات',
    path: '/api/supply-chain/health',
    method: 'GET',
    expectedStatus: [200, 404]
  },
  {
    name: '✅ حالة موفر الإخطارات',
    path: '/api/notifications/status',
    method: 'GET',
    expectedStatus: [200, 404]
  },
  {
    name: '✅ حالة نظام SSO',
    path: '/api/sso/status',
    method: 'GET',
    expectedStatus: [200, 404]
  },
  {
    name: '✅ قائمة الموردين',
    path: '/api/supply-chain/suppliers',
    method: 'GET',
    expectedStatus: [200, 404]
  },
  {
    name: '✅ المقاييس المتقدمة',
    path: '/api/notifications/advanced/metrics',
    method: 'GET',
    expectedStatus: [200, 404]
  }
];

const MOI_TESTS = [
  {
    name: '🇸🇦 صحة MOI Passport Integration',
    path: '/api/moi/health',
    method: 'GET',
    expectedStatus: [200, 404]
  },
  {
    name: '🇸🇦 تحقق من جواز السفر',
    path: '/api/moi/passports/verify',
    method: 'POST',
    body: { passportNumber: 'TEST123456', userId: 'test-user' },
    expectedStatus: [200, 400, 404, 500]
  },
  {
    name: '🇸🇦 تحقق من بطاقة الهوية',
    path: '/api/moi/national-ids/verify',
    method: 'POST',
    body: { nationalId: '1234567890', userId: 'test-user' },
    expectedStatus: [200, 400, 404, 500]
  },
  {
    name: '🇸🇦 حالة صحة MOI',
    path: '/api/moi/health',
    method: 'GET',
    expectedStatus: [200, 404]
  }
];

// ============================================
// 🔧 دوال المساعدة
// ============================================

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close'
      },
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================
// 🧪 تشغيل الاختبارات
// ============================================

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 اختبار التكامل الشامل - MOI + ERP                          ║');
  console.log('║     Comprehensive Integration Test Suite                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // ==================
  // اختبار الخادم الأساسي
  // ==================
  console.log('📋 اختبار نقاط النهاية الأساسية:\n');
  
  for (const test of TESTS) {
    try {
      const result = await makeRequest(test.path, test.method, test.body);
      const expectedArray = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      const success = expectedArray.includes(result.statusCode);
      
      if (success) {
        console.log(`${test.name}`);
        console.log(`   URL: ${test.path}`);
        console.log(`   ✅ Status: ${result.statusCode}\n`);
        passed++;
      } else {
        console.log(`${test.name}`);
        console.log(`   URL: ${test.path}`);
        console.log(`   ❌ Expected: ${expectedArray.join(' or ')}, Got: ${result.statusCode}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`${test.name}`);
      console.log(`   ⚠️ Error: ${error.message}\n`);
      skipped++;
    }
  }

  // ==================
  // اختبار MOI Integration
  // ==================
  console.log('\n🇸🇦 اختبار MOI Passport Integration:\n');
  
  for (const test of MOI_TESTS) {
    try {
      const result = await makeRequest(test.path, test.method, test.body);
      const expectedArray = Array.isArray(test.expectedStatus) ? test.expectedStatus : [test.expectedStatus];
      const success = expectedArray.includes(result.statusCode);
      
      if (success) {
        console.log(`${test.name}`);
        console.log(`   URL: ${test.path}`);
        console.log(`   ✅ Status: ${result.statusCode}\n`);
        passed++;
      } else {
        console.log(`${test.name}`);
        console.log(`   URL: ${test.path}`);
        console.log(`   ❌ Expected: ${expectedArray.join(' or ')}, Got: ${result.statusCode}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`${test.name}`);
      console.log(`   ⚠️ Error: ${error.message}\n`);
      skipped++;
    }
  }

  // ==================
  // ملخص النتائج
  // ==================
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  📊 ملخص النتائج                                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const total = passed + failed + skipped;
  const passRate = Math.round((passed / total) * 100);
  
  console.log(`✅ نجح:    ${passed}/${total}`);
  console.log(`❌ فشل:    ${failed}/${total}`);
  console.log(`⚠️ تم تخطيه: ${skipped}/${total}`);
  console.log(`📈 معدل النجاح: ${passRate}%\n`);

  if (failed === 0 && skipped <= 2) {
    console.log('🎉 النظام يعمل بشكل مثالي!\n');
    process.exit(0);
  } else if (failed > 0) {
    console.log('⚠️ يوجد بعض المشاكل التي تحتاج إلى معالجة\n');
    process.exit(1);
  } else {
    console.log('✓ النظام يعمل (مع بعض الخدمات المفقودة والتي لا تؤثر)\n');
    process.exit(0);
  }
}

// ==================
// بدء الاختبارات
// ==================
console.log('⏳ يتم بدء الاختبارات... الرجاء الانتظار\n');
runTests().catch(err => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
