#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let authToken = null;

function makeRequest(method, path, data = null, useAuth = true) {
  return new Promise(resolve => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (useAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
      console.log(`[DEBUG] Using token: ${authToken.substring(0, 20)}...`);
    }

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            data: response,
            success: res.statusCode >= 200 && res.statusCode < 300,
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            data: null,
            success: false,
            error: 'Parse error',
          });
        }
      });
    });

    req.on('error', err => {
      resolve({
        statusCode: 0,
        data: null,
        success: false,
        error: err.message,
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     🚀 اختبار نظام AlAwael ERP الشامل                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  let passed = 0;
  let failed = 0;

  // 1. تسجيل الدخول
  process.stdout.write('⏳ 1. تسجيل الدخول... ');
  let result = await makeRequest(
    'POST',
    '/api/auth/login',
    {
      email: 'admin@alawael.com',
      password: 'Admin@123456',
    },
    false,
  );

  if (result.success && result.data.data && result.data.data.accessToken) {
    authToken = result.data.data.accessToken;
    console.log('✅ نجح');
    passed++;
  } else {
    console.log('❌ فشل');
    failed++;
  }

  // 2. لوحة تحكم CRM
  process.stdout.write('⏳ 2. لوحة تحكم CRM... ');
  result = await makeRequest('GET', '/api/crm/dashboard');
  if (result.success && result.data.kpis) {
    console.log(`✅ نجح (${result.data.kpis.length} مؤشرات)`);
    passed++;
  } else {
    console.log('❌ فشل');
    failed++;
  }

  // 3. قائمة العملاء
  process.stdout.write('⏳ 3. قائمة العملاء... ');
  result = await makeRequest('GET', '/api/crm/customers');
  if (result.success && result.data.customers) {
    console.log(`✅ نجح (${result.data.customers.length} عميل)`);
    passed++;
  } else {
    console.log('❌ فشل');
    failed++;
  }

  // 4. الفرص التجارية
  process.stdout.write('⏳ 4. الفرص التجارية (Deals)... ');
  result = await makeRequest('GET', '/api/crm/deals');
  if (result.success && result.data.deals) {
    console.log(`✅ نجح (${result.data.deals.length} فرصة)`);
    passed++;
  } else {
    console.log('❌ فشل');
    failed++;
  }

  // 5. خط أنابيب المبيعات
  process.stdout.write('⏳ 5. خط أنابيب المبيعات (Pipeline)... ');
  result = await makeRequest('GET', '/api/crm/pipeline');
  if (result.success && result.data.stages) {
    console.log(`✅ نجح (${result.data.stages.length} مرحلة)`);
    passed++;
  } else {
    console.log('❌ فشل');
    failed++;
  }

  // 6. السجل النشاط
  process.stdout.write('⏳ 6. السجل النشاط... ');
  result = await makeRequest('GET', '/api/crm/activities');
  if (result.success && result.data.activities) {
    console.log(`✅ نجح (${result.data.activities.length} نشاط)`);
    passed++;
  } else {
    console.log('❌ فشل');
    failed++;
  }

  // 7. التحليلات المتقدمة
  process.stdout.write('⏳ 7. التحليلات المتقدمة (Analytics)... ');
  result = await makeRequest('GET', '/api/crm/analytics');
  if (result.success && result.data.salesByStage) {
    console.log(`✅ نجح`);
    passed++;
  } else {
    console.log('❌ فشل');
    failed++;
  }

  // النتائج
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                    📊 النتائج النهائية                 ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ نجح:   ${passed.toString().padEnd(49)}║`);
  console.log(`║  ❌ فشل:   ${failed.toString().padEnd(49)}║`);
  console.log(`║  📊 الإجمالي:  ${(passed + failed).toString().padEnd(45)}║`);
  const total = passed + failed;
  const percentage = ((passed / total) * 100).toFixed(1);
  console.log(`║  📈 النسبة: ${percentage}%${' '.repeat(47 - percentage.toString().length)}║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  if (passed === total) {
    console.log('🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام.');
    console.log('');
    console.log('📱 روابط الدخول:');
    console.log('   🔐 Backend API:  http://localhost:3001');
    console.log('   💻 Frontend App: http://localhost:3000');
    console.log('');
    console.log('👤 بيانات الدخول:');
    console.log('   📧 البريد الإلكتروني: admin@alawael.com');
    console.log('   🔑 كلمة السر: Admin@123456');
  } else {
    console.log(`⚠️  ${failed} اختبار(ات) فشل(ت). تحقق من الأعلى.`);
  }
  console.log('');
}

runTests().catch(err => {
  console.error('❌ خطأ:', err.message);
  process.exit(1);
});
