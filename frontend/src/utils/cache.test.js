/**
 * Tests for Cache Utility
 * فحوصات أداة التخزين المؤقت
 */

import { requestCache, cachedApiCall } from '../utils/cache';

describe('Cache Utility', () => {
  beforeEach(() => {
    requestCache.clear();
  });

  test('should store and retrieve data', () => {
    const config = { method: 'get', url: '/test', params: {} };
    requestCache.set(config, { data: 'test' }, 10000);

    expect(requestCache.get(config)).toEqual({ data: 'test' });
  });

  test('should return null for expired data', () => {
    const config = { method: 'get', url: '/test', params: {} };
    requestCache.set(config, { data: 'test' }, 1); // 1ms TTL

    // Wait for expiry
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(requestCache.get(config)).toBeNull();
        resolve();
      }, 10);
    });
  });

  test('should invalidate by pattern', () => {
    requestCache.set({ method: 'get', url: '/users', params: {} }, { data: 'users' });
    requestCache.set({ method: 'get', url: '/posts', params: {} }, { data: 'posts' });

    requestCache.invalidate('users');

    expect(requestCache.get({ method: 'get', url: '/users', params: {} })).toBeNull();
    expect(requestCache.get({ method: 'get', url: '/posts', params: {} })).toEqual({ data: 'posts' });
  });

  test('should return stats', () => {
    requestCache.set({ method: 'get', url: '/test', params: {} }, { data: 'test' });

    const stats = requestCache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.entries).toHaveLength(1);
  });

  test('cachedApiCall should cache GET requests', async () => {
    const apiFn = jest.fn().mockResolvedValue({ data: 'cached' });
    const config = { method: 'get', url: '/cached' };

    const result1 = await cachedApiCall(apiFn, config);
    const result2 = await cachedApiCall(apiFn, config);

    expect(result1).toEqual({ data: 'cached' });
    expect(result2).toEqual({ data: 'cached' });
    expect(apiFn).toHaveBeenCalledTimes(1); // Only called once!
  });

  test('cachedApiCall should skip cache for mutations', async () => {
    const apiFn = jest.fn().mockResolvedValue({ data: 'created' });
    const config = { method: 'post', url: '/create' };

    const result = await cachedApiCall(apiFn, config);

    expect(result).toEqual({ data: 'created' });
    expect(apiFn).toHaveBeenCalledTimes(1);
  });
});
