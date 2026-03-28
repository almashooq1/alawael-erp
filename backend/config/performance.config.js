/* eslint-disable no-unused-vars */
/**
 * ⚡ Performance Configuration - تكوين الأداء المحسن
 * نظام ERP الألوائل - إصدار احترافي
 */

const logger = require('../utils/logger');

const performanceConfig = {
  // إعدادات قاعدة البيانات
  database: {
    // MongoDB
    mongodb: {
      // Connection Pooling
      poolSize: process.env.MONGO_POOL_SIZE || 10,
      // Connection Timeout
      connectTimeoutMS: 30000,
      // Socket Timeout
      socketTimeoutMS: 45000,
      // Server Selection Timeout
      serverSelectionTimeoutMS: 5000,
      // Max Pool Size
      maxPoolSize: 50,
      // Min Pool Size
      minPoolSize: 5,
      // Max Idle Time MS
      maxIdleTimeMS: 30000,
      // Wait Queue Timeout
      waitQueueTimeoutMS: 10000,
      // Heartbeat Frequency
      heartbeatFrequencyMS: 10000,
      // Auto Index Build
      autoIndex: process.env.NODE_ENV !== 'production',
    },

    // Query Optimization
    query: {
      // الحد الأقصى لعدد النتائج
      maxLimit: 1000,
      // الحد الافتراضي
      defaultLimit: 50,
      // تفعيل lean queries (أسرع)
      leanQueries: true,
      // تفعيل lean على populate
      leanPopulate: true,
      // تحديد الحقول المطلوبة فقط
      selectOnlyRequired: true,
    },

    // Indexing Strategy
    indexes: {
      // تفعيل الفهارس التلقائية
      autoCreate: true,
      // الفهارس المركبة الشائعة
      compound: {
        users: [{ email: 1 }, { nationalId: 1 }, { branch: 1, status: 1 }],
        employees: [
          { branch: 1, status: 1 },
          { department: 1, status: 1 },
        ],
        transactions: [{ date: -1 }, { type: 1, date: -1 }, { branch: 1, date: -1 }],
        attendance: [
          { employee: 1, date: 1 },
          { branch: 1, date: 1 },
        ],
      },
    },
  },

  // إعدادات الذاكرة والتخزين المؤقت
  memory: {
    // Heap Size Limit (MB)
    maxHeapSize: process.env.NODE_OPTIONS
      ? parseInt(process.env.NODE_OPTIONS.match(/--max-old-space-size=(\d+)/)?.[1]) || 2048
      : 2048,
    // Garbage Collection
    gc: {
      // تفعيل GC التزايدية
      incremental: true,
      // GC عند ضغط الذاكرة
      exposeGC: true,
    },
    // Memory Monitoring
    monitoring: {
      // تحذير عند استخدام 80% من الذاكرة
      warningThreshold: 0.8,
      // حرج عند استخدام 90% من الذاكرة
      criticalThreshold: 0.9,
      // فحص كل 30 ثانية
      checkInterval: 30000,
    },
  },

  // إعدادات API Performance
  api: {
    // Response Compression
    compression: {
      enabled: true,
      // أنواع الضغط المسموحة
      algorithms: ['br', 'gzip', 'deflate'],
      // الحد الأدنى للحجم (bytes)
      threshold: 1024,
      // مستوى الضغط (1-9)
      level: 6,
    },

    // Response Time
    responseTime: {
      // تفعيل قياس وقت الاستجابة
      enabled: true,
      // Header name
      header: 'X-Response-Time',
      // تحذير إذا تجاوز (ms)
      warningThreshold: 500,
      // حرج إذا تجاوز (ms)
      criticalThreshold: 2000,
    },

    // Pagination
    pagination: {
      // الحد الأقصى للصفحة
      maxLimit: 100,
      // الحد الافتراضي
      defaultLimit: 20,
      // تفعيل cursor pagination
      cursorPagination: true,
    },

    // Request Timeout
    timeout: {
      // مهلة الطلب العامة (ms)
      request: 30000,
      // مهلة الـ middleware
      middleware: 5000,
      // مهلة قاعدة البيانات
      database: 10000,
    },
  },

  // إعدادات Concurrent Processing
  concurrency: {
    // الحد الأقصى للعمليات المتزامنة
    maxConcurrent: 100,
    // حجم Queue
    queueSize: 1000,
    // Timeout للـ Queue
    queueTimeout: 60000,
    // Worker Threads
    workers: {
      enabled: true,
      // عدد العمال
      count: process.env.WORKER_COUNT || require('os').cpus().length,
      // الحد الأقصى للمهام لكل عامل
      maxTasksPerWorker: 50,
    },
  },

  // إعدادات Batch Processing
  batch: {
    // تفعيل المعالجة بالدفعات
    enabled: true,
    // حجم الدفعة الافتراضي
    defaultBatchSize: 100,
    // أقصى حجم للدفعة
    maxBatchSize: 1000,
    // تأخير بين الدفعات (ms)
    batchDelay: 100,
    // تفعيل Parallel Batches
    parallelBatches: true,
  },

  // إعدادات Caching Layer
  caching: {
    // Memory Cache
    memory: {
      enabled: true,
      // أقصى عدد من العناصر
      maxSize: 10000,
      // مدة الصلاحية الافتراضية (seconds)
      defaultTTL: 300,
      // تنظيف كل (seconds)
      cleanupInterval: 60,
    },

    // Query Caching
    queryCache: {
      enabled: true,
      // استعلامات قابلة للتخزين المؤقت
      cacheableQueries: ['find', 'findOne', 'countDocuments', 'aggregate'],
      // أنماط الاستعلامات للتجاهل
      skipPatterns: [/live/, /realtime/, /stream/],
    },
  },

  // إعدادات Logging Performance
  logging: {
    // مستوى السجلات
    level: process.env.LOG_LEVEL || 'info',
    // تفعيل structured logging
    structured: true,
    // تفعيل log rotation
    rotation: {
      enabled: true,
      // أقصى حجم للملف (bytes)
      maxSize: 10485760, // 10MB
      // أقصى عدد من الملفات
      maxFiles: 5,
    },
    // Sampling للطلبات الكثيرة
    sampling: {
      enabled: process.env.NODE_ENV === 'production',
      rate: 0.1, // 10% من الطلبات
    },
  },

  // إعدادات Monitoring
  monitoring: {
    // تفعيل المراقبة
    enabled: true,
    // Prometheus Metrics
    prometheus: {
      enabled: true,
      endpoint: '/metrics',
      // Metrics مخصصة
      customMetrics: true,
    },
    // Health Checks
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      // فحص قاعدة البيانات
      checkDatabase: true,
      // فحص Redis
      checkRedis: true,
      // فحص الذاكرة
      checkMemory: true,
    },
    // Performance Metrics
    metrics: {
      // جمع المقاييس
      collect: true,
      // فترة الجمع (seconds)
      interval: 60,
      // المقاييس المراد جمعها
      types: ['cpu', 'memory', 'eventLoop', 'gc', 'http', 'database', 'cache'],
    },
  },

  // إعدادات Cluster Mode
  cluster: {
    // تفعيل Cluster
    enabled: process.env.CLUSTER_ENABLED === 'true',
    // عدد العمال (0 = auto)
    workers: parseInt(process.env.CLUSTER_WORKERS) || 0,
    // إعادة تشغيل العامل عند الخطأ
    respawnOnError: true,
    // أقصى محاولات إعادة التشغيل
    maxRespawnAttempts: 5,
    // تأخير إعادة التشغيل (ms)
    respawnDelay: 1000,
  },
};

