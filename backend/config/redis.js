/**
 * Redis Configuration
 * إعدادات Redis Cache
 */

const redis = require('redis');

let redisClient = null;
let isConnected = false;

// Redis enabled flag (from environment)
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';
const DISABLE_REDIS = process.env.DISABLE_REDIS === 'true';
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600; // Default 1 hour

/**
 * Initialize Redis Client
 * تهيئة عميل Redis
 */
async function initializeRedis() {
  // Hard disables: explicit flag, missing URL, or mock DB mode
  if (DISABLE_REDIS || !REDIS_ENABLED || !REDIS_URL) {
    console.log('ℹ️  Redis is disabled (DISABLE_REDIS=true or REDIS_DISABLED/URL missing)');
    return null;
  }

  try {
    console.log('🔄 Connecting to Redis...');

    // Create Redis client
    redisClient = redis.createClient({
      url: REDIS_URL,
      password: REDIS_PASSWORD,
      socket: {
        reconnectStrategy: retries => {
          if (retries > 10) {
            console.error('❌ Redis: Too many reconnection attempts');
            return new Error('Too many reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // Error handler
    redisClient.on('error', err => {
      console.error('❌ Redis Error:', err.message);
      isConnected = false;
    });

    // Connect handler
    redisClient.on('connect', () => {
      console.log('🔄 Redis: Connecting...');
    });

    // Ready handler
    redisClient.on('ready', () => {
      console.log('✅ Redis: Connected and ready');
      isConnected = true;
    });

    // Reconnecting handler
    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis: Reconnecting...');
      isConnected = false;
    });

    // End handler
    redisClient.on('end', () => {
      console.log('⚠️  Redis: Connection closed');
      isConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error.message);
    console.log('⚠️  Continuing without Redis cache');
    return null;
  }
}

/**
 * Get value from cache
 * الحصول على قيمة من الـ Cache
 */
async function get(key) {
  if (!isConnected || !redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    console.error(`Redis GET error for key "${key}":`, error.message);
    return null;
  }
}

/**
 * Set value in cache
 * حفظ قيمة في الـ Cache
 */
async function set(key, value, ttl = CACHE_TTL) {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    await redisClient.setEx(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`Redis SET error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete key from cache
 * حذف مفتاح من الـ Cache
 */
async function del(key) {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error(`Redis DEL error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Delete multiple keys matching pattern
 * حذف عدة مفاتيح حسب النمط
 */
async function delPattern(pattern) {
  if (!isConnected || !redisClient) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    await redisClient.del(keys);
    return keys.length;
  } catch (error) {
    console.error(`Redis DEL pattern error for "${pattern}":`, error.message);
    return 0;
  }
}

/**
 * Check if key exists
 * التحقق من وجود مفتاح
 */
async function exists(key) {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    const result = await redisClient.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`Redis EXISTS error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Set expiration time for key
 * تعيين وقت انتهاء للمفتاح
 */
async function expire(key, seconds) {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.expire(key, seconds);
    return true;
  } catch (error) {
    console.error(`Redis EXPIRE error for key "${key}":`, error.message);
    return false;
  }
}

/**
 * Flush all cache
 * مسح جميع الـ Cache
 */
async function flushAll() {
  if (!isConnected || !redisClient) {
    return false;
  }

  try {
    await redisClient.flushAll();
    console.log('✅ Redis: Cache flushed');
    return true;
  } catch (error) {
    console.error('Redis FLUSHALL error:', error.message);
    return false;
  }
}

/**
 * Get Redis client info
 * الحصول على معلومات Redis
 */
async function info() {
  if (!isConnected || !redisClient) {
    return {
      connected: false,
      message: 'Redis not connected',
    };
  }

  try {
    const serverInfo = await redisClient.info('server');
    const memoryInfo = await redisClient.info('memory');
    const statsInfo = await redisClient.info('stats');

    return {
      connected: true,
      server: serverInfo,
      memory: memoryInfo,
      stats: statsInfo,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Close Redis connection
 * إغلاق اتصال Redis
 */
async function close() {
  if (redisClient) {
    await redisClient.quit();
    console.log('✅ Redis: Connection closed gracefully');
  }
}

/**
 * Get cache stats
 * الحصول على إحصائيات الـ Cache
 */
async function getStats() {
  if (!isConnected || !redisClient) {
    return {
      enabled: REDIS_ENABLED,
      connected: false,
    };
  }

  try {
    const dbSize = await redisClient.dbSize();
    const infoStats = await redisClient.info('stats');

    return {
      enabled: REDIS_ENABLED,
      connected: true,
      keys: dbSize,
      info: infoStats,
    };
  } catch (error) {
    return {
      enabled: REDIS_ENABLED,
      connected: false,
      error: error.message,
    };
  }
}

module.exports = {
  initializeRedis,
  get,
  set,
  del,
  delPattern,
  exists,
  expire,
  flushAll,
  info,
  close,
  getStats,
  getClient: () => redisClient,
  isConnected: () => isConnected,
  isEnabled: () => REDIS_ENABLED,
};
