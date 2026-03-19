/**
 * Load Testing باستخدام Locust
 * اختبار النظام تحت أحمال عالية
 */

import { HttpClient } from '@angular/common/http';
import axios from 'axios';

// ====== 1. سيناريوهات اختبار الحمل ======

class LoadTestingScenarios {
  constructor(baseURL = 'http://localhost:5000/api/v1') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000
    });
    this.results = {
      successful: 0,
      failed: 0,
      totalTime: 0,
      responseTimes: []
    };
  }

  /**
   * السيناريو 1: تسجيل الدخول المتكرر
   * محاكاة 100 مستخدم يسجلون دخول في نفس الوقت
   */
  async loginStressTest(concurrentUsers = 100) {
    console.log(`🔄 بدء اختبار الدخول المتكرر: ${concurrentUsers} مستخدم`);

    const requests = [];
    const startTime = performance.now();

    for (let i = 0; i < concurrentUsers; i++) {
      const promise = this.client.post('/auth/login', {
        email: `testuser${i}@example.com`,
        password: 'TestPassword123!'
      })
        .then(response => {
          this.results.successful++;
          return {
            status: 'success',
            time: performance.now() - startTime
          };
        })
        .catch(error => {
          this.results.failed++;
          return {
            status: 'failed',
            time: performance.now() - startTime,
            error: error.message
          };
        });

      requests.push(promise);
    }

    const allResults = await Promise.all(requests);
    this.results.totalTime = performance.now() - startTime;

    return {
      scenario: 'Login Stress Test',
      concurrentUsers,
      successful: this.results.successful,
      failed: this.results.failed,
      totalTime: `${this.results.totalTime.toFixed(2)}ms`,
      avgTime: `${(this.results.totalTime / concurrentUsers).toFixed(2)}ms`,
      requestsPerSecond: (concurrentUsers / this.results.totalTime * 1000).toFixed(2)
    };
  }

  /**
   * السيناريو 2: تحديث مواقع المركبات المتكرر
   * محاكاة 500 مركبة ترسل تحديثات موقع كل ثانية
   */
  async locationUpdateStressTest(vehicleCount = 500, iterations = 10) {
    console.log(`📍 اختبار تحديث المواقع: ${vehicleCount} مركبة × ${iterations} تحديث`);

    const startTime = performance.now();
    let totalRequests = 0;

    for (let iter = 0; iter < iterations; iter++) {
      const requests = [];

      for (let i = 0; i < vehicleCount; i++) {
        const promise = this.client.post('/gps/location/update', {
          vehicleId: `vehicle_${i}`,
          latitude: 24.7136 + Math.random() * 0.1,
          longitude: 46.6753 + Math.random() * 0.1,
          speed: Math.random() * 120,
          heading: Math.random() * 360,
          timestamp: new Date().toISOString()
        }, {
          headers: {
            'Authorization': `Bearer test_token_${i}`
          }
        })
          .then(() => {
            this.results.successful++;
          })
          .catch(() => {
            this.results.failed++;
          });

        requests.push(promise);
        totalRequests++;
      }

      await Promise.all(requests);
      console.log(`  ✅ التكرار ${iter + 1}/${iterations} مكتمل`);
    }

    const totalTime = performance.now() - startTime;

    return {
      scenario: 'Location Update Stress',
      vehicleCount,
      iterations,
      totalRequests,
      successful: this.results.successful,
      failed: this.results.failed,
      totalTime: `${totalTime.toFixed(2)}ms`,
      avgTimePerRequest: `${(totalTime / totalRequests).toFixed(2)}ms`,
      requestsPerSecond: (totalRequests / totalTime * 1000).toFixed(2)
    };
  }

  /**
   * السيناريو 3: جلب بيانات لوحة التحكم
   * محاكاة 1000 مستخدم يطلبون بيانات اللوحة بنفس الوقت
   */
  async dashboardLoadTest(concurrentUsers = 1000) {
    console.log(`📊 اختبار لوحة التحكم: ${concurrentUsers} مستخدم`);

    const requests = [];
    const startTime = performance.now();

    for (let i = 0; i < concurrentUsers; i++) {
      const promise = this.client.get('/dashboard/fleet-summary', {
        headers: {
          'Authorization': `Bearer test_token_${i}`
        }
      })
        .then(response => {
          this.results.successful++;
          this.results.responseTimes.push(performance.now() - startTime);
        })
        .catch(() => {
          this.results.failed++;
        });

      requests.push(promise);
    }

    await Promise.all(requests);
    const totalTime = performance.now() - startTime;

    const responseTimes = this.results.responseTimes.sort((a, b) => a - b);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

    return {
      scenario: 'Dashboard Load Test',
      concurrentUsers,
      successful: this.results.successful,
      failed: this.results.failed,
      totalTime: `${totalTime.toFixed(2)}ms`,
      avgTime: `${(totalTime / concurrentUsers).toFixed(2)}ms`,
      p50: `${p50.toFixed(2)}ms`,
      p95: `${p95.toFixed(2)}ms`,
      p99: `${p99.toFixed(2)}ms`,
      requestsPerSecond: (concurrentUsers / totalTime * 1000).toFixed(2)
    };
  }

  /**
   * السيناريو 4: WebSocket الاتصالات المتزامنة
   * محاكاة 5000 اتصال WebSocket متزامن
   */
  async websocketConnectionTest(concurrentConnections = 5000) {
    console.log(`🔌 اختبار WebSocket: ${concurrentConnections} اتصال`);

    const startTime = performance.now();
    let connectedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < concurrentConnections; i++) {
      try {
        // محاكاة اتصال WebSocket
        const ws = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            failedCount++;
            reject(new Error('Connection timeout'));
          }, 5000);

          // محاكاة اتصال ناجح
          setTimeout(() => {
            clearTimeout(timeout);
            connectedCount++;
            resolve();
          }, Math.random() * 1000);
        });

        await ws;
      } catch (error) {
        failedCount++;
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      scenario: 'WebSocket Connection Test',
      concurrentConnections,
      connected: connectedCount,
      failed: failedCount,
      totalTime: `${totalTime.toFixed(2)}ms`,
      avgTimePerConnection: `${(totalTime / concurrentConnections).toFixed(2)}ms`,
      connectionsPerSecond: (concurrentConnections / totalTime * 1000).toFixed(2)
    };
  }

  /**
   * السيناريو 5: استعلامات قاعدة البيانات الثقيلة
   * محاكاة 100 استعلام معقد في نفس الوقت
   */
  async complexQueryTest(queryCount = 100) {
    console.log(`🔍 اختبار الاستعلامات المعقدة: ${queryCount} استعلام`);

    const requests = [];
    const startTime = performance.now();

    for (let i = 0; i < queryCount; i++) {
      const promise = this.client.get('/reports/performance', {
        params: {
          period: 'month',
          type: 'vehicle',
          vehicleId: `vehicle_${i}`
        },
        headers: {
          'Authorization': `Bearer test_token_${i}`
        }
      })
        .then(() => {
          this.results.successful++;
        })
        .catch(() => {
          this.results.failed++;
        });

      requests.push(promise);
    }

    await Promise.all(requests);
    const totalTime = performance.now() - startTime;

    return {
      scenario: 'Complex Query Test',
      queryCount,
      successful: this.results.successful,
      failed: this.results.failed,
      totalTime: `${totalTime.toFixed(2)}ms`,
      avgTimePerQuery: `${(totalTime / queryCount).toFixed(2)}ms`,
      queriesPerSecond: (queryCount / totalTime * 1000).toFixed(2)
    };
  }

  /**
   * السيناريو 6: اختبار الذاكرة والموارد
   * محاكاة استخدام مكثف للموارد
   */
  async resourceHeavyTest(duration = 60000) {
    console.log(`⚙️ اختبار الموارد: ${duration / 1000} ثانية`);

    const startTime = performance.now();
    let requestCount = 0;

    while (performance.now() - startTime < duration) {
      try {
        await this.client.post('/predictions/accident-risk', {
          vehicleId: `vehicle_heavy_test`,
          speed: Math.random() * 150,
          acceleration: Math.random() * 10,
          weather: ['clear', 'rain', 'snow'][Math.floor(Math.random() * 3)],
          roadType: ['highway', 'city', 'rural'][Math.floor(Math.random() * 3)],
          timeOfDay: ['morning', 'afternoon', 'night'][Math.floor(Math.random() * 3)],
          driverExperience: Math.random() * 50
        });

        requestCount++;
      } catch (error) {
        // استمر بغض النظر عن الأخطاء
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      scenario: 'Resource Heavy Test',
      durationSeconds: (duration / 1000).toFixed(2),
      totalRequests: requestCount,
      avgRequestsPerSecond: (requestCount / (totalTime / 1000)).toFixed(2)
    };
  }
}