// فئة PerformanceMonitor
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0 },
      responseTimes: [],
      memoryUsage: [],
      cpuUsage: [],
    };
    this.startTime = Date.now();
    this.config = performanceConfig;
  }

  /**
   * بدء المراقبة
   */
  start() {
    // مراقبة الذاكرة
    if (this.config.monitoring.metrics.collect) {
      this._metricsInterval = setInterval(() => {
        this.collectMetrics();
      }, this.config.monitoring.metrics.interval * 1000);
      this._metricsInterval.unref();
    }
  }

  /**
   * إيقاف المراقبة
   */
  stop() {
    if (this._metricsInterval) {
      clearInterval(this._metricsInterval);
      this._metricsInterval = null;
    }
  }

  /**
   * جمع المقاييس
   */
  collectMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    });

    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system,
    });

    // الاحتفاظ بآخر 100 قراءة فقط
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }
    if (this.metrics.cpuUsage.length > 100) {
      this.metrics.cpuUsage.shift();
    }

    // تحقق من عتبة الذاكرة
    this.checkMemoryThreshold(memoryUsage);
  }

  /**
   * التحقق من عتبة الذاكرة
   */
  checkMemoryThreshold(memoryUsage) {
    const { memory } = this.config;
    const usedRatio = memoryUsage.heapUsed / memory.maxHeapSize;

    if (usedRatio >= memory.monitoring.criticalThreshold) {
      logger.error(`🔴 حرج: استخدام الذاكرة ${(usedRatio * 100).toFixed(1)}%`);
      // محاولة تنظيف الذاكرة
      if (global.gc) {
        global.gc();
        logger.info('🧹 تم تشغيل Garbage Collection');
      }
    } else if (usedRatio >= memory.monitoring.warningThreshold) {
      logger.warn(`🟡 تحذير: استخدام الذاكرة ${(usedRatio * 100).toFixed(1)}%`);
    }
  }

  /**
   * تسجيل طلب
   */
  recordRequest(success = true, responseTime = 0) {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }

    if (responseTime > 0) {
      this.metrics.responseTimes.push({
        timestamp: Date.now(),
        duration: responseTime,
      });

      // الاحتفاظ بآخر 1000 طلب
      if (this.metrics.responseTimes.length > 1000) {
        this.metrics.responseTimes.shift();
      }
    }
  }

  /**
   * الحصول على الإحصائيات
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.startTime;

    // حساب متوسط وقت الاستجابة
    const responseTimes = this.metrics.responseTimes.map(r => r.duration);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // حساب معدل الطلبات في الثانية
    const requestsPerSecond = this.metrics.requests.total / (uptime / 1000);

    // أحدث استخدام للذاكرة
    const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];

    return {
      uptime: {
        seconds: Math.floor(uptime / 1000),
        formatted: this.formatUptime(uptime),
      },
      requests: {
        total: this.metrics.requests.total,
        success: this.metrics.requests.success,
        errors: this.metrics.requests.errors,
        successRate:
          this.metrics.requests.total > 0
            ? ((this.metrics.requests.success / this.metrics.requests.total) * 100).toFixed(2)
            : 100,
        perSecond: requestsPerSecond.toFixed(2),
      },
      responseTime: {
        average: Math.round(avgResponseTime),
        min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99),
      },
      memory: latestMemory || process.memoryUsage(),
      timestamp: now,
    };
  }

  /**
   * حساب النسبة المئوية
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index]);
  }

  /**
   * تنسيق مدة التشغيل
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * إعادة تعيين المقاييس
   */
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0 },
      responseTimes: [],
      memoryUsage: [],
      cpuUsage: [],
    };
    this.startTime = Date.now();
  }
}

