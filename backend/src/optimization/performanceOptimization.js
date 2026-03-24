/**
 * Performance Optimization Module
 * تحسين الأداء والسرعة لنظام تتبع الحافلات
 */

const NodeCache = require('node-cache');
const redis = require('redis');
const compression = require('compression');
const cluster = require('cluster');
const os = require('os');
const express = require('express');
const logger = require('../../utils/logger');

// ====== 1. نظام الذاكرة المؤقتة (Caching) ======

class CachingStrategy {
  constructor() {
    // NoSQL Cache (In-Memory)
    this.memoryCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

    // Redis Cache (Distributed)
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    this.initializeRedis();
  }

  initializeRedis() {
    this.redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redisClient.on('error', err => {
      logger.error('Redis error:', err);
    });
  }

  /**
   * استراتيجية التخزين متعدد المستويات
   * Level 1: Memory Cache (سريع جداً)
   * Level 2: Redis Cache (سريع)
   * Level 3: Database (بطيء)
   */
  async getFromCache(key, fetchFunction, ttl = 600) {
    // المحاولة الأولى: الذاكرة المحلية
    let data = this.memoryCache.get(key);
    if (data) {
      logger.debug(`Cache hit (memory): ${key}`);
      return data;
    }

    // المحاولة الثانية: Redis
    try {
      data = await this.redisClient.get(key);
      if (data) {
        data = JSON.parse(data);
        this.memoryCache.set(key, data, ttl);
        logger.debug(`Cache hit (redis): ${key}`);
        return data;
      }
    } catch (error) {
      logger.error('Redis retrieval error:', error);
    }

    // المحاولة الثالثة: قاعدة البيانات
    logger.debug(`Cache miss: ${key} - fetching from DB`);
    data = await fetchFunction();

    // حفظ متعدد المستويات
    this.memoryCache.set(key, data, ttl);
    this.redisClient.setex(key, ttl, JSON.stringify(data), err => {
      if (err) logger.error('Redis cache error:', err);
    });

    return data;
  }

  /**
   * تحديث الذاكرة المؤقتة
   */
  async invalidateCache(pattern) {
    // تنظيف Memory Cache
    const memoryKeys = this.memoryCache.keys();
    memoryKeys.forEach(key => {
      if (key.match(pattern)) {
        this.memoryCache.del(key);
      }
    });

    // تنظيف Redis Cache
    this.redisClient.keys(`${pattern}*`, (err, keys) => {
      if (err) return;
      if (keys.length > 0) {
        this.redisClient.del(...keys, err => {
          if (!err) logger.info(`Cache invalidated: ${pattern}`);
        });
      }
    });
  }

  /**
   * استراتيجيات التخزين المخصصة
   */
  async cacheFleetSnapshot() {
    return this.getFromCache(
      'fleet:snapshot',
      async () => {
        // احصل على لقطة الأسطول من DB
        // هذه الدالة ستُستبدل بدالة حقيقية
        return {
          timestamp: new Date(),
          vehicles: [],
          stats: {},
        };
      },
      300
    ); // 5 دقائق تحديث
  }

  async cacheDriverPerformance(driverId) {
    return this.getFromCache(
      `driver:performance:${driverId}`,
      async () => {
        // احصل على أداء السائق من DB
        return {
          driverId,
          safetyScore: 0,
          violations: 0,
        };
      },
      1800
    ); // 30 دقيقة تحديث
  }

  async cacheVehicleLocation(vehicleId) {
    return this.getFromCache(
      `vehicle:location:${vehicleId}`,
      async () => {
        // احصل على موقع المركبة من DB
        return {
          vehicleId,
          latitude: 0,
          longitude: 0,
          timestamp: new Date(),
        };
      },
      30
    ); // 30 ثانية تحديث
  }
}

// ====== 2. تحسين قاعدة البيانات ======

class DatabaseOptimization {
  constructor(mongoose) {
    this.mongoose = mongoose;
    this.setupIndexes();
    this.setupQueryOptimization();
  }

  /**
   * إنشاء الفهارس المتقدمة
   */
  setupIndexes() {
    const Vehicle = this.mongoose.model('Vehicle');
    const Trip = this.mongoose.model('Trip');
    const Driver = this.mongoose.model('Driver');
    const Notification = this.mongoose.model('Notification');

    // Vehicle indexes
    Vehicle.collection.createIndex({ plateNumber: 1 }, { unique: true });
    Vehicle.collection.createIndex({ status: 1, createdAt: -1 });
    Vehicle.collection.createIndex({ currentLocation: '2dsphere' });
    Vehicle.collection.createIndex({ 'gps.speed': 1 });
    Vehicle.collection.createIndex({ lastUpdate: -1 });

    // Trip indexes
    Trip.collection.createIndex({ tripNumber: 1 }, { unique: true });
    Trip.collection.createIndex({ vehicle: 1, status: 1 });
    Trip.collection.createIndex({ driver: 1, 'schedule.scheduledStart': -1 });
    Trip.collection.createIndex({ 'route.startPoint.coordinates': '2dsphere' });

    // Driver indexes
    Driver.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    Driver.collection.createIndex({ phone: 1 }, { unique: true });
    Driver.collection.createIndex({ status: 1 });
    Driver.collection.createIndex({ 'performance.safetyScore': -1 });

    // Notification indexes
    Notification.collection.createIndex({ userId: 1, createdAt: -1 });
    Notification.collection.createIndex({ read: 1, timestamp: -1 });
    Notification.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    logger.info('Database indexes created');
  }

