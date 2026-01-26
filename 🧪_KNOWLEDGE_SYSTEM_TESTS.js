// ============================================================
// Knowledge Management System - Comprehensive Test Suite
// مجموعة الاختبارات الشاملة لنظام إدارة المعرفة
// ============================================================

const axios = require('axios');

// ============================================================
// TEST CONFIGURATION
// ============================================================

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const TEST_TIMEOUT = 5000;

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token';
const MANAGER_TOKEN = process.env.MANAGER_TOKEN || 'test-manager-token';
const USER_TOKEN = process.env.USER_TOKEN || 'test-user-token';

// Test data
const testData = {
  article: {
    title: 'مقالة اختبار: البروتوكول العلاجي',
    description: 'اختبار إنشاء مقالة جديدة',
    content: '# محتوى الاختبار\n\nهذه مقالة اختبار',
    category: 'therapeutic_protocols',
    tags: ['اختبار', 'علاج'],
    visibleTo: ['admin', 'manager', 'employee'],
  },
  caseStudy: {
    title: 'دراسة حالة اختبار: مريض عمره 50 سنة',
    description: 'دراسة حالة شاملة',
    content:
      '# المقدمة\n\nمريض عمره 50 سنة يعاني من...\n\n# العلاج\n\nتم تطبيق البروتوكول...',
    category: 'case_studies',
    tags: ['حالة', 'نتيجة إيجابية'],
  },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

class KnowledgeTestSuite {
  constructor() {
    this.passedTests = 0;
    this.failedTests = 0;
    this.testResults = [];
  }

  logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const message = `${status} | ${testName}`;
    console.log(message);
    if (details) console.log(`  → ${details}`);

    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date(),
    });

    if (passed) {
      this.passedTests++;
    } else {
      this.failedTests++;
    }
  }

  async assertEqual(actual, expected, testName) {
    const passed = actual === expected;
    this.logTest(
      testName,
      passed,
      `Expected: ${expected}, Got: ${actual}`
    );
    return passed;
  }

  async assertTrue(condition, testName) {
    this.logTest(testName, condition);
    return condition;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('اختبار ملخص النتائج / Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ نجح / Passed: ${this.passedTests}`);
    console.log(`❌ فشل / Failed: ${this.failedTests}`);
    console.log(
      `📊 النسبة المئوية / Success Rate: ${((this.passedTests / (this.passedTests + this.failedTests)) * 100).toFixed(2)}%`
    );
    console.log('='.repeat(60));
  }
}

const testSuite = new KnowledgeTestSuite();

// ============================================================
// TEST 1: GET ALL ARTICLES
// الاختبار 1: الحصول على جميع المقالات
// ============================================================

async function testGetAllArticles() {
  try {
    console.log('\n📋 TEST 1: Getting All Articles');
    const response = await axios.get(`${API_BASE_URL}/knowledge/articles`, {
      params: { limit: 20 },
      timeout: TEST_TIMEOUT,
    });

    await testSuite.assertTrue(
      response.status === 200,
      'GET /articles should return 200'
    );
    await testSuite.assertTrue(
      Array.isArray(response.data.data),
      'Response should contain array of articles'
    );

    console.log(`  ℹ️  Found ${response.data.data.length} articles`);
    return response.data.data;
  } catch (error) {
    testSuite.logTest('GET /articles', false, error.message);
    return [];
  }
}

// ============================================================
// TEST 2: SEARCH ARTICLES
// الاختبار 2: البحث عن المقالات
// ============================================================

async function testSearchArticles() {
  try {
    console.log('\n🔍 TEST 2: Searching Articles');

    // Test keyword search
    const response1 = await axios.get(`${API_BASE_URL}/knowledge/search`, {
      params: { q: 'علاج', limit: 10 },
      timeout: TEST_TIMEOUT,
    });

    await testSuite.assertTrue(
      response1.status === 200,
      'Search should return 200'
    );
    await testSuite.assertTrue(
      Array.isArray(response1.data.data.results),
      'Search should return results array'
    );

    console.log(`  ℹ️  Found ${response1.data.data.results.length} results for "علاج"`);

    // Test category filter search
    const response2 = await axios.get(`${API_BASE_URL}/knowledge/search`, {
      params: {
        q: 'علاج',
        category: 'therapeutic_protocols',
        limit: 10,
      },
      timeout: TEST_TIMEOUT,
    });

    await testSuite.assertTrue(
      response2.status === 200,
      'Filtered search should return 200'
    );

    console.log(
      `  ℹ️  Found ${response2.data.data.results.length} results for "علاج" in therapeutic_protocols`
    );

    return response1.data.data.results;
  } catch (error) {
    testSuite.logTest('Search /search', false, error.message);
    return [];
  }
}

