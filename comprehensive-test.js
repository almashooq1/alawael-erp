const http = require('http');

const baseURL = 'http://localhost:3001';

// Test credentials
const testCreds = {
  email: 'admin@alawael.com',
  password: 'Admin@123456',
};

let authToken = null;

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║         🧪 اختبار شامل لنظام AlAwael ERP               ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseURL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test 1: Health Check
  console.log('1️⃣  فحص صحة النظام...');
  try {
    const health = await makeRequest('GET', '/health');
    if (health.status === 200) {
      console.log('   ✅ Backend يعمل بشكل طبيعي\n');
      results.passed++;
    } else {
      console.log('   ❌ Backend لا يستجيب\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في الاتصال\n');
    results.failed++;
  }

  // Test 2: Login
  console.log('2️⃣  اختبار تسجيل الدخول...');
  try {
    const login = await makeRequest('POST', '/api/auth/login', testCreds);
    if (login.status === 200 && login.data.token) {
      authToken = login.data.token;
      console.log('   ✅ تسجيل الدخول نجح');
      console.log('   📝 البريد:', login.data.user?.email, '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل تسجيل الدخول\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في تسجيل الدخول\n');
    results.failed++;
  }

  // Test 3: Get Users
  console.log('3️⃣  اختبار جلب قائمة المستخدمين...');
  try {
    const users = await makeRequest('GET', '/api/users');
    if (users.status === 200) {
      console.log('   ✅ تم جلب المستخدمين');
      console.log('   📊 العدد:', users.data.length || 'N/A', '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل جلب المستخدمين\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في جلب المستخدمين\n');
    results.failed++;
  }

  // Test 4: Get Modules
  console.log('4️⃣  اختبار جلب قائمة الموديولات...');
  try {
    const modules = await makeRequest('GET', '/api/modules');
    if (modules.status === 200) {
      console.log('   ✅ تم جلب الموديولات');
      console.log('   📊 الموديولات:', modules.data.length || 'N/A', '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل جلب الموديولات\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في جلب الموديولات\n');
    results.failed++;
  }

  // Test 5: CRM Dashboard
  console.log('5️⃣  اختبار لوحة تحكم CRM...');
  try {
    const crmDash = await makeRequest('GET', '/api/crm/dashboard');
    if (crmDash.status === 200) {
      console.log('   ✅ لوحة تحكم CRM تعمل');
      console.log('   📊 عدد العملاء:', crmDash.data.kpis?.[0]?.value || 'N/A');
      console.log('   📊 الفرص المفتوحة:', crmDash.data.kpis?.[1]?.value || 'N/A', '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل تحميل لوحة CRM\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في CRM Dashboard\n');
    results.failed++;
  }

  // Test 6: CRM Customers
  console.log('6️⃣  اختبار نقطة العملاء في CRM...');
  try {
    const crmCustomers = await makeRequest('GET', '/api/crm/customers');
    if (crmCustomers.status === 200) {
      console.log('   ✅ نقطة العملاء تعمل');
      console.log('   👥 عدد العملاء:', crmCustomers.data.customers?.length || 0, '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل جلب العملاء\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في نقطة العملاء\n');
    results.failed++;
  }

  // Test 7: CRM Deals
  console.log('7️⃣  اختبار نقطة الفرص في CRM...');
  try {
    const crmDeals = await makeRequest('GET', '/api/crm/deals');
    if (crmDeals.status === 200) {
      console.log('   ✅ نقطة الفرص تعمل');
      console.log('   💼 عدد الفرص:', crmDeals.data.deals?.length || 0, '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل جلب الفرص\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في نقطة الفرص\n');
    results.failed++;
  }

  // Test 8: CRM Pipeline
  console.log('8️⃣  اختبار خط أنابيب البيع...');
  try {
    const pipeline = await makeRequest('GET', '/api/crm/pipeline');
    if (pipeline.status === 200) {
      console.log('   ✅ خط الأنابيب يعمل');
      console.log('   📈 المراحل:', pipeline.data.stages?.length || 0, '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل جلب خط الأنابيب\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في خط الأنابيب\n');
    results.failed++;
  }

  // Test 9: CRM Activities
  console.log('9️⃣  اختبار سجل الأنشطة...');
  try {
    const activities = await makeRequest('GET', '/api/crm/activities');
    if (activities.status === 200) {
      console.log('   ✅ سجل الأنشطة يعمل');
      console.log('   📋 الأنشطة:', activities.data.activities?.length || 0, '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل جلب الأنشطة\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في سجل الأنشطة\n');
    results.failed++;
  }

  // Test 10: CRM Analytics
  console.log('🔟 اختبار التحليلات المتقدمة...');
  try {
    const analytics = await makeRequest('GET', '/api/crm/analytics');
    if (analytics.status === 200) {
      console.log('   ✅ التحليلات تعمل');
      console.log('   📊 قطاعات البيانات:', Object.keys(analytics.data || {}).length, '\n');
      results.passed++;
    } else {
      console.log('   ❌ فشل جلب التحليلات\n');
      results.failed++;
    }
  } catch (err) {
    console.log('   ❌ خطأ في التحليلات\n');
    results.failed++;
  }

  // Summary
  const total = results.passed + results.failed;
  const percentage = Math.round((results.passed / total) * 100);

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                    📊 ملخص الاختبارات                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`   ✅ نجح: ${results.passed}/${total}`);
  console.log(`   ❌ فشل: ${results.failed}/${total}`);
  console.log(`   📈 النسبة: ${percentage}%\n`);

  if (percentage === 100) {
    console.log('🎉 جميع الاختبارات نجحت! النظام يعمل بكمال.\n');
  } else if (percentage >= 80) {
    console.log('✅ النظام يعمل بشكل جيد جداً.\n');
  } else {
    console.log('⚠️ هناك بعض المشاكل التي تحتاج انتباه.\n');
  }

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║               🚀 العنوانات الهامة للوصول                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('   🏠 الرئيسية: http://localhost:3000/');
  console.log('   👤 تسجيل الدخول: http://localhost:3000/login');
  console.log('   📊 لوحة التحكم: http://localhost:3000/dashboard');
  console.log('   💼 نظام CRM: http://localhost:3000/crm');
  console.log('   📚 التعليم الإلكتروني: http://localhost:3000/elearning');
  console.log('   💰 المالية: http://localhost:3000/finance');
  console.log('   👥 الموارد البشرية: http://localhost:3000/hr\n');
  console.log('   📝 بيانات الدخول:');
  console.log('      البريد:', testCreds.email);
  console.log('      كلمة المرور: Admin@123456\n');
}

runTests().catch(console.error);
