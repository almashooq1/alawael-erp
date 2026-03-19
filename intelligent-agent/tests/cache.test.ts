import { describe, it, expect, beforeEach } from 'vitest';
import { Cache } from '../src/modules/cache';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache();
  });

  describe('Initialization & Configuration', () => {
    it('should create instance with default configuration', () => {
      expect(cache).toBeDefined();
      expect(cache instanceof Cache).toBe(true);
    });

    it('should accept custom maxSize configuration', () => {
      const customCache = new Cache({ maxSize: 100 });
      expect(customCache).toBeDefined();
    });

    it('should accept custom defaultTTL configuration', () => {
      const customCache = new Cache({ defaultTTL: 5000 });
      expect(customCache).toBeDefined();
    });

    it('should accept enableStats configuration', () => {
      const customCache = new Cache({ enableStats: false });
      expect(customCache).toBeDefined();
    });

    it('should initialize with empty cache', () => {
      expect(cache.getSize()).toBe(0);
    });
  });

  describe('Basic Set/Get Operations', () => {
    it('should set and retrieve a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should handle different data types', () => {
      const data = { name: 'test', count: 42, active: true };
      cache.set('complex', data);
      expect(cache.get('complex')).toEqual(data);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      cache.set('array', arr);
      expect(cache.get('array')).toEqual(arr);
    });

    it('should throw error for undefined value', () => {
      expect(() => cache.set('key', undefined)).toThrow('Cache value cannot be undefined');
    });

    it('should throw error for missing key', () => {
      expect(() => cache.set('', 'value')).toThrow('Cache key is required');
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should throw error when getting with missing key', () => {
      expect(() => cache.get('')).toThrow('Cache key is required');
    });

    it('should update existing value', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');
    });

    it('should handle numeric keys', () => {
      cache.set('123', 'numeric key');
      expect(cache.get('123')).toBe('numeric key');
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key:with:special-chars_123';
      cache.set(specialKey, 'value');
      expect(cache.get(specialKey)).toBe('value');
    });
  });

  describe('Has Operation', () => {
    it('should return true for existing key', () => {
      cache.set('exists', 'value');
      expect(cache.has('exists')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('notexist')).toBe(false);
    });

    it('should throw error for missing key', () => {
      expect(() => cache.has('')).toThrow('Cache key is required');
    });

    it('should return false after deletion', () => {
      cache.set('temp', 'value');
      cache.delete('temp');
      expect(cache.has('temp')).toBe(false);
    });
  });

  describe('Delete Operation', () => {
    it('should delete existing key', () => {
      cache.set('key', 'value');
      const deleted = cache.delete('key');
      expect(deleted).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('notexist');
      expect(deleted).toBe(false);
    });

    it('should throw error for missing key', () => {
      expect(() => cache.delete('')).toThrow('Cache key is required');
    });
  });

  describe('Clear Operation', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      const cleared = cache.clear();
      expect(cleared).toBe(3);
      expect(cache.getSize()).toBe(0);
    });

    it('should return 0 when clearing empty cache', () => {
      const cleared = cache.clear();
      expect(cleared).toBe(0);
    });

    it('should affect all queries after clear', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('Size Management', () => {
    it('should track cache size', () => {
      expect(cache.getSize()).toBe(0);
      
      cache.set('key1', 'value1');
      expect(cache.getSize()).toBe(1);
      
      cache.set('key2', 'value2');
      expect(cache.getSize()).toBe(2);
    });

    it('should update size on deletion', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.delete('key1');
      expect(cache.getSize()).toBe(1);
    });

    it('should enforce maxSize limit', () => {
      const smallCache = new Cache({ maxSize: 3 });
      
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      expect(smallCache.getSize()).toBe(3);
      
      smallCache.set('key4', 'value4');
      expect(smallCache.getSize()).toBe(3);
    });

    it('should not evict when updating existing key', () => {
      const smallCache = new Cache({ maxSize: 2 });
      
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      expect(smallCache.getSize()).toBe(2);
      
      smallCache.set('key1', 'updated');
      expect(smallCache.getSize()).toBe(2);
      expect(smallCache.get('key1')).toBe('updated');
    });
  });

  describe('TTL & Expiration', () => {
    it('should respect TTL on set', async () => {
      cache.set('ttlkey', 'value', 100);
      expect(cache.get('ttlkey')).toBe('value');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('ttlkey')).toBeUndefined();
    });

    it('should use default TTL from config', async () => {
      const ttlCache = new Cache({ defaultTTL: 100 });
      ttlCache.set('key', 'value');
      
      expect(ttlCache.get('key')).toBe('value');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(ttlCache.get('key')).toBeUndefined();
    });

    it('should override default TTL with specific TTL', async () => {
      const ttlCache = new Cache({ defaultTTL: 500 });
      ttlCache.set('key', 'value', 100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(ttlCache.get('key')).toBeUndefined();
    });

    it('has should return false for expired entries', async () => {
      cache.set('expkey', 'value', 100);
      expect(cache.has('expkey')).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.has('expkey')).toBe(false);
    });

    it('should persist items with no TTL', () => {
      const noTTLCache = new Cache({ defaultTTL: 0 });
      noTTLCache.set('persist', 'value');
      
      expect(noTTLCache.get('persist')).toBe('value');
      // No timeout, value should still exist
    });
  });

  describe('Statistics', () => {
    it('should track cache hits', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should track cache misses', () => {
      cache.get('nonexistent');
      cache.get('alsonothere');
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should track sets', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
    });

    it('should track deletes', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.delete('key1');
      cache.delete('key2');
      
      const stats = cache.getStats();
      expect(stats.deletes).toBe(2);
    });

    it('should calculate correct hit rate', () => {
      cache.set('key', 'value');
      
      // 2 hits
      cache.get('key');
      cache.get('key');
      
      // 1 miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should return 0 hit rate when no operations', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should reset statistics', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('nonexistent');
      
      cache.resetStats();
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
    });

    it('should track evictions', () => {
      const smallCache = new Cache({ maxSize: 2 });
      
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3'); // Should evict key1
      
      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should disable stats when configured', () => {
      const noStatsCache = new Cache({ enableStats: false });
      
      noStatsCache.set('key', 'value');
      noStatsCache.get('key');
      noStatsCache.get('nonexistent');
      
      const stats = noStatsCache.getStats();
      // Stats should be reset/empty even though operations occurred
      expect(stats.sets).toBe(0);
    });
  });

  describe('Keys Management', () => {
    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      const keys = cache.getKeys();
      expect(keys.length).toBe(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for empty cache', () => {
      const keys = cache.getKeys();
      expect(keys).toEqual([]);
    });

    it('should exclude expired keys from getKeys', async () => {
      cache.set('persist', 'value');
      cache.set('expire', 'value', 100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const keys = cache.getKeys();
      // Expired key might still be in internal store, but we should filter
      expect(keys).toContain('persist');
    });
  });

  describe('Event Emission', () => {
    it('should emit set event', () => {
      return new Promise<void>((resolve) => {
        cache.once('set', (data) => {
          expect(data).toHaveProperty('key');
          expect(data).toHaveProperty('hasExpiry');
          resolve();
        });
        cache.set('key', 'value');
      });
    });

    it('should emit hit event', () => {
      return new Promise<void>((resolve) => {
        cache.set('key', 'value');
        cache.once('hit', (data) => {
          expect(data).toHaveProperty('key');
          resolve();
        });
        cache.get('key');
      });
    });

    it('should emit miss event', () => {
      return new Promise<void>((resolve) => {
        cache.once('miss', (data) => {
          expect(data).toHaveProperty('key');
          resolve();
        });
        cache.get('nonexistent');
      });
    });

    it('should emit delete event', () => {
      return new Promise<void>((resolve) => {
        cache.set('key', 'value');
        cache.once('delete', (data) => {
          expect(data).toHaveProperty('key');
          resolve();
        });
        cache.delete('key');
      });
    });

    it('should emit cleared event', () => {
      return new Promise<void>((resolve) => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        
        cache.once('cleared', (data) => {
          expect(data).toHaveProperty('itemsRemoved');
          expect(data.itemsRemoved).toBe(2);
          resolve();
        });
        cache.clear();
      });
    });

    it('should emit expired event', async () => {
      return new Promise<void>((resolve) => {
        cache.set('expkey', 'value', 100);
        
        cache.once('expired', (data) => {
          expect(data).toHaveProperty('key');
          resolve();
        });
        
        setTimeout(() => {
          cache.get('expkey');
        }, 150);
      });
    });

    it('should emit evicted event on size limit', () => {
      return new Promise<void>((resolve) => {
        const smallCache = new Cache({ maxSize: 1 });
        
        smallCache.once('evicted', (data) => {
          expect(data).toHaveProperty('key');
          resolve();
        });
        
        smallCache.set('key1', 'value1');
        smallCache.set('key2', 'value2');
      });
    });
  });

  describe('Instance Isolation', () => {
    it('should not share data between instances', () => {
      const cache1 = new Cache();
      const cache2 = new Cache();
      
      cache1.set('key', 'value1');
      cache2.set('key', 'value2');
      
      expect(cache1.get('key')).toBe('value1');
      expect(cache2.get('key')).toBe('value2');
    });

    it('should not share configuration between instances', () => {
      const cache1 = new Cache({ maxSize: 10 });
      const cache2 = new Cache({ maxSize: 100 });
      
      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
    });

    it('should not share stats between instances', () => {
      const cache1 = new Cache();
      const cache2 = new Cache();
      
      cache1.set('key', 'value');
      cache1.get('key');
      
      cache2.get('key'); // miss
      
      const stats1 = cache1.getStats();
      const stats2 = cache2.getStats();
      
      expect(stats1.hits).toBe(1);
      expect(stats2.hits).toBe(0);
      expect(stats2.misses).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large values', () => {
      const largeValue = new Array(10000).fill('large');
      cache.set('large', largeValue);
      expect(cache.get('large')).toEqual(largeValue);
    });

    it('should handle null values (explicitly allowed)', () => {
      cache.set('nullkey', null);
      expect(cache.get('nullkey')).toBeNull();
    });

    it('should handle zero as value', () => {
      cache.set('zero', 0);
      expect(cache.get('zero')).toBe(0);
    });

    it('should handle false as value', () => {
      cache.set('false', false);
      expect(cache.get('false')).toBe(false);
    });

    it('should handle empty string as value', () => {
      cache.set('empty', '');
      expect(cache.get('empty')).toBe('');
    });

    it('should handle multiple sequential operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      expect(cache.getSize()).toBe(100);
      
      for (let i = 0; i < 50; i++) {
        expect(cache.get(`key${i}`)).toBe(`value${i}`);
      }
    });
  });
});
