/**
 * adapterRateLimiter.js — per-provider token-bucket rate limiter.
 *
 * Why: Saudi government APIs (Absher, NPHIES, GOSI) charge per call.
 * A runaway loop or misconfigured cron could burn thousands of SAR in
 * an afternoon. This caps each provider's call rate independently, and
 * — critically — each individual actor's share within that pool.
 *
 * Algorithm: token bucket.
 *   • Each provider gets a bucket sized `capacity`, refilled at
 *     `refillPerMinute` tokens/min.
 *   • Each `take()` consumes 1 token or returns `false` + the number
 *     of ms until the next token is available.
 *   • Per-actor sub-bucket prevents a single actor from monopolizing
 *     the provider-level pool.
 *
 * Env tuning (per provider):
 *   {PROVIDER}_RL_CAPACITY      — bucket size (default 60)
 *   {PROVIDER}_RL_REFILL_PER_MIN — refill rate (default 30/min)
 *   {PROVIDER}_RL_ACTOR_CAP     — per-actor cap within pool (default 20)
 *
 * Sensible defaults per provider (tuned to real vendor tiers):
 *   GOSI:     60 / 30 / 20       — standard tier
 *   Absher:   30 / 10 / 5        — paid per-call, tight
 *   NPHIES:   120 / 60 / 30      — bulk claims friendly
 *   Fatoora:  600 / 600 / 200    — ZATCA allows ~10/s
 *
 * Pure in-memory — not clustered. Single-instance deployments are fine;
 * multi-instance deploys should back this with Redis (swap `buckets`
 * for a redis-backed map).
 */

'use strict';

const DEFAULTS = {
  gosi: { capacity: 60, refillPerMinute: 30, actorCap: 20 },
  scfhs: { capacity: 60, refillPerMinute: 30, actorCap: 20 },
  absher: { capacity: 30, refillPerMinute: 10, actorCap: 5 },
  qiwa: { capacity: 60, refillPerMinute: 30, actorCap: 20 },
  nafath: { capacity: 60, refillPerMinute: 60, actorCap: 10 },
  fatoora: { capacity: 600, refillPerMinute: 600, actorCap: 200 },
  muqeem: { capacity: 60, refillPerMinute: 30, actorCap: 20 },
  nphies: { capacity: 120, refillPerMinute: 60, actorCap: 30 },
  wasel: { capacity: 120, refillPerMinute: 60, actorCap: 30 },
  balady: { capacity: 60, refillPerMinute: 30, actorCap: 20 },
};

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function configFor(provider) {
  const def = DEFAULTS[provider] || { capacity: 60, refillPerMinute: 30, actorCap: 20 };
  const KEY = provider.toUpperCase();
  return {
    capacity: envInt(`${KEY}_RL_CAPACITY`, def.capacity),
    refillPerMinute: envInt(`${KEY}_RL_REFILL_PER_MIN`, def.refillPerMinute),
    actorCap: envInt(`${KEY}_RL_ACTOR_CAP`, def.actorCap),
  };
}

// buckets[provider] = { tokens, lastRefill, actorWindows: Map<actorKey, { count, windowStart }> }
const buckets = new Map();

function getBucket(provider) {
  if (!buckets.has(provider)) {
    const cfg = configFor(provider);
    buckets.set(provider, {
      tokens: cfg.capacity,
      lastRefill: Date.now(),
      cfg,
      actorWindows: new Map(),
    });
  }
  return buckets.get(provider);
}

function refill(bucket) {
  const now = Date.now();
  const elapsedMs = now - bucket.lastRefill;
  const tokensToAdd = (elapsedMs / 60_000) * bucket.cfg.refillPerMinute;
  if (tokensToAdd < 0.001) return;
  bucket.tokens = Math.min(bucket.cfg.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

function actorKey(ctx) {
  return String(ctx?.actorId || ctx?.actorEmail || ctx?.ipHash || 'anonymous').slice(0, 64);
}

/**
 * take(provider, ctx) — attempt to consume 1 token.
 * Returns { allowed: true } on success, or
 *         { allowed: false, reason, retryAfterMs, scope } on denial.
 */
function take(provider, ctx = {}) {
  const bucket = getBucket(provider);
  refill(bucket);

  // Per-actor throttle: within a 60-second rolling window, limit actorCap calls
  const aKey = actorKey(ctx);
  const now = Date.now();
  const window = bucket.actorWindows.get(aKey);
  if (window && now - window.windowStart < 60_000) {
    if (window.count >= bucket.cfg.actorCap) {
      const retryAfterMs = 60_000 - (now - window.windowStart);
      return {
        allowed: false,
        reason: `actor exceeded ${bucket.cfg.actorCap} calls/min to ${provider}`,
        retryAfterMs,
        scope: 'actor',
      };
    }
  } else {
    bucket.actorWindows.set(aKey, { count: 0, windowStart: now });
  }

  // Provider-pool token bucket
  if (bucket.tokens < 1) {
    const msPerToken = 60_000 / bucket.cfg.refillPerMinute;
    const retryAfterMs = Math.ceil((1 - bucket.tokens) * msPerToken);
    return {
      allowed: false,
      reason: `provider pool exhausted for ${provider}`,
      retryAfterMs,
      scope: 'provider',
    };
  }

  bucket.tokens -= 1;
  const aw = bucket.actorWindows.get(aKey);
  aw.count += 1;
  return { allowed: true };
}

/**
 * status(provider) — snapshot for the admin dashboard / health check.
 * Never throws; returns 'unknown' shape if provider hasn't been used.
 */
function status(provider) {
  const bucket = buckets.get(provider);
  if (!bucket) {
    const cfg = configFor(provider);
    return {
      provider,
      configured: true,
      capacity: cfg.capacity,
      refillPerMinute: cfg.refillPerMinute,
      actorCap: cfg.actorCap,
      available: cfg.capacity,
      utilization: 0,
      activeActors: 0,
    };
  }
  refill(bucket);
  const now = Date.now();
  // Prune stale actor windows (>5 min old)
  for (const [k, w] of bucket.actorWindows) {
    if (now - w.windowStart > 5 * 60_000) bucket.actorWindows.delete(k);
  }
  return {
    provider,
    configured: true,
    capacity: bucket.cfg.capacity,
    refillPerMinute: bucket.cfg.refillPerMinute,
    actorCap: bucket.cfg.actorCap,
    available: Math.floor(bucket.tokens),
    utilization: Math.round(((bucket.cfg.capacity - bucket.tokens) / bucket.cfg.capacity) * 100),
    activeActors: bucket.actorWindows.size,
  };
}

/** Reset a bucket — operator escape hatch (admin-only endpoint). */
function reset(provider) {
  const bucket = buckets.get(provider);
  if (!bucket) return;
  bucket.tokens = bucket.cfg.capacity;
  bucket.lastRefill = Date.now();
  bucket.actorWindows.clear();
}

/** Reset all buckets — for tests. */
function _resetAll() {
  buckets.clear();
}

module.exports = { take, status, reset, configFor, _resetAll, DEFAULTS };
