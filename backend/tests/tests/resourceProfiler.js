/**
 * اختبار إجهاد الموارد - Stress Testing & Resource Profiling
 * قياس الأداء تحت الضغط الشديد وتحديد حدود النظام
 */

const os = require('os');
const { performance } = require('perf_hooks');

class ResourceProfiler {
  constructor() {
    this.baselinMemory = process.memoryUsage();
    this.cpuUsage = process.cpuUsage();
    this.results = [];
  }

  /**
   * قياس استهلاك الذاكرة
   */
  getMemorySnapshot() {
    const used = process.memoryUsage();
    return {
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(used.external / 1024 / 1024)}MB`,
      rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
      arrayBuffers: `${Math.round(used.arrayBuffers / 1024 / 1024)}MB`
    };
  }

  /**
   * قياس استهلاك الـ CPU
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return {
      cpuCount: cpus.length,
      idlePercent: Math.round((totalIdle / totalTick) * 100),
      busyPercent: Math.round(100 - (totalIdle / totalTick) * 100)
    };
  }

  /**
   * اختبار إجهاد معالجة السلاسل النصية
   */
  stressStringProcessing() {
    console.log('🔥 اختبار إجهاد معالجة السلاسل...');
    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const iterations = 100000;
    let data = [];

    for (let i = 0; i < iterations; i++) {
      const str = `Location-${i}-${Date.now()}-${Math.random()}`;
      data.push(str.toUpperCase());
      data.push(str.toLowerCase());
      data.push(str.substring(0, 10));
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      test: 'String Processing',
      iterations,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      memoryDelta: `${Math.round((endMem - startMem) / 1024 / 1024)}MB`,
      throughput: `${(iterations / ((endTime - startTime) / 1000)).toFixed(0)} ops/sec`
    };
  }

  /**
   * اختبار إجهاد معالجة الـ JSON
   */
  stressJSONProcessing() {
    console.log('🔥 اختبار إجهاد معالجة JSON...');
    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const iterations = 10000;
    let processed = 0;

    for (let i = 0; i < iterations; i++) {
      const obj = {
        id: `vehicle-${i}`,
        latitude: Math.random() * 90,
        longitude: Math.random() * 180,
        speed: Math.random() * 200,
        timestamp: Date.now(),
        metadata: {
          driver: `driver-${i % 100}`,
          route: `route-${i % 50}`,
          status: ['active', 'idle', 'maintenance'][i % 3]
        }
      };

      const json = JSON.stringify(obj);
      JSON.parse(json);
      processed++;
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      test: 'JSON Processing',
      iterations: processed,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      memoryDelta: `${Math.round((endMem - startMem) / 1024 / 1024)}MB`,
      throughput: `${(processed / ((endTime - startTime) / 1000)).toFixed(0)} ops/sec`
    };
  }

  /**
   * اختبار إجهاد معالجة المصفوفات الكبيرة
   */
  stressArrayProcessing() {
    console.log('🔥 اختبار إجهاد معالجة المصفوفات...');
    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // إنشاء مصفوفة كبيرة
    const largeArray = Array.from({ length: 1000000 }, (_, i) => ({
      id: i,
      value: Math.random(),
      timestamp: Date.now()
    }));

    // عمليات مختلفة
    largeArray.filter(x => x.value > 0.5);
    largeArray.map(x => x.value * 2);
    largeArray.reduce((sum, x) => sum + x.value, 0);
    largeArray.sort((a, b) => a.value - b.value);

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      test: 'Array Processing',
      arraySize: largeArray.length,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      memoryDelta: `${Math.round((endMem - startMem) / 1024 / 1024)}MB`,
      throughput: `${(largeArray.length / ((endTime - startTime) / 1000)).toFixed(0)} items/sec`
    };
  }

  /**
   * اختبار إجهاد معالجة التواريخ والأوقات
   */
  stressDateProcessing() {
    console.log('🔥 اختبار إجهاد معالجة التواريخ...');
    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const iterations = 1000000;
    let processed = 0;

    for (let i = 0; i < iterations; i++) {
      const date = new Date();
      date.toISOString();
      date.getTime();
      date.getFullYear();
      date.getMonth();
      date.getDate();
      processed++;
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      test: 'Date Processing',
      iterations: processed,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      memoryDelta: `${Math.round((endMem - startMem) / 1024 / 1024)}MB`,
      throughput: `${(processed / ((endTime - startTime) / 1000)).toFixed(0)} ops/sec`
    };
  }

  /**
   * اختبار إجهاد معالجة الأرقام والعمليات الحسابية
   */
  stressMathProcessing() {
    console.log('🔥 اختبار إجهاد العمليات الحسابية...');
    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const iterations = 10000000;
    let result = 0;

    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i);
      result = Math.sin(result);
      result = Math.cos(result);
      result = Math.abs(result);
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      test: 'Math Processing',
      iterations,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      memoryDelta: `${Math.round((endMem - startMem) / 1024 / 1024)}MB`,
      throughput: `${(iterations / ((endTime - startTime) / 1000)).toFixed(0)} ops/sec`,
      result: result.toFixed(6)
    };
  }

  /**
   * اختبار إجهاد معالجة التشفير
   */
  stressEncryption() {
    const crypto = require('crypto');
    console.log('🔥 اختبار إجهاد التشفير...');

    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const iterations = 1000;
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const data = 'GPS Location Data: Latitude 24.7136, Longitude 46.6753';

    for (let i = 0; i < iterations; i++) {
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      test: 'Encryption',
      iterations,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      memoryDelta: `${Math.round((endMem - startMem) / 1024 / 1024)}MB`,
      throughput: `${(iterations / ((endTime - startTime) / 1000)).toFixed(0)} ops/sec`
    };
  }

  /**
   * اختبار إجهاد معالجة الـ Regex
   */
  stressRegexProcessing() {
    console.log('🔥 اختبار إجهاد معالجة Regex...');

    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const iterations = 100000;
    const patterns = [
      /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
      /^\+?[1-9]\d{1,14}$/,
      /^[A-Z]{3,5}-[0-9]{1,5}$/,
      /^(-?\d+\.?\d*|-?\.\d+)$/
    ];

    let matched = 0;

    for (let i = 0; i < iterations; i++) {
      const email = `user${i}@example.com`;
      const phone = `+9665012345${i % 10}`;
      const vehicleId = `VHL-${i}`;
      const coordinate = `${Math.random() * 180}`;

      if (patterns[0].test(email)) matched++;
      if (patterns[1].test(phone)) matched++;
      if (patterns[2].test(vehicleId)) matched++;
      if (patterns[3].test(coordinate)) matched++;
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      test: 'Regex Processing',
      iterations,
      matched,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      memoryDelta: `${Math.round((endMem - startMem) / 1024 / 1024)}MB`,
      throughput: `${(iterations / ((endTime - startTime) / 1000)).toFixed(0)} ops/sec`
    };
  }

  /**
   * اختبار تسرب الذاكرة (Memory Leak Detection)
   */
  stressMemoryLeakDetection() {
    console.log('🔥 اختبار كشف تسرب الذاكرة...');

    const startMem = process.memoryUsage();
    const startTime = performance.now();

    // محاكاة عمليات قد تسبب تسرب ذاكرة
    const globalLeaks = [];
    const baseObjects = 100000;

    for (let i = 0; i < baseObjects; i++) {
      globalLeaks.push({
        id: i,
        data: Array(100).fill(Math.random()),
        timestamp: new Date()
      });
    }

    const midMem = process.memoryUsage();

    // تنظيف
    globalLeaks.length = 0;

    // إجبار garbage collection إذا كان متاح
    if (global.gc) {
      global.gc();
    }

    const endMem = process.memoryUsage();
    const endTime = performance.now();

    return {
      test: 'Memory Leak Detection',
      baseObjects,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      peakMemory: `${Math.round(midMem.heapUsed / 1024 / 1024)}MB`,
      finalMemory: `${Math.round(endMem.heapUsed / 1024 / 1024)}MB`,
      leaked: `${Math.round((endMem.heapUsed - startMem.heapUsed) / 1024 / 1024)}MB`,
      status: Math.round((endMem.heapUsed - startMem.heapUsed) / 1024 / 1024) > 50 ? 'LEAK DETECTED' : 'OK'
    };
  }

  /**
   * تشغيل جميع الاختبارات
   */
  async runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        🔥 اختبار إجهاد الموارد - Resource Stress Test      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // معلومات النظام
    console.log('📊 معلومات النظام:');
    console.log(`   المعالجات: ${os.cpus().length}`);
    console.log(`   إجمالي الذاكرة: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
    console.log(`   الذاكرة المتاحة: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);
    console.log(`   منصة التشغيل: ${os.platform()}\n`);

    // قبل الاختبارات
    console.log('💾 الحالة الأولية:');
    console.log('   ', this.getMemorySnapshot());
    console.log('   ', this.getCPUUsage());
    console.log('\n');

    // تشغيل الاختبارات
    this.results.push(this.stressStringProcessing());
    this.results.push(this.stressJSONProcessing());
    this.results.push(this.stressArrayProcessing());
    this.results.push(this.stressDateProcessing());
    this.results.push(this.stressMathProcessing());
    this.results.push(this.stressEncryption());
    this.results.push(this.stressRegexProcessing());
    this.results.push(this.stressMemoryLeakDetection());

    // بعد الاختبارات
    console.log('💾 الحالة النهائية:');
    console.log('   ', this.getMemorySnapshot());
    console.log('   ', this.getCPUUsage());
    console.log('\n');

    this.printReport();
  }

  /**
   * طباعة التقرير
   */
  printReport() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                   📋 تقرير الأداء                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('اختبار                    | المدة        | الذاكرة      | الإنتاجية');
    console.log('════════════════════════════════════════════════════════════');

    this.results.forEach(result => {
      const name = result.test.padEnd(25);
      const duration = (result.duration || 'N/A').padEnd(12);
      const memory = (result.memoryDelta || 'N/A').padEnd(12);
      const throughput = result.throughput || 'N/A';

      console.log(`${name} | ${duration} | ${memory} | ${throughput}`);
    });

    console.log('════════════════════════════════════════════════════════════\n');

    // ملخص
    const memoryLeakTest = this.results.find(r => r.test === 'Memory Leak Detection');
    const status = memoryLeakTest?.status || 'UNKNOWN';

    console.log('✅ الملخص:');
    console.log(`   عدد الاختبارات: ${this.results.length}`);
    console.log(`   حالة تسرب الذاكرة: ${status}`);
    console.log(`   الاستهلاك الإجمالي: ${this.getMemorySnapshot().heapUsed}`);
    console.log('════════════════════════════════════════════════════════════\n');
  }

  /**
   * تصدير النتائج
   */
  exportToJSON() {
    return {
      timestamp: new Date().toISOString(),
      systemInfo: {
        cpuCount: os.cpus().length,
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
        freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`,
        platform: os.platform(),
        arch: os.arch()
      },
      results: this.results
    };
  }
}

module.exports = { ResourceProfiler };

// التشغيل المباشر
if (require.main === module) {
  const profiler = new ResourceProfiler();
  profiler.runAllTests();
}
