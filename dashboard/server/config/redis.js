/**
 * Redis Cluster Configuration
 * Phase 13 - Week 2: Database & Redis Optimization
 *
 * Features:
 * - Redis cluster support
 * - Sentinel failover
 * - Connection pooling
 * - Automatic reconnection
 * - Cache strategies (LRU, LFU, TTL)
 */

const Redis = require('ioredis');

// Environment configuration
const config = {
  // Standalone mode (development)
  standalone: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),

    // Connection settings
    connectTimeout: 10000,
    retryStrategy: times => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },

    // Keep-alive
    keepAlive: 30000,

    // Reconnect settings
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  },

  // Cluster mode (production)
  cluster: {
    nodes: [
      {
        host: process.env.REDIS_CLUSTER_NODE1_HOST || 'localhost',
        port: parseInt(process.env.REDIS_CLUSTER_NODE1_PORT || '7000'),
      },
      {
        host: process.env.REDIS_CLUSTER_NODE2_HOST || 'localhost',
        port: parseInt(process.env.REDIS_CLUSTER_NODE2_PORT || '7001'),
      },
      {
        host: process.env.REDIS_CLUSTER_NODE3_HOST || 'localhost',
        port: parseInt(process.env.REDIS_CLUSTER_NODE3_PORT || '7002'),
      },
    ],
    options: {
      redisOptions: {
        password: process.env.REDIS_PASSWORD || undefined,
      },
      clusterRetryStrategy: times => {
        return Math.min(times * 100, 2000);
      },
      enableReadyCheck: true,
      maxRedirections: 16,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
    },
  },

  // Sentinel mode (high availability)
  sentinel: {
    sentinels: [
      {
        host: process.env.REDIS_SENTINEL1_HOST || 'localhost',
        port: parseInt(process.env.REDIS_SENTINEL1_PORT || '26379'),
      },
      {
        host: process.env.REDIS_SENTINEL2_HOST || 'localhost',
        port: parseInt(process.env.REDIS_SENTINEL2_PORT || '26380'),
      },
      {
        host: process.env.REDIS_SENTINEL3_HOST || 'localhost',
        port: parseInt(process.env.REDIS_SENTINEL3_PORT || '26381'),
      },
    ],
    name: process.env.REDIS_MASTER_NAME || 'mymaster',
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};

// Redis clients
let client = null;
let subscriber = null;

// Cache statistics
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  commands: {
    total: 0,
    fast: 0, // < 10ms
    medium: 0, // 10-100ms
    slow: 0, // > 100ms
  },
};

/**
 * Initialize Redis connection
 */
async function initialize() {
  const mode = process.env.REDIS_MODE || 'standalone';
  console.log(`🔴 Initializing Redis (${mode} mode)...`);

  try {
    switch (mode) {
      case 'cluster':
        client = new Redis.Cluster(config.cluster.nodes, config.cluster.options);
        break;

      case 'sentinel':
        client = new Redis({
          sentinels: config.sentinel.sentinels,
          name: config.sentinel.name,
          password: config.sentinel.password,
          db: config.sentinel.db,
        });
        break;

      default:
        client = new Redis(config.standalone);
    }

    // Event handlers
    client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis ready');
    });

    client.on('error', err => {
      console.error('❌ Redis error:', err.message);
      stats.errors++;
    });

    client.on('close', () => {
      console.log('🔴 Redis connection closed');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Wait for connection
    await client.ping();
    console.log('✅ Redis initialized successfully');

    // Initialize subscriber for pub/sub
    if (mode === 'cluster') {
      subscriber = new Redis.Cluster(config.cluster.nodes, config.cluster.options);
    } else {
      subscriber = client.duplicate();
    }

    return { client, subscriber };
  } catch (err) {
    console.error('❌ Failed to initialize Redis:', err.message);
    throw err;
  }
}

/**
 * Get value from cache
 */
async function get(key, options = {}) {
  const startTime = Date.now();
  stats.commands.total++;

  try {
    const value = await client.get(key);
    const duration = Date.now() - startTime;

    // Track command performance
    if (duration < 10) stats.commands.fast++;
    else if (duration < 100) stats.commands.medium++;
    else stats.commands.slow++;

    if (value !== null) {
      stats.hits++;

      // Parse JSON if needed
      if (options.json) {
        return JSON.parse(value);
      }

      return value;
    } else {
      stats.misses++;
      return null;
    }
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis GET error:', err.message);
    return null;
  }
}

/**
 * Set value in cache
 */
async function set(key, value, options = {}) {
  const startTime = Date.now();
  stats.commands.total++;
  stats.sets++;

  try {
    // Serialize JSON objects
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;

    // Set with TTL
    if (options.ttl || options.ex) {
      const ttl = options.ttl || options.ex;
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }

    const duration = Date.now() - startTime;
    if (duration < 10) stats.commands.fast++;
    else if (duration < 100) stats.commands.medium++;
    else stats.commands.slow++;

    return true;
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis SET error:', err.message);
    return false;
  }
}

