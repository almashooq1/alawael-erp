/**
 * Unit Tests — AdvancedCachingService
 * P#73 - Batch 34
 *
 * Class export (not singleton). Depends on logger + redis.config.
 * Tests: Redis path + memory fallback for set/get/invalidate/getStats/clear
 */

'use strict';

const mockSetex = jest.fn();
const mockGet = jest.fn();
const mockScan = jest.fn();
const mockDel = jest.fn();

const mockRedisClient = {
  status: 'ready',
  setex: (...a) => mockSetex(...a),
  get: (...a) => mockGet(...a),
  scan: (...a) => mockScan(...a),
  del: (...a) => mockDel(...a),
};

jest.mock('../../config/redis.config', () => ({
  getRedisClient: jest.fn(() => mockRedisClient),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const AdvancedCachingService = require('../../services/advancedCaching.service');

describe('AdvancedCachingService', () => {
  let svc;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient.status = 'ready';
    svc = new AdvancedCachingService();
  });

  /* ================================================================ */
  /*  constructor                                                       */
  /* ================================================================ */
  describe('constructor', () => {
    it('initialises empty _memCache', () => {
      expect(svc._memCache).toBeInstanceOf(Map);
      expect(svc._memCache.size).toBe(0);
    });

    it('initialises stats with 0 hits and misses', () => {
      expect(svc.stats).toEqual({ hits: 0, misses: 0 });
    });
  });

  /* ================================================================ */
  /*  _redis()                                                          */
  /* ================================================================ */
  describe('_redis', () => {
    it('returns client when status is ready', () => {
      expect(svc._redis()).toBe(mockRedisClient);
    });

    it('returns null when status is not ready', () => {
      mockRedisClient.status = 'connecting';
      expect(svc._redis()).toBeNull();
    });

    it('returns null when client is null', () => {
      const { getRedisClient } = require('../../config/redis.config');
      getRedisClient.mockReturnValueOnce(null);
      expect(svc._redis()).toBeNull();
    });
  });

  /* ================================================================ */
  /*  set                                                               */
  /* ================================================================ */
  describe('set', () => {
    it('stores in redis when available', async () => {
      mockSetex.mockResolvedValue('OK');
      const res = await svc.set('key1', { data: 1 }, 60000);
      expect(mockSetex).toHaveBeenCalledWith('cache:key1', 60, '{"data":1}');
      expect(res.store).toBe('redis');
      expect(res.cached).toBe(true);
    });

    it('defaults TTL to 1 hour (3600s)', async () => {
      mockSetex.mockResolvedValue('OK');
      await svc.set('key2', 'val');
      expect(mockSetex).toHaveBeenCalledWith('cache:key2', 3600, '"val"');
    });

    it('falls back to memory when redis fails', async () => {
      mockSetex.mockRejectedValue(new Error('Redis down'));
      const res = await svc.set('key3', 'val');
      expect(res.store).toBe('memory');
      expect(svc._memCache.has('key3')).toBe(true);
    });

    it('falls back to memory when redis not ready', async () => {
      mockRedisClient.status = 'closed';
      const res = await svc.set('key4', 42);
      expect(res.store).toBe('memory');
      expect(mockSetex).not.toHaveBeenCalled();
    });

    it('ensures minimum 1s TTL', async () => {
      mockSetex.mockResolvedValue('OK');
      await svc.set('key5', 'x', 100); // 100ms → rounds to 0, but max(1, ...) = 1
      expect(mockSetex).toHaveBeenCalledWith('cache:key5', 1, '"x"');
    });
  });

  /* ================================================================ */
  /*  get                                                               */
  /* ================================================================ */
  describe('get', () => {
    it('returns value from redis (hit)', async () => {
      mockGet.mockResolvedValue('{"data":1}');
      const val = await svc.get('key1');
      expect(val).toEqual({ data: 1 });
      expect(svc.stats.hits).toBe(1);
    });

    it('returns null from redis (miss)', async () => {
      mockGet.mockResolvedValue(null);
      const val = await svc.get('missing');
      expect(val).toBeNull();
      expect(svc.stats.misses).toBe(1);
    });

    it('falls back to memory when redis fails', async () => {
      mockGet.mockRejectedValue(new Error('Redis down'));
      svc._memCache.set('key2', { value: 'cached', expires: Date.now() + 60000 });
      const val = await svc.get('key2');
      expect(val).toBe('cached');
      expect(svc.stats.hits).toBe(1);
    });

    it('returns null for expired memory entry', async () => {
      svc._memCache.set('old', { value: 'stale', expires: Date.now() - 1000 });
      mockRedisClient.status = 'closed';
      const val = await svc.get('old');
      expect(val).toBeNull();
      expect(svc.stats.misses).toBe(1);
      expect(svc._memCache.has('old')).toBe(false);
    });

    it('returns null for missing memory entry', async () => {
      mockRedisClient.status = 'closed';
      const val = await svc.get('nokey');
      expect(val).toBeNull();
      expect(svc.stats.misses).toBe(1);
    });

    it('returns value from memory (hit)', async () => {
      mockRedisClient.status = 'closed';
      svc._memCache.set('mem1', { value: { x: 1 }, expires: Date.now() + 60000 });
      const val = await svc.get('mem1');
      expect(val).toEqual({ x: 1 });
      expect(svc.stats.hits).toBe(1);
    });
  });

  /* ================================================================ */
  /*  invalidate                                                        */
  /* ================================================================ */
  describe('invalidate', () => {
    it('deletes matching redis keys via scan', async () => {
      mockScan.mockResolvedValueOnce(['0', ['cache:user:1', 'cache:user:2']]);
      mockDel.mockResolvedValue(2);
      const res = await svc.invalidate('user');
      expect(mockDel).toHaveBeenCalledWith('cache:user:1', 'cache:user:2');
      expect(res.invalidated).toBe(2);
    });

    it('also clears matching memory entries', async () => {
      mockScan.mockResolvedValueOnce(['0', []]);
      svc._memCache.set('user:1', { value: 1, expires: Date.now() + 60000 });
      svc._memCache.set('other:1', { value: 2, expires: Date.now() + 60000 });
      const res = await svc.invalidate('user');
      expect(res.invalidated).toBe(1);
      expect(svc._memCache.has('user:1')).toBe(false);
      expect(svc._memCache.has('other:1')).toBe(true);
    });

    it('handles redis scan failure gracefully', async () => {
      mockScan.mockRejectedValue(new Error('fail'));
      svc._memCache.set('test:1', { value: 1, expires: Date.now() + 60000 });
      const res = await svc.invalidate('test');
      expect(res.invalidated).toBe(1); // only memory count
    });

    it('handles multi-page scan', async () => {
      mockScan
        .mockResolvedValueOnce(['42', ['cache:a:1']])
        .mockResolvedValueOnce(['0', ['cache:a:2']]);
      mockDel.mockResolvedValue(1);
      const res = await svc.invalidate('a');
      expect(mockDel).toHaveBeenCalledTimes(2);
      expect(res.invalidated).toBe(2);
    });
  });

  /* ================================================================ */
  /*  getStats                                                          */
  /* ================================================================ */
  describe('getStats', () => {
    it('returns all stat fields', async () => {
      mockScan.mockResolvedValueOnce(['0', ['k1', 'k2']]);
      svc.stats = { hits: 10, misses: 5 };
      svc._memCache.set('a', {});
      const res = await svc.getStats();
      expect(res.hits).toBe(10);
      expect(res.misses).toBe(5);
      expect(res.hitRate).toBeCloseTo(66.67, 1);
      expect(res.memorySize).toBe(1);
      expect(res.redisSize).toBe(2);
      expect(res.size).toBe(3);
      expect(res.store).toBe('redis');
    });

    it('hitRate is 0 when no requests', async () => {
      mockScan.mockResolvedValueOnce(['0', []]);
      const res = await svc.getStats();
      expect(res.hitRate).toBe(0);
    });

    it('store is memory when redis not ready', async () => {
      mockRedisClient.status = 'closed';
      const res = await svc.getStats();
      expect(res.store).toBe('memory');
      expect(res.redisSize).toBe(0);
    });
  });

  /* ================================================================ */
  /*  clear                                                             */
  /* ================================================================ */
  describe('clear', () => {
    it('clears both redis and memory', async () => {
      mockScan.mockResolvedValueOnce(['0', ['cache:x']]);
      mockDel.mockResolvedValue(1);
      svc._memCache.set('a', {});
      const res = await svc.clear();
      expect(res.cleared).toBe(true);
      expect(svc._memCache.size).toBe(0);
      expect(mockDel).toHaveBeenCalled();
    });

    it('clears memory even when redis fails', async () => {
      mockScan.mockRejectedValue(new Error('fail'));
      svc._memCache.set('x', {});
      const res = await svc.clear();
      expect(res.cleared).toBe(true);
      expect(svc._memCache.size).toBe(0);
    });

    it('clears memory when redis not available', async () => {
      mockRedisClient.status = 'closed';
      svc._memCache.set('z', {});
      const res = await svc.clear();
      expect(res.cleared).toBe(true);
      expect(svc._memCache.size).toBe(0);
    });
  });
});
