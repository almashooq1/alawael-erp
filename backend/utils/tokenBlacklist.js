/**
 * Token Blacklist Service
 *
 * Redis-backed JWT token blacklist for proper logout invalidation.
 * Stores blacklisted token hashes with TTL matching token expiry.
 *
 * Usage:
 *   const tokenBlacklist = require('./tokenBlacklist');
 *   await tokenBlacklist.add(token, decodedPayload);
 *   const blocked = await tokenBlacklist.isBlacklisted(token);
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Lazy Redis client — initialized on first use
let redisClient = null;
let redisInitFailed = false;

// In-memory fallback set for when Redis is down (bounded LRU-style)
const MAX_FALLBACK_SIZE = 10000;
const _fallbackSet = new Set();

/**
 * Hash the token to avoid storing raw JWTs in Redis
 */
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Get or create the Redis client (lazy singleton)
 */
const getRedis = async () => {
  // Respect DISABLE_REDIS env var
  if (process.env.DISABLE_REDIS === 'true') return null;
  if (redisClient) return redisClient;
  if (redisInitFailed) return null; // Don't retry after permanent failure
  try {
    const { createRedisClient } = require('../config/cache.config');
    const client = await createRedisClient();
    if (!client) {
      // createRedisClient returned null → connection failed, don't retry
      redisInitFailed = true;
      return null;
    }
    redisClient = client;
    return redisClient;
  } catch {
    // Redis unavailable — blacklist will be skipped (graceful degradation)
    redisInitFailed = true;
    return null;
  }
};

const PREFIX = 'bl:';

module.exports = {
  /**
   * Add a token to the blacklist
   * @param {string} token - The raw JWT string
   * @param {object} decoded - The decoded JWT payload (must have `exp`)
   */
  async add(token, decoded) {
    try {
      const hash = hashToken(token);
      const redis = await getRedis();
      if (!redis) {
        // Fallback: store in memory (evict oldest if full)
        if (_fallbackSet.size >= MAX_FALLBACK_SIZE) {
          const first = _fallbackSet.values().next().value;
          _fallbackSet.delete(first);
        }
        _fallbackSet.add(hash);
        return;
      }

      const key = PREFIX + hash;
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await Promise.race([
          redis.set(key, '1', 'EX', ttl),
          new Promise(resolve => setTimeout(resolve, 3000)),
        ]);
      }
    } catch (err) {
      // Still store in fallback on error
      _fallbackSet.add(hashToken(token));
      logger.error('Token blacklist add error:', { error: err.message });
    }
  },

  /**
   * Check if a token is blacklisted
   * @param {string} token - The raw JWT string
   * @returns {boolean} true if blacklisted
   */
  async isBlacklisted(token) {
    try {
      const hash = hashToken(token);

      // Always check in-memory fallback first
      if (_fallbackSet.has(hash)) return true;

      const redis = await getRedis();
      if (!redis) return false; // Redis down + not in fallback → allow (best-effort)

      // Timeout guard: never let a Redis call hang the auth middleware
      const result = await Promise.race([
        redis.get(PREFIX + hash),
        new Promise(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      return result === '1';
    } catch (err) {
      logger.error('Token blacklist check error:', { error: err.message });
      // Check fallback even on Redis error
      return _fallbackSet.has(hashToken(token));
    }
  },
};