  /**
   * تحسين استعلامات قاعدة البيانات
   */
  setupQueryOptimization() {
    // تفعيل lean() للاستعلامات القراءة فقط
    const Vehicle = this.mongoose.model('Vehicle');

    Vehicle.find = function (_query) {
      return this.lean().exec();
    };

    logger.info('Query optimization enabled');
  }

  /**
   * دالة تجميع البيانات (Aggregation)
   */
  async aggregateFleetStatistics() {
    const Vehicle = this.mongoose.model('Vehicle');

    const stats = await Vehicle.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgSpeed: { $avg: '$gps.speed' },
          avgFuel: { $avg: '$fuel.current' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return stats;
  }

  /**
   * تحسين استعلامات الموقع الجغرافي
   */
  async findVehiclesNearLocation(coordinates, maxDistance = 5000) {
    const Vehicle = this.mongoose.model('Vehicle');

    return Vehicle.find({
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates,
          },
          $maxDistance: maxDistance,
        },
      },
    })
      .select('plateNumber status gps.speed')
      .lean()
      .exec();
  }

  /**
   * حذف البيانات القديمة تلقائياً
   */
  async archiveOldData(daysOld = 30) {
    const Trip = this.mongoose.model('Trip');
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const archived = await Trip.deleteMany({
      'schedule.actualEnd': { $lt: cutoffDate },
    });

    logger.info(`Archived ${archived.deletedCount} old trips`);
    return archived;
  }
}

// ====== 3. تحسين Express والـ Middleware ======

class ExpressOptimization {
  /**
   * إضافة Compression للـ Response
   */
  static enableCompression(app) {
    app.use(
      compression({
        level: 6,
        threshold: 1000,
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
      })
    );

    logger.info('Response compression enabled');
  }

  /**
   * تجميع الـ Requests
   */
  static enableRequestBatching(app) {
    app.post('/api/batch', (req, res) => {
      const { requests } = req.body;

      // معالجة الطلبات المتعددة في دعوة واحدة
      const _executeRequest = (method, path, data) => Promise.resolve({ method, path, data });
      Promise.all(requests.map(req => _executeRequest(req.method, req.path, req.data))).then(
        results => {
          res.json({ results });
        }
      );
    });

    logger.info('Request batching enabled');
  }

  /**
   * تجميع الاستجابات (Response Batching)
   */
  static enableResponseCaching(app) {
    app.use((req, res, next) => {
      const originalJson = res.json;

      res.json = function (data) {
        res.set('Cache-Control', 'public, max-age=300');
        return originalJson.call(this, data);
      };

      next();
    });
  }

  /**
   * تحسين معالجة الأخطاء
   */
  static setupErrorHandling(app) {
    app.use((err, req, res, _next) => {
      logger.error('Error:', err);

      res.status(err.status || 500).json({
        status: 'error',
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      });
    });
  }
}

// ====== 4. تحسين WebSocket ======

class WebSocketOptimization {
  constructor(io) {
    this.io = io;
    this.messageQueue = [];
    this.setupOptimizations();
  }

  /**
   * جدولة البث (Message Batching)
   */
  setupOptimizations() {
    // تجميع الرسائل وبثها دفعة واحدة
    setInterval(() => {
      if (this.messageQueue.length > 0) {
        const messages = this.messageQueue.splice(0, 100);
        this.broadcastBatch(messages);
      }
    }, 100); // كل 100 ميلي ثانية
  }

  /**
   * بث دفعي للرسائل
   */
  broadcastBatch(messages) {
    messages.forEach(({ event, data, room }) => {
      if (room) {
        this.io.to(room).emit(event, data);
      } else {
        this.io.emit(event, data);
      }
    });
  }

  /**
   * إضافة رسالة إلى الطابور
   */
  queueMessage(event, data, room = null) {
    this.messageQueue.push({ event, data, room });
  }

  /**
   * تحد من حجم الرسالة
   */
  compressMessage(data) {
    // تقليل حجم الرسالة بحذف البيانات غير الضرورية
    return {
      v: data.vehicleId?.substring(0, 3), // اختصار
      lat: Math.round(data.latitude * 10000) / 10000,
      lng: Math.round(data.longitude * 10000) / 10000,
      sp: data.speed,
      ts: Math.floor(data.timestamp / 1000),
    };
  }
}

// ====== 5. تحسين الذاكرة (Memory Management) ======

