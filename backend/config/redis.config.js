/* eslint-disable no-unused-vars */
/**
 * تكوين Redis - التخزين المؤقت
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;

const connectRedis = () => {
  if (redis) return redis;

  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    // Limit reconnection attempts to avoid log spam when Redis is unavailable
    retryStrategy: times => {
      if (times > 5) {
        logger.warn('Redis: max reconnection attempts reached, giving up');
        return null; // stop retrying
      }
      return Math.min(times * 500, 3000); // exponential backoff, max 3s
    },
  });

  redis.on('connect', () => {
    logger.info('✅ Redis Connected');
  });

  redis.on('error', err => {
    logger.error('❌ Redis Error:', err.message);
  });

  redis.on('close', () => {
    logger.info('⚠️ Redis Connection Closed');
  });

  redis.on('reconnecting', () => {
    logger.info('🔄 Redis Reconnecting...');
  });

  return redis;
};

const disconnectRedis = async () => {
  if (redis) {
    try {
      await redis.quit();
      logger.info('✅ Redis Disconnected');
    } catch (error) {
      logger.error('❌ Redis Disconnection Error:', error.message);
    }
  }
};

const checkRedisHealth = async () => {
  if (!redis) {
    return { status: 'not_initialized', connected: false };
  }

  try {
    const pong = await redis.ping();
    return {
      status: redis.status === 'ready' ? 'connected' : 'disconnected',
      connected: redis.status === 'ready',
      ping: pong,
      readyState: redis.status,
    };
  } catch (error) {
    return {
      status: 'error',
      connected: false,
      error: error.message,
    };
  }
};

const getRedisClient = () => {
  if (!redis) {
    return connectRedis();
  }
  return redis;
};

// دوال مساعدة للتخزين المؤقت
const cache = {
  get: async key => {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis GET Error:', error.message);
      return null;
    }
  },

  set: async (key, value, ttl = 3600) => {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET Error:', error.message);
      return false;
    }
  },

  del: async key => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL Error:', error.message);
      return false;
    }
  },

  flush: async () => {
    try {
      await redis.flushall();
      return true;
    } catch (error) {
      logger.error('Redis FLUSH Error:', error.message);
      return false;
    }
  },
};

module.exports = {
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
  getRedisClient,
  cache,
};
