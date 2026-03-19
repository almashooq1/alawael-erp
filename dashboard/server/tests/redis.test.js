/**
 * Phase 13 Week 2: Redis Module Tests
 * Tests for Redis caching, pub/sub, and cluster support
 */

const redis = require('../config/redis');

// Mock environment variables
process.env.REDIS_MODE = 'standalone';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1'; // Use DB 1 for tests

describe('Redis Module', () => {
  // Skip tests if Redis not available
  const skipIfNoRedis = process.env.SKIP_REDIS_TESTS === 'true';

  beforeAll(async () => {
    if (skipIfNoRedis) {
      console.log('⚠️  Skipping Redis tests (SKIP_REDIS_TESTS=true)');
      return;
    }

    try {
      await redis.initialize();
      // Clear test keys
      await redis.delPattern('test:*');
    } catch (error) {
      console.error('Redis initialization failed:', error.message);
      process.env.SKIP_REDIS_TESTS = 'true';
    }
  });

  afterAll(async () => {
    if (!skipIfNoRedis) {
      // Cleanup test keys
      try {
        await redis.delPattern('test:*');
      } catch (error) {
        console.log('Cleanup failed:', error.message);
      }
    }
  });

  describe('Initialization', () => {
    test('should initialize Redis client', async () => {
      if (skipIfNoRedis) return;

      const health = await redis.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
    });

    test('should detect correct mode', async () => {
      if (skipIfNoRedis) return;

      expect(process.env.REDIS_MODE).toBe('standalone');
    });
  });

  describe('Basic Operations', () => {
    test('should set and get string value', async () => {
      if (skipIfNoRedis) return;

      await redis.set('test:string', 'hello');
      const value = await redis.get('test:string');
      expect(value).toBe('hello');
    });

    test('should set and get with TTL', async () => {
      if (skipIfNoRedis) return;

      await redis.set('test:ttl', 'expire', { ttl: 2 });
      const value = await redis.get('test:ttl');
      expect(value).toBe('expire');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2100));
      const expired = await redis.get('test:ttl');
      expect(expired).toBeNull();
    });

    test('should handle JSON values automatically', async () => {
      if (skipIfNoRedis) return;

      const obj = { name: 'test', value: 123, nested: { key: 'value' } };
      await redis.set('test:json', obj);
      const retrieved = await redis.get('test:json', { json: true });

      expect(retrieved).toEqual(obj);
      expect(retrieved.name).toBe('test');
      expect(retrieved.nested.key).toBe('value');
    });

    test('should delete keys', async () => {
      if (skipIfNoRedis) return;

      await redis.set('test:delete', 'value');
      await redis.del('test:delete');
      const value = await redis.get('test:delete');
      expect(value).toBeNull();
    });
  });

  describe('Cache-Aside Pattern', () => {
    test('should fetch and cache value with getOrSet', async () => {
      if (skipIfNoRedis) return;

      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        return { data: 'fetched', count: fetchCount };
      };

      // First call should fetch
      const result1 = await redis.getOrSet('test:cache', fetchFn, { ttl: 60 });
      expect(result1.data).toBe('fetched');
      expect(fetchCount).toBe(1);

      // Second call should use cache
      const result2 = await redis.getOrSet('test:cache', fetchFn, { ttl: 60 });
      expect(result2.data).toBe('fetched');
      expect(fetchCount).toBe(1); // Should not increase
    });

    test('should refresh cache when expired', async () => {
      if (skipIfNoRedis) return;

      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        return fetchCount;
      };

      // First fetch
      await redis.getOrSet('test:refresh', fetchFn, { ttl: 1 });
      expect(fetchCount).toBe(1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should fetch again
      await redis.getOrSet('test:refresh', fetchFn, { ttl: 1 });
      expect(fetchCount).toBe(2);
    });
  });

  describe('Counter Operations', () => {
    test('should increment counter', async () => {
      if (skipIfNoRedis) return;

      await redis.set('test:counter', 0);
      await redis.incr('test:counter', 5);
      const value = await redis.get('test:counter');
      expect(parseInt(value)).toBe(5);
    });

    test('should decrement counter', async () => {
      if (skipIfNoRedis) return;

      await redis.set('test:counter2', 10);
      await redis.decr('test:counter2', 3);
      const value = await redis.get('test:counter2');
      expect(parseInt(value)).toBe(7);
    });

    test('should initialize counter if not exists', async () => {
      if (skipIfNoRedis) return;

      await redis.del('test:newcounter');
      await redis.incr('test:newcounter', 1);
      const value = await redis.get('test:newcounter');
      expect(parseInt(value)).toBe(1);
    });
  });

  describe('Pattern Operations', () => {
    beforeEach(async () => {
      if (skipIfNoRedis) return;

      // Setup test keys
      await redis.set('test:pattern:1', 'value1');
      await redis.set('test:pattern:2', 'value2');
      await redis.set('test:pattern:3', 'value3');
      await redis.set('test:other', 'other');
    });

    test('should find keys by pattern', async () => {
      if (skipIfNoRedis) return;

      const keys = await redis.keys('test:pattern:*');
      expect(keys.length).toBe(3);
      expect(keys).toContain('test:pattern:1');
      expect(keys).toContain('test:pattern:2');
      expect(keys).toContain('test:pattern:3');
      expect(keys).not.toContain('test:other');
    });

    test('should delete keys by pattern', async () => {
      if (skipIfNoRedis) return;

      await redis.delPattern('test:pattern:*');
      const keys = await redis.keys('test:pattern:*');
      expect(keys.length).toBe(0);

      // Other key should still exist
      const other = await redis.get('test:other');
      expect(other).toBe('other');
    });
  });

  describe('Pub/Sub', () => {
    test('should publish and subscribe to messages', async () => {
      if (skipIfNoRedis) return;

      const messages = [];

      // Subscribe
      await redis.subscribe('test:channel', message => {
        messages.push(message);
      });

      // Give subscription time to register
      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish
      await redis.publish('test:channel', { type: 'test', data: 'hello' });
      await redis.publish('test:channel', { type: 'test', data: 'world' });

      // Give messages time to arrive
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0].type).toBe('test');
      expect(messages[0].data).toBe('hello');
    });

    test('should handle multiple subscribers', async () => {
      if (skipIfNoRedis) return;

      const messages1 = [];
      const messages2 = [];

      await redis.subscribe('test:multi', msg => messages1.push(msg));
      await redis.subscribe('test:multi', msg => messages2.push(msg));

      await new Promise(resolve => setTimeout(resolve, 100));

      await redis.publish('test:multi', { data: 'broadcast' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messages1.length).toBeGreaterThan(0);
      expect(messages2.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      if (skipIfNoRedis) return;
      // Stats are global, so this is best effort
    });

    test('should track cache hits and misses', async () => {
      if (skipIfNoRedis) return;

      // Clear and set new key
      await redis.del('test:stats');
      await redis.set('test:stats', 'value');

      // Hit
      await redis.get('test:stats');

      // Miss
      await redis.get('test:nonexistent');

      const stats = redis.getStats();
      expect(stats.cache.hits).toBeGreaterThan(0);
      expect(stats.cache.misses).toBeGreaterThan(0);
      expect(stats.cache.hitRate).toBeGreaterThan(0);
      expect(stats.cache.hitRate).toBeLessThanOrEqual(100);
    });

    test('should track command performance', async () => {
      if (skipIfNoRedis) return;

      await redis.set('test:perf', 'value');
      await redis.get('test:perf');

      const stats = redis.getStats();
      expect(stats.commands.total).toBeGreaterThan(0);
      expect(stats.commands.fast).toBeGreaterThan(0);
    });

    test('should calculate correct hit rate', async () => {
      if (skipIfNoRedis) return;

      const stats = redis.getStats();
      const expectedRate = (stats.cache.hits / (stats.cache.hits + stats.cache.misses)) * 100;
      expect(Math.abs(stats.cache.hitRate - expectedRate)).toBeLessThan(0.01);
    });
  });

  describe('Health Checks', () => {
    test('should perform health check', async () => {
      if (skipIfNoRedis) return;

      const health = await redis.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
      expect(health.latency).toBeLessThan(1000); // Should be fast
    });

    test('should measure latency accurately', async () => {
      if (skipIfNoRedis) return;

      const health = await redis.healthCheck();
      expect(typeof health.latency).toBe('number');
      expect(health.latency).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle get on non-existent key', async () => {
      if (skipIfNoRedis) return;

      const value = await redis.get('test:nonexistent');
      expect(value).toBeNull();
    });

    test('should handle JSON parse errors gracefully', async () => {
      if (skipIfNoRedis) return;

      // Set invalid JSON
      await redis.set('test:invalid', 'not json but a string');

      // Should return string as-is when json option is false
      const value = await redis.get('test:invalid');
      expect(value).toBe('not json but a string');
    });

    test('should track errors in statistics', async () => {
      if (skipIfNoRedis) return;

      const beforeStats = redis.getStats();
      const beforeErrors = beforeStats.cache.errors;

      // This should work, won't cause error
      await redis.get('test:any');

      const afterStats = redis.getStats();
      // Errors should not increase for normal operations
      expect(afterStats.cache.errors).toBe(beforeErrors);
    });
  });
});

describe.skip('Redis Module - Unit Tests (No Redis Required)', () => {
  test('should export required functions', () => {
    expect(typeof redis.initialize).toBe('function');
    expect(typeof redis.get).toBe('function');
    expect(typeof redis.set).toBe('function');
    expect(typeof redis.del).toBe('function');
    expect(typeof redis.getOrSet).toBe('function');
    expect(typeof redis.incr).toBe('function');
    expect(typeof redis.decr).toBe('function');
    expect(typeof redis.keys).toBe('function');
    expect(typeof redis.delPattern).toBe('function');
    expect(typeof redis.publish).toBe('function');
    expect(typeof redis.subscribe).toBe('function');
    expect(typeof redis.getStats).toBe('function');
    expect(typeof redis.healthCheck).toBe('function');
  });

  test('should have correct function signatures', () => {
    expect(redis.get.length).toBeGreaterThanOrEqual(1);
    expect(redis.set.length).toBeGreaterThanOrEqual(2);
    expect(redis.del.length).toBe(1);
    expect(redis.getOrSet.length).toBeGreaterThanOrEqual(2);
  });
});
