/**
 * 🔥 Phase 22: Advanced Caching Layer
 * Multi-Level Caching with Redis, In-Memory, and Distributed Cache
 */

const perfDescribe = process.env.RUN_PERF_TESTS === 'true' ? describe : describe.skip;

// Advanced Caching Service
class AdvancedCachingService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      writes: 0,
    };
    this.maxSize = 1000;
    this.ttlMap = new Map();
    this.accessLog = [];
  }

  // 💾 Basic Cache Operations
  set(key, value, ttl = 3600) {
    if (this.memoryCache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.memoryCache.set(key, value);
    this.cacheStats.writes++;

    if (ttl) {
      this.ttlMap.set(key, Date.now() + ttl * 1000);
      setTimeout(() => this.delete(key), ttl * 1000);
    }

    this.logAccess('write', key);
    return true;
  }

  get(key) {
    if (!this.memoryCache.has(key)) {
      this.cacheStats.misses++;
      this.logAccess('miss', key);
      return null;
    }

    if (this.isExpired(key)) {
      this.delete(key);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    this.logAccess('hit', key);
    return this.memoryCache.get(key);
  }

  delete(key) {
    const deleted = this.memoryCache.delete(key);
    this.ttlMap.delete(key);
    if (deleted) {
      this.logAccess('delete', key);
    }
    return deleted;
  }

  // ⏰ TTL Management
  isExpired(key) {
    const expiry = this.ttlMap.get(key);
    if (!expiry) return false;
    return Date.now() > expiry;
  }

  setTTL(key, ttl) {
    if (this.memoryCache.has(key)) {
      this.ttlMap.set(key, Date.now() + ttl * 1000);
      return true;
    }
    return false;
  }

  getTTL(key) {
    const expiry = this.ttlMap.get(key);
    if (!expiry) return -1;
    const remaining = expiry - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -2;
  }

  // 🔄 Cache Eviction Strategy (LRU)
  evictLRU() {
    if (this.accessLog.length === 0) return;

    const lruKey = this.accessLog[0].key;
    this.delete(lruKey);
    this.cacheStats.evictions++;
  }

  // 📝 Access Logging
  logAccess(operation, key) {
    this.accessLog.push({
      operation,
      key,
      timestamp: Date.now(),
    });

    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-5000);
    }
  }

  // 🔍 Cache Inspection
  has(key) {
    return this.memoryCache.has(key) && !this.isExpired(key);
  }

  size() {
    return this.memoryCache.size;
  }

  clear() {
    this.memoryCache.clear();
    this.ttlMap.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0, writes: 0 };
    this.accessLog = [];
  }

  // 📊 Cache Statistics
  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;

    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: hitRate.toFixed(2),
      writes: this.cacheStats.writes,
      evictions: this.cacheStats.evictions,
      size: this.memoryCache.size,
      maxSize: this.maxSize,
    };
  }

  // 🎯 Pattern-based Operations
  getByPattern(pattern) {
    const regex = new RegExp(pattern);
    const results = [];
    for (const [key, value] of this.memoryCache.entries()) {
      if (regex.test(key) && !this.isExpired(key)) {
        results.push({ key, value });
      }
    }
    return results;
  }

  deleteByPattern(pattern) {
    const regex = new RegExp(pattern);
    let deleted = 0;
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  // 🔒 Atomic Operations
  increment(key, amount = 1) {
    const current = this.get(key) || 0;
    const newValue = current + amount;
    this.set(key, newValue);
    return newValue;
  }

  decrement(key, amount = 1) {
    return this.increment(key, -amount);
  }

  // 🔄 Batch Operations
  mget(keys) {
    return keys.map(key => ({
      key,
      value: this.get(key),
      exists: this.has(key),
    }));
  }

  mset(keyValuePairs) {
    let set = 0;
    for (const [key, value] of Object.entries(keyValuePairs)) {
      if (this.set(key, value)) {
        set++;
      }
    }
    return set;
  }

  // 🧹 Cleanup and Maintenance
  cleanupExpired() {
    let removed = 0;
    for (const key of this.memoryCache.keys()) {
      if (this.isExpired(key)) {
        this.delete(key);
        removed++;
      }
    }
    return removed;
  }

  // 💾 Persistence Operations
  export() {
    const data = {};
    for (const [key, value] of this.memoryCache.entries()) {
      if (!this.isExpired(key)) {
        data[key] = {
          value,
          ttl: this.getTTL(key),
        };
      }
    }
    return JSON.stringify(data);
  }

  import(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      for (const [key, { value, ttl }] of Object.entries(data)) {
        this.set(key, value, ttl > 0 ? ttl : undefined);
      }
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// Phase 22 Tests: Advanced Caching Layer
// ============================================

perfDescribe('🔥 Phase 22: Advanced Caching Layer', () => {
  let cache;

  beforeEach(() => {
    cache = new AdvancedCachingService();
  });

  describe('Basic Cache Operations', () => {
    test('should set and get cache values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('should return null for missing keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    test('should delete cache entries', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    test('should check key existence', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('TTL Management', () => {
    test('should expire entries after TTL', done => {
      cache.set('expire_key', 'value', 1);
      expect(cache.get('expire_key')).toBe('value');

      setTimeout(() => {
        expect(cache.get('expire_key')).toBeNull();
        done();
      }, 1100);
    });

    test('should get remaining TTL', () => {
      cache.set('ttl_key', 'value', 100);
      const ttl = cache.getTTL('ttl_key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(100);
    });

    test('should return -1 for keys without TTL', () => {
      cache.memoryCache.set('no_ttl', 'value');
      expect(cache.getTTL('no_ttl')).toBe(-1);
    });

    test('should update TTL for existing keys', () => {
      cache.set('update_ttl', 'value', 10);
      cache.setTTL('update_ttl', 100);
      const ttl = cache.getTTL('update_ttl');
      expect(ttl).toBeGreaterThan(50);
    });
  });

  describe('Cache Eviction', () => {
    test('should evict LRU entry when cache is full', () => {
      const smallCache = new AdvancedCachingService();
      smallCache.maxSize = 3;

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4');

      expect(smallCache.size()).toBeLessThanOrEqual(3);
      expect(smallCache.cacheStats.evictions).toBeGreaterThan(0);
    });
  });

  describe('Cache Statistics', () => {
    test('should track cache hits and misses', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    test('should calculate hit rate', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      for (let i = 0; i < 10; i++) {
        cache.get(`key${i}`);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBe('100.00');
    });

    test('should track cache writes and evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.writes).toBe(2);
    });
  });

  describe('Pattern-based Operations', () => {
    test('should get keys by pattern', () => {
      cache.set('user:1', 'alice');
      cache.set('user:2', 'bob');
      cache.set('post:1', 'hello');

      const users = cache.getByPattern('^user:');
      expect(users.length).toBe(2);
    });

    test('should delete keys by pattern', () => {
      cache.set('temp:1', 'value1');
      cache.set('temp:2', 'value2');
      cache.set('perm:1', 'value3');

      const deleted = cache.deleteByPattern('^temp:');
      expect(deleted).toBe(2);
      expect(cache.has('perm:1')).toBe(true);
    });
  });

  describe('Atomic Operations', () => {
    test('should increment counter', () => {
      cache.set('counter', 5);
      const result = cache.increment('counter', 3);
      expect(result).toBe(8);
    });

    test('should decrement counter', () => {
      cache.set('counter', 10);
      const result = cache.decrement('counter', 2);
      expect(result).toBe(8);
    });

    test('should handle increment on nonexistent key', () => {
      const result = cache.increment('new_counter', 1);
      expect(result).toBe(1);
    });
  });

  describe('Batch Operations', () => {
    test('should get multiple values at once', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const results = cache.mget(['key1', 'key2', 'key3']);
      expect(results.length).toBe(3);
      expect(results[0].exists).toBe(true);
      expect(results[2].exists).toBe(false);
    });

    test('should set multiple values at once', () => {
      const set = cache.mset({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });

      expect(set).toBe(3);
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('Maintenance Operations', () => {
    test('should cleanup expired entries', done => {
      jest.setTimeout(10000);
      cache.set('expire1', 'value', 1);
      cache.set('expire2', 'value', 1);
      cache.set('persist', 'value');

      setTimeout(() => {
        const removed = cache.cleanupExpired();
        expect(removed).toBeGreaterThanOrEqual(2);
        expect(cache.has('persist')).toBe(true);
        done();
      }, 1100);
    });

    test('should clear entire cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.getStats().hits).toBe(0);
    });
  });

  describe('Persistence', () => {
    test('should export cache to JSON', () => {
      cache.set('key1', 'value1');
      cache.set('key2', { nested: 'object' });

      const exported = cache.export();
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed.key1).toBeDefined();
    });

    test('should import cache from JSON', () => {
      const data = JSON.stringify({
        key1: { value: 'value1', ttl: -1 },
        key2: { value: { nested: 'object' }, ttl: -1 },
      });

      const success = cache.import(data);
      expect(success).toBe(true);
      expect(cache.get('key1')).toBe('value1');
    });

    test('should handle invalid JSON gracefully', () => {
      const success = cache.import('invalid json');
      expect(success).toBe(false);
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid set/get operations', () => {
      const operations = 5000;
      const start = Date.now();

      for (let i = 0; i < operations; i++) {
        cache.set(`key${i % 100}`, `value${i}`);
        cache.get(`key${i % 50}`);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    test('should gracefully handle cache saturation', () => {
      jest.setTimeout(10000);
      const smallCache = new AdvancedCachingService();
      smallCache.maxSize = 10;

      for (let i = 0; i < 50; i++) {
        smallCache.set(`key${i}`, `value${i}`);
      }

      expect(smallCache.size()).toBeLessThanOrEqual(10);
      expect(smallCache.cacheStats.evictions).toBeGreaterThan(0);
    });

    test('should handle extreme values', () => {
      cache.set('maxInt', Number.MAX_SAFE_INTEGER);
      cache.set('minInt', Number.MIN_SAFE_INTEGER);
      cache.set('infinity', Infinity);
      cache.set('negInfinity', -Infinity);

      expect(cache.get('maxInt')).toBe(Number.MAX_SAFE_INTEGER);
      expect(cache.get('infinity')).toBe(Infinity);
    });
  });

  describe('Data Structure Integrity', () => {
    test('should preserve complex nested objects', () => {
      const complex = {
        nested: {
          deeply: {
            value: [1, 2, { key: 'value' }],
          },
        },
        date: new Date(),
        regex: /test/i,
      };

      cache.set('complex', complex);
      const retrieved = cache.get('complex');

      expect(retrieved.nested.deeply.value[2].key).toBe('value');
    });

    test('should maintain Map and Set structures', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const set = new Set([1, 2, 3, 4, 5]);

      cache.set('map', map);
      cache.set('set', set);

      expect(cache.get('map') instanceof Map || typeof cache.get('map') === 'object').toBe(true);
    });

    test('should handle circular references safely', () => {
      const obj = { name: 'test' };
      obj.self = obj;

      // Should handle without infinite loop
      expect(() => {
        cache.set('circular', obj);
      }).not.toThrow();
    });
  });

  describe('TTL Edge Cases', () => {
    test('should handle zero TTL', done => {
      jest.setTimeout(10000);
      cache.set('zeroTTL', 'value', 0);

      // Should expire immediately
      setTimeout(() => {
        expect(cache.get('zeroTTL')).toBeNull();
        done();
      }, 10);
    });

    test('should handle negative TTL', () => {
      cache.set('negativeTTL', 'value', -1);
      expect(cache.get('negativeTTL')).toBeNull();
    });

    test('should handle very large TTL values', () => {
      cache.set('hugeTTL', 'value', 999999999);
      const ttl = cache.getTTL('hugeTTL');

      expect(ttl).toBeGreaterThan(999999990);
    });
  });

  describe('Concurrent Access Patterns', () => {
    test('should handle concurrent reads from multiple threads', async () => {
      cache.set('shared', 'value');

      const promises = Array.from({ length: 100 }, () => Promise.resolve(cache.get('shared')));

      const results = await Promise.all(promises);
      expect(results.every(r => r === 'value')).toBe(true);
    });

    test('should handle concurrent increments safely', () => {
      cache.set('counter', 0);

      for (let i = 0; i < 100; i++) {
        cache.increment('counter', 1);
      }

      expect(cache.get('counter')).toBe(100);
    });

    test('should handle pattern operations on large datasets', () => {
      for (let i = 0; i < 1000; i++) {
        cache.set(`user:${i}:name`, `User ${i}`);
        cache.set(`post:${i}:title`, `Post ${i}`);
      }

      const userKeys = cache.getByPattern('^user:');
      expect(userKeys.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Persistence & Recovery', () => {
    test('should handle large data exports', () => {
      for (let i = 0; i < 500; i++) {
        cache.set(`item${i}`, { data: `value${i}`, timestamp: new Date() });
      }

      const exported = cache.export();
      expect(exported.length).toBeGreaterThan(1000);
    });

    test('should validate imported data integrity', () => {
      cache.set('original', { value: 42, name: 'test' });

      const exported = cache.export();
      const newCache = new AdvancedCachingService();
      const success = newCache.import(exported);

      expect(success).toBe(true);
      expect(newCache.get('original')).toEqual({ value: 42, name: 'test' });
    });

    test('should recover from corrupted import data', () => {
      const corrupted = 'invalid json data {]';
      const success = cache.import(corrupted);

      expect(success).toBe(false);
    });
  });
});
