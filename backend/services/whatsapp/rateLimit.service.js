'use strict';

/**
 * WhatsApp Rate Limiter — حدود معدل الإرسال
 * ═══════════════════════════════════════════════════════════════════════════
 * Per-phone sliding window enforcement on outbound WhatsApp sends, defending
 * against:
 *   - Accidental fan-out bugs (e.g. cron loop sending the same reminder N×).
 *   - Compromised admin token spamming a beneficiary.
 *   - Meta's own per-phone rate caps that cause 429 cascades.
 *
 * Three concurrent windows (all must be under cap to pass):
 *   - minute: 20 / phone
 *   - hour:   200 / phone
 *   - day:    2000 / phone
 *
 * Backed by Redis when available (atomic INCR + EXPIRE). Falls back to an
 * in-memory Map for dev / test / when Redis is disabled. The in-memory path
 * is process-local — so in a multi-instance deploy, only Redis gives correct
 * global enforcement. Tests that need deterministic behavior should call
 * `reset()` between cases.
 *
 * Public API:
 *   - check(phone)            → { allowed, reason?, retryAfterSeconds? }
 *   - recordSend(phone)       → void (increments counters)
 *   - checkAndRecord(phone)   → check + record atomically; preferred for callers
 *   - reset(phone?)           → clears counters (test helper)
 *   - getStats(phone)         → debug shape { minute, hour, day }
 *
 * Caps come from env to allow per-deployment overrides without redeploy:
 *   WHATSAPP_RL_PER_MINUTE (default 20)
 *   WHATSAPP_RL_PER_HOUR   (default 200)
 *   WHATSAPP_RL_PER_DAY    (default 2000)
 *
 * @module services/whatsapp/rateLimit.service
 */

const logger = require('../../utils/logger');

const KEY_PREFIX = 'wa:rl:';

function caps() {
  return {
    minute: parseInt(process.env.WHATSAPP_RL_PER_MINUTE, 10) || 20,
    hour: parseInt(process.env.WHATSAPP_RL_PER_HOUR, 10) || 200,
    day: parseInt(process.env.WHATSAPP_RL_PER_DAY, 10) || 2000,
  };
}

function bucketKeys(phone, at = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const y = at.getUTCFullYear();
  const m = pad(at.getUTCMonth() + 1);
  const d = pad(at.getUTCDate());
  const h = pad(at.getUTCHours());
  const mi = pad(at.getUTCMinutes());
  return {
    minute: `${KEY_PREFIX}${phone}:m:${y}${m}${d}${h}${mi}`,
    hour: `${KEY_PREFIX}${phone}:h:${y}${m}${d}${h}`,
    day: `${KEY_PREFIX}${phone}:d:${y}${m}${d}`,
  };
}

// ─── Redis backend ──────────────────────────────────────────────────────────
function getRedisClient() {
  try {
    const r = require('../../config/redis');
    if (r && typeof r.isConnected === 'function' && r.isConnected()) {
      return typeof r.getClient === 'function' ? r.getClient() : null;
    }
  } catch {
    // optional dep — fall through to in-memory
  }
  return null;
}

async function redisGet(client, keys) {
  const [m, h, d] = await client.mget(keys.minute, keys.hour, keys.day);
  return {
    minute: parseInt(m, 10) || 0,
    hour: parseInt(h, 10) || 0,
    day: parseInt(d, 10) || 0,
  };
}

async function redisIncr(client, keys) {
  const pipeline = client.pipeline();
  pipeline.incr(keys.minute);
  pipeline.expire(keys.minute, 90); // keep ~ 1.5× window for clock skew
  pipeline.incr(keys.hour);
  pipeline.expire(keys.hour, 3700);
  pipeline.incr(keys.day);
  pipeline.expire(keys.day, 90000);
  const results = await pipeline.exec();
  // results is [[err, val], ...] — take INCR slots (0, 2, 4)
  return {
    minute: parseInt(results[0][1], 10) || 0,
    hour: parseInt(results[2][1], 10) || 0,
    day: parseInt(results[4][1], 10) || 0,
  };
}

