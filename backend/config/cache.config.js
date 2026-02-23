/**
 * 🚀 Cache Configuration - تكوين التخزين المؤقت المحسن
 * نظام ERP الألوائل - إصدار احترافي
 */

const redis = require('redis');

// إعدادات Redis المتقدمة
const cacheConfig = {
  // إعدادات Redis الأساسية
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,

    // إعدادات الاتصال
    socket: {
      connectTimeout: 10000,
      keepAlive: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('❌ Redis: فشل إعادة الاتصال بعد 10 محاولات');
          return new Error('فشل الاتصال بـ Redis');
        }
        return Math.min(retries * 100, 3000);
      }
    },

    // إعدادات Cluster (للإنتاج)
    cluster: process.env.NODE_ENV === 'production' ? {
      nodes: [
        { host: process.env.REDIS_NODE_1 || 'redis-1', port: 6379 },
        { host: process.env.REDIS_NODE_2 || 'redis-2', port: 6379 },
        { host: process.env.REDIS_NODE_3 || 'redis-3', port: 6379 }
      ],
      options: {
        scaleReads: 'slave',
        maxRedirections: 16
      }
    } : null
  },

  // إعدادات التخزين المؤقت
  cache: {
    // الأوقات الافتراضية (بالثواني)
    ttl: {
      short: 60,           // دقيقة واحدة - للبيانات المتغيرة
      medium: 300,         // 5 دقائق - للبيانات شبه ثابتة
      long: 3600,          // ساعة واحدة - للبيانات الثابتة
      veryLong: 86400,     // يوم واحد - للبيانات النادرة التغيير
      session: 7200        // ساعتين - لجلسات المستخدم
    },

    // مفاتيح التخزين المؤقت
    keys: {
      user: 'user:',
      permissions: 'permissions:',
      settings: 'settings:',
      menu: 'menu:',
      reports: 'reports:',
      analytics: 'analytics:',
      dashboard: 'dashboard:',
      branch: 'branch:',
      employee: 'employee:'
    },

    // بادئات المفاتيح
    prefix: {
      app: 'alawael:',
      cache: 'cache:',
      session: 'session:',
      rateLimit: 'ratelimit:'
    }
  },

  // استراتيجيات التخزين المؤقت
  strategies: {
    // Cache-Aside Pattern
    cacheAside: {
      enabled: true,
      read: async (key, fetchFunction, ttl = 300) => {
        // سيتم تنفيذها في الخدمة
      },
      write: async (key, data, ttl = 300) => {
        // سيتم تنفيذها في الخدمة
      },
      invalidate: async (key) => {
        // سيتم تنفيذها في الخدمة
      }
    },

    // Write-Through Pattern
    writeThrough: {
      enabled: true,
      write: async (key, data, ttl = 300) => {
        // كتابة في Cache و Database معاً
      }
    },

    // Write-Behind Pattern
    writeBehind: {
      enabled: false, // للإنتاج فقط
      queueSize: 1000,
      flushInterval: 5000
    }
  },

  // إعدادات الضغط
  compression: {
    enabled: true,
    threshold: 1024, // ضغط البيانات أكبر من 1KB
    algorithm: 'gzip'
  },

  // إعدادات المراقبة
  monitoring: {
    enabled: true,
    logSlowQueries: true,
    slowQueryThreshold: 100, // ms
    statsInterval: 60000 // كل دقيقة
  }
};

// إنشاء عميل Redis
const createRedisClient = async () => {
  let client;

  if (cacheConfig.redis.cluster && process.env.NODE_ENV === 'production') {
    // Cluster Mode
    client = redis.createCluster(
      cacheConfig.redis.cluster.nodes,
      cacheConfig.redis.cluster.options
    );
  } else {
    // Standalone Mode
    client = redis.createClient({
      socket: cacheConfig.redis.socket,
      password: cacheConfig.redis.password,
      database: cacheConfig.redis.db
    });
  }

  client.on('connect', () => {
    console.log('✅ Redis: متصل بنجاح');
  });

  client.on('error', (err) => {
    console.error('❌ Redis Error:', err.message);
  });

  client.on('ready', () => {
    console.log('🚀 Redis: جاهز للاستخدام');
  });

  await client.connect();

  return client;
};

// فئة CacheService
class CacheService {
  constructor(client) {
    this.client = client;
    this.config = cacheConfig;
  }

  /**
   * الحصول على قيمة من التخزين المؤقت
   */
  async get(key) {
    try {
      const fullKey = this.config.cache.prefix.app + this.config.cache.prefix.cache + key;
      const data = await this.client.get(fullKey);

      if (!data) return null;

      // فك الضغط إذا كان ضرورياً
      return JSON.parse(data);
    } catch (error) {
      console.error('Cache Get Error:', error.message);
      return null;
    }
  }

  /**
   * تخزين قيمة في التخزين المؤقت
   */
  async set(key, value, ttl = this.config.cache.ttl.medium) {
    try {
      const fullKey = this.config.cache.prefix.app + this.config.cache.prefix.cache + key;
      const data = JSON.stringify(value);

      await this.client.setEx(fullKey, ttl, data);
      return true;
    } catch (error) {
      console.error('Cache Set Error:', error.message);
      return false;
    }
  }

  /**
   * حذف قيمة من التخزين المؤقت
   */
  async del(key) {
    try {
      const fullKey = this.config.cache.prefix.app + this.config.cache.prefix.cache + key;
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      console.error('Cache Del Error:', error.message);
      return false;
    }
  }

  /**
   * حذف جميع المفاتيح التي تبدأ بـ prefix
   */
  async delPattern(pattern) {
    try {
      const fullPattern = this.config.cache.prefix.app + this.config.cache.prefix.cache + pattern;
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      return keys.length;
    } catch (error) {
      console.error('Cache DelPattern Error:', error.message);
      return 0;
    }
  }

  /**
   * الحصول على قيمة أو جلبها من الدالة
   */
  async getOrSet(key, fetchFunction, ttl = this.config.cache.ttl.medium) {
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    await this.set(key, data, ttl);

    return data;
  }

  /**
   * تحديث قيمة في التخزين المؤقت
   */
  async refresh(key, fetchFunction, ttl = this.config.cache.ttl.medium) {
    const data = await fetchFunction();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * التحقق من وجود مفتاح
   */
  async exists(key) {
    try {
      const fullKey = this.config.cache.prefix.app + this.config.cache.prefix.cache + key;
      return await this.client.exists(fullKey);
    } catch (error) {
      return false;
    }
  }

  /**
   * الحصول على TTL المتبقي
   */
  async getTTL(key) {
    try {
      const fullKey = this.config.cache.prefix.app + this.config.cache.prefix.cache + key;
      return await this.client.ttl(fullKey);
    } catch (error) {
      return -1;
    }
  }

  /**
   * إحصائيات التخزين المؤقت
   */
  async getStats() {
    try {
      const info = await this.client.info('stats');
      const memory = await this.client.info('memory');

      return {
        connected: true,
        stats: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory)
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * تحليل معلومات Redis
   */
  parseRedisInfo(info) {
    const result = {};
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * إغلاق الاتصال
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      console.log('👋 Redis: تم إغلاق الاتصال');
    }
  }
}

module.exports = {
  cacheConfig,
  createRedisClient,
  CacheService
};