// ============================================================
// TEST 3: GET ARTICLE BY CATEGORY
// الاختبار 3: الحصول على المقالات حسب التصنيف
// ============================================================

async function testGetArticlesByCategory() {
  try {
    console.log('\n📂 TEST 3: Getting Articles by Category');

    const categories = [
      'therapeutic_protocols',
      'case_studies',
      'research_experiments',
      'best_practices',
    ];

    for (const category of categories) {
      const response = await axios.get(
        `${API_BASE_URL}/knowledge/categories/${category}`,
        {
          params: { page: 1, limit: 5 },
          timeout: TEST_TIMEOUT,
        }
      );

      const count = response.data.data.articles.length;
      await testSuite.assertTrue(
        response.status === 200,
        `GET /categories/${category} should return 200`
      );

      console.log(`  ℹ️  Category "${category}": ${count} articles`);
    }
  } catch (error) {
    testSuite.logTest('GET /categories/:category', false, error.message);
  }
}

// ============================================================
// TEST 4: GET TRENDING ARTICLES
// الاختبار 4: الحصول على المقالات الشهيرة
// ============================================================

async function testGetTrendingArticles() {
  try {
    console.log('\n🔥 TEST 4: Getting Trending Articles');

    const response = await axios.get(`${API_BASE_URL}/knowledge/trending`, {
      params: { limit: 5 },
      timeout: TEST_TIMEOUT,
    });

    await testSuite.assertTrue(
      response.status === 200,
      'GET /trending should return 200'
    );
    await testSuite.assertTrue(
      Array.isArray(response.data.data),
      'Trending articles should be array'
    );

    console.log(`  ℹ️  Top trending articles:`);
    response.data.data.forEach((article, idx) => {
      console.log(`    ${idx + 1}. ${article.title} (${article.views} views)`);
    });

    return response.data.data;
  } catch (error) {
    testSuite.logTest('GET /trending', false, error.message);
    return [];
  }
}

// ============================================================
// TEST 5: GET TOP RATED ARTICLES
// الاختبار 5: الحصول على أعلى المقالات تقييماً
// ============================================================

async function testGetTopRatedArticles() {
  try {
    console.log('\n⭐ TEST 5: Getting Top Rated Articles');

    const response = await axios.get(`${API_BASE_URL}/knowledge/top-rated`, {
      params: { limit: 5 },
      timeout: TEST_TIMEOUT,
    });

    await testSuite.assertTrue(
      response.status === 200,
      'GET /top-rated should return 200'
    );

    console.log(`  ℹ️  Top rated articles:`);
    response.data.data.forEach((article, idx) => {
      const rating = article.ratings?.average || 0;
      console.log(`    ${idx + 1}. ${article.title} (${rating}/5 ⭐)`);
    });

    return response.data.data;
  } catch (error) {
    testSuite.logTest('GET /top-rated', false, error.message);
    return [];
  }
}

// ============================================================
// TEST 6: GET SINGLE ARTICLE WITH VIEWS INCREMENT
// الاختبار 6: الحصول على مقالة واحدة مع زيادة العروض
// ============================================================

async function testGetSingleArticle(articleId) {
  try {
    if (!articleId) {
      console.log('\n📖 TEST 6: SKIPPED (No article ID provided)');
      return null;
    }

    console.log('\n📖 TEST 6: Getting Single Article');

    const response = await axios.get(
      `${API_BASE_URL}/knowledge/articles/${articleId}`,
      { timeout: TEST_TIMEOUT }
    );

    await testSuite.assertTrue(
      response.status === 200,
      'GET /articles/:id should return 200'
    );
    await testSuite.assertTrue(
      response.data.data.title !== undefined,
      'Article should have title'
    );

    console.log(`  ℹ️  Article: ${response.data.data.title}`);
    console.log(`  ℹ️  Views: ${response.data.data.views}`);
    console.log(
      `  ℹ️  Rating: ${(response.data.data.ratings?.average || 0).toFixed(1)}/5`
    );

    return response.data.data;
  } catch (error) {
    testSuite.logTest('GET /articles/:id', false, error.message);
    return null;
  }
}

