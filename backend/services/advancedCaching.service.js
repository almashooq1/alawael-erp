/**
 * Advanced Caching Service
 * خدمة التخزين المؤقت المتقدمة
 */

class AdvancedCachingService {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  set(key, value, ttl = 3600000) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
    return { cached: true, key };
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  invalidate(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return { invalidated: count };
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    return { ...this.stats, hitRate, size: this.cache.size };
  }

  clear() {
    this.cache.clear();
    return { cleared: true };
  }
}

module.exports = AdvancedCachingService;
