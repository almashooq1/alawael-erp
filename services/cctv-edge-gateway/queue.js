/**
 * queue — Redis-backed FIFO for events that couldn't reach central.
 *
 * Falls back to an in-memory ring buffer if Redis isn't configured /
 * available. The replay worker drains this regularly.
 */
'use strict';

const config = require('./config');
const log = require('./logger');

let redis = null;
const memory = [];
const MAX_MEMORY = 5000;

async function _redis() {
  if (redis) return redis;
  try {
    const Redis = require('ioredis');
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      log.debug(`[queue] redis error: ${err.message}`);
    });
    await redis.connect();
    return redis;
  } catch (err) {
    log.warn(`[queue] redis unavailable, using memory: ${err.message}`);
    redis = null;
    return null;
  }
}

async function push(item) {
  const r = await _redis();
  if (r) {
    try {
      await r.rpush(config.redis.queueKey, JSON.stringify(item));
      await r.ltrim(config.redis.queueKey, -config.redis.queueMax, -1);
      return { ok: true, backend: 'redis' };
    } catch (err) {
      log.warn(`[queue] redis push failed: ${err.message}`);
    }
  }
  if (memory.length >= MAX_MEMORY) memory.shift();
  memory.push(item);
  return { ok: true, backend: 'memory' };
}

async function pop(batchSize = 50) {
  const r = await _redis();
  if (r) {
    try {
      const items = [];
      for (let i = 0; i < batchSize; i++) {
        const raw = await r.lpop(config.redis.queueKey);
        if (!raw) break;
        try {
          items.push(JSON.parse(raw));
        } catch {
          // skip malformed
        }
      }
      return items;
    } catch (err) {
      log.warn(`[queue] redis pop failed: ${err.message}`);
    }
  }
  return memory.splice(0, batchSize);
}

async function size() {
  const r = await _redis();
  if (r) {
    try {
      return await r.llen(config.redis.queueKey);
    } catch {
      // fall through
    }
  }
  return memory.length;
}

async function disconnect() {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    redis = null;
  }
}

module.exports = { push, pop, size, disconnect };