// ============================================================
// TEST 7: ANALYTICS - SEARCH STATISTICS
// الاختبار 7: الإحصائيات - إحصائيات البحث
// ============================================================

async function testSearchAnalytics() {
  try {
    console.log('\n📊 TEST 7: Search Analytics');

    const response = await axios.get(
      `${API_BASE_URL}/knowledge/analytics/searches`,
      {
        params: { days: 30 },
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        timeout: TEST_TIMEOUT,
      }
    );

    await testSuite.assertTrue(
      response.status === 200,
      'GET /analytics/searches should return 200'
    );
    await testSuite.assertTrue(
      Array.isArray(response.data.data),
      'Analytics should return array'
    );

    console.log(`  ℹ️  Top search queries (last 30 days):`);
    response.data.data.slice(0, 5).forEach((search, idx) => {
      console.log(`    ${idx + 1}. "${search._id}" (${search.count} times)`);
    });

    return response.data.data;
  } catch (error) {
    testSuite.logTest('GET /analytics/searches', false, error.message);
    return [];
  }
}

// ============================================================
// TEST 8: ANALYTICS - SYSTEM STATISTICS
// الاختبار 8: الإحصائيات - إحصائيات النظام
// ============================================================

async function testSystemStatistics() {
  try {
    console.log('\n📈 TEST 8: System Statistics');

    const response = await axios.get(`${API_BASE_URL}/knowledge/analytics/stats`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      timeout: TEST_TIMEOUT,
    });

    await testSuite.assertTrue(
      response.status === 200,
      'GET /analytics/stats should return 200'
    );

    const { stats, totalArticles, totalViews } = response.data.data;

    console.log(`  ℹ️  System Statistics:`);
    console.log(`    - Total Articles: ${totalArticles}`);
    console.log(`    - Total Views: ${totalViews}`);
    console.log(`    - Articles by Category:`);

    stats.forEach((stat) => {
      console.log(
        `      • ${stat._id}: ${stat.count} articles (${stat.totalViews} views)`
      );
    });

    return response.data.data;
  } catch (error) {
    testSuite.logTest('GET /analytics/stats', false, error.message);
    return null;
  }
}

// ============================================================
// TEST 9: CREATE ARTICLE (WITH AUTHENTICATION)
// الاختبار 9: إنشاء مقالة (مع المصادقة)
// ============================================================

async function testCreateArticle() {
  try {
    console.log('\n✏️  TEST 9: Creating Article');

    const response = await axios.post(
      `${API_BASE_URL}/knowledge/articles`,
      testData.article,
      {
        headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
        timeout: TEST_TIMEOUT,
      }
    );

    await testSuite.assertTrue(
      response.status === 201,
      'POST /articles should return 201'
    );
    await testSuite.assertTrue(
      response.data.data._id !== undefined,
      'Created article should have ID'
    );

    console.log(`  ℹ️  Created article: ${response.data.data.title}`);
    console.log(`  ℹ️  Article ID: ${response.data.data._id}`);

    return response.data.data;
  } catch (error) {
    testSuite.logTest('POST /articles', false, error.message);
    return null;
  }
}

// ============================================================
// TEST 10: RATE ARTICLE
// الاختبار 10: تقييم مقالة
// ============================================================

async function testRateArticle(articleId) {
  try {
    if (!articleId) {
      console.log('\n⭐ TEST 10: SKIPPED (No article ID provided)');
      return null;
    }

    console.log('\n⭐ TEST 10: Rating Article');

    const response = await axios.post(
      `${API_BASE_URL}/knowledge/articles/${articleId}/rate`,
      {
        rating: 5,
        helpful: true,
        feedback: 'مقالة رائعة وشاملة جداً',
      },
      {
        headers: { Authorization: `Bearer ${USER_TOKEN}` },
        timeout: TEST_TIMEOUT,
      }
    );

    await testSuite.assertTrue(
      response.status === 200,
      'POST /articles/:id/rate should return 200'
    );
    await testSuite.assertTrue(
      response.data.data.rating === 5,
      'Rating should be 5'
    );

    console.log(`  ℹ️  Rated article with 5 stars`);
    console.log(`  ℹ️  New average rating: ${response.data.data.averageRating.toFixed(1)}/5`);

    return response.data.data;
  } catch (error) {
    testSuite.logTest('POST /articles/:id/rate', false, error.message);
    return null;
  }
}

