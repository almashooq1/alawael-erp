/**
 * اختبار الأمان المتقدم - Penetration Testing
 * تحديد الثغرات الأمنية واختبار الحماية
 */

const axios = require('axios');
const crypto = require('crypto');
const assert = require('assert');

class SecurityAuditTest {
  constructor(baseURL = 'http://localhost:5000/api/v1') {
    this.baseURL = baseURL;
    this.client = axios.create({ baseURL, timeout: 10000 });
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  /**
   * 1️⃣ اختبار SQL/NoSQL Injection
   */
  async testNoSQLInjection() {
    console.log('🔍 اختبار NoSQL Injection...');

    const injectionPayloads = [
      { "$ne": null },
      { "$gt": "" },
      { "$regex": ".*" },
      `{"$where": "this.password == '${Buffer.from('test').toString()}'"}`
    ];

    for (const payload of injectionPayloads) {
      try {
        const response = await this.client.post('/auth/login', {
          email: payload,
          password: payload
        });

        // إذا نجحنا بـ injection، فهناك مشكلة
        if (response.status === 200) {
          this.results.failed.push({
            test: 'NoSQL Injection',
            payload: JSON.stringify(payload),
            status: 'VULNERABLE'
          });
        }
      } catch (error) {
        // الخطأ هو جيد - نريد رفع الطلب
        if (error.response?.status === 400 || error.response?.status === 401) {
          this.results.passed.push({
            test: 'NoSQL Injection Prevention',
            payload: JSON.stringify(payload).substring(0, 50)
          });
        }
      }
    }
  }

  /**
   * 2️⃣ اختبار XSS (Cross-Site Scripting)
   */
  async testXSSVulnerability() {
    console.log('🔍 اختبار XSS...');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>'
    ];

    for (const payload of xssPayloads) {
      try {
        const response = await this.client.post('/notifications/send', {
          userId: 'user_123',
          type: 'alert',
          title: payload,
          message: payload,
          channels: ['email']
        });

        // التحقق من أن الـ payload تم تنقيته
        if (response.data && 
            (response.data.title?.includes('<script>') || 
             response.data.message?.includes('<img'))) {
          this.results.failed.push({
            test: 'XSS Prevention',
            payload: payload.substring(0, 50),
            status: 'VULNERABLE'
          });
        } else {
          this.results.passed.push({
            test: 'XSS Prevention',
            payload: payload.substring(0, 50)
          });
        }
      } catch (error) {
        this.results.passed.push({
          test: 'XSS Prevention',
          payload: payload.substring(0, 50),
          blocked: true
        });
      }
    }
  }