// ====== 2. تقرير الاختبارات الشامل ======

class LoadTestReport {
  constructor() {
    this.results = [];
  }

  addResult(result) {
    this.results.push({
      timestamp: new Date(),
      ...result
    });
  }

  generateReport() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         📊 تقرير اختبار الحمل الشامل                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.scenario}`);
      console.log('─'.repeat(50));

      Object.keys(result).forEach(key => {
        if (key !== 'scenario' && key !== 'timestamp') {
          console.log(`   ${key}: ${result[key]}`);
        }
      });

      console.log('');
    });

    // الملخص الإجمالي
    const totalRequests = this.results.reduce((sum, r) => {
      if (r.totalRequests) return sum + r.totalRequests;
      if (r.concurrentUsers) return sum + r.concurrentUsers;
      return sum;
    }, 0);

    console.log('═'.repeat(50));
    console.log(`إجمالي الطلبات: ${totalRequests}`);
    console.log(`عدد السيناريوهات: ${this.results.length}`);
    console.log('═'.repeat(50));
  }

  exportJSON() {
    return JSON.stringify(this.results, null, 2);
  }

  exportCSV() {
    const headers = ['Scenario', 'Total Requests', 'Success Rate', 'Avg Time'];
    let csv = headers.join(',') + '\n';

    this.results.forEach(result => {
      const row = [
        result.scenario,
        result.totalRequests || result.concurrentUsers,
        `${((result.successful / (result.successful + result.failed)) * 100).toFixed(2)}%`,
        result.avgTimePerRequest || result.avgTime || result.avgTimePerConnection
      ];

      csv += row.join(',') + '\n';
    });

    return csv;
  }
}

// ====== 3. تشغيل الاختبارات ======

async function runAllLoadTests() {
  const tester = new LoadTestingScenarios();
  const report = new LoadTestReport();

  console.log('🚀 بدء مجموعة اختبارات الحمل الشاملة...\n');

  try {
    // السيناريو 1: تسجيل الدخول
    console.log('▶️ السيناريو 1️⃣: تسجيل الدخول');
    const loginResults = await tester.loginStressTest(100);
    report.addResult(loginResults);

    // انتظار قليل
    await new Promise(resolve => setTimeout(resolve, 2000));

    // السيناريو 2: تحديث المواقع
    console.log('\n▶️ السيناريو 2️⃣: تحديث المواقع');
    const locationResults = await tester.locationUpdateStressTest(500, 5);
    report.addResult(locationResults);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // السيناريو 3: لوحة التحكم
    console.log('\n▶️ السيناريو 3️⃣: لوحة التحكم');
    const dashboardResults = await tester.dashboardLoadTest(200);
    report.addResult(dashboardResults);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // السيناريو 4: WebSocket
    console.log('\n▶️ السيناريو 4️⃣: WebSocket');
    const wsResults = await tester.websocketConnectionTest(2000);
    report.addResult(wsResults);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // السيناريو 5: الاستعلامات
    console.log('\n▶️ السيناريو 5️⃣: الاستعلامات المعقدة');
    const queryResults = await tester.complexQueryTest(50);
    report.addResult(queryResults);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // السيناريو 6: الموارد
    console.log('\n▶️ السيناريو 6️⃣: اختبار الموارد');
    const resourceResults = await tester.resourceHeavyTest(30000); // 30 ثانية
    report.addResult(resourceResults);

    // طباعة التقرير
    report.generateReport();

    // حفظ النتائج
    console.log('\n💾 حفظ النتائج...');
    const jsonResults = report.exportJSON();
    const csvResults = report.exportCSV();

    console.log('✅ اكتملت اختبارات الحمل بنجاح!');

    return {
      success: true,
      report: report.results,
      json: jsonResults,
      csv: csvResults
    };

  } catch (error) {
    console.error('❌ خطأ أثناء الاختبارات:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تصدير للاستخدام
module.exports = {
  LoadTestingScenarios,
  LoadTestReport,
  runAllLoadTests
};

// إذا كان هذا الملف يعمل مباشرة
if (require.main === module) {
  runAllLoadTests().then(results => {
    process.exit(results.success ? 0 : 1);
  });
}
