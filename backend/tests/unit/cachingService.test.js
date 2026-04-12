/**
 * Unit Tests — CachingService
 * P#67 - Batch 28
 *
 * Pure in-memory singleton (Map + timers, no DB).
 * Covers: set, get, delete, has, clear, evictLRU, shutdown,
 *         cacheReport/getCachedReport, cacheFilteredData/getCachedFilteredData,
 *         cacheAnalytics/getCachedAnalytics, invalidateByPattern,
 *         getSize, getStatistics, getAll, pruneExpired, resetStatistics
 */

'use strict';

describe('CachingService', () => {
  let service;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.isolateModules(() => {
      service = require('../../services/cachingService');
    });
  });

  afterEach(() => {
    if (service && service.shutdown) service.shutdown();
    jest.useRealTimers();
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts empty', () => {
      expect(service.getSize()).toBe(0);
    });

    it('has default ttl and maxSize', () => {
      expect(service.ttl).toBe(5 * 60 * 1000);
      expect(service.maxSize).toBe(100);
    });

    it('stats start at zero', () => {
      expect(service.stats.hits).toBe(0);
      expect(service.stats.misses).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  set / get                                                           */
  /* ------------------------------------------------------------------ */
  describe('set / get', () => {
    it('stores and retrieves a value', () => {
      service.set('k1', 'hello');
      expect(service.get('k1')).toBe('hello');
    });

    it('returns null for missing key', () => {
      expect(service.get('missing')).toBeNull();
    });

    it('increments stats.sets on each set', () => {
      service.set('a', 1);
      service.set('b', 2);
      expect(service.stats.sets).toBe(2);
    });

    it('increments stats.hits on successful get', () => {
      service.set('k', 'v');
      service.get('k');
      expect(service.stats.hits).toBe(1);
    });

    it('increments stats.misses on failed get', () => {
      service.get('ghost');
      expect(service.stats.misses).toBe(1);
    });

    it('updates hitCount on entry', () => {
      service.set('k', 'v');
      service.get('k');
      service.get('k');
      const entries = service.getAll();
      expect(entries[0].hitCount).toBe(2);
    });

    it('returns null after TTL expiry', () => {
      service.set('k', 'v', 1000);
      jest.advanceTimersByTime(2000);
      expect(service.get('k')).toBeNull();
    });

    it('counts as miss after TTL expiry', () => {
      service.set('k', 'v', 1000);
      jest.advanceTimersByTime(2000);
      service.get('k');
      expect(service.stats.misses).toBe(1);
    });

    it('overwrites existing key', () => {
      service.set('k', 'v1');
      service.set('k', 'v2');
      expect(service.get('k')).toBe('v2');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  delete                                                              */
  /* ------------------------------------------------------------------ */
  describe('delete', () => {
    it('removes an entry', () => {
      service.set('k', 'v');
      const res = service.delete('k');
      expect(res).toBe(true);
      expect(service.get('k')).toBeNull();
    });

    it('increments stats.deletes', () => {
      service.set('k', 'v');
      service.delete('k');
      expect(service.stats.deletes).toBe(1);
    });

    it('returns false for non-existent key', () => {
      const res = service.delete('ghost');
      expect(res).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  has                                                                 */
  /* ------------------------------------------------------------------ */
  describe('has', () => {
    it('returns true for existing key', () => {
      service.set('k', 'v');
      expect(service.has('k')).toBe(true);
    });

    it('returns false for missing key', () => {
      expect(service.has('ghost')).toBe(false);
    });

    it('returns false for expired key', () => {
      service.set('k', 'v', 5000);
      // Manually age entry past TTL
      service.cache.get('k').createdAt = Date.now() - 10000;
      expect(service.has('k')).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  clear / shutdown                                                    */
  /* ------------------------------------------------------------------ */
  describe('clear / shutdown', () => {
    it('removes all entries', () => {
      service.set('a', 1);
      service.set('b', 2);
      service.clear();
      expect(service.getSize()).toBe(0);
    });

    it('shutdown clears cache', () => {
      service.set('a', 1);
      service.shutdown();
      expect(service.getSize()).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  evictLRU                                                            */
  /* ------------------------------------------------------------------ */
  describe('evictLRU', () => {
    it('evicts least recently used entry', () => {
      service.set('old', 'v1');
      // Make 'old' have an older lastAccessed
      const oldEntry = service.cache.get('old');
      oldEntry.lastAccessed = Date.now() - 60000;

      service.set('new', 'v2');
      service.evictLRU();
      expect(service.cache.has('old')).toBe(false);
      expect(service.cache.has('new')).toBe(true);
    });

    it('increments stats.evictions', () => {
      service.set('a', 1);
      // Make entry older so LRU can pick it (Date.now frozen in fake timers)
      service.cache.get('a').lastAccessed = Date.now() - 1000;
      service.evictLRU();
      expect(service.stats.evictions).toBe(1);
    });

    it('auto-evicts when maxSize reached', () => {
      // Fill to max — use long TTL so timers don't interfere
      for (let i = 0; i < 100; i++) {
        service.set(`k${i}`, i, 999999999);
        // Give each entry a different lastAccessed so LRU can pick the oldest
        service.cache.get(`k${i}`).lastAccessed = Date.now() - (100 - i);
      }
      expect(service.getSize()).toBe(100);
      // Adding one more should trigger eviction of k0 (oldest lastAccessed)
      service.set('overflow', 'x', 999999999);
      expect(service.getSize()).toBe(100); // evicted one, added one
      expect(service.stats.evictions).toBe(1);
      expect(service.cache.has('k0')).toBe(false); // oldest was evicted
    });
  });

  /* ------------------------------------------------------------------ */
  /*  cacheReport / getCachedReport                                       */
  /* ------------------------------------------------------------------ */
  describe('cacheReport / getCachedReport', () => {
    it('caches and retrieves a report', () => {
      const data = { title: 'Q1 Report', rows: [1, 2, 3] };
      service.cacheReport('r1', data);
      expect(service.getCachedReport('r1')).toEqual(data);
    });

    it('returns null for missing report', () => {
      expect(service.getCachedReport('ghost')).toBeNull();
    });

    it('uses report_ prefix key', () => {
      const key = service.cacheReport('r1', { x: 1 });
      expect(key).toBe('report_r1');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  cacheFilteredData / getCachedFilteredData                           */
  /* ------------------------------------------------------------------ */
  describe('cacheFilteredData / getCachedFilteredData', () => {
    it('caches and retrieves filtered data', () => {
      service.cacheFilteredData('f1', [1, 2, 3]);
      expect(service.getCachedFilteredData('f1')).toEqual([1, 2, 3]);
    });

    it('returns null for missing filter', () => {
      expect(service.getCachedFilteredData('ghost')).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  cacheAnalytics / getCachedAnalytics                                 */
  /* ------------------------------------------------------------------ */
  describe('cacheAnalytics / getCachedAnalytics', () => {
    it('caches and retrieves analytics', () => {
      service.cacheAnalytics('a1', { visits: 500 });
      expect(service.getCachedAnalytics('a1')).toEqual({ visits: 500 });
    });

    it('returns null for missing analytics', () => {
      expect(service.getCachedAnalytics('ghost')).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  invalidateByPattern                                                 */
  /* ------------------------------------------------------------------ */
  describe('invalidateByPattern', () => {
    it('removes entries matching pattern', () => {
      service.set('report_r1', 'a');
      service.set('report_r2', 'b');
      service.set('filter_f1', 'c');
      const count = service.invalidateByPattern('report_');
      expect(count).toBe(2);
      expect(service.get('filter_f1')).toBe('c');
    });

    it('returns 0 when no match', () => {
      service.set('a', 1);
      expect(service.invalidateByPattern('zzz')).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getStatistics                                                       */
  /* ------------------------------------------------------------------ */
  describe('getStatistics', () => {
    it('returns comprehensive stats', () => {
      service.set('a', 1);
      service.get('a');
      service.get('missing');
      const stats = service.getStatistics();
      expect(stats.sets).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(2);
      expect(stats.hitRate).toBe('50.00%');
      expect(stats.cacheSize).toBe(1);
      expect(stats.maxSize).toBe(100);
    });

    it('reports 0% hit rate when empty', () => {
      const stats = service.getStatistics();
      expect(stats.hitRate).toBe('0.00%');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getAll                                                              */
  /* ------------------------------------------------------------------ */
  describe('getAll', () => {
    it('returns all cache entries', () => {
      service.set('a', 1);
      service.set('b', 2);
      const entries = service.getAll();
      expect(entries.length).toBe(2);
      expect(entries[0]).toHaveProperty('key');
      expect(entries[0]).toHaveProperty('value');
      expect(entries[0]).toHaveProperty('hitCount');
      expect(entries[0]).toHaveProperty('age');
    });

    it('returns empty array when cache is empty', () => {
      expect(service.getAll()).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  pruneExpired                                                        */
  /* ------------------------------------------------------------------ */
  describe('pruneExpired', () => {
    it('removes expired entries', () => {
      service.set('short', 'v', 5000);
      service.set('long', 'v', 60000);
      // Manually age the 'short' entry so it's expired for pruneExpired,
      // but DON'T advance timers (which would trigger the setTimeout delete)
      service.cache.get('short').createdAt = Date.now() - 10000;
      const pruned = service.pruneExpired();
      expect(pruned).toBe(1);
      expect(service.cache.has('short')).toBe(false);
      expect(service.has('long')).toBe(true);
    });

    it('returns 0 when nothing expired', () => {
      service.set('k', 'v', 60000);
      expect(service.pruneExpired()).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  resetStatistics                                                     */
  /* ------------------------------------------------------------------ */
  describe('resetStatistics', () => {
    it('resets all stats to zero', () => {
      service.set('a', 1);
      service.get('a');
      service.get('miss');
      service.resetStatistics();
      expect(service.stats.hits).toBe(0);
      expect(service.stats.misses).toBe(0);
      expect(service.stats.sets).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getSize                                                             */
  /* ------------------------------------------------------------------ */
  describe('getSize', () => {
    it('returns current cache size', () => {
      service.set('a', 1);
      service.set('b', 2);
      expect(service.getSize()).toBe(2);
      service.delete('a');
      expect(service.getSize()).toBe(1);
    });
  });
});