  /**
   * 3️⃣ اختبار Broken Authentication
   */
  async testBrokenAuthentication() {
    console.log('🔍 اختبار Broken Authentication...');

    // محاولة بدون توكن
    try {
      await this.client.get('/dashboard/fleet-summary');
      this.results.failed.push({
        test: 'Authentication Required',
        status: 'VULNERABLE - No token required'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        this.results.passed.push({
          test: 'Authentication Required',
          status: 'Protected'
        });
      }
    }

    // محاولة مع توكن مزيف
    try {
      this.client.defaults.headers.common['Authorization'] = 'Bearer fake_token_12345';
      await this.client.get('/dashboard/fleet-summary');
      this.results.failed.push({
        test: 'Invalid Token Rejection',
        status: 'VULNERABLE'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        this.results.passed.push({
          test: 'Invalid Token Rejection',
          status: 'Protected'
        });
      }
    }

    // محاولة مع توكن منتهي الصلاحية
    const expiredToken = this.createExpiredToken();
    try {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${expiredToken}`;
      await this.client.get('/dashboard/fleet-summary');
      this.results.failed.push({
        test: 'Expired Token Check',
        status: 'VULNERABLE'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        this.results.passed.push({
          test: 'Expired Token Check',
          status: 'Protected'
        });
      }
    }
  }

  /**
   * 4️⃣ اختبار CSRF (Cross-Site Request Forgery)
   */
  async testCSRFProtection() {
    console.log('🔍 اختبار CSRF Protection...');

    // محاولة POST بدون CSRF token
    try {
      const response = await this.client.post('/gps/location/update', {
        vehicleId: 'test',
        latitude: 0,
        longitude: 0,
        speed: 0
      }, {
        headers: {
          'Authorization': 'Bearer test_token',
          'Origin': 'http://malicious-site.com'
        }
      });

      // إذا نجحنا، قد تكون هناك مشكلة
      if (response.status === 200) {
        this.results.warnings.push({
          test: 'CSRF Protection',
          status: 'Check CORS headers'
        });
      }
    } catch (error) {
      if (error.response?.status === 403) {
        this.results.passed.push({
          test: 'CSRF Protection',
          status: 'Protected'
        });
      }
    }
  }

  /**
   * 5️⃣ اختبار Rate Limiting
   */
  async testRateLimiting() {
    console.log('🔍 اختبار Rate Limiting...');

    const loginAttempts = 20;
    let blockedCount = 0;

    for (let i = 0; i < loginAttempts; i++) {
      try {
        await this.client.post('/auth/login', {
          email: 'test@example.com',
          password: 'wrong_password'
        });
      } catch (error) {
        if (error.response?.status === 429) {
          blockedCount++;
        }
      }
    }

    if (blockedCount > 0) {
      this.results.passed.push({
        test: 'Rate Limiting',
        status: `Blocked after ${blockedCount} attempts`
      });
    } else {
      this.results.warnings.push({
        test: 'Rate Limiting',
        status: 'May not be properly configured'
      });
    }
  }

  /**
   * 6️⃣ اختبار Sensitive Data Exposure
   */
  async testSensitiveDataExposure() {
    console.log('🔍 اختبار Sensitive Data Exposure...');

    // التحقق من عدم تسرب المعلومات الحساسة في الأخطاء
    try {
      await this.client.get('/database/admin');
    } catch (error) {
      const errorMsg = error.response?.data?.message || '';

      // تحقق من أنه لا يكشف معلومات حساسة
      const leakedInfo = [
        'SQL',
        'mongodb',
        'Database',
        'connection string',
        '/home/user',
        'node_modules'
      ];

      const hasLeakage = leakedInfo.some(info => errorMsg.includes(info));

      if (hasLeakage) {
        this.results.failed.push({
          test: 'Sensitive Data Exposure',
          status: 'VULNERABLE - Information leakage detected'
        });
      } else {
        this.results.passed.push({
          test: 'Sensitive Data Exposure',
          status: 'Protected'
        });
      }
    }
  }

  /**
   * 7️⃣ اختبار Security Headers
   */
  async testSecurityHeaders() {
    console.log('🔍 اختبار Security Headers...');

    try {
      const response = await this.client.get('/health');
      const headers = response.headers;

      const requiredHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age='
      };

      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        const headerValue = headers[header.toLowerCase()];

        if (headerValue && headerValue.includes(expectedValue)) {
          this.results.passed.push({
            test: `Security Header: ${header}`,
            status: headerValue.substring(0, 50)
          });
        } else {
          this.results.warnings.push({
            test: `Security Header: ${header}`,
            status: 'Missing or incorrect value'
          });
        }
      }
    } catch (error) {
      console.error('Error checking headers:', error.message);
    }
  }

  /**
   * 8️⃣ اختبار Endpoint Access Control
   */
  async testAccessControl() {
    console.log('🔍 اختبار Access Control...');

    // محاولة الوصول إلى endpoint بدون صلاحيات
    const driverToken = await this.getTokenForRole('driver');
    const adminEndpoint = '/admin/users';

    try {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${driverToken}`;
      await this.client.get(adminEndpoint);

      this.results.failed.push({
        test: 'Role-based Access Control',
        endpoint: adminEndpoint,
        status: 'VULNERABLE - Driver accessed admin endpoint'
      });
    } catch (error) {
      if (error.response?.status === 403) {
        this.results.passed.push({
          test: 'Role-based Access Control',
          endpoint: adminEndpoint,
          status: 'Protected'
        });
      }
    }
  }

  /**
   * 9️⃣ اختبار Encryption
   */
  async testEncryption() {
    console.log('🔍 اختبار Encryption...');

    // التحقق من أن الكود يستخدم HTTPS/TLS
    if (this.baseURL.startsWith('https://')) {
      this.results.passed.push({
        test: 'HTTPS/TLS Encryption',
        status: 'Enabled'
      });
    } else {
      this.results.warnings.push({
        test: 'HTTPS/TLS Encryption',
        status: 'Not using HTTPS - Use HTTPS in production'
      });
    }

    // التحقق من تشفير البيانات الحساسة
    try {
      const response = await this.client.post('/auth/register', {
        email: 'test@example.com',
        password: 'TestPassword123!',
        phone: '+966501234567',
        firstName: 'Test',
        lastName: 'User',
        userType: 'driver'
      });

      // تحقق من أن كلمة المرور لم تُرجع كما هي
      if (response.data?.password) {
        this.results.failed.push({
          test: 'Password Encryption',
          status: 'VULNERABLE - Password returned in response'
        });
      } else {
        this.results.passed.push({
          test: 'Password Encryption',
          status: 'Protected'
        });
      }
    } catch (error) {
      // خطأ متوقع
    }
  }

  /**
   * 🔟 اختبار API Documentation
   */
  async testAPIDocumentation() {
    console.log('🔍 اختبار API Documentation...');

    try {
      const response = await this.client.get('/api-docs');

      if (response.status === 200) {
        this.results.passed.push({
          test: 'API Documentation',
          status: 'Available - Ensure it\'s protected in production'
        });
      }
    } catch (error) {
      if (error.response?.status === 404) {
        this.results.passed.push({
          test: 'API Documentation',
          status: 'Not exposed (good for production)'
        });
      }
    }
  }

  /**
   * مساعد: إنشاء توكن منتهي الصلاحية
   */
  createExpiredToken() {
    // هذا مثال - يجب أن يكون توكن JWT حقيقي منتهي الصلاحية
    const header = Buffer.from(JSON.stringify({ alg: 'HS512' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      id: 'test',
      exp: Math.floor(Date.now() / 1000) - 3600 // منتهي الصلاحية منذ ساعة
    })).toString('base64');

    return `${header}.${payload}.signature`;
  }

  /**
   * مساعد: الحصول على توكن لدور محدد
   */
  async getTokenForRole(role) {
    try {
      const response = await this.client.post('/auth/login', {
        email: `${role}@example.com`,
        password: 'TestPassword123!'
      });

      return response.data?.data?.accessToken || 'fake_token';
    } catch (error) {
      return 'fake_token';
    }
  }

  /**
   * تشغيل جميع الاختبارات
   */
  async runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          🔐 اختبار الأمان المتقدم (Penetration Test)        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await this.testNoSQLInjection();
    await this.testXSSVulnerability();
    await this.testBrokenAuthentication();
    await this.testCSRFProtection();
    await this.testRateLimiting();
    await this.testSensitiveDataExposure();
    await this.testSecurityHeaders();
    await this.testAccessControl();
    await this.testEncryption();
    await this.testAPIDocumentation();

    this.printReport();
  }

  /**
   * طباعة التقرير
   */
  printReport() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   📊 تقرير الأمان                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('✅ اختبارات نجحت:');
    this.results.passed.forEach(test => {
      console.log(`   ✓ ${test.test} - ${test.status || ''}`);
    });

    if (this.results.failed.length > 0) {
      console.log('\n❌ اختبارات فشلت:');
      this.results.failed.forEach(test => {
        console.log(`   ✗ ${test.test} - ${test.status}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ تحذيرات:');
      this.results.warnings.forEach(test => {
        console.log(`   ⚠ ${test.test} - ${test.status}`);
      });
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`📈 الملخص:`);
    console.log(`   نجح: ${this.results.passed.length}`);
    console.log(`   فشل: ${this.results.failed.length}`);
    console.log(`   تحذيرات: ${this.results.warnings.length}`);
    console.log('════════════════════════════════════════════════════════════\n');
  }
}

// التصدير والتشغيل
module.exports = { SecurityAuditTest };

// تشغيل إذا كان الملف يعمل مباشرة
if (require.main === module) {
  const audit = new SecurityAuditTest();
  audit.runAllTests().then(() => {
    process.exit(audit.results.failed.length > 0 ? 1 : 0);
  });
}
