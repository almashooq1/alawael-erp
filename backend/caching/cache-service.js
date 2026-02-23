/**
 * Cache Service - خدمة التخزين المؤقت
 * Enterprise Caching for Alawael ERP
 */

const EventEmitter = require('events');

/**
 * Cache Configuration
 */
const cacheConfig = {
  // Default TTL in seconds
  defaultTTL: 3600, // 1 hour
  
  // Maximum keys
  maxKeys: 10000,
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'alawael:',
  },
  
  // Cache strategies
  strategies: {
    'user:session': { ttl: 86400, maxKeys: 50000 }, // 24 hours
    'user:profile': { ttl: 3600, maxKeys: 10000 }, // 1 hour
    'employee:data': { ttl: 1800, maxKeys: 5000 }, // 30 minutes
    'finance:rates': { ttl: 300, maxKeys: 100 }, // 5 minutes
    'inventory:stock': { ttl: 60, maxKeys: 10000 }, // 1 minute
    'reports:daily': { ttl: 86400, maxKeys: 100 }, // 24 hours
    'settings:global': { ttl: 7200, maxKeys: 100 }, // 2 hours
  },
};

/**
 * In-Memory Cache Provider
 */
class MemoryCacheProvider extends EventEmitter {
  constructor(config = {}) {
    super();
    this.cache = new Map();
    this.timers = new Map();
    this.maxKeys = config.maxKeys || 10000;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }
  
  async get(key) {
    const item = this.cache.get(key);
    
    if (item && (!item.expires || item.expires > Date.now())) {
      this.stats.hits++;
      return item.value;
    }
    
    this.stats.misses++;
    
    if (item) {
      this.cache.delete(key);
    }
    
    return null;
  }
  
  async set(key, value, ttl = cacheConfig.defaultTTL) {
    // Enforce max keys
    if (this.cache.size >= this.maxKeys && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const expires = ttl ? Date.now() + ttl * 1000 : null;
    
    this.cache.set(key, {
      value,
      expires,
      createdAt: Date.now(),
    });
    
    // Set expiration timer
    if (ttl) {
      this.timers.set(key, setTimeout(() => {
        this.delete(key);
      }, ttl * 1000));
    }
    
    this.stats.sets++;
    
    return true;
  }
  
  async delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    const result = this.cache.delete(key);
    
    if (result) {
      this.stats.deletes++;
    }
    
    return result;
  }
  
  async has(key) {
    const item = this.cache.get(key);
    return item && (!item.expires || item.expires > Date.now());
  }
  
  async clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.cache.clear();
    return true;
  }
  
  async keys(pattern = '*') {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }
  
  async size() {
    return this.cache.size;
  }
  
  evictOldest() {
    let oldest = null;
    let oldestKey = null;
    
    for (const [key, item] of this.cache) {
      if (!oldest || item.createdAt < oldest.createdAt) {
        oldest = item;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.emit('eviction', oldestKey);
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      size: this.cache.size,
      maxKeys: this.maxKeys,
    };
  }
}

/**
 * Redis Cache Provider
 */
