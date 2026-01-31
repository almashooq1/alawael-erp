"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = exports.CacheTTL = exports.CachePrefix = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('CacheService');
// Cache key prefixes
var CachePrefix;
(function (CachePrefix) {
    CachePrefix["USER"] = "user";
    CachePrefix["PROJECT"] = "project";
    CachePrefix["DATASET"] = "dataset";
    CachePrefix["MODEL"] = "model";
    CachePrefix["PREDICTION"] = "prediction";
    CachePrefix["ANALYTICS"] = "analytics";
    CachePrefix["SESSION"] = "session";
    CachePrefix["RATE_LIMIT"] = "rate_limit";
    CachePrefix["QUERY"] = "query";
})(CachePrefix || (exports.CachePrefix = CachePrefix = {}));
// Cache TTL (Time To Live) in seconds
var CacheTTL;
(function (CacheTTL) {
    CacheTTL[CacheTTL["SHORT"] = 60] = "SHORT";
    CacheTTL[CacheTTL["MEDIUM"] = 300] = "MEDIUM";
    CacheTTL[CacheTTL["LONG"] = 1800] = "LONG";
    CacheTTL[CacheTTL["HOUR"] = 3600] = "HOUR";
    CacheTTL[CacheTTL["DAY"] = 86400] = "DAY";
    CacheTTL[CacheTTL["WEEK"] = 604800] = "WEEK";
    CacheTTL[CacheTTL["PERMANENT"] = -1] = "PERMANENT"; // No expiration
})(CacheTTL || (exports.CacheTTL = CacheTTL = {}));
class CacheService {
    constructor() {
        this.redis = null;
        this.localCache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.redis = new ioredis_1.default({
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
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    // ==================== BASIC CACHE OPERATIONS ====================
    /**
     * Get value from cache (checks local cache first, then Redis)
     */
    async get(key) {
        try {
            // Check local cache first (L1)
            const localValue = this.getFromLocalCache(key);
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
        }
        catch (error) {
            logger.error('Cache get error', { key, error: error.message });
            return null;
        }
    }
    /**
     * Set value in cache (both local and Redis)
     */
    async set(key, value, ttl = CacheTTL.MEDIUM) {
        try {
            const serialized = JSON.stringify(value);
            // Set in local cache
            this.setInLocalCache(key, value, Math.min(ttl, CacheTTL.SHORT));
            // Set in Redis
            if (ttl === CacheTTL.PERMANENT) {
                await this.redis.set(key, serialized);
            }
            else {
                await this.redis.setex(key, ttl, serialized);
            }
            logger.debug('Cache set', { key, ttl });
            return true;
        }
        catch (error) {
            logger.error('Cache set error', { key, error: error.message });
            return false;
        }
    }
    /**
     * Delete key from cache
     */
    async delete(key) {
        try {
            this.localCache.delete(key);
            await this.redis.del(key);
            logger.debug('Cache deleted', { key });
            return true;
        }
        catch (error) {
            logger.error('Cache delete error', { key, error: error.message });
            return false;
        }
    }
    /**
     * Delete keys by pattern
     */
    async deletePattern(pattern) {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0)
                return 0;
            // Delete from local cache
            for (const key of keys) {
                this.localCache.delete(key);
            }
            // Delete from Redis
            const deleted = await this.redis.del(...keys);
            logger.info('Cache pattern deleted', { pattern, count: deleted });
            return deleted;
        }
        catch (error) {
            logger.error('Cache delete pattern error', { pattern, error: error.message });
            return 0;
        }
    }
    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            if (this.localCache.has(key))
                return true;
            const exists = await this.redis.exists(key);
            return exists === 1;
        }
        catch (error) {
            logger.error('Cache exists error', { key, error: error.message });
            return false;
        }
    }
    /**
     * Extend TTL for existing key
     */
    async expire(key, ttl) {
        try {
            await this.redis.expire(key, ttl);
            return true;
        }
        catch (error) {
            logger.error('Cache expire error', { key, error: error.message });
            return false;
        }
    }
    // ==================== ADVANCED CACHE OPERATIONS ====================
    /**
     * Get or set pattern - fetch from cache or execute function and cache result
     */
    async getOrSet(key, fetcher, ttl = CacheTTL.MEDIUM) {
        try {
            // Try to get from cache
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }
            // Fetch new data
            const data = await fetcher();
            // Cache the result
            await this.set(key, data, ttl);
            return data;
        }
        catch (error) {
            logger.error('Cache getOrSet error', { key, error: error.message });
            throw error;
        }
    }
    /**
     * Cache multiple values at once
     */
    async setMultiple(items) {
        try {
            const pipeline = this.redis.pipeline();
            for (const item of items) {
                const serialized = JSON.stringify(item.value);
                const ttl = item.ttl || CacheTTL.MEDIUM;
                if (ttl === CacheTTL.PERMANENT) {
                    pipeline.set(item.key, serialized);
                }
                else {
                    pipeline.setex(item.key, ttl, serialized);
                }
            }
            await pipeline.exec();
            logger.debug('Cache setMultiple', { count: items.length });
            return true;
        }
        catch (error) {
            logger.error('Cache setMultiple error', { error: error.message });
            return false;
        }
    }
    /**
     * Get multiple values at once
     */
    async getMultiple(keys) {
        try {
            const results = new Map();
            const values = await this.redis.mget(...keys);
            for (let i = 0; i < keys.length; i++) {
                if (values[i]) {
                    results.set(keys[i], JSON.parse(values[i]));
                }
            }
            logger.debug('Cache getMultiple', { requested: keys.length, found: results.size });
            return results;
        }
        catch (error) {
            logger.error('Cache getMultiple error', { error: error.message });
            return new Map();
        }
    }
    /**
     * Increment counter
     */
    async increment(key, amount = 1) {
        try {
            const result = await this.redis.incrby(key, amount);
            return result;
        }
        catch (error) {
            logger.error('Cache increment error', { key, error: error.message });
            return 0;
        }
    }
    /**
     * Decrement counter
     */
    async decrement(key, amount = 1) {
        try {
            const result = await this.redis.decrby(key, amount);
            return result;
        }
        catch (error) {
            logger.error('Cache decrement error', { key, error: error.message });
            return 0;
        }
    }
    // ==================== ENTITY-SPECIFIC CACHE METHODS ====================
    /**
     * Build cache key with prefix
     */
    buildKey(prefix, id, suffix) {
        return suffix ? `${prefix}:${id}:${suffix}` : `${prefix}:${id}`;
    }
    async cacheUser(userId, userData, ttl = CacheTTL.HOUR) {
        await this.set(this.buildKey(CachePrefix.USER, userId), userData, ttl);
    }
    async getCachedUser(userId) {
        return this.get(this.buildKey(CachePrefix.USER, userId));
    }
    async invalidateUser(userId) {
        await this.deletePattern(`${CachePrefix.USER}:${userId}*`);
    }
    async cacheProject(projectId, projectData, ttl = CacheTTL.MEDIUM) {
        await this.set(this.buildKey(CachePrefix.PROJECT, projectId), projectData, ttl);
    }
    async getCachedProject(projectId) {
        return this.get(this.buildKey(CachePrefix.PROJECT, projectId));
    }
    async invalidateProject(projectId) {
        await this.deletePattern(`${CachePrefix.PROJECT}:${projectId}*`);
    }
    async cacheAnalytics(key, data, ttl = CacheTTL.LONG) {
        await this.set(this.buildKey(CachePrefix.ANALYTICS, key), data, ttl);
    }
    async getCachedAnalytics(key) {
        return this.get(this.buildKey(CachePrefix.ANALYTICS, key));
    }
    // ==================== LOCAL CACHE (L1) OPERATIONS ====================
    getFromLocalCache(key) {
        const item = this.localCache.get(key);
        if (!item)
            return null;
        if (item.expiry > 0 && Date.now() > item.expiry) {
            this.localCache.delete(key);
            return null;
        }
        return item.value;
    }
    setInLocalCache(key, value, ttl) {
        const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : -1;
        this.localCache.set(key, { value, expiry });
    }
    cleanupLocalCache() {
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
    getStats() {
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
    resetStats() {
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
    async flushAll() {
        this.localCache.clear();
        await this.redis.flushdb();
        logger.warn('All cache flushed');
    }
    async close() {
        await this.redis.quit();
        logger.info('Cache service closed');
    }
}
exports.CacheService = CacheService;
// Singleton instance
exports.cacheService = CacheService.getInstance();
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