// ============================================================
// TEST 11: UPDATE ARTICLE
// الاختبار 11: تحديث مقالة
// ============================================================

async function testUpdateArticle(articleId) {
  try {
    if (!articleId) {
      console.log('\n🔄 TEST 11: SKIPPED (No article ID provided)');
      return null;
    }

    console.log('\n🔄 TEST 11: Updating Article');

    const response = await axios.put(
      `${API_BASE_URL}/knowledge/articles/${articleId}`,
      {
        title: 'عنوان محدث: البروتوكول العلاجي المحسّن',
        description: 'وصف محدث للمقالة',
      },
      {
        headers: { Authorization: `Bearer ${MANAGER_TOKEN}` },
        timeout: TEST_TIMEOUT,
      }
    );

    await testSuite.assertTrue(
      response.status === 200,
      'PUT /articles/:id should return 200'
    );

    console.log(`  ℹ️  Updated article: ${response.data.data.title}`);

    return response.data.data;
  } catch (error) {
    testSuite.logTest('PUT /articles/:id', false, error.message);
    return null;
  }
}

// ============================================================
// TEST 12: DELETE ARTICLE
// الاختبار 12: حذف مقالة
// ============================================================

async function testDeleteArticle(articleId) {
  try {
    if (!articleId) {
      console.log('\n🗑️  TEST 12: SKIPPED (No article ID provided)');
      return null;
    }

    console.log('\n🗑️  TEST 12: Deleting Article');

    const response = await axios.delete(
      `${API_BASE_URL}/knowledge/articles/${articleId}`,
      {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        timeout: TEST_TIMEOUT,
      }
    );

    await testSuite.assertTrue(
      response.status === 200,
      'DELETE /articles/:id should return 200'
    );

    console.log(`  ℹ️  Article deleted successfully`);

    return response.data.data;
  } catch (error) {
    testSuite.logTest('DELETE /articles/:id', false, error.message);
    return null;
  }
}

// ============================================================
// TEST RUNNER
// تشغيل الاختبارات
// ============================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Knowledge Management System - Full Test Suite');
  console.log('🧪 مجموعة الاختبارات الشاملة');
  console.log('='.repeat(60));

  try {
    // Run all tests
    const articles = await testGetAllArticles();
    await testSearchArticles();
    await testGetArticlesByCategory();
    await testGetTrendingArticles();
    await testGetTopRatedArticles();

    const firstArticleId = articles.length > 0 ? articles[0]._id : null;
    await testGetSingleArticle(firstArticleId);

    await testSearchAnalytics();
    await testSystemStatistics();

    // Optional: Test creation/update/delete with valid token
    const createdArticle = await testCreateArticle();
    if (createdArticle) {
      await testRateArticle(createdArticle._id);
      await testUpdateArticle(createdArticle._id);
      // Uncomment to test deletion:
      // await testDeleteArticle(createdArticle._id);
    }
  } catch (error) {
    console.error('Test suite error:', error.message);
  } finally {
    // Print summary
    testSuite.printSummary();
  }
}

// ============================================================
// EXPORT FOR MODULE USAGE
// ============================================================

module.exports = {
  testGetAllArticles,
  testSearchArticles,
  testGetArticlesByCategory,
  testGetTrendingArticles,
  testGetTopRatedArticles,
  testGetSingleArticle,
  testSearchAnalytics,
  testSystemStatistics,
  testCreateArticle,
  testRateArticle,
  testUpdateArticle,
  testDeleteArticle,
  runAllTests,
};

// ============================================================
// RUN IF EXECUTED DIRECTLY
// ============================================================

if (require.main === module) {
  runAllTests().catch(console.error);
}