// ─── In-memory fallback ─────────────────────────────────────────────────────
const memStore = new Map(); // key → { count, expiresAt }

function memGet(keys) {
  const now = Date.now();
  const read = k => {
    const v = memStore.get(k);
    if (!v || v.expiresAt < now) {
      memStore.delete(k);
      return 0;
    }
    return v.count;
  };
  return { minute: read(keys.minute), hour: read(keys.hour), day: read(keys.day) };
}

function memIncr(keys) {
  const now = Date.now();
  const inc = (k, ttlMs) => {
    const existing = memStore.get(k);
    const next =
      existing && existing.expiresAt >= now
        ? { count: existing.count + 1, expiresAt: existing.expiresAt }
        : { count: 1, expiresAt: now + ttlMs };
    memStore.set(k, next);
    return next.count;
  };
  return {
    minute: inc(keys.minute, 90 * 1000),
    hour: inc(keys.hour, 3700 * 1000),
    day: inc(keys.day, 90000 * 1000),
  };
}

// Periodic cleanup — keeps the Map from growing without bound under load.
let cleanupTimer = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memStore) {
      if (v.expiresAt < now) memStore.delete(k);
    }
  }, 60 * 1000);
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Read current counts WITHOUT incrementing. Use to surface a 429 before a
 * send is even attempted, or to render a "remaining capacity" badge.
 */
async function check(phone, at) {
  if (!phone) return { allowed: true };
  const keys = bucketKeys(phone, at);
  const c = caps();
  const client = getRedisClient();
  const counts = client ? await redisGet(client, keys) : memGet(keys);

  if (counts.minute >= c.minute) {
    return { allowed: false, reason: 'per_minute', retryAfterSeconds: 60, counts, caps: c };
  }
  if (counts.hour >= c.hour) {
    return { allowed: false, reason: 'per_hour', retryAfterSeconds: 3600, counts, caps: c };
  }
  if (counts.day >= c.day) {
    return { allowed: false, reason: 'per_day', retryAfterSeconds: 86400, counts, caps: c };
  }
  return { allowed: true, counts, caps: c };
}

/**
 * Increment counters AFTER a successful send. Separate from check() so the
 * caller can choose whether to count attempts or only successes.
 */
async function recordSend(phone, at) {
  if (!phone) return null;
  const keys = bucketKeys(phone, at);
  const client = getRedisClient();
  try {
    return client ? await redisIncr(client, keys) : memIncr(keys);
  } catch (err) {
    logger.warn(`[WhatsApp RL] increment failed: ${err.message}`);
    // Fall back to memory on Redis transient error rather than blocking the send.
    return memIncr(keys);
  } finally {
    if (!client) ensureCleanup();
  }
}

/**
 * Check-then-increment in one call. Returns the same shape as `check()`.
 * Recommended path for send endpoints — single call, single decision.
 *
 * Note: not strictly atomic on the in-memory path; in distributed Redis
 * mode there's still a check→incr gap. For our cap sizes (20/min minimum)
 * this is acceptable — bursts of N concurrent requests can overshoot by
 * at most N. For tighter guarantees move to Lua + EVAL.
 */
async function checkAndRecord(phone, at) {
  const decision = await check(phone, at);
  if (!decision.allowed) return decision;
  const counts = await recordSend(phone, at);
  return { ...decision, counts };
}

function reset(phone) {
  if (!phone) {
    memStore.clear();
    return;
  }
  for (const k of Array.from(memStore.keys())) {
    if (k.startsWith(`${KEY_PREFIX}${phone}:`)) memStore.delete(k);
  }
}

async function getStats(phone, at) {
  const keys = bucketKeys(phone, at);
  const client = getRedisClient();
  return client ? redisGet(client, keys) : memGet(keys);
}

module.exports = {
  check,
  recordSend,
  checkAndRecord,
  reset,
  getStats,
  // Exposed for testing only:
  _bucketKeys: bucketKeys,
  _caps: caps,
};
