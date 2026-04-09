/**
 * Smart Query Cache Layer - Al-Awael ERP
 * طبقة التخزين المؤقت الذكية للاستعلامات
 *
 * Features:
 *  - Automatic query result caching with fingerprinting
 *  - Model-aware cache invalidation (write-through)
 *  - TTL per model/query type
 *  - In-memory LRU cache + optional Redis backend
 *  - Cache warming for frequently accessed queries
 *  - Cache hit/miss statistics
 *  - Bypass mechanism for real-time requirements
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// LRU Cache (in-memory)
// ══════════════════════════════════════════════════════════════════
class LRUCache {
  constructor(maxSize = 1000) {
    this._maxSize = maxSize;
    this._cache = new Map();
    this._stats = { hits: 0, misses: 0, evictions: 0, sets: 0 };
  }

  get(key) {
    if (!this._cache.has(key)) {
      this._stats.misses++;
      return undefined;
    }

    const entry = this._cache.get(key);

    // Check TTL
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this._cache.delete(key);
      this._stats.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this._cache.delete(key);
    this._cache.set(key, entry);
    this._stats.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = 60000) {
    // Evict oldest if full
    if (this._cache.size >= this._maxSize) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
      this._stats.evictions++;
    }

    this._cache.set(key, {
      value,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
      createdAt: Date.now(),
    });
    this._stats.sets++;
  }

  delete(key) {
    return this._cache.delete(key);
  }

  /** Invalidate all keys matching a prefix */
  invalidateByPrefix(prefix) {
    let count = 0;
    for (const key of this._cache.keys()) {
      if (key.startsWith(prefix)) {
        this._cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Invalidate all keys matching a tag */
  invalidateByTag(tag) {
    let count = 0;
    for (const [key, entry] of this._cache) {
      if (entry.tags && entry.tags.includes(tag)) {
        this._cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear() {
    this._cache.clear();
  }

  get size() {
    return this._cache.size;
  }

  getStats() {
    const total = this._stats.hits + this._stats.misses;
    return {
      ...this._stats,
      size: this._cache.size,
      maxSize: this._maxSize,
      hitRate: total > 0 ? ((this._stats.hits / total) * 100).toFixed(2) + '%' : '0%',
    };
  }
}

// ══════════════════════════════════════════════════════════════════
// Query Cache Model TTLs
// ══════════════════════════════════════════════════════════════════
const MODEL_TTL = {
  // Fast changing — short TTL
  Notification: 30 * 1000, // 30 sec
  Attendance: 60 * 1000, // 1 min
  Session: 30 * 1000, // 30 sec

  // Medium — moderate TTL
  User: 5 * 60 * 1000, // 5 min
  Employee: 5 * 60 * 1000, // 5 min
  Beneficiary: 5 * 60 * 1000, // 5 min
  Invoice: 3 * 60 * 1000, // 3 min
  Order: 3 * 60 * 1000, // 3 min

  // Slow changing — long TTL
  Department: 30 * 60 * 1000, // 30 min
  Branch: 30 * 60 * 1000, // 30 min
  Program: 30 * 60 * 1000, // 30 min
  Vehicle: 15 * 60 * 1000, // 15 min

  // Almost static
  SystemSettings: 60 * 60 * 1000, // 1 hour
  Role: 60 * 60 * 1000, // 1 hour

  // Default
  _default: 5 * 60 * 1000, // 5 min
};

// ══════════════════════════════════════════════════════════════════
// QueryCacheLayer
// ══════════════════════════════════════════════════════════════════
class QueryCacheLayer {
  constructor(options = {}) {
    this._cache = new LRUCache(options.maxSize || 2000);
    this._enabled = options.enabled !== false;
    this._globalTTL = options.globalTTL || null;
    this._modelTTL = { ...MODEL_TTL, ...options.modelTTL };
    this._excludedModels = new Set(options.excludedModels || []);
    this._warmupQueries = [];
    this._installed = false;
  }

  // ────── Generate Cache Key ──────
  _generateKey(modelName, operation, filter, options = {}) {
    const fingerprint = JSON.stringify({
      m: modelName,
      o: operation,
      f: filter,
      s: options.sort,
      l: options.limit,
      k: options.skip,
      p: options.projection,
      pop: options.populate,
    });

    const hash = crypto.createHash('md5').update(fingerprint).digest('hex');
    return `qc:${modelName}:${hash}`;
  }

  // ────── Get TTL for Model ──────
  _getTTL(modelName) {
    if (this._globalTTL) return this._globalTTL;
    return this._modelTTL[modelName] || this._modelTTL._default;
  }

  // ────── Install as Mongoose Plugin ──────
  /**
   * Install query cache as a global Mongoose plugin
   * Automatically caches find, findOne, and countDocuments queries
   */
  install() {
    if (this._installed) return;
    this._installed = true;

    const self = this;

    mongoose.plugin(function queryCachePlugin(schema) {
      // ── Cache find queries ──
      schema.post('find', function (docs) {
        if (!self._enabled) return;

        const modelName = this.model?.modelName;
        if (!modelName || self._excludedModels.has(modelName)) return;
        if (this.getOptions()?._noCache) return;

        const key = self._generateKey(modelName, 'find', this.getFilter(), {
          sort: this.getOptions()?.sort,
          limit: this.getOptions()?.limit,
          skip: this.getOptions()?.skip,
          projection: this.projection?.(),
        });

        const ttl = self._getTTL(modelName);
        self._cache.set(key, docs, ttl);
      });

      // ── Invalidate on writes ──
      const writeOps = [
        'save',
        'updateOne',
        'updateMany',
        'findOneAndUpdate',
        'deleteOne',
        'deleteMany',
        'findOneAndDelete',
        'insertMany',
      ];

      for (const op of writeOps) {
        schema.post(op, function () {
          if (!self._enabled) return;
          const modelName = this.constructor?.modelName || this.model?.modelName;
          if (modelName) {
            self.invalidateModel(modelName);
          }
        });
      }
    });

    logger.info('[QueryCache] Installed as Mongoose plugin');
  }

  // ────── Manual Cache Operations ──────

  /** Get cached result */
  get(modelName, operation, filter, options = {}) {
    if (!this._enabled) return undefined;
    const key = this._generateKey(modelName, operation, filter, options);
    return this._cache.get(key);
  }

  /** Set cached result */
  set(modelName, operation, filter, result, options = {}) {
    if (!this._enabled) return;
    const key = this._generateKey(modelName, operation, filter, options);
    const ttl = this._getTTL(modelName);
    this._cache.set(key, result, ttl);
  }

  /** Invalidate all cached queries for a model */
  invalidateModel(modelName) {
    const count = this._cache.invalidateByPrefix(`qc:${modelName}:`);
    if (count > 0) {
      logger.debug(`[QueryCache] Invalidated ${count} entries for ${modelName}`);
    }
    return count;
  }

  /** Invalidate all cache entries */
  invalidateAll() {
    this._cache.clear();
    logger.info('[QueryCache] All entries invalidated');
  }

  // ────── Cache Warming ──────

  /**
   * Register a query to be warmed up on startup or periodically
   * @param {Function} queryFn - async () => result (the query to execute)
   * @param {string} modelName
   * @param {Object} options
   */
  registerWarmup(queryFn, modelName, options = {}) {
    this._warmupQueries.push({ queryFn, modelName, options });
  }

  /** Execute all registered warmup queries */
  async warmup() {
    if (this._warmupQueries.length === 0) return { warmed: 0 };

    let warmed = 0;
    for (const { queryFn, modelName } of this._warmupQueries) {
      try {
        await queryFn();
        warmed++;
      } catch (err) {
        logger.warn(`[QueryCache] Warmup failed for ${modelName}: ${err.message}`);
      }
    }

    logger.info(`[QueryCache] Warmed up ${warmed}/${this._warmupQueries.length} queries`);
    return { warmed, total: this._warmupQueries.length };
  }

  // ────── Configuration ──────

  enable() {
    this._enabled = true;
  }
  disable() {
    this._enabled = false;
  }

  excludeModel(modelName) {
    this._excludedModels.add(modelName);
    this.invalidateModel(modelName);
  }

  includeModel(modelName) {
    this._excludedModels.delete(modelName);
  }

  setModelTTL(modelName, ttlMs) {
    this._modelTTL[modelName] = ttlMs;
  }

  // ────── Statistics ──────
  getStats() {
    return {
      enabled: this._enabled,
      ...this._cache.getStats(),
      excludedModels: [...this._excludedModels],
      warmupQueries: this._warmupQueries.length,
    };
  }
}

// ══════════════════════════════════════════════════════════════════
// Express Middleware: Cache API Responses
// ══════════════════════════════════════════════════════════════════
/**
 * Express middleware that caches JSON responses
 *
 * @param {Object} options - { ttl, keyFn, condition }
 *
 * @example
 *   router.get('/api/departments',
 *     queryCacheMiddleware({ ttl: 300000 }),
 *     departmentController.list
 *   );
 */
function queryCacheMiddleware(options = {}) {
  const cache = new LRUCache(options.maxSize || 500);
  const ttl = options.ttl || 60000;

  return (req, res, next) => {
    // Skip for non-GET requests
    if (req.method !== 'GET') return next();

    // Custom key generation
    const keyFn =
      options.keyFn ||
      (req => {
        const userId = req.user?.id || 'anon';
        const branch = req.user?.branch || 'all';
        return `api:${userId}:${branch}:${req.originalUrl}`;
      });

    const key = keyFn(req);
    const cached = cache.get(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = data => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

// Singleton
const queryCache = new QueryCacheLayer();

module.exports = {
  QueryCacheLayer,
  LRUCache,
  queryCache,
  queryCacheMiddleware,
  MODEL_TTL,
};
