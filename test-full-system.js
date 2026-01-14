#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let authToken = null;

const tests = [
  {
    name: '🔐 تسجيل الدخول',
    method: 'POST',
    path: '/api/auth/login',
    data: { email: 'admin@alawael.com', password: 'Admin@123456' },
    expectedStatus: 200,
    capture: 'token',
  },
  {
    name: '📊 لوحة تحكم CRM',
    method: 'GET',
    path: '/api/crm/dashboard',
    expectedStatus: 200,
  },
  {
    name: '👥 قائمة العملاء',
    method: 'GET',
    path: '/api/crm/customers',
    expectedStatus: 200,
  },
  {
    name: '💼 الفرص التجارية',
    method: 'GET',
    path: '/api/crm/deals',
    expectedStatus: 200,
  },
  {
    name: '📈 خط أنابيب المبيعات',
    method: 'GET',
    path: '/api/crm/pipeline',
    expectedStatus: 200,
  },
  {
    name: '📋 السجل النشاط',
    method: 'GET',
    path: '/api/crm/activities',
    expectedStatus: 200,
  },
  {
    name: '📊 التحليلات المتقدمة',
    method: 'GET',
    path: '/api/crm/analytics',
    expectedStatus: 200,
  },
];

function makeRequest(test) {
  return new Promise(resolve => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: test.path,
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (authToken && test.method === 'GET') {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const passed = res.statusCode === test.expectedStatus;

          if (test.capture === 'token' && passed) {
            authToken = response.token;
          }

          resolve({
            test: test.name,
            status: res.statusCode,
            passed,
            expectedStatus: test.expectedStatus,
            dataPreview: response && typeof response === 'object' ? Object.keys(response).slice(0, 3).join(', ') : 'N/A',
          });
        } catch {
          resolve({
            test: test.name,
            status: res.statusCode,
            passed: false,
            expectedStatus: test.expectedStatus,
            error: 'JSON parsing failed',
          });
        }
      });
    });

    req.on('error', err => {
      resolve({
        test: test.name,
        status: 0,
        passed: false,
        error: err.message,
      });
    });

    if (test.data) {
      req.write(JSON.stringify(test.data));
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
  const results = [];

  for (const test of tests) {
    process.stdout.write(`⏳ اختبار: ${test.name}... `);
    const result = await makeRequest(test);

    // حفظ التوكن بعد تسجيل الدخول
    if (result.passed && test.capture === 'token' && result.dataPreview) {
      console.log(`(التوكن محفوظ)`);
    }

    results.push(result);

    if (result.passed) {
      console.log(`✅ نجح (${result.status})`);
      passed++;
    } else {
      console.log(`❌ فشل (${result.status})`);
      failed++;
    }
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                    📊 النتائج                          ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ نجح:   ${passed.toString().padEnd(49)}║`);
  console.log(`║  ❌ فشل:   ${failed.toString().padEnd(49)}║`);
  console.log(`║  📊 الإجمالي:  ${(passed + failed).toString().padEnd(45)}║`);
  const percentage = ((passed / (passed + failed)) * 100).toFixed(1);
  console.log(`║  📈 النسبة: ${percentage}%${' '.repeat(47 - percentage.length)}║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  if (passed === tests.length) {
    console.log('🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام.');
  } else {
    console.log(`⚠️  ${failed} اختبار(ات) فشل(ت). تحقق من السجلات أعلاه.`);
  }
  console.log('');
  console.log('📱 روابط الوصول:');
  console.log('   🔐 Backend API: http://localhost:3001');
  console.log('   💻 Frontend: http://localhost:3000');
  console.log('');
}

runTests().catch(console.error);
