import ioredis, { Redis } from 'ioredis';
import { createLogger } from '../utils/logger';

const logger = createLogger('CacheService');

// Cache key prefixes
export enum CachePrefix {
  USER = 'user',
  PROJECT = 'project',
  DATASET = 'dataset',
  MODEL = 'model',
  PREDICTION = 'prediction',
  ANALYTICS = 'analytics',
  SESSION = 'session',
  RATE_LIMIT = 'rate_limit',
  QUERY = 'query'
}

// Cache TTL (Time To Live) in seconds
export enum CacheTTL {
  SHORT = 60,           // 1 minute
  MEDIUM = 300,         // 5 minutes
  LONG = 1800,          // 30 minutes
  HOUR = 3600,          // 1 hour
  DAY = 86400,          // 24 hours
  WEEK = 604800,        // 7 days
  PERMANENT = -1        // No expiration
}

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null = null;
  private localCache: Map<string, { value: any; expiry: number }> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  private constructor() {
    this.redis = new ioredis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_CACHE_DB || '0'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    this.redis.on('connect', () => {
      logger.info('Redis cache connected');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache error', { error: error.message });
    });

    // Start cleanup interval for local cache
    setInterval(() => this.cleanupLocalCache(), 60000); // Every minute
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // ==================== BASIC CACHE OPERATIONS ====================

  /**
   * Get value from cache (checks local cache first, then Redis)
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      // Check local cache first (L1)
      const localValue = this.getFromLocalCache<T>(key);
      if (localValue !== null) {
        this.cacheHits++;
        logger.debug('Cache hit (local)', { key });
        return localValue;
      }

      // Check Redis (L2)
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        this.cacheHits++;
        const parsed = JSON.parse(redisValue);
        
        // Store in local cache
        this.setInLocalCache(key, parsed, CacheTTL.SHORT);
        
        logger.debug('Cache hit (redis)', { key });
        return parsed;
      }

      this.cacheMisses++;
      logger.debug('Cache miss', { key });
      return null;
    } catch (error: any) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache (both local and Redis)
   */
  public async set(
    key: string,
    value: any,
    ttl: number = CacheTTL.MEDIUM
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);

      // Set in local cache
      this.setInLocalCache(key, value, Math.min(ttl, CacheTTL.SHORT));

      // Set in Redis
      if (ttl === CacheTTL.PERMANENT) {
        await this.redis.set(key, serialized);
      } else {
        await this.redis.setex(key, ttl, serialized);
      }

      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error: any) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  public async delete(key: string): Promise<boolean> {
    try {
      this.localCache.delete(key);
      await this.redis.del(key);
      logger.debug('Cache deleted', { key });
      return true;
    } catch (error: any) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      // Delete from local cache
      for (const key of keys) {
        this.localCache.delete(key);
      }

      // Delete from Redis
      const deleted = await this.redis.del(...keys);
      logger.info('Cache pattern deleted', { pattern, count: deleted });
      return deleted;
    } catch (error: any) {
      logger.error('Cache delete pattern error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      if (this.localCache.has(key)) return true;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error: any) {
      logger.error('Cache exists error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Extend TTL for existing key
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error: any) {
      logger.error('Cache expire error', { key, error: error.message });
      return false;
    }
  }

  // ==================== ADVANCED CACHE OPERATIONS ====================

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  public async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CacheTTL.MEDIUM
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch new data
      const data = await fetcher();
      
      // Cache the result
      await this.set(key, data, ttl);
      
      return data;
    } catch (error: any) {
      logger.error('Cache getOrSet error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Cache multiple values at once
   */
  public async setMultiple(items: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();

      for (const item of items) {
        const serialized = JSON.stringify(item.value);
        const ttl = item.ttl || CacheTTL.MEDIUM;
        
        if (ttl === CacheTTL.PERMANENT) {
          pipeline.set(item.key, serialized);
        } else {
          pipeline.setex(item.key, ttl, serialized);
        }
      }

      await pipeline.exec();
      logger.debug('Cache setMultiple', { count: items.length });
      return true;
    } catch (error: any) {
      logger.error('Cache setMultiple error', { error: error.message });
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  public async getMultiple<T = any>(keys: string[]): Promise<Map<string, T>> {
    try {
      const results = new Map<string, T>();
      const values = await this.redis.mget(...keys);

      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          results.set(keys[i], JSON.parse(values[i]!));
        }
      }

      logger.debug('Cache getMultiple', { requested: keys.length, found: results.size });
      return results;
    } catch (error: any) {
      logger.error('Cache getMultiple error', { error: error.message });
      return new Map();
    }
  }

  /**
   * Increment counter
   */
  public async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const result = await this.redis.incrby(key, amount);
      return result;
    } catch (error: any) {
      logger.error('Cache increment error', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  public async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      const result = await this.redis.decrby(key, amount);
      return result;
    } catch (error: any) {
      logger.error('Cache decrement error', { key, error: error.message });
      return 0;
    }
  }

  // ==================== ENTITY-SPECIFIC CACHE METHODS ====================

  /**
   * Build cache key with prefix
   */
  private buildKey(prefix: CachePrefix, id: string, suffix?: string): string {
    return suffix ? `${prefix}:${id}:${suffix}` : `${prefix}:${id}`;
  }

  public async cacheUser(userId: string, userData: any, ttl: number = CacheTTL.HOUR): Promise<void> {
    await this.set(this.buildKey(CachePrefix.USER, userId), userData, ttl);
  }

  public async getCachedUser(userId: string): Promise<any> {
    return this.get(this.buildKey(CachePrefix.USER, userId));
  }

  public async invalidateUser(userId: string): Promise<void> {
    await this.deletePattern(`${CachePrefix.USER}:${userId}*`);
  }

  public async cacheProject(projectId: string, projectData: any, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    await this.set(this.buildKey(CachePrefix.PROJECT, projectId), projectData, ttl);
  }

  public async getCachedProject(projectId: string): Promise<any> {
    return this.get(this.buildKey(CachePrefix.PROJECT, projectId));
  }

  public async invalidateProject(projectId: string): Promise<void> {
    await this.deletePattern(`${CachePrefix.PROJECT}:${projectId}*`);
  }

  public async cacheAnalytics(key: string, data: any, ttl: number = CacheTTL.LONG): Promise<void> {
    await this.set(this.buildKey(CachePrefix.ANALYTICS, key), data, ttl);
  }

  public async getCachedAnalytics(key: string): Promise<any> {
    return this.get(this.buildKey(CachePrefix.ANALYTICS, key));
  }

  // ==================== LOCAL CACHE (L1) OPERATIONS ====================

  private getFromLocalCache<T>(key: string): T | null {
    const item = this.localCache.get(key);
    if (!item) return null;

    if (item.expiry > 0 && Date.now() > item.expiry) {
      this.localCache.delete(key);
      return null;
    }

    return item.value;
  }

  private setInLocalCache(key: string, value: any, ttl: number): void {
    const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : -1;
    this.localCache.set(key, { value, expiry });
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.localCache.entries()) {
      if (item.expiry > 0 && now > item.expiry) {
        this.localCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Local cache cleaned', { cleaned });
    }
  }

  // ==================== MONITORING ====================

  public getStats() {
    const hitRate = this.cacheHits + this.cacheMisses > 0
      ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
      : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: hitRate.toFixed(2) + '%',
      localCacheSize: this.localCache.size
    };
  }

  public resetStats(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  public async flushAll(): Promise<void> {
    this.localCache.clear();
    await this.redis.flushdb();
    logger.warn('All cache flushed');
  }

  public async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Cache service closed');
  }
}

// Singleton instance
export const cacheService = CacheService.getInstance();

// Example usage:
/*
import { cacheService, CacheTTL } from './services/cache';

// Simple get/set
await cacheService.set('user:123', { name: 'John' }, CacheTTL.HOUR);
const user = await cacheService.get('user:123');

// Get or set pattern
const projects = await cacheService.getOrSet(
  'projects:user:123',
  () => fetchProjectsFromDB('123'),
  CacheTTL.MEDIUM
);

// Entity-specific methods
await cacheService.cacheUser('123', userData);
const cachedUser = await cacheService.getCachedUser('123');

// Invalidate cache
await cacheService.invalidateUser('123');

// Check stats
const stats = cacheService.getStats();
console.log('Cache hit rate:', stats.hitRate);
*/
