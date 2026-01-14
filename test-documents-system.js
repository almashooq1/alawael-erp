// Test script for Documents Management System API
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'admin@alawael.com',
  password: 'Admin@123456',
};

let authToken = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
  log(`🧪 اختبار: ${name}`, 'bright');
  log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test 1: Login
async function testLogin() {
  logTest('تسجيل الدخول');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = response.data.data?.accessToken || response.data.token;
    if (!authToken) {
      throw new Error('No token received');
    }
    logSuccess('تم تسجيل الدخول بنجاح');
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    logError('فشل تسجيل الدخول');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 2: Get Dashboard
async function testDashboard() {
  logTest('لوحة تحكم المستندات');
  try {
    const response = await axios.get(`${API_URL}/documents/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const { stats, categories, recentDocuments } = response.data.data;

    logSuccess('تم جلب بيانات لوحة التحكم');
    logInfo(`إجمالي المستندات: ${stats.total}`);
    logInfo(`معتمد: ${stats.approved} | قيد المراجعة: ${stats.pending} | مرفوض: ${stats.rejected}`);
    logInfo(`عدد التصنيفات: ${categories.length}`);
    logInfo(`المستندات الأخيرة: ${recentDocuments.length}`);

    return true;
  } catch (error) {
    logError('فشل جلب لوحة التحكم');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 3: Get All Documents
async function testGetDocuments() {
  logTest('جلب جميع المستندات');
  try {
    const response = await axios.get(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const { documents, total, page, limit } = response.data.data;

    logSuccess('تم جلب المستندات');
    logInfo(`عدد المستندات: ${documents.length} من ${total}`);
    logInfo(`الصفحة: ${page} | الحد: ${limit}`);

    if (documents.length > 0) {
      logInfo(`أول مستند: ${documents[0].title}`);
    }

    return true;
  } catch (error) {
    logError('فشل جلب المستندات');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 4: Get Categories
async function testGetCategories() {
  logTest('جلب التصنيفات');
  try {
    const response = await axios.get(`${API_URL}/documents/categories/all`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const categories = Array.isArray(response.data.data) ? response.data.data : response.data.data?.categories || [];

    logSuccess('تم جلب التصنيفات');
    logInfo(`عدد التصنيفات: ${categories.length}`);

    if (categories.length > 0) {
      categories.forEach((cat, index) => {
        logInfo(`${index + 1}. ${cat.icon} ${cat.name} (${cat.count} مستند)`);
      });
    } else {
      logInfo('لا توجد تصنيفات');
    }

    return true;
  } catch (error) {
    logError('فشل جلب التصنيفات');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 5: Get Templates
async function testGetTemplates() {
  logTest('جلب القوالب');
  try {
    const response = await axios.get(`${API_URL}/documents/templates/all`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const templates = Array.isArray(response.data.data) ? response.data.data : response.data.data?.templates || [];

    logSuccess('تم جلب القوالب');
    logInfo(`عدد القوالب: ${templates.length}`);

    if (templates.length > 0) {
      templates.forEach((temp, index) => {
        logInfo(`${index + 1}. ${temp.name} - ${temp.category || 'قالب عام'}`);
      });
    } else {
      logInfo('لا توجد قوالب');
    }

    return true;
  } catch (error) {
    logError('فشل جلب القوالب');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 6: Search Documents
async function testSearchDocuments() {
  logTest('البحث في المستندات');
  try {
    const response = await axios.get(`${API_URL}/documents/search/advanced`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { query: 'عقد' },
    });

    const { results, count } = response.data.data;

    logSuccess('تم البحث بنجاح');
    logInfo(`عدد النتائج: ${count}`);

    if (results.length > 0) {
      logInfo(`أول نتيجة: ${results[0].title}`);
    }

    return true;
  } catch (error) {
    logError('فشل البحث');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 7: Filter by Category
async function testFilterByCategory() {
  logTest('تصفية حسب التصنيف');
  try {
    const response = await axios.get(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { category: 'cat_001' },
    });

    const { documents, total } = response.data.data;

    logSuccess('تم التصفية بنجاح');
    logInfo(`عدد المستندات المصفاة: ${total}`);

    return true;
  } catch (error) {
    logError('فشلت التصفية');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 8: Get Analytics
async function testGetAnalytics() {
  logTest('التحليلات والإحصائيات');
  try {
    const response = await axios.get(`${API_URL}/documents/reports/analytics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const { overview, documentsByCategory, mostDownloaded } = response.data.data;

    logSuccess('تم جلب التحليلات');
    logInfo(`إجمالي المستندات: ${overview.totalDocuments}`);
    logInfo(`إجمالي التحميلات: ${overview.totalDownloads}`);
    logInfo(`إجمالي المشاهدات: ${overview.totalViews}`);
    logInfo(`التخزين المستخدم: ${overview.storageUsage}`);

    logInfo(`\nالتوزيع حسب التصنيف:`);
    documentsByCategory.forEach(cat => {
      logInfo(`  - ${cat.category}: ${cat.count} مستند`);
    });

    logInfo(`\nالأكثر تحميلاً:`);
    mostDownloaded.slice(0, 3).forEach((doc, index) => {
      logInfo(`  ${index + 1}. ${doc.title} (${doc.downloads} تحميل)`);
    });

    return true;
  } catch (error) {
    logError('فشل جلب التحليلات');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 9: Upload Document
async function testUploadDocument() {
  logTest('رفع مستند جديد');
  try {
    const newDocument = {
      title: 'مستند اختبار',
      titleEn: 'Test Document',
      description: 'هذا مستند اختبار تم إنشاؤه بواسطة السكريبت',
      categoryId: 'cat_001',
      type: 'contract',
      format: 'pdf',
      size: 1024000,
      tags: ['اختبار', 'تجريبي'],
    };

    const response = await axios.post(`${API_URL}/documents/upload`, newDocument, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const document = response.data.data?.document || response.data.data;

    logSuccess('تم رفع المستند بنجاح');
    logInfo(`معرف المستند: ${document.id}`);
    logInfo(`العنوان: ${document.title}`);

    return document.id;
  } catch (error) {
    logError('فشل رفع المستند');
    console.error(error.response?.data || error.message);
    return null;
  }
}

// Test 10: Get Single Document
async function testGetDocument(documentId) {
  logTest('جلب تفاصيل مستند واحد');
  try {
    const response = await axios.get(`${API_URL}/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const document = response.data.data?.document || response.data.data;

    logSuccess('تم جلب تفاصيل المستند');
    logInfo(`العنوان: ${document.title}`);
    logInfo(`الحالة: ${document.status}`);
    logInfo(`الحجم: ${(document.size / 1024).toFixed(2)} KB`);
    logInfo(`المشاهدات: ${document.views} | التحميلات: ${document.downloads}`);

    return true;
  } catch (error) {
    logError('فشل جلب المستند');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 11: Update Document
async function testUpdateDocument(documentId) {
  logTest('تحديث المستند');
  try {
    const updates = {
      status: 'approved',
      description: 'تم تحديث الوصف بواسطة السكريبت',
    };

    const response = await axios.put(`${API_URL}/documents/${documentId}`, updates, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const document = response.data.data?.document || response.data.data;

    logSuccess('تم تحديث المستند');
    logInfo(`الحالة الجديدة: ${document.status}`);

    return true;
  } catch (error) {
    logError('فشل تحديث المستند');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Test 12: Delete Document
async function testDeleteDocument(documentId) {
  logTest('حذف المستند');
  try {
    await axios.delete(`${API_URL}/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    logSuccess('تم حذف المستند بنجاح');

    return true;
  } catch (error) {
    logError('فشل حذف المستند');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║       📄 اختبار شامل لنظام إدارة المستندات           ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝', 'bright');

  const results = {
    passed: 0,
    failed: 0,
    total: 0,
  };

  try {
    // Test sequence
    results.total++;
    if (await testLogin()) results.passed++;
    else results.failed++;

    results.total++;
    if (await testDashboard()) results.passed++;
    else results.failed++;

    results.total++;
    if (await testGetDocuments()) results.passed++;
    else results.failed++;

    results.total++;
    if (await testGetCategories()) results.passed++;
    else results.failed++;

    results.total++;
    if (await testGetTemplates()) results.passed++;
    else results.failed++;

    results.total++;
    if (await testSearchDocuments()) results.passed++;
    else results.failed++;

    results.total++;
    if (await testFilterByCategory()) results.passed++;
    else results.failed++;

    results.total++;
    if (await testGetAnalytics()) results.passed++;
    else results.failed++;

    // CRUD operations
    results.total++;
    const documentId = await testUploadDocument();
    if (documentId) {
      results.passed++;

      results.total++;
      if (await testGetDocument(documentId)) results.passed++;
      else results.failed++;

      results.total++;
      if (await testUpdateDocument(documentId)) results.passed++;
      else results.failed++;

      results.total++;
      if (await testDeleteDocument(documentId)) results.passed++;
      else results.failed++;
    } else {
      results.failed += 4; // Failed upload and subsequent tests
      results.total += 3;
    }
  } catch (error) {
    logError('حدث خطأ أثناء تشغيل الاختبارات');
    console.error(error);
  }

  // Print summary
  log('\n╔═══════════════════════════════════════════════════════════╗', 'bright');
  log('║                   📊 نتائج الاختبارات                    ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════╝', 'bright');

  log(`\nإجمالي الاختبارات: ${results.total}`, 'blue');
  log(`✅ نجح: ${results.passed}`, 'green');
  log(`❌ فشل: ${results.failed}`, 'red');
  log(`📈 نسبة النجاح: ${((results.passed / results.total) * 100).toFixed(1)}%`, 'cyan');

  if (results.failed === 0) {
    log('\n🎉 مبروك! جميع الاختبارات نجحت! 🎉', 'green');
  } else {
    log('\n⚠️  بعض الاختبارات فشلت. يرجى مراجعة الأخطاء أعلاه.', 'yellow');
  }

  log('');
}

// Run tests
runAllTests();
