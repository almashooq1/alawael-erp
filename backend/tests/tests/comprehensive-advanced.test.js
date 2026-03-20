/**
 * Advanced Comprehensive Testing Suite
 * مجموعة اختبارات متقدمة شاملة جداً
 *
 * يتضمن:
 * ✅ اختبارات الأداء (Performance Tests)
 * ✅ اختبارات الأمان (Security Tests)
 * ✅ اختبارات التكامل (Integration Tests)
 * ✅ اختبارات الحالات المعقدة (Complex Scenarios)
 * ✅ اختبارات تحمل الحمل (Stress Tests)
 * ✅ اختبارات البيانات (Data Validation Tests)
 */

const axios = require('axios');
const _assert = require('assert');

// ========================
// Configuration
// ========================
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const TIMEOUT = 30000;
const PERFORMANCE_THRESHOLD = 500; // ms

// ========================
// Helper Functions
// ========================

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
    };
    this.tests = [];
    this.startTime = null;
  }

  async runTest(name, testFn) {
    this.results.total++;
    const testStartTime = Date.now();

    try {
      await testFn();
      this.results.passed++;
      console.log(`✅ ${name}`);
      this.tests.push({ name, status: 'PASSED', duration: Date.now() - testStartTime });
    } catch (error) {
      this.results.failed++;
      console.error(`❌ ${name}: ${error.message}`);
      this.tests.push({
        name,
        status: 'FAILED',
        error: error.message,
        duration: Date.now() - testStartTime,
      });
    }
  }

  async runAll(tests) {
    this.startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log('🧪 بدء مجموعة الاختبارات المتقدمة الشاملة');
    console.log('='.repeat(80) + '\n');

    for (const test of tests) {
      await this.runTest(test.name, test.fn);
    }

    this.results.duration = Date.now() - this.startTime;
    this.printSummary();
  }

  printSummary() {
    const passPercentage = ((this.results.passed / this.results.total) * 100).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('📊 ملخص النتائج');
    console.log('='.repeat(80));
    console.log(`✅ نجح: ${this.results.passed}/${this.results.total}`);
    console.log(`❌ فشل: ${this.results.failed}/${this.results.total}`);
    console.log(`⏭️  تم تخطيه: ${this.results.skipped}/${this.results.total}`);
    console.log(`📈 نسبة النجاح: ${passPercentage}%`);
    console.log(`⏱️  الوقت الإجمالي: ${this.results.duration}ms`);
    console.log('='.repeat(80) + '\n');

    if (this.results.failed > 0) {
      console.log('❌ الاختبارات الفاشلة:');
      this.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => {
          console.log(`  - ${t.name}: ${t.error}`);
        });
    }
  }
}

// ========================
// Performance Tests
// ========================

const performanceTests = [
  {
    name: 'اختبار الأداء - استدعاء قائمة المقاييس',
    fn: async () => {
      const startTime = Date.now();
      await axios.get(`${API_BASE_URL}/measurements`, { timeout: TIMEOUT });
      const duration = Date.now() - startTime;

      if (duration > PERFORMANCE_THRESHOLD) {
        throw new Error(
          `الاستدعاء استغرق ${duration}ms (يجب أن يكون أقل من ${PERFORMANCE_THRESHOLD}ms)`
        );
      }
    },
  },

  {
    name: 'اختبار الأداء - استدعاء قائمة البرامج',
    fn: async () => {
      const startTime = Date.now();
      await axios.get(`${API_BASE_URL}/programs`, { timeout: TIMEOUT });
      const duration = Date.now() - startTime;

      if (duration > PERFORMANCE_THRESHOLD) {
        throw new Error(`الاستدعاء استغرق ${duration}ms`);
      }
    },
  },

  {
    name: 'اختبار الأداء - الربط الذكي',
    fn: async () => {
      const startTime = Date.now();

      const result = await axios.post(
        `${API_BASE_URL}/measurements/analyze-and-link`,
        {
          measurementCode: 'INTEL_003',
          interpretationLevel: 'MODERATE',
        },
        { timeout: TIMEOUT }
      );

      const duration = Date.now() - startTime;

      if (duration > PERFORMANCE_THRESHOLD * 2) {
        throw new Error(
          `الربط استغرق ${duration}ms (يجب أن يكون أقل من ${PERFORMANCE_THRESHOLD * 2}ms)`
        );
      }

      if (!result.data.recommendedPrograms) {
        throw new Error('لم يتم إرجاع البرامج الموصى بها');
      }
    },
  },

  {
    name: 'اختبار الأداء - إنشاء مقياس نتيجة',
    fn: async () => {
      const startTime = Date.now();

      await axios.post(
        `${API_BASE_URL}/measurements/results`,
        {
          measurementCode: 'MOTOR_002',
          score: 75,
          interpretationLevel: 'AVERAGE',
          beneficiaryId: 'test-user-1',
        },
        { timeout: TIMEOUT }
      );

      const duration = Date.now() - startTime;

      if (duration > PERFORMANCE_THRESHOLD) {
        throw new Error(`الإنشاء استغرق ${duration}ms`);
      }
    },
  },
];

