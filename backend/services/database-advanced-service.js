/* eslint-disable no-unused-vars */
/**
 * خدمة قاعدة البيانات المتقدمة - Advanced Database Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 * يتضمن: التخزين المؤقت، التجميع، البحث الذكي، التحليلات
 */

const mongoose = require('mongoose');
const Redis = require('ioredis');
const { EventEmitter } = require('events');
const { escapeRegex } = require('../utils/sanitize');

class AdvancedDatabaseService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      cacheDefaultTTL: config.cacheDefaultTTL || 3600,
      maxQueryTime: config.maxQueryTime || 30000,
      ...config,
    };

    this.redis = null;
    this.queryCache = new Map();
    this.connectionPool = new Map();
    this.metrics = {
      queries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      slowQueries: [],
    };
  }

  // تهيئة الخدمة
  async initialize() {
    try {
      // تهيئة Redis
      this.redis = new Redis({
        ...(typeof this.config.redisUrl === 'string'
          ? { host: this.config.redisUrl.replace(/^redis:\/\//, '').split(':')[0] || 'localhost' }
          : {}),
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: times => (times > 5 ? null : Math.min(times * 200, 3000)),
      });
      this.redis.on('connect', () => this.emit('redis:connected'));
      this.redis.on('error', err => this.emit('redis:error', err));

      // تهيئة فهارس MongoDB
      await this.ensureIndexes();

      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // ========================================
  // التخزين المؤقت الذكي
  // ========================================

  async getFromCache(key, options = {}) {
    const startTime = Date.now();

    try {
      // التحقق من الذاكرة المحلية أولاً
      if (this.queryCache.has(key)) {
        const cached = this.queryCache.get(key);
        if (Date.now() < cached.expiresAt) {
          this.metrics.cacheHits++;
          return { data: cached.data, source: 'local' };
        }
        this.queryCache.delete(key);
      }

      // التحقق من Redis
      if (this.redis) {
        const cached = await this.redis.get(`cache:${key}`);
        if (cached) {
          let data;
          try {
            data = JSON.parse(cached);
          } catch {
            // Corrupt cache entry — evict and treat as miss
            await this.redis.del(`cache:${key}`).catch(() => {});
            this.metrics.cacheMisses++;
            return null;
          }
          // تخزين في الذاكرة المحلية
          this.queryCache.set(key, {
            data,
            expiresAt: Date.now() + (options.ttl || this.config.cacheDefaultTTL * 1000),
          });
          this.metrics.cacheHits++;
          return { data, source: 'redis' };
        }
      }

      this.metrics.cacheMisses++;
      return null;
    } catch (error) {
      this.emit('cache:error', { key, error });
      return null;
    }
  }

  async setCache(key, data, options = {}) {
    const ttl = options.ttl || this.config.cacheDefaultTTL;

    try {
      // تخزين في الذاكرة المحلية
      this.queryCache.set(key, {
        data,
        expiresAt: Date.now() + ttl * 1000,
      });

      // تخزين في Redis
      if (this.redis) {
        await this.redis.setex(`cache:${key}`, ttl, JSON.stringify(data));
      }

      return true;
    } catch (error) {
      this.emit('cache:error', { key, error });
      return false;
    }
  }

  async invalidateCache(pattern) {
    try {
      // مسح من الذاكرة المحلية
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        for (const key of this.queryCache.keys()) {
          if (regex.test(key)) {
            this.queryCache.delete(key);
          }
        }
      } else {
        this.queryCache.delete(pattern);
      }

      // مسح من Redis
      if (this.redis) {
        const keys = await this.redis.keys(`cache:${pattern}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      return true;
    } catch (error) {
      this.emit('cache:error', { pattern, error });
      return false;
    }
  }

  // ========================================
  // الاستعلامات المتقدمة
  // ========================================

  async findWithCache(model, query, options = {}) {
    const cacheKey = `${model.modelName}:${JSON.stringify(query)}:${JSON.stringify(options)}`;

    // التحقق من التخزين المؤقت
    if (options.cache !== false) {
      const cached = await this.getFromCache(cacheKey, options);
      if (cached) {
        return cached.data;
      }
    }

    // تنفيذ الاستعلام
    const startTime = Date.now();
    this.metrics.queries++;

    let result;
    try {
      let queryBuilder = model.find(query.query || query);

      // تطبيق الخيارات
      if (options.select) queryBuilder = queryBuilder.select(options.select);
      if (options.populate) queryBuilder = queryBuilder.populate(options.populate);
      if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
      if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
      if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
      if (options.lean) queryBuilder = queryBuilder.lean();

      result = await queryBuilder.maxTimeMS(this.config.maxQueryTime).exec();

      // تسجيل الاستعلامات البطيئة
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.metrics.slowQueries.push({
          model: model.modelName,
          query,
          duration,
          timestamp: new Date(),
        });
        this.emit('slowQuery', { model: model.modelName, query, duration });
      }

      // تخزين النتيجة
      if (options.cache !== false) {
        await this.setCache(cacheKey, result, options);
      }

      return result;
    } catch (error) {
      this.emit('query:error', { model: model.modelName, query, error });
      throw error;
    }
  }

  // ========================================
  // التجميعات المتقدمة
  // ========================================

  async aggregateWithCache(model, pipeline, options = {}) {
    const cacheKey = `${model.modelName}:agg:${JSON.stringify(pipeline)}`;

    if (options.cache !== false) {
      const cached = await this.getFromCache(cacheKey, options);
      if (cached) {
        return cached.data;
      }
    }

    const startTime = Date.now();
    this.metrics.queries++;

    try {
      let aggBuilder = model.aggregate(pipeline);

      if (options.hint) aggBuilder = aggBuilder.hint(options.hint);
      if (options.explain) aggBuilder = aggBuilder.explain(options.explain);

      const result = await aggBuilder.exec();

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.metrics.slowQueries.push({
          model: model.modelName,
          pipeline,
          duration,
          timestamp: new Date(),
        });
      }

      if (options.cache !== false) {
        await this.setCache(cacheKey, result, { ttl: options.ttl || 300 });
      }

      return result;
    } catch (error) {
      this.emit('aggregation:error', { model: model.modelName, pipeline, error });
      throw error;
    }
  }

  // ========================================
  // البحث الذكي
  // ========================================

  async smartSearch(model, searchTerm, options = {}) {
    const { fields = [], fuzzy = true, minScore = 0.5, limit = 20, includeScores = true } = options;

    const cacheKey = `${model.modelName}:search:${searchTerm}:${JSON.stringify(options)}`;
    const cached = await this.getFromCache(cacheKey, { ttl: 300 });
    if (cached) return cached.data;

    try {
      const pipeline = [];

      // البحث النصي إذا كان مدعوماً
      if (mongoose.models[model.modelName]?.schema?.indexes?.().some(i => i[0]['$**'])) {
        pipeline.push({
          $match: {
            $text: { $search: searchTerm },
          },
        });

        if (includeScores) {
          pipeline.push({
            $addFields: { score: { $meta: 'textScore' } },
          });
          pipeline.push({
            $match: { score: { $gte: minScore } },
          });
          pipeline.push({ $sort: { score: -1 } });
        }
      } else {
        // البحث التقليدي
        const searchConditions = fields.map(field => ({
          [field]: { $regex: escapeRegex(searchTerm), $options: fuzzy ? 'i' : '' },
        }));

        pipeline.push({
          $match: { $or: searchConditions },
        });
      }

      pipeline.push({ $limit: limit });

      const results = await model.aggregate(pipeline);
      await this.setCache(cacheKey, results, { ttl: 300 });

      return results;
    } catch (error) {
      this.emit('search:error', { model: model.modelName, searchTerm, error });
      throw error;
    }
  }

  // ========================================
  // التحليلات والإحصائيات
  // ========================================

  async getCollectionStats(model) {
    const stats = await model.aggregate([
      {
        $collStats: {
          latencyStats: { histograms: true },
          storageStats: {},
          count: {},
        },
      },
    ]);

    return stats[0];
  }

  async getIndexUsageStats(model) {
    return await model.aggregate([{ $indexStats: {} }]);
  }

  getMetrics() {
    const hitRate =
      this.metrics.queries > 0
        ? (
            (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) *
            100
          ).toFixed(2)
        : 0;

    return {
      ...this.metrics,
      cacheHitRate: `${hitRate}%`,
      localCacheSize: this.queryCache.size,
      slowQueriesCount: this.metrics.slowQueries.length,
    };
  }

  // ========================================
  // إدارة الفهارس
  // ========================================

  async ensureIndexes() {
    const models = mongoose.models;

    for (const [name, model] of Object.entries(models)) {
      try {
        await model.ensureIndexes();
        this.emit('index:ensured', { model: name });
      } catch (error) {
        this.emit('index:error', { model: name, error });
      }
    }
  }

  async analyzeIndexes(model) {
    const indexes = await model.collection.indexes();
    const stats = await this.getIndexUsageStats(model);

    return {
      indexes,
      usage: stats,
      recommendations: this.generateIndexRecommendations(indexes, stats),
    };
  }

  generateIndexRecommendations(indexes, stats) {
    const recommendations = [];

    // فحص الفهارس غير المستخدمة
    for (const index of indexes) {
      const usage = stats.find(s => s.name === index.name);
      if (!usage || usage.accesses.ops === 0) {
        if (index.name !== '_id_') {
          recommendations.push({
            type: 'unused_index',
            index: index.name,
            suggestion: `النظر في إزالة الفهرس ${index.name} غير المستخدم`,
          });
        }
      }
    }

    return recommendations;
  }

  // ========================================
  // عمليات التجميد والتحسين
  // ========================================

  async optimizeCollection(model) {
    try {
      // تنفيذ compact
      if (model.db.readyState === 1) {
        await model.db.db.command({ compact: model.collection.name });
      }

      // تحليل الاستعلامات
      const stats = await this.getCollectionStats(model);

      this.emit('optimization:complete', { model: model.modelName, stats });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      this.emit('optimization:error', { model: model.modelName, error });
      throw error;
    }
  }

  // ========================================
  // التنظيف والإغلاق
  // ========================================

  async cleanup() {
    // مسح الذاكرة المحلية
    this.queryCache.clear();

    // إغلاق Redis
    if (this.redis) {
      await this.redis.quit();
    }

    this.emit('cleanup:complete');
  }
}

// تصدير نسخة مفردة
let instance = null;

module.exports = {
  AdvancedDatabaseService,
  getInstance: config => {
    if (!instance) {
      instance = new AdvancedDatabaseService(config);
    }
    return instance;
  },
};
