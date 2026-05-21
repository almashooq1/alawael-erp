'use strict';

/**
 * WhatsApp Idempotency Store — مفاتيح عدم التكرار
 * ═══════════════════════════════════════════════════════════════════════════
 * Memoize the result of a send for 24 hours, keyed by an `Idempotency-Key`
 * header supplied by the caller. Protects against:
 *   - Network retries from the admin UI that would otherwise double-send.
 *   - Cron jobs that store offsets imprecisely and re-fire a window.
 *   - Mobile clients flapping between WiFi/LTE on a slow link.
 *
 * Semantics:
 *   - First call with a given key: runs the producer, stores result for 24h,
 *     returns { result, replayed: false }.
 *   - Subsequent call within 24h: returns the cached result with
 *     { replayed: true } so the caller can set an `X-Idempotent-Replay: 1`
 *     header for observability.
 *   - Different request bodies under the same key: the FIRST body wins.
 *     This matches Stripe's behavior — the key is the source of truth.
 *
 * Redis-backed when available; in-memory fallback otherwise. Same multi-
 * instance caveat as the rate limiter: only Redis gives correct global
 * dedup; in-memory is process-local.
 *
 * Public API:
 *   - withKey(key, producer)              → { result, replayed }
 *   - peek(key)                           → cached value or null
 *   - reset(key?)                         → test helper
 *
 * @module services/whatsapp/idempotency.service
 */

const logger = require('../../utils/logger');

const KEY_PREFIX = 'wa:idem:';
const DEFAULT_TTL_SEC = 24 * 3600; // 24h

function getRedisClient() {
  try {
    const r = require('../../config/redis');
    if (r && typeof r.isConnected === 'function' && r.isConnected()) {
      return typeof r.getClient === 'function' ? r.getClient() : null;
    }
  } catch {
    // optional
  }
  return null;
}

// ─── In-memory fallback ─────────────────────────────────────────────────────
const memStore = new Map(); // key → { value, expiresAt }

function memGet(key) {
  const v = memStore.get(key);
  if (!v) return null;
  if (v.expiresAt < Date.now()) {
    memStore.delete(key);
    return null;
  }
  return v.value;
}

function memSet(key, value, ttlSec) {
  memStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

let cleanupTimer = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(
    () => {
      const now = Date.now();
      for (const [k, v] of memStore) {
        if (v.expiresAt < now) memStore.delete(k);
      }
    },
    5 * 60 * 1000
  );
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
}

/**
 * Atomically check-or-run. If a value exists for `key`, returns it as
 * `{ result, replayed: true }`. Otherwise invokes `producer()`, stores
 * its resolved value, and returns `{ result, replayed: false }`.
 *
 * Producer errors are NOT cached — a failed send must be retryable with the
 * same key. Cache only successful resolutions.
 *
 * If `key` is falsy, the producer is invoked directly with no caching
 * (idempotency is opt-in via the header).
 */
async function withKey(key, producer, { ttlSec = DEFAULT_TTL_SEC } = {}) {
  if (!key) {
    const result = await producer();
    return { result, replayed: false };
  }
  const fullKey = `${KEY_PREFIX}${key}`;
  const client = getRedisClient();

  // Peek
  let cached = null;
  try {
    if (client) {
      const raw = await client.get(fullKey);
      cached = raw ? JSON.parse(raw) : null;
    } else {
      cached = memGet(fullKey);
    }
  } catch (err) {
    logger.warn(`[WhatsApp Idem] peek failed: ${err.message}`);
  }

  if (cached !== null && cached !== undefined) {
    return { result: cached, replayed: true };
  }

  // Run + store
  const result = await producer();
  try {
    if (client) {
      // NX SET — only set if not exists; guards against a race where two
      // concurrent requests both miss the peek and both run the producer.
      // Whichever lands first wins; the loser's stored value is dropped.
      await client.set(fullKey, JSON.stringify(result), 'EX', ttlSec, 'NX');
    } else {
      memSet(fullKey, result, ttlSec);
      ensureCleanup();
    }
  } catch (err) {
    logger.warn(`[WhatsApp Idem] store failed (key=${key}): ${err.message}`);
  }
  return { result, replayed: false };
}

async function peek(key) {
  if (!key) return null;
  const fullKey = `${KEY_PREFIX}${key}`;
  const client = getRedisClient();
  try {
    if (client) {
      const raw = await client.get(fullKey);
      return raw ? JSON.parse(raw) : null;
    }
    return memGet(fullKey);
  } catch (err) {
    logger.warn(`[WhatsApp Idem] peek failed: ${err.message}`);
    return null;
  }
}

function reset(key) {
  if (!key) {
    memStore.clear();
    return;
  }
  memStore.delete(`${KEY_PREFIX}${key}`);
}

module.exports = {
  withKey,
  peek,
  reset,
  KEY_PREFIX,
};
