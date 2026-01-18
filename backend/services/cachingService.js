/**
 * خدمة التخزين المؤقت الذكية
 * Intelligent Caching Service
 *
 * إدارة التخزين المؤقت للتقارير والبيانات
 * Manage caching for reports and data
 */

class CachingService {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100; // Max cache entries
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  /**
   * تخزين البيانات
   * Store data
   */
  set(key, value, ttl = this.ttl) {
    // تجنب overflow
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry = {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ttl,
      hitCount: 0,
    };

    this.cache.set(key, entry);
    this.stats.sets++;

    // جدولة الحذف التلقائي
    setTimeout(() => {
      this.delete(key);
    }, ttl);

    return true;
  }

  /**
   * استرجاع البيانات
   * Get data
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // التحقق من انتهاء صلاحية البيانات
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    entry.hitCount++;
    this.stats.hits++;

    return entry.value;
  }

  /**
   * حذف البيانات
   * Delete data
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * التحقق من وجود البيانات
   * Check if key exists
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // التحقق من انتهاء الصلاحية
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * إفراغ الكاش بالكامل
   * Clear cache
   */
  clear() {
    this.cache.clear();
    return true;
  }

  /**
   * حذف العنصر الأقل استخداماً (LRU)
   * Evict least recently used
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * تخزين مؤقت للتقارير
   * Cache reports
   */
  cacheReport(reportId, reportData, ttl = 10 * 60 * 1000) {
    const cacheKey = `report_${reportId}`;
    this.set(cacheKey, reportData, ttl);
    return cacheKey;
  }

  /**
   * استرجاع تقرير مخزن
   * Get cached report
   */
  getCachedReport(reportId) {
    const cacheKey = `report_${reportId}`;
    return this.get(cacheKey);
  }

  /**
   * تخزين مؤقت للبيانات المُصفاة
   * Cache filtered data
   */
  cacheFilteredData(filterId, data, ttl = 5 * 60 * 1000) {
    const cacheKey = `filter_${filterId}`;
    this.set(cacheKey, data, ttl);
    return cacheKey;
  }

  /**
   * استرجاع البيانات المُصفاة المخزنة
   * Get cached filtered data
   */
  getCachedFilteredData(filterId) {
    const cacheKey = `filter_${filterId}`;
    return this.get(cacheKey);
  }

  /**
   * تخزين مؤقت للتحليلات
   * Cache analytics
   */
  cacheAnalytics(analyticsId, data, ttl = 60 * 60 * 1000) {
    // 1 hour
    const cacheKey = `analytics_${analyticsId}`;
    this.set(cacheKey, data, ttl);
    return cacheKey;
  }

  /**
   * استرجاع التحليلات المخزنة
   * Get cached analytics
   */
  getCachedAnalytics(analyticsId) {
    const cacheKey = `analytics_${analyticsId}`;
    return this.get(cacheKey);
  }

  /**
   * إبطال البيانات حسب النمط
   * Invalidate by pattern
   */
  invalidateByPattern(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * الحصول على حجم الكاش
   * Get cache size
   */
  getSize() {
    return this.cache.size;
  }

  /**
   * الحصول على الإحصائيات
   * Get statistics
   */
  getStatistics() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests,
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      utilizationRate: ((this.cache.size / this.maxSize) * 100).toFixed(2) + '%',
    };
  }

  /**
   * الحصول على كل الإدخالات
   * Get all entries
   */
  getAll() {
    const entries = [];
    for (const [key, entry] of this.cache) {
      entries.push({
        key,
        value: entry.value,
        createdAt: entry.createdAt,
        lastAccessed: entry.lastAccessed,
        hitCount: entry.hitCount,
        age: Date.now() - entry.createdAt,
        ttl: entry.ttl,
      });
    }
    return entries;
  }

  /**
   * تصفية البيانات المنتهية الصلاحية
   * Prune expired entries
   */
  pruneExpired() {
    let prunedCount = 0;
    for (const [key, entry] of this.cache) {
      if (Date.now() - entry.createdAt > entry.ttl) {
        this.delete(key);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  /**
   * إعادة تعيين الإحصائيات
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }
}

// Instance واحد للتطبيق بالكامل
const cachingService = new CachingService({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
});

module.exports = cachingService;