// ========================
// Security Tests
// ========================

const securityTests = [
  {
    name: 'اختبار الأمان - التحقق من صحة الإدخال',
    fn: async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/measurements/results`,
          {
            measurementCode: 'INVALID<script>alert("XSS")</script>',
            score: 1000, // أكبر من الحد الأقصى
            beneficiaryId: 'test<img src=x>',
          },
          { timeout: TIMEOUT }
        );

        throw new Error('يجب أن يرفض الإدخال غير الصحيح');
      } catch (error) {
        if (error.response && error.response.status >= 400) {
          // متوقع
          return;
        }
        throw error;
      }
    },
  },

  {
    name: 'اختبار الأمان - التحقق من نطاق الدرجات',
    fn: async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/measurements/results`,
          {
            measurementCode: 'INTEL_003',
            score: -50,
            interpretationLevel: 'NORMAL',
            beneficiaryId: 'test-user-1',
          },
          { timeout: TIMEOUT }
        );

        throw new Error('يجب أن يرفض الدرجات السالبة');
      } catch (error) {
        if (error.response && error.response.status >= 400) {
          return;
        }
        throw error;
      }
    },
  },

  {
    name: 'اختبار الأمان - معالجة الحقول المفقودة',
    fn: async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/measurements/results`,
          {
            measurementCode: 'MOTOR_002',
            // حقول مفقودة
          },
          { timeout: TIMEOUT }
        );

        throw new Error('يجب أن يرفض الطلب بحقول مفقودة');
      } catch (error) {
        if (error.response && error.response.status >= 400) {
          return;
        }
        throw error;
      }
    },
  },

  {
    name: 'اختبار الأمان - التحقق من صحة رموز المقاييس',
    fn: async () => {
      try {
        await axios.post(
          `${API_BASE_URL}/measurements/analyze-and-link`,
          {
            measurementCode: 'NONEXISTENT_CODE_12345',
            interpretationLevel: 'NORMAL',
          },
          { timeout: TIMEOUT }
        );

        throw new Error('يجب أن يرفض رموز المقاييس غير الموجودة');
      } catch (error) {
        if (error.response && error.response.status >= 400) {
          return;
        }
        throw error;
      }
    },
  },
];

// ========================
// Integration Tests
// ========================

const integrationTests = [
  {
    name: 'اختبار التكامل - القراءة والكتابة والقراءة مرة أخرى',
    fn: async () => {
      // اكتب نتيجة
      const writeResult = await axios.post(
        `${API_BASE_URL}/measurements/results`,
        {
          measurementCode: 'LANG_001',
          score: 85,
          interpretationLevel: 'ABOVE_AVERAGE',
          beneficiaryId: 'test-integration-1',
          notes: 'اختبار التكامل',
        },
        { timeout: TIMEOUT }
      );

      if (!writeResult.data.id) {
        throw new Error('لم يتم إرجاع معرف النتيجة');
      }

      // اقرأ النتيجة
      const readResult = await axios.get(
        `${API_BASE_URL}/measurements/results/${writeResult.data.id}`,
        { timeout: TIMEOUT }
      );

      if (readResult.data.score !== 85) {
        throw new Error('الدرجة المقروءة لا تطابق الدرجة المكتوبة');
      }
    },
  },

  {
    name: 'اختبار التكامل - ربط نتيجة بالبرامج تلقائياً',
    fn: async () => {
      const result = await axios.post(
        `${API_BASE_URL}/measurements/results`,
        {
          measurementCode: 'AUTISM_004',
          score: 35,
          interpretationLevel: 'SEVERE_IMPAIRMENT',
          beneficiaryId: 'test-integration-2',
        },
        { timeout: TIMEOUT }
      );

      if (!result.data.activatedPrograms || result.data.activatedPrograms.length === 0) {
        throw new Error('لم يتم تنشيط أي برامج تلقائياً');
      }

      const programs = result.data.activatedPrograms;
      const hasCriticalPrograms = programs.some(p => p.recommendationLevel === 'CRITICAL');

      if (!hasCriticalPrograms) {
        throw new Error('يجب أن تكون هناك برامج حرجة للحالات الشديدة');
      }
    },
  },

  {
    name: 'اختبار التكامل - الحصول على تقرير شامل',
    fn: async () => {
      const report = await axios.get(`${API_BASE_URL}/measurements/report/test-integration-1`, {
        timeout: TIMEOUT,
      });

      if (!report.data.measurements) {
        throw new Error('التقرير لا يحتوي على قائمة المقاييس');
      }

      if (!report.data.recommendations) {
        throw new Error('التقرير لا يحتوي على التوصيات');
      }

      if (!report.data.summary) {
        throw new Error('التقرير لا يحتوي على ملخص');
      }
    },
  },

  {
    name: 'اختبار التكامل - معالجة حالات متعددة',
    fn: async () => {
      const measurements = [
        { code: 'MOTOR_002', score: 45, level: 'MILD_IMPAIRMENT' },
        { code: 'LANG_001', score: 55, level: 'BELOW_AVERAGE' },
        { code: 'SOCIAL_001', score: 40, level: 'POOR' },
      ];

      for (const measurement of measurements) {
        await axios.post(
          `${API_BASE_URL}/measurements/results`,
          {
            measurementCode: measurement.code,
            score: measurement.score,
            interpretationLevel: measurement.level,
            beneficiaryId: 'test-multi-measure',
          },
          { timeout: TIMEOUT }
        );
      }

      const report = await axios.get(`${API_BASE_URL}/measurements/report/test-multi-measure`, {
        timeout: TIMEOUT,
      });

      if (report.data.measurements.length !== 3) {
        throw new Error('يجب أن يكون هناك 3 مقاييس في التقرير');
      }
    },
  },

  {
    name: 'اختبار التكامل - استدعاءات متعددة متزامنة',
    fn: async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          axios.post(
            `${API_BASE_URL}/measurements/results`,
            {
              measurementCode: `ELITE_TEST_${i}`,
              score: 50 + i * 5,
              interpretationLevel: 'AVERAGE',
              beneficiaryId: `test-concurrent-${i}`,
            },
            { timeout: TIMEOUT }
          )
        );
      }

      const results = await Promise.all(promises);

      if (results.length !== 10) {
        throw new Error('اقل من 10 استدعاءات نجحت');
      }

      const allSuccessful = results.every(r => r.status === 200);
      if (!allSuccessful) {
        throw new Error('ليست جميع الاستدعاءات ناجحة');
      }
    },
  },
];

// ========================
// Complex Scenario Tests
// ========================

const complexScenarioTests = [
  {
    name: 'سيناريو معقد - حالة التوحد الشديدة',
    fn: async () => {
      // حالة توحد شديدة مع تأخر لغوي
      const measurements = [
        { code: 'AUTISM_004', score: 25, level: 'SEVERE_IMPAIRMENT' },
        { code: 'LANG_001', score: 20, level: 'SEVERE_IMPAIRMENT' },
        { code: 'SOCIAL_001', score: 15, level: 'SEVERE_IMPAIRMENT' },
        { code: 'MOTOR_002', score: 60, level: 'AVERAGE' },
      ];

      for (const measurement of measurements) {
        await axios.post(
          `${API_BASE_URL}/measurements/results`,
          {
            measurementCode: measurement.code,
            score: measurement.score,
            interpretationLevel: measurement.level,
            beneficiaryId: 'case-autism-severe',
          },
          { timeout: TIMEOUT }
        );
      }

      const analysis = await axios.post(
        `${API_BASE_URL}/measurements/analyze-and-link`,
        {
          measurementCode: 'AUTISM_004',
          interpretationLevel: 'SEVERE_IMPAIRMENT',
        },
        { timeout: TIMEOUT }
      );

      if (!analysis.data.recommendedPrograms) {
        throw new Error('لم يتم الحصول على برامج موصى بها');
      }

      const criticalPrograms = analysis.data.recommendedPrograms.filter(
        p => p.priority === 'CRITICAL'
      );
      if (criticalPrograms.length === 0) {
        throw new Error('يجب أن تكون هناك برامج حرجة');
      }
    },
  },

  {
    name: 'سيناريو معقد - صعوبات تعلمية معقدة',
    fn: async () => {
      const measurements = [
        { code: 'ACADEMIC_ELITE_001', score: 30, level: 'POOR' }, // دسلكسيا
        { code: 'ACADEMIC_ELITE_002', score: 35, level: 'POOR' }, // دسجرافيا
        { code: 'ACADEMIC_ELITE_003', score: 40, level: 'POOR' }, // دسكالكوليا
        { code: 'COGNITION_ELITE_001', score: 55, level: 'AVERAGE' }, // معالجة عادية
      ];

      for (const measurement of measurements) {
        await axios.post(
          `${API_BASE_URL}/measurements/results`,
          {
            measurementCode: measurement.code,
            score: measurement.score,
            interpretationLevel: measurement.level,
            beneficiaryId: 'case-learning-complex',
          },
          { timeout: TIMEOUT }
        );
      }

      const report = await axios.get(`${API_BASE_URL}/measurements/report/case-learning-complex`, {
        timeout: TIMEOUT,
      });

      if (!report.data.summary) {
        throw new Error('يجب أن يكون هناك ملخص');
      }

      const shouldHighlightMultipleIssues = report.data.measurements.length >= 3;
      if (!shouldHighlightMultipleIssues) {
        throw new Error('تم اكتشاف عدة صعوبات لكن لم يتم تميزها');
      }
    },
  },

  {
    name: 'سيناريو معقد - حالة إعاقة حركية مع تأثر معرفي',
    fn: async () => {
      const measurements = [
        { code: 'PHYSIO_ELITE_001', score: 20, level: 'SEVERE_IMPAIRMENT' }, // حركة سيئة
        { code: 'PHYSIO_ELITE_004', score: 25, level: 'POOR' }, // توازن سيء
        { code: 'COGNITION_ELITE_001', score: 70, level: 'AVERAGE' }, // معرفة جيدة نسبياً
      ];

      for (const measurement of measurements) {
        await axios.post(
          `${API_BASE_URL}/measurements/results`,
          {
            measurementCode: measurement.code,
            score: measurement.score,
            interpretationLevel: measurement.level,
            beneficiaryId: 'case-motor-cognitive',
          },
          { timeout: TIMEOUT }
        );
      }

      const analysis = await axios.post(
        `${API_BASE_URL}/measurements/analyze-and-link`,
        {
          measurementCode: 'PHYSIO_ELITE_001',
          interpretationLevel: 'SEVERE_IMPAIRMENT',
        },
        { timeout: TIMEOUT }
      );

      const hasMotorPrograms = analysis.data.recommendedPrograms.some(
        p => p.id && p.id.includes('MOTOR')
      );

      if (!hasMotorPrograms) {
        throw new Error('يجب أن تكون هناك برامج حركية');
      }
    },
  },
];

// ========================
// Stress Tests
// ========================

const stressTests = [
  {
    name: 'اختبار الإجهاد - 50 استدعاء متتالي',
    fn: async () => {
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        try {
          await axios.get(`${API_BASE_URL}/measurements`, { timeout: TIMEOUT });
        } catch (error) {
          throw new Error(`فشل الاستدعاء ${i + 1}: ${error.message}`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`    ⏱️  50 استدعاء في ${duration}ms`);

      if (duration > 15000) {
        throw new Error(`الاستدعاءات استغرقت وقتاً طويلاً جداً: ${duration}ms`);
      }
    },
  },

  {
    name: 'اختبار الإجهاد - 20 عملية كتابة متزامن',
    fn: async () => {
      const promises = [];

      for (let i = 0; i < 20; i++) {
        promises.push(
          axios.post(
            `${API_BASE_URL}/measurements/results`,
            {
              measurementCode: 'MOTOR_002',
              score: Math.floor(Math.random() * 100),
              interpretationLevel: 'AVERAGE',
              beneficiaryId: `stress-test-${i}`,
            },
            { timeout: TIMEOUT }
          )
        );
      }

      try {
        await Promise.all(promises);
      } catch (error) {
        throw new Error(`فشل واحد على الأقل من 20 عملية كتابة: ${error.message}`);
      }
    },
  },
];

// ========================
// Data Validation Tests
// ========================

const dataValidationTests = [
  {
    name: 'اختبار البيانات - التحقق من وجود بيانات المقاييس',
    fn: async () => {
      const result = await axios.get(`${API_BASE_URL}/measurements`, { timeout: TIMEOUT });

      if (!Array.isArray(result.data)) {
        throw new Error('يجب أن تكون النتيجة مصفوفة');
      }

      if (result.data.length === 0) {
        throw new Error('يجب أن يكون هناك مقاييس على الأقل');
      }

      const measurement = result.data[0];
      const requiredFields = ['code', 'name', 'description', 'category'];

      for (const field of requiredFields) {
        if (!measurement[field]) {
          throw new Error(`المقياس يفتقد الحقل: ${field}`);
        }
      }
    },
  },

  {
    name: 'اختبار البيانات - التحقق من وجود بيانات البرامج',
    fn: async () => {
      const result = await axios.get(`${API_BASE_URL}/programs`, { timeout: TIMEOUT });

      if (!Array.isArray(result.data)) {
        throw new Error('يجب أن تكون النتيجة مصفوفة');
      }

      if (result.data.length === 0) {
        throw new Error('يجب أن يكون هناك برامج على الأقل');
      }

      const program = result.data[0];
      const requiredFields = ['code', 'name', 'description', 'category'];

      for (const field of requiredFields) {
        if (!program[field]) {
          throw new Error(`البرنامج يفتقد الحقل: ${field}`);
        }
      }
    },
  },

  {
    name: 'اختبار البيانات - التحقق من الفئات',
    fn: async () => {
      const measurements = await axios.get(`${API_BASE_URL}/measurements`, { timeout: TIMEOUT });
      const categories = new Set(measurements.data.map(m => m.category));

      if (categories.size === 0) {
        throw new Error('يجب أن يكون هناك فئات على الأقل');
      }

      console.log(`    📂 وجدت ${categories.size} فئة`);
    },
  },
];

// ========================
// Main Test Execution
// ========================

async function runAllTests() {
  const runner = new TestRunner();

  const allTests = [
    {
      category: '⚡ اختبارات الأداء',
      tests: performanceTests,
    },
    {
      category: '🔒 اختبارات الأمان',
      tests: securityTests,
    },
    {
      category: '🔗 اختبارات التكامل',
      tests: integrationTests,
    },
    {
      category: '🎯 الحالات المعقدة',
      tests: complexScenarioTests,
    },
    {
      category: '💪 اختبارات الإجهاد',
      tests: stressTests,
    },
    {
      category: '📊 اختبارات البيانات',
      tests: dataValidationTests,
    },
  ];

  for (const category of allTests) {
    console.log(`\n${category.category}\n` + '─'.repeat(50));

    for (const test of category.tests) {
      await runner.runTest(test.name, test.fn);
    }
  }

  runner.printSummary();

  return runner.results.failed === 0;
}

// ========================
// Export
// ========================

module.exports = {
  runAllTests,
  TestRunner,
  performanceTests,
  securityTests,
  integrationTests,
  complexScenarioTests,
  stressTests,
  dataValidationTests,
};

// ========================
// CLI Execution
// ========================

if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ خطأ حرج:', error);
      process.exit(1);
    });
}
