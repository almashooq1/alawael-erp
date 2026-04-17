/**
 * مشغل الاختبارات الشامل - Master Test Runner
 * تشغيل جميع الاختبارات وتجميع النتائج
 */

const fs = require('fs');
const path = require('path');

// استيراد الوحدات
const { SecurityAuditTest } = require('./securityAudit');
const { VulnerabilityScanner } = require('./vulnerabilityScanner');
const { ResourceProfiler } = require('./resourceProfiler');
const { IntegrationCompatibilityTest } = require('./integrationTest');
const { BigDataPerformanceTest } = require('./bigDataPerformance');
const { E2ETest } = require('./e2eTest');

class MasterTestRunner {
  constructor(config = {}) {
    this.config = {
      baseURL: config.baseURL || 'http://localhost:5000/api/v1',
      includeTests: config.includeTests || [
        'security',
        'vulnerability',
        'resources',
        'integration',
        'bigdata',
        'e2e',
      ],
      reportPath: config.reportPath || './test-reports',
      ...config,
    };

    this.allResults = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: require('os').cpus().length,
      },
      testSuites: {},
    };

    this.testOrder = ['security', 'vulnerability', 'resources', 'integration', 'bigdata', 'e2e'];
  }

  /**
   * تشغيل اختبارات الأمان
   */
  async runSecurityTests() {
    if (!this.config.includeTests.includes('security')) return;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                🔐 اختبارات الأمان Security Tests          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const audit = new SecurityAuditTest(this.config.baseURL);
    await audit.runAllTests();

    this.allResults.testSuites.security = {
      status: audit.results.failed.length === 0 ? 'PASSED' : 'FAILED',
      passed: audit.results.passed.length,
      failed: audit.results.failed.length,
      warnings: audit.results.warnings.length,
      results: audit.results,
    };
  }

  /**
   * تشغيل فحص الثغرات
   */
  async runVulnerabilityTests() {
    if (!this.config.includeTests.includes('vulnerability')) return;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            🔍 فحص الثغرات Vulnerability Scanner          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const scanner = new VulnerabilityScanner(this.config.baseURL);
    await scanner.runAllScans();

    this.allResults.testSuites.vulnerability = {
      status: scanner.vulnerabilities.critical.length === 0 ? 'PASSED' : 'HAS_ISSUES',
      critical: scanner.vulnerabilities.critical.length,
      high: scanner.vulnerabilities.high.length,
      medium: scanner.vulnerabilities.medium.length,
      low: scanner.vulnerabilities.low.length,
      info: scanner.vulnerabilities.info.length,
    };
  }

  /**
   * تشغيل اختبارات الموارد
   */
  async runResourceTests() {
    if (!this.config.includeTests.includes('resources')) return;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         🔥 اختبار الموارد Resource Profiler Tests        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const profiler = new ResourceProfiler();
    await profiler.runAllTests();

    this.allResults.testSuites.resources = {
      status: 'COMPLETED',
      testsRun: profiler.results.length,
      results: profiler.exportToJSON(),
    };
  }

  /**
   * تشغيل اختبارات التكامل
   */
  async runIntegrationTests() {
    if (!this.config.includeTests.includes('integration')) return;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       🔗 اختبار التكامل Integration & Compatibility      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const integration = new IntegrationCompatibilityTest(this.config.baseURL);
    await integration.runAllTests();

    this.allResults.testSuites.integration = {
      status: integration.results.failed.length === 0 ? 'PASSED' : 'FAILED',
      passed: integration.results.passed.length,
      failed: integration.results.failed.length,
      warnings: integration.results.warnings.length,
    };
  }

  /**
   * تشغيل اختبارات البيانات الضخمة
   */
  async runBigDataTests() {
    if (!this.config.includeTests.includes('bigdata')) return;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║       📊 اختبار البيانات الضخمة Big Data Performance     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const bigData = new BigDataPerformanceTest(this.config.baseURL);
    await bigData.runAllTests();

    this.allResults.testSuites.bigdata = {
      status: 'COMPLETED',
      testsRun: bigData.results.length,
      results: bigData.exportToJSON(),
    };
  }

  /**
   * تشغيل اختبارات E2E
   */
  async runE2ETests() {
    if (!this.config.includeTests.includes('e2e')) return;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         🧪 اختبارات E2E End-to-End Testing              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const e2e = new E2ETest(this.config.baseURL);
    await e2e.runAllScenarios();

    this.allResults.testSuites.e2e = {
      status: e2e.results.failed === 0 ? 'PASSED' : 'FAILED',
      passed: e2e.results.passed,
      failed: e2e.results.failed,
      totalDuration: e2e.results.duration,
      scenarios: e2e.results.scenarios,
    };
  }

  /**
   * تشغيل جميع الاختبارات
   */
  async runAll() {
    const overallStart = Date.now();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║    🧪 مشغل الاختبارات الشامل - Master Test Runner        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 معلومات الاختبار:');
    console.log(`   التاريخ: ${new Date().toLocaleString('ar-SA')}`);
    console.log(`   الخادم: ${this.config.baseURL}`);
    console.log(`   الاختبارات: ${this.config.includeTests.join(', ')}\n`);

    // تشغيل الاختبارات بالترتيب
    for (const test of this.testOrder) {
      if (this.config.includeTests.includes(test)) {
        try {
          switch (test) {
            case 'security':
              await this.runSecurityTests();
              break;
            case 'vulnerability':
              await this.runVulnerabilityTests();
              break;
            case 'resources':
              await this.runResourceTests();
              break;
            case 'integration':
              await this.runIntegrationTests();
              break;
            case 'bigdata':
              await this.runBigDataTests();
              break;
            case 'e2e':
              await this.runE2ETests();
              break;
          }
        } catch (error) {
          console.error(`❌ خطأ في اختبار ${test}:`, error.message);
          this.allResults.testSuites[test] = {
            status: 'ERROR',
            error: error.message,
          };
        }
      }
    }

    this.allResults.totalDuration = Date.now() - overallStart;

    // طباعة التقرير الملخص
    this.printMasterReport();

    // حفظ التقارير
    await this.saveReports();
  }

  /**
   * طباعة التقرير الملخص
   */
  printMasterReport() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              📊 ملخص نتائج جميع الاختبارات               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // جدول النتائج
    console.log('مجموعة الاختبار          | الحالة      | التفاصيل');
    console.log('════════════════════════════════════════════════════════════');

    for (const test of this.testOrder) {
      if (!this.allResults.testSuites[test]) continue;

      const suite = this.allResults.testSuites[test];
      const testName = {
        security: 'اختبارات الأمان',
        vulnerability: 'فحص الثغرات',
        resources: 'اختبار الموارد',
        integration: 'اختبار التكامل',
        bigdata: 'اختبار البيانات الضخمة',
        e2e: 'اختبارات E2E',
      }[test];

      const status = suite.status;
      let details = '';

      if (suite.passed !== undefined && suite.failed !== undefined) {
        details = `${suite.passed} نجح, ${suite.failed} فشل`;
      } else if (suite.critical !== undefined) {
        const _totalIssues = suite.critical + suite.high + suite.medium + suite.low;
        details = `${suite.critical} حرج, ${suite.high} عالي`;
      } else if (suite.testsRun !== undefined) {
        details = `${suite.testsRun} اختبار`;
      }

      const statusDisplay =
        status === 'PASSED' ? '✅' : status === 'FAILED' ? '❌' : status === 'ERROR' ? '⚠️' : '➡️';

      console.log(`${testName.padEnd(24)} | ${statusDisplay} ${status.padEnd(8)} | ${details}`);
    }

    console.log('════════════════════════════════════════════════════════════\n');

    // الملخص العام
    console.log('📈 الملخص العام:');
    console.log(`   عدد مجموعات الاختبار: ${Object.keys(this.allResults.testSuites).length}`);
    console.log(`   الوقت الإجمالي: ${(this.allResults.totalDuration / 1000).toFixed(2)}s`);
    console.log(
      `   البيئة: ${this.allResults.environment.platform} (${this.allResults.environment.arch})`
    );
    console.log(`   إصدار Node: ${this.allResults.environment.nodeVersion}`);
    console.log(`   عدد المعالجات: ${this.allResults.environment.cpus}\n`);

    // التوصيات
    console.log('💡 التوصيات:');
    console.log('   • قم بمراجعة جميع الثغرات الحرجة');
    console.log('   • تأكد من أن all security tests تمرت');
    console.log('   • تحقق من أداء التطبيق تحت الحمل');
    console.log('   • ادقق في سجلات الأخطاء if any');
    console.log('   • كرر الاختبارات بشكل دوري\n');

    // مسار التقارير
    console.log(`📁 تم حفظ التقارير في: ${path.resolve(this.config.reportPath)}\n`);
  }

  /**
   * حفظ التقارير
   */
  async saveReports() {
    // إنشاء المجلد إذا لم يكن موجوداً
    if (!fs.existsSync(this.config.reportPath)) {
      fs.mkdirSync(this.config.reportPath, { recursive: true });
    }

    // حفظ التقرير الشامل
    const mainReportPath = path.join(this.config.reportPath, 'master-report.json');
    fs.writeFileSync(mainReportPath, JSON.stringify(this.allResults, null, 2));
    console.log(`✅ تم حفظ التقرير الرئيسي: ${mainReportPath}`);

    // حفظ تقرير HTML
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(this.config.reportPath, 'report.html');
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`✅ تم حفظ تقرير HTML: ${htmlPath}`);

    // حفظ تقرير Markdown
    const mdReport = this.generateMarkdownReport();
    const mdPath = path.join(this.config.reportPath, 'report.md');
    fs.writeFileSync(mdPath, mdReport);
    console.log(`✅ تم حفظ تقرير Markdown: ${mdPath}\n`);
  }

  /**
   * توليد تقرير HTML
   */
  generateHTMLReport() {
    const timestamp = new Date().toLocaleString('ar-SA');

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير الاختبارات الشامل</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .passed { color: #4CAF50; font-weight: bold; }
        .failed { color: #f44336; font-weight: bold; }
        .info { background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .timestamp { color: #999; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 تقرير الاختبارات الشامل</h1>
        <p class="timestamp">تاريخ التقرير: ${timestamp}</p>

        <div class="info">
            <h3>معلومات البيئة</h3>
            <ul>
                <li>الخادم: ${this.config.baseURL}</li>
                <li>نظام التشغيل: ${this.allResults.environment.platform}</li>
                <li>إصدار Node: ${this.allResults.environment.nodeVersion}</li>
                <li>عدد المعالجات: ${this.allResults.environment.cpus}</li>
            </ul>
        </div>

        <h2>ملخص النتائج</h2>
        <table>
            <tr>
                <th>مجموعة الاختبار</th>
                <th>الحالة</th>
                <th>التفاصيل</th>
            </tr>
            ${this.testOrder
              .map(test => {
                const suite = this.allResults.testSuites[test];
                if (!suite) return '';

                const testName = {
                  security: 'اختبارات الأمان',
                  vulnerability: 'فحص الثغرات',
                  resources: 'اختبار الموارد',
                  integration: 'اختبار التكامل',
                  bigdata: 'اختبار البيانات الضخمة',
                  e2e: 'اختبارات E2E',
                }[test];

                const statusClass = suite.status === 'PASSED' ? 'passed' : 'failed';
                let details = '';

                if (suite.passed !== undefined && suite.failed !== undefined) {
                  details = `${suite.passed} نجح, ${suite.failed} فشل`;
                } else if (suite.critical !== undefined) {
                  details = `${suite.critical} حرج, ${suite.high} عالي`;
                }

                return `
                <tr>
                    <td>${testName}</td>
                    <td class="${statusClass}">${suite.status}</td>
                    <td>${details}</td>
                </tr>
              `;
              })
              .join('')}
        </table>

        <h2>الملاحظات</h2>
        <ul>
            <li>تم تشغيل الاختبارات بنجاح</li>
            <li>تحقق من التقارير المفصلة للمزيد من المعلومات</li>
            <li>يُنصح بتشغيل الاختبارات بشكل دوري</li>
        </ul>
    </div>
</body>
</html>
    `;
  }

  /**
   * توليد تقرير Markdown
   */
  generateMarkdownReport() {
    const timestamp = new Date().toLocaleString('ar-SA');

    let report = `# 🧪 تقرير الاختبارات الشامل\n\n`;
    report += `**تاريخ التقرير:** ${timestamp}\n\n`;
    report += `## معلومات البيئة\n\n`;
    report += `- **الخادم:** ${this.config.baseURL}\n`;
    report += `- **نظام التشغيل:** ${this.allResults.environment.platform}\n`;
    report += `- **إصدار Node:** ${this.allResults.environment.nodeVersion}\n`;
    report += `- **عدد المعالجات:** ${this.allResults.environment.cpus}\n`;
    report += `- **الوقت الإجمالي:** ${(this.allResults.totalDuration / 1000).toFixed(2)}s\n\n`;

    report += `## ملخص النتائج\n\n`;
    report += `| مجموعة الاختبار | الحالة | التفاصيل |\n`;
    report += `|---|---|---|\n`;

    for (const test of this.testOrder) {
      const suite = this.allResults.testSuites[test];
      if (!suite) continue;

      const testName = {
        security: 'اختبارات الأمان',
        vulnerability: 'فحص الثغرات',
        resources: 'اختبار الموارد',
        integration: 'اختبار التكامل',
        bigdata: 'اختبار البيانات الضخمة',
        e2e: 'اختبارات E2E',
      }[test];

      let details = '';
      if (suite.passed !== undefined && suite.failed !== undefined) {
        details = `${suite.passed} نجح, ${suite.failed} فشل`;
      }

      report += `| ${testName} | ${suite.status} | ${details} |\n`;
    }

    report += `\n## التوصيات\n\n`;
    report += `- ✅ تحقق من جميع الثغرات الحرجة\n`;
    report += `- ✅ تأكد من نجاح اختبارات الأمان\n`;
    report += `- ✅ راقب أداء النظام\n`;
    report += `- ✅ كرر الاختبارات بشكل دوري\n`;

    return report;
  }
}

// التشغيل
if (require.main === module) {
  const runner = new MasterTestRunner({
    baseURL: process.env.API_URL || 'http://localhost:5000/api/v1',
    reportPath: process.env.REPORT_PATH || './test-reports',
    includeTests: process.env.TESTS
      ? process.env.TESTS.split(',')
      : ['security', 'vulnerability', 'resources', 'integration', 'bigdata', 'e2e'],
  });

  runner.runAll().catch(error => {
    console.error('❌ خطأ في تشغيل الاختبارات:', error);
    process.exit(1);
  });
}

module.exports = { MasterTestRunner };
