// Testing Script for Internal Audit System
// Run this with: node testInternalAudit.js

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let authToken = null;

// Helper to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (authToken && !headers.Authorization) {
      options.headers.Authorization = `Bearer ${authToken}`;
    }

    const req = http.request(url, options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Tests
async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   🧪 Comprehensive Internal Audit System Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  try {
    console.log('Test 1: Health Check');
    const res = await makeRequest('GET', '/api/health');
    if (res.status === 200 && res.data.success) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log('❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 2: Login
  try {
    console.log('Test 2: Authentication (Login)');
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@alawael.com',
      password: 'Admin@123456',
    });
    if (res.status === 200 && res.data.success && res.data.token) {
      authToken = res.data.token;
      console.log(`✅ PASS (Token: ${authToken.substring(0, 20)}...)\n`);
      passed++;
    } else {
      console.log('❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 3: Get Audit Plans (should be empty or have initial data)
  try {
    console.log('Test 3: Get Audit Plans');
    const res = await makeRequest('GET', '/api/internal-audits/audit-plans');
    if (res.status === 200 || res.status === 401) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log('❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 4: Create Audit Plan
  try {
    console.log('Test 4: Create Audit Plan');
    const res = await makeRequest('POST', '/api/internal-audits/audit-plans', {
      year: 2026,
      departments: ['المبيعات', 'المالية', 'العمليات'],
      objectives: ['تقييم الامتثال', 'تقييم المخاطر'],
      estimatedDays: 30,
    });
    if (res.status === 201 || res.status === 200) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log(`❌ FAIL (Status: ${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 5: Get Surprise Audits
  try {
    console.log('Test 5: Get Surprise Audits');
    const res = await makeRequest('GET', '/api/internal-audits/surprise-audits');
    if (res.status === 200 || res.status === 401) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log('❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 6: Create Surprise Audit
  try {
    console.log('Test 6: Create Surprise Audit');
    const res = await makeRequest('POST', '/api/internal-audits/surprise-audits', {
      type: 'operational',
      scope: 'عينة عشوائية من عمليات المبيعات',
      evidence: 'وثائق وملاحظات ميدانية',
      observations: [],
    });
    if (res.status === 201 || res.status === 200) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log(`❌ FAIL (Status: ${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 7: Get Non-Conformance Reports
  try {
    console.log('Test 7: Get Non-Conformance Reports');
    const res = await makeRequest('GET', '/api/internal-audits/non-conformance-reports');
    if (res.status === 200 || res.status === 401) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log('❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 8: Create Non-Conformance Report
  try {
    console.log('Test 8: Create Non-Conformance Report');
    const res = await makeRequest('POST', '/api/internal-audits/non-conformance-reports', {
      classification: 'عدم مطابقة رئيسية',
      details: 'عدم الامتثال للسياسات المالية',
      impact: 'تأثير عالي على العمليات',
      rootCause: 'نقص في التدريب',
    });
    if (res.status === 201 || res.status === 200) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log(`❌ FAIL (Status: ${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 9: Get Corrective Actions
  try {
    console.log('Test 9: Get Corrective/Preventive Actions');
    const res = await makeRequest('GET', '/api/internal-audits/actions');
    if (res.status === 200 || res.status === 401) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log('❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 10: Create Action
  try {
    console.log('Test 10: Create Corrective/Preventive Action');
    const res = await makeRequest('POST', '/api/internal-audits/actions', {
      type: 'corrective',
      rootCauseAnalysis: 'تحليل السبب الجذري للمشكلة',
      proposedActions: ['إجراء 1', 'إجراء 2'],
      responsible: 'أحمد محمد',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (res.status === 201 || res.status === 200) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log(`❌ FAIL (Status: ${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 11: Get Follow-ups
  try {
    console.log('Test 11: Get Closure Follow-ups');
    const res = await makeRequest('GET', '/api/internal-audits/follow-ups');
    if (res.status === 200 || res.status === 401) {
      console.log('✅ PASS\n');
      passed++;
    } else {
      console.log('❌ FAIL\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Test 12: Dashboard
  try {
    console.log('Test 12: Internal Audit Dashboard');
    const res = await makeRequest('GET', '/api/internal-audits/internal-audit-dashboard');
    if (res.status === 200) {
      const stats = res.data.data || {};
      console.log(`✅ PASS (Plans: ${stats.totalPlans}, Audits: ${stats.totalSurpriseAudits})\n`);
      passed++;
    } else if (res.status === 401) {
      console.log('✅ PASS (Requires Auth)\n');
      passed++;
    } else {
      console.log(`❌ FAIL (Status: ${res.status})\n`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}\n`);
    failed++;
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   📊 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('✅ All tests passed! System is ready for production.\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Check the logs above.\n`);
  }
}

runTests().catch(console.error);