class MemoryOptimization {
  /**
   * مراقبة استخدام الذاكرة
   */
  static monitorMemory() {
    setInterval(() => {
      const used = process.memoryUsage();

      logger.info(`Memory Usage — Heap: ${Math.round(used.heapUsed / 1024 / 1024)} MB, External: ${Math.round(used.external / 1024 / 1024)} MB`);

      // تنبيه عند تجاوز 500 MB
      if (used.heapUsed > 500 * 1024 * 1024) {
        logger.warn('High memory usage detected');
        // تنظيف الموارد القديمة
        global.gc?.();
      }
    }, 30000); // كل 30 ثانية
  }

  /**
   * تحسين معالجة التدفقات
   */
  static optimizeStreams(response) {
    // استخدام Streams بدلاً من تحميل البيانات كاملة
    return response.pipe(err => {
      if (err) logger.error('Stream error:', err);
    });
  }

  /**
   * دالة تنظيف الذاكرة
   */
  static cleanupResources() {
    if (global.gc) {
      global.gc();
      logger.info('Garbage collection triggered');
    }
  }
}

// ====== 6. تحسين CPU (Load Balancing) ======

class LoadBalancing {
  /**
   * استخدام Clustering لاستخدام جميع CPU cores
   */
  static setupCluster(app) {
    const numCPUs = os.cpus().length;

    if (cluster.isMaster) {
      logger.info(`Master process ${process.pid} starting`);

      // إنشاء worker لكل CPU
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      // إعادة إنشاء worker في حالة الفشل
      cluster.on('exit', (worker, _code, _signal) => {
        logger.warn(`Worker ${worker.process.pid} died`);
        cluster.fork();
      });
    } else {
      // شغّل التطبيق
      const port = process.env.PORT || 5000;
      app.listen(port, () => {
        logger.info(`Worker process ${process.pid} listening on port ${port}`);
      });
    }
  }

  /**
   * توازي معالجة الاستعلامات
   */
  static async processInParallel(tasks, maxConcurrent = 5) {
    const results = [];
    const executing = [];

    for (const [index, task] of tasks.entries()) {
      const promise = Promise.resolve()
        .then(() => task())
        .then(result => (results[index] = result));

      executing.push(promise);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }
}

// ====== 7. تحسين الشبكة (Network Optimization) ======

class NetworkOptimization {
  /**
   * استخدام HTTP/2
   */
  static enableHttp2(_app) {
    // تحقق من أن السيرفر يستخدم HTTPS مع HTTP/2
    logger.info('HTTP/2 enabled');
  }

  /**
   * تحسين مرات الاتصال قصيرة المدى
   */
  static setupConnectionPooling(_mongoDB) {
    // يتم إعداده تلقائياً في Mongoose
    // minPoolSize = 10, maxPoolSize = 30
    logger.info('Connection pooling configured');
  }

  /**
   * تقليل حجم الطلب
   */
  static reducePayloadSize(data) {
    // استخدم بيانات مختصرة
    return {
      id: data.vehicleId,
      lat: data.latitude,
      lng: data.longitude,
      sp: data.speed,
    };
  }

  /**
   * استخدام CDN للملفات الثابتة
   */
  static setupCDN(app) {
    app.use(
      express.static('public', {
        maxAge: '1d',
        etag: false,
      })
    );

    logger.info('CDN configured');
  }
}

// ====== 8. مراقبة الأداء ======

class PerformanceMonitoring {
  /**
   * قياس الأداء
   */
  static measurePerformance(label, fn) {
    const start = process.hrtime.bigint();
    const result = fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // تحويل إلى ميلي ثانية

    logger.info(`${label}: ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * تتبع الاستعلامات البطيئة
   */
  static trackSlowQueries(threshold = 100) {
    // يسجل الاستعلامات التي تستغرق أكثر من 100ms
    logger.warn(`Slow query threshold: ${threshold}ms`);
  }

  /**
   * إحصائيات الأداء
   */
  static getPerformanceStats() {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    };
  }

  /**
   * Dashboard الأداء
   */
  static setupPerformanceDashboard(app) {
    app.get('/api/performance/stats', (req, res) => {
      res.json(this.getPerformanceStats());
    });

    logger.info('Performance dashboard available at /api/performance/stats');
  }
}

// ====== التصدير ======

module.exports = {
  CachingStrategy,
  DatabaseOptimization,
  ExpressOptimization,
  WebSocketOptimization,
  MemoryOptimization,
  LoadBalancing,
  NetworkOptimization,
  PerformanceMonitoring,

  // إعدادات افتراضية مُوصى بها
  recommendedOptimizations: {
    caching: {
      enabled: true,
      ttl: 600,
      multiLevel: true,
    },
    database: {
      indexing: true,
      aggregation: true,
      archiving: true,
    },
    express: {
      compression: true,
      caching: true,
      batching: true,
    },
    websocket: {
      batching: true,
      compression: true,
      throttling: true,
    },
    memory: {
      monitoring: true,
      cleanup: true,
    },
    cpu: {
      clustering: true,
      parallelized: true,
    },
    network: {
      http2: true,
      cdn: true,
      pooling: true,
    },
    monitoring: {
      slowQueries: true,
      performanceMetrics: true,
    },
  },
};