class RedisCacheProvider extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = { ...cacheConfig.redis, ...config };
    this.client = null;
    this.isConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }
  
  async connect() {
    const redis = require('redis');
    
    this.client = redis.createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
      },
      password: this.config.password,
      database: this.config.db,
    });
    
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Redis cache connected');
    });
    
    this.client.on('disconnect', () => {
      this.isConnected = false;
      console.log('⚠️ Redis cache disconnected');
    });
    
    this.client.on('error', (error) => {
      console.error('Redis error:', error);
    });
    
    await this.client.connect();
  }
  
  prefixKey(key) {
    return `${this.config.keyPrefix}${key}`;
  }
  
  async get(key) {
    try {
      const value = await this.client.get(this.prefixKey(key));
      
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set(key, value, ttl = cacheConfig.defaultTTL) {
    try {
      const prefixedKey = this.prefixKey(key);
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setEx(prefixedKey, ttl, serialized);
      } else {
        await this.client.set(prefixedKey, serialized);
      }
      
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  async delete(key) {
    try {
      const result = await this.client.del(this.prefixKey(key));
      
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  async has(key) {
    try {
      const exists = await this.client.exists(this.prefixKey(key));
      return exists === 1;
    } catch (error) {
      return false;
    }
  }
  
  async clear() {
    try {
      const keys = await this.client.keys(`${this.config.keyPrefix}*`);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }
  
  async keys(pattern = '*') {
    try {
      const fullPattern = this.prefixKey(pattern);
      const keys = await this.client.keys(fullPattern);
      
      return keys.map(key => key.replace(this.config.keyPrefix, ''));
    } catch (error) {
      return [];
    }
  }
  
  async size() {
    try {
      const keys = await this.client.keys(`${this.config.keyPrefix}*`);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }
  
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      isConnected: this.isConnected,
    };
  }
}

/**
 * Cache Manager
 */
class CacheManager {
  constructor() {
    this.provider = null;
    this.strategies = cacheConfig.strategies;
  }
  
  /**
   * Initialize cache manager
   */
  async initialize(providerType = 'memory') {
    if (providerType === 'redis') {
      this.provider = new RedisCacheProvider();
      await this.provider.connect();
    } else {
      this.provider = new MemoryCacheProvider();
    }
    
    console.log(`✅ Cache manager initialized (${providerType})`);
  }
  
  /**
   * Get from cache
   */
  async get(key) {
    return this.provider.get(key);
  }
  
  /**
   * Set in cache
   */
  async set(key, value, ttl) {
    // Check for strategy
    const strategy = this.getStrategy(key);
    const effectiveTTL = ttl || strategy?.ttl || cacheConfig.defaultTTL;
    
    return this.provider.set(key, value, effectiveTTL);
  }
  
  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet(key, factory, ttl) {
    const cached = await this.get(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, ttl);
    
    return value;
  }
  
  /**
   * Delete from cache
   */
  async delete(key) {
    return this.provider.delete(key);
  }
  
  /**
   * Delete by pattern
   */
  async deletePattern(pattern) {
    const keys = await this.provider.keys(pattern);
    
    for (const key of keys) {
      await this.provider.delete(key);
    }
    
    return keys.length;
  }
  
  /**
   * Invalidate cache for entity
   */
  async invalidateEntity(entity, id) {
    const patterns = [
      `${entity}:${id}`,
      `${entity}:${id}:*`,
      `*:${entity}:${id}`,
    ];
    
    let deleted = 0;
    
    for (const pattern of patterns) {
      deleted += await this.deletePattern(pattern);
    }
    
    return deleted;
  }
  
  /**
   * Clear all cache
   */
  async clear() {
    return this.provider.clear();
  }
  
  /**
   * Get strategy for key
   */
  getStrategy(key) {
    for (const [prefix, strategy] of Object.entries(this.strategies)) {
      if (key.startsWith(prefix)) {
        return strategy;
      }
    }
    return null;
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return this.provider.getStats();
  }
  
  /**
   * Create cache key
   */
  static createKey(...parts) {
    return parts.filter(Boolean).join(':');
  }
  
  /**
   * Disconnect
   */
  async disconnect() {
    if (this.provider && this.provider.disconnect) {
      await this.provider.disconnect();
    }
  }
}

// Singleton instance
const cacheManager = new CacheManager();

/**
 * Cache Middleware
 */
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 300,
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    shouldCache = (req) => req.method === 'GET',
  } = options;
  
  return async (req, res, next) => {
    if (!shouldCache(req)) {
      return next();
    }
    
    const key = keyGenerator(req);
    
    try {
      const cached = await cacheManager.get(key);
      
      if (cached) {
        return res.json({
          ...cached,
          _cached: true,
        });
      }
      
      // Store original json
      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheManager.set(key, data, ttl).catch(console.error);
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

/**
 * Cache Decorator
 */
const cached = (keyTemplate, ttl) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const key = typeof keyTemplate === 'function'
        ? keyTemplate(...args)
        : keyTemplate;
      
      return cacheManager.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };
    
    return descriptor;
  };
};

/**
 * Cache Keys Constants
 */
const CacheKeys = {
  // User
  USER_SESSION: (userId) => `user:session:${userId}`,
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_PERMISSIONS: (userId) => `user:permissions:${userId}`,
  
  // Employee
  EMPLOYEE_DATA: (empId) => `employee:data:${empId}`,
  EMPLOYEE_LIST: (deptId) => `employee:list:${deptId}`,
  
  // Finance
  EXCHANGE_RATE: (from, to) => `finance:rate:${from}:${to}`,
  INVOICE: (invId) => `finance:invoice:${invId}`,
  
  // Inventory
  STOCK_LEVEL: (itemId) => `inventory:stock:${itemId}`,
  PRODUCT: (prodId) => `inventory:product:${prodId}`,
  
  // Settings
  GLOBAL_SETTINGS: 'settings:global',
  TENANT_SETTINGS: (tenantId) => `settings:tenant:${tenantId}`,
  
  // Reports
  DAILY_REPORT: (date) => `reports:daily:${date}`,
  MONTHLY_REPORT: (month) => `reports:monthly:${month}`,
};

module.exports = {
  CacheManager,
  cacheManager,
  MemoryCacheProvider,
  RedisCacheProvider,
  cacheMiddleware,
  cached,
  CacheKeys,
  cacheConfig,
};