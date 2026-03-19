const redis = require('redis');
const logger = require('../utils/logger');

// Allow running without a Redis instance in local/offline scenarios
if (process.env.USE_MOCK_CACHE === 'true') {
  const memoryStore = new Map();

  const cache = {
    async set(key, value) {
      memoryStore.set(key, value);
      return true;
    },
    async get(key) {
      return memoryStore.get(key) ?? null;
    },
    async delete(key) {
      memoryStore.delete(key);
      return true;
    },
    async deletePattern(pattern) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryStore.keys()) {
        if (regex.test(key)) memoryStore.delete(key);
      }
      return true;
    },
    async clear() {
      memoryStore.clear();
      return true;
    },
    async stats() {
      return { items: memoryStore.size };
    },
  };

  const cacheMiddleware = () => (req, res, next) => next();

  module.exports = {
    redisClient: null,
    cache,
    cacheMiddleware,
  };
  logger.warn('Redis is mocked (USE_MOCK_CACHE=true). No external cache connection required.');
} else {
  const redisClient = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: Number(process.env.REDIS_DB || 0),
  });

  redisClient.on('error', err => {
    logger.error('Redis error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  // Initiate connection (Redis v4 requires explicit connect)
  redisClient.connect().catch(err => logger.error('Redis connect error:', err));

  // Cache helper functions
  const cache = {
    // Set cache with TTL (Time To Live in seconds)
    async set(key, value, ttl = 3600) {
      try {
        const serialized = JSON.stringify(value);
        if (ttl) {
          await redisClient.setEx(key, ttl, serialized);
        } else {
          await redisClient.set(key, serialized);
        }
        return true;
      } catch (error) {
        logger.error('Cache set error:', error);
        return false;
      }
    },

    // Get cache
    async get(key) {
      try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        logger.error('Cache get error:', error);
        return null;
      }
    },

    // Delete cache
    async delete(key) {
      try {
        await redisClient.del(key);
        return true;
      } catch (error) {
        logger.error('Cache delete error:', error);
        return false;
      }
    },

    // Delete by pattern
    async deletePattern(pattern) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        return true;
      } catch (error) {
        logger.error('Cache deletePattern error:', error);
        return false;
      }
    },

    // Clear all cache
    async clear() {
      try {
        await redisClient.flushdb();
        return true;
      } catch (error) {
        logger.error('Cache clear error:', error);
        return false;
      }
    },

    // Get cache statistics
    async stats() {
      try {
        const info = await redisClient.info('stats');
        return info;
      } catch (error) {
        logger.error('Cache stats error:', error);
        return null;
      }
    },
  };

  // Cache middleware
  const cacheMiddleware = (duration = 3600) => {
    return async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `route:${req.originalUrl}`;

      try {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) {
          res.set('X-Cache', 'HIT');
          return res.json(cachedData);
        }
      } catch (error) {
        logger.error('Cache middleware error:', error);
      }

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = body => {
        cache.set(cacheKey, body, duration).catch(err => {
          logger.error('Failed to cache response:', err);
        });
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    };
  };

  module.exports = {
    redisClient,
    cache,
    cacheMiddleware,
  };
}