// فئة QueryOptimizer
class QueryOptimizer {
  constructor() {
    this.config = performanceConfig.database;
  }

  /**
   * تحسين استعلام
   */
  optimizeQuery(query, options = {}) {
    const optimized = { ...query };
    const optimizedOptions = { ...options };

    // تطبيق lean queries
    if (this.config.query.leanQueries && !options.populate) {
      optimizedOptions.lean = true;
    }

    // تحديد الحد الأقصى للنتائج
    if (!optimizedOptions.limit) {
      optimizedOptions.limit = this.config.query.defaultLimit;
    } else if (optimizedOptions.limit > this.config.query.maxLimit) {
      optimizedOptions.limit = this.config.query.maxLimit;
    }

    // تحديد الحقول المطلوبة فقط
    if (this.config.query.selectOnlyRequired && options.select) {
      optimizedOptions.select = options.select;
    }

    return { query: optimized, options: optimizedOptions };
  }

  /**
   * تحسين aggregate
   */
  optimizeAggregate(pipeline) {
    const optimizedPipeline = [];

    // نقل $match و $limit إلى البداية
    const matchStages = pipeline.filter(stage => stage.$match);
    const limitStages = pipeline.filter(stage => stage.$limit);
    const otherStages = pipeline.filter(stage => !stage.$match && !stage.$limit);

    // إضافة $match أولاً
    optimizedPipeline.push(...matchStages);

    // إضافة المراحل الأخرى
    optimizedPipeline.push(...otherStages);

    // إضافة $limit في النهاية
    if (limitStages.length > 0) {
      optimizedPipeline.push(limitStages[limitStages.length - 1]);
    } else {
      optimizedPipeline.push({ $limit: this.config.query.defaultLimit });
    }

    return optimizedPipeline;
  }

  /**
   * إنشاء فهرس مقترح
   */
  suggestIndex(collection, query) {
    const indexFields = {};

    // استخراج الحقول من الاستعلام
    for (const [field, value] of Object.entries(query)) {
      if (typeof value === 'object' && value !== null) {
        // عمليات مثل $gt, $lt, $in
        if (value.$eq !== undefined) {
          indexFields[field] = 1;
        } else if (value.$in !== undefined) {
          indexFields[field] = 1;
        }
      } else {
        indexFields[field] = 1;
      }
    }

    return {
      collection,
      fields: indexFields,
      suggestion:
        Object.keys(indexFields).length > 0
          ? `db.${collection}.createIndex(${JSON.stringify(indexFields)})`
          : null,
    };
  }
}

// فئة MemoryManager
class MemoryManager {
  constructor() {
    this.config = performanceConfig.memory;
    this.cache = new Map();
  }

  /**
   * إضافة للذاكرة المؤقتة
   */
  set(key, value, ttl = 300) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });

    // تنظيف إذا تجاوز الحد
    if (this.cache.size > this.config.monitoring.maxSize) {
      this.cleanup();
    }
  }

  /**
   * الحصول من الذاكرة المؤقتة
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * حذف من الذاكرة المؤقتة
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * تنظيف الذاكرة المؤقتة
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    logger.info(`🧹 تم تنظيف ${cleaned} عنصر من الذاكرة المؤقتة`);
    return cleaned;
  }

  /**
   * مسح كل الذاكرة المؤقتة
   */
  clear() {
    this.cache.clear();
    logger.info('🧹 تم مسح كل الذاكرة المؤقتة');
  }

  /**
   * الحصول على حجم الذاكرة المؤقتة
   */
  size() {
    return this.cache.size;
  }

  /**
   * الحصول على استخدام الذاكرة
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: this.formatBytes(usage.heapUsed),
      heapTotal: this.formatBytes(usage.heapTotal),
      external: this.formatBytes(usage.external),
      rss: this.formatBytes(usage.rss),
      percentage: ((usage.heapUsed / this.config.maxHeapSize) * 100).toFixed(1),
    };
  }

  /**
   * تنسيق البايتات
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = {
  performanceConfig,
  PerformanceMonitor,
  QueryOptimizer,
  MemoryManager,
};
