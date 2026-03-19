/* eslint-disable no-unused-vars */
/**
 * خدمة التخزين المؤقت المتقدم لقاعدة البيانات - Advanced Database Cache Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 * لتحسين الأداء وتقليل الاستعلامات
 */

const NodeCache = require('node-cache');
const EventEmitter = require('events');

class DatabaseCacheService extends EventEmitter {
  constructor() {
    super();

    // إنشاء طبقات التخزين المؤقت
    this.caches = {
      // طبقة 1: تخزين سريع (10 ثواني)
      hot: new NodeCache({ stdTTL: 10, checkperiod: 5, maxKeys: 1000 }),
      // طبقة 2: تخزين عادي (60 ثانية)
      warm: new NodeCache({ stdTTL: 60, checkperiod: 30, maxKeys: 5000 }),
      // طبقة 3: تخزين طويل (300 ثانية)
      cold: new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: 10000 }),
      // طبقة 4: تخزين ثابت (3600 ثانية)
      static: new NodeCache({ stdTTL: 3600, checkperiod: 300, maxKeys: 2000 }),
    };

    // إحصائيات
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      byLayer: {
        hot: { hits: 0, misses: 0 },
        warm: { hits: 0, misses: 0 },
        cold: { hits: 0, misses: 0 },
        static: { hits: 0, misses: 0 },
      },
    };

    // أنماط المفاتيح
    this.keyPatterns = {
      beneficiary: 'ben:',
      session: 'sess:',
      service: 'svc:',
      branch: 'brh:',
      employee: 'emp:',
      report: 'rpt:',
      settings: 'set:',
      user: 'usr:',
      analytics: 'ana:',
      notification: 'ntf:',
    };

    // إعداد المستمعين
    this.setupListeners();
  }

  // إعداد المستمعين
  setupListeners() {
    Object.entries(this.caches).forEach(([name, cache]) => {
      cache.on('expired', (key, value) => {
        this.emit('cache-expired', { layer: name, key });
      });

      cache.on('flush', () => {
        this.emit('cache-flushed', { layer: name });
      });
    });
  }

  // إنشاء مفتاح
  buildKey(type, id, suffix = '') {
    const prefix = this.keyPatterns[type] || 'gen:';
    return `${prefix}${id}${suffix ? ':' + suffix : ''}`;
  }

  // تحديد الطبقة المناسبة
  determineLayer(key, options = {}) {
    if (options.layer) return options.layer;

    // تحديد الطبقة بناءً على نوع البيانات
    if (key.startsWith('ben:') || key.startsWith('sess:')) return 'hot';
    if (key.startsWith('ana:') || key.startsWith('rpt:')) return 'cold';
    if (key.startsWith('set:')) return 'static';
    return 'warm';
  }

  // الحصول على قيمة
  get(key, options = {}) {
    const layer = this.determineLayer(key, options);
    const cache = this.caches[layer];

    let value = cache.get(key);

    // إذا لم يوجد في الطبقة المحددة، جرب الطبقات الأخرى
    if (value === undefined && options.checkOtherLayers !== false) {
      for (const [l, c] of Object.entries(this.caches)) {
        if (l !== layer) {
          value = c.get(key);
          if (value !== undefined) {
            // نقل إلى الطبقة المناسبة
            this.set(key, value, { layer });
            break;
          }
        }
      }
    }

    // تحديث الإحصائيات
    if (value !== undefined) {
      this.stats.hits++;
      this.stats.byLayer[layer].hits++;
      this.emit('cache-hit', { key, layer });
    } else {
      this.stats.misses++;
      this.stats.byLayer[layer].misses++;
      this.emit('cache-miss', { key, layer });
    }

    return value;
  }

  // تعيين قيمة
  set(key, value, options = {}) {
    const layer = this.determineLayer(key, options);
    const cache = this.caches[layer];
    const ttl = options.ttl || cache.options.stdTTL;

    const success = cache.set(key, value, ttl);

    if (success) {
      this.stats.sets++;
      this.emit('cache-set', { key, layer, ttl });
    }

    return success;
  }

  // الحصول أو تعيين (نمط الديكوراتور)
  async getOrSet(key, fetchFn, options = {}) {
    let value = this.get(key, { ...options, checkOtherLayers: false });

    if (value !== undefined) {
      return value;
    }

    // جلب البيانات
    try {
      value = await fetchFn();

      if (value !== undefined && value !== null) {
        this.set(key, value, options);
      }

      return value;
    } catch (error) {
      this.emit('cache-error', { key, error });
      throw error;
    }
  }

  // حذف قيمة
  del(key, options = {}) {
    const layer = this.determineLayer(key, options);
    let deleted = false;

    // حذف من جميع الطبقات
    for (const cache of Object.values(this.caches)) {
      if (cache.del(key)) {
        deleted = true;
      }
    }

    if (deleted) {
      this.stats.deletes++;
      this.emit('cache-delete', { key });
    }

    return deleted;
  }

  // حذف بنمط
  delByPattern(pattern) {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const cache of Object.values(this.caches)) {
      const keys = cache.keys();
      for (const key of keys) {
        if (regex.test(key)) {
          cache.del(key);
          count++;
        }
      }
    }

    this.stats.deletes += count;
    this.emit('cache-pattern-delete', { pattern, count });

    return count;
  }

  // حذف حسب النوع
  delByType(type) {
    const prefix = this.keyPatterns[type];
    if (!prefix) return 0;

    return this.delByPattern(`${prefix}*`);
  }

  // حذف بواسطة معرف
  delById(type, id) {
    const prefix = this.keyPatterns[type];
    if (!prefix) return 0;

    return this.delByPattern(`${prefix}${id}*`);
  }

  // تحديث ذكي
  async invalidate(keys, options = {}) {
    const results = { deleted: 0, errors: [] };

    for (const key of keys) {
      try {
        if (this.del(key)) {
          results.deleted++;
        }
      } catch (error) {
        results.errors.push({ key, error: 'حدث خطأ داخلي' });
      }
    }

    this.emit('cache-invalidate', results);
    return results;
  }

  // مسح طبقة
  flushLayer(layer) {
    const cache = this.caches[layer];
    if (!cache) return false;

    cache.flushAll();
    this.emit('cache-layer-flushed', { layer });
    return true;
  }

  // مسح الكل
  flushAll() {
    for (const cache of Object.values(this.caches)) {
      cache.flushAll();
    }
    this.emit('cache-all-flushed');
  }

  // الحصول على إحصائيات
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) : 0;

    const layerStats = {};
    for (const [name, cache] of Object.entries(this.caches)) {
      const layerTotal = this.stats.byLayer[name].hits + this.stats.byLayer[name].misses;
      layerStats[name] = {
        keys: cache.keys().length,
        hits: this.stats.byLayer[name].hits,
        misses: this.stats.byLayer[name].misses,
        hitRate:
          layerTotal > 0 ? ((this.stats.byLayer[name].hits / layerTotal) * 100).toFixed(2) : 0,
      };
    }

    return {
      total: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: `${hitRate}%`,
        sets: this.stats.sets,
        deletes: this.stats.deletes,
      },
      layers: layerStats,
    };
  }

  // إعادة تعيين الإحصائيات
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      byLayer: {
        hot: { hits: 0, misses: 0 },
        warm: { hits: 0, misses: 0 },
        cold: { hits: 0, misses: 0 },
        static: { hits: 0, misses: 0 },
      },
    };
  }

  // التحقق من الصحة
  healthCheck() {
    const stats = this.getStats();
    const issues = [];

    // فحص معدل الإصابة
    const hitRate = parseFloat(stats.total.hitRate);
    if (hitRate < 50) {
      issues.push({ type: 'low-hit-rate', value: hitRate, threshold: 50 });
    }

    // فحص عدد المفاتيح
    for (const [name, layer] of Object.entries(stats.layers)) {
      if (layer.keys > 8000 && name !== 'cold') {
        issues.push({ type: 'high-key-count', layer: name, value: layer.keys });
      }
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      hitRate: stats.total.hitRate,
      totalKeys: Object.values(stats.layers).reduce((sum, l) => sum + l.keys, 0),
      issues,
    };
  }

  // وسيلة مساعدة للمستفيدين
  async getBeneficiary(id, fetchFn) {
    return this.getOrSet(this.buildKey('beneficiary', id), fetchFn, { layer: 'hot' });
  }

  // وسيلة مساعدة للجلسات
  async getSession(id, fetchFn) {
    return this.getOrSet(this.buildKey('session', id), fetchFn, { layer: 'hot' });
  }

  // وسيلة مساعدة للخدمات
  async getService(id, fetchFn) {
    return this.getOrSet(this.buildKey('service', id), fetchFn, { layer: 'warm' });
  }

  // وسيلة مساعدة للفروع
  async getBranch(id, fetchFn) {
    return this.getOrSet(this.buildKey('branch', id), fetchFn, { layer: 'static' });
  }

  // وسيلة مساعدة للإعدادات
  async getSetting(key, fetchFn) {
    return this.getOrSet(this.buildKey('settings', key), fetchFn, { layer: 'static' });
  }

  // وسيلة مساعدة للتحليلات
  async getAnalytics(key, fetchFn) {
    return this.getOrSet(this.buildKey('analytics', key), fetchFn, { layer: 'cold' });
  }
}

module.exports = new DatabaseCacheService();