/**
 * Delete key from cache
 */
async function del(key) {
  stats.commands.total++;
  stats.deletes++;

  try {
    const result = await client.del(key);
    return result > 0;
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis DEL error:', err.message);
    return false;
  }
}

/**
 * Get or set (cache-aside pattern)
 */
async function getOrSet(key, fetchFn, options = {}) {
  // Try to get from cache
  let value = await get(key, { json: true });

  if (value !== null) {
    return value;
  }

  // Cache miss - fetch from source
  try {
    value = await fetchFn();

    // Store in cache
    await set(key, value, options);

    return value;
  } catch (err) {
    console.error('❌ getOrSet fetch error:', err.message);
    throw err;
  }
}

/**
 * Increment counter
 */
async function incr(key, amount = 1) {
  stats.commands.total++;

  try {
    if (amount === 1) {
      return await client.incr(key);
    } else {
      return await client.incrby(key, amount);
    }
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis INCR error:', err.message);
    return null;
  }
}

/**
 * Decrement counter
 */
async function decr(key, amount = 1) {
  stats.commands.total++;

  try {
    if (amount === 1) {
      return await client.decr(key);
    } else {
      return await client.decrby(key, amount);
    }
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis DECR error:', err.message);
    return null;
  }
}

/**
 * Set expiration on key
 */
async function expire(key, seconds) {
  stats.commands.total++;

  try {
    return await client.expire(key, seconds);
  } catch (err) {
    stats.errors++;
    return false;
  }
}

/**
 * Check if key exists
 */
async function exists(key) {
  stats.commands.total++;

  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (err) {
    stats.errors++;
    return false;
  }
}

/**
 * Get keys matching pattern
 */
async function keys(pattern) {
  stats.commands.total++;

  try {
    return await client.keys(pattern);
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis KEYS error:', err.message);
    return [];
  }
}

/**
 * Delete keys matching pattern
 */
async function delPattern(pattern) {
  try {
    const matchingKeys = await keys(pattern);

    if (matchingKeys.length === 0) {
      return 0;
    }

    // Delete in batches
    const batchSize = 1000;
    let deleted = 0;

    for (let i = 0; i < matchingKeys.length; i += batchSize) {
      const batch = matchingKeys.slice(i, i + batchSize);
      const result = await client.del(...batch);
      deleted += result;
    }

    stats.deletes += deleted;
    return deleted;
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis DEL pattern error:', err.message);
    return 0;
  }
}

/**
 * Flush all keys in current database
 */
async function flushDb() {
  try {
    await client.flushdb();
    console.log('🗑️  Redis database flushed');
    return true;
  } catch (err) {
    console.error('❌ Redis FLUSHDB error:', err.message);
    return false;
  }
}

/**
 * Publish message to channel
 */
async function publish(channel, message) {
  stats.commands.total++;

  try {
    const serialized = typeof message === 'object' ? JSON.stringify(message) : message;

    const subscribers = await client.publish(channel, serialized);
    return subscribers;
  } catch (err) {
    stats.errors++;
    console.error('❌ Redis PUBLISH error:', err.message);
    return 0;
  }
}

/**
 * Subscribe to channel
 */
async function subscribe(channel, callback) {
  if (!subscriber) {
    console.error('❌ Subscriber not initialized');
    return;
  }

  try {
    await subscriber.subscribe(channel);

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch {
          callback(message);
        }
      }
    });

    console.log(`📡 Subscribed to channel: ${channel}`);
  } catch (err) {
    console.error('❌ Redis SUBSCRIBE error:', err.message);
  }
}

/**
 * Get cache statistics
 */
function getStats() {
  const hitRate =
    stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
      : '0.00';

  return {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: `${hitRate}%`,
    sets: stats.sets,
    deletes: stats.deletes,
    errors: stats.errors,
    commands: {
      total: stats.commands.total,
      fast: stats.commands.fast,
      medium: stats.commands.medium,
      slow: stats.commands.slow,
      fastPercentage:
        stats.commands.total > 0
          ? ((stats.commands.fast / stats.commands.total) * 100).toFixed(2) + '%'
          : '0.00%',
    },
  };
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;

    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)[1];

    return {
      healthy: true,
      status: 'healthy',
      latency,
      version,
      mode: process.env.REDIS_MODE || 'standalone',
    };
  } catch (err) {
    return {
      healthy: false,
      status: 'unhealthy',
      error: err.message,
    };
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('🔴 Closing Redis connections...');

  if (client) {
    await client.quit();
    console.log('✅ Redis client closed');
  }

  if (subscriber) {
    await subscriber.quit();
    console.log('✅ Redis subscriber closed');
  }
}

// Export
module.exports = {
  initialize,
  get,
  set,
  del,
  getOrSet,
  incr,
  decr,
  expire,
  exists,
  keys,
  delPattern,
  flushDb,
  publish,
  subscribe,
  getStats,
  healthCheck,
  shutdown,

  // Direct client access
  get client() {
    return client;
  },
  get subscriber() {
    return subscriber;
  },
};
