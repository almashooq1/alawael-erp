/**
 * Redis idempotency adapter — durable multi-node replacement for the
 * in-memory idempotency store.
 *
 * Keys:
 *   idem:done:<key>      — JSON of the completed response entry (TTL-bound)
 *   idem:pending:<key>   — marker placed by reserve() while a request is
 *                          in flight on some worker (TTL-bound, shorter so
 *                          a crashed worker doesn't permanently lock a key)
 *
 * Contract matches `idempotencyStore.setStore`:
 *   get(key)              → entry | null
 *   put(key, entry, ttlMs)
 *   reserve(key, ttlMs)   → 'new' | 'pending' | 'done'
 *   release(key)          (best-effort, used when we decide not to cache a 5xx)
 *
 * The adapter treats any ioredis-compatible client, so it works with real
 * Redis in production AND with a stub in tests (we expose an in-memory stub
 * via `createInMemory()` so Redis tests can run without a live server).
 */

'use strict';

const DONE_PREFIX = 'idem:done:';
const PEND_PREFIX = 'idem:pending:';
const DEFAULT_PENDING_TTL_MS = 5 * 60 * 1000; // 5 min — worker crash safety net

class RedisIdempotencyStore {
  constructor(client, { pendingTtlMs = DEFAULT_PENDING_TTL_MS } = {}) {
    if (!client) throw new Error('RedisIdempotencyStore: client is required');
    this.client = client;
    this.pendingTtlMs = pendingTtlMs;
  }

  async get(key) {
    const raw = await this.client.get(DONE_PREFIX + key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupt row — drop it so the request proceeds normally.
      await this.client.del(DONE_PREFIX + key).catch(() => {});
      return null;
    }
  }

  async put(key, entry, ttlMs) {
    const payload = JSON.stringify(entry);
    await this.client.set(DONE_PREFIX + key, payload, 'PX', ttlMs);
    await this.client.del(PEND_PREFIX + key).catch(() => {});
  }

  async reserve(key, _ttlMs) {
    const done = await this.client.exists(DONE_PREFIX + key);
    if (done) return 'done';
    // SET NX PX — atomic reserve. Returns OK if we won the race, null if someone else did.
    const res = await this.client.set(PEND_PREFIX + key, '1', 'NX', 'PX', this.pendingTtlMs);
    if (res === 'OK') return 'new';
    return 'pending';
  }

  async release(key) {
    await this.client.del(PEND_PREFIX + key).catch(() => {});
  }
}

/**
 * In-memory stub that implements the subset of the ioredis interface this
 * adapter uses. Handy for tests that want to exercise the adapter logic
 * without running a real Redis server.
 */
function createInMemory() {
  const store = new Map(); // key -> { value, expiresAt }

  function _sweep() {
    const now = Date.now();
    for (const [k, v] of store) if (v.expiresAt <= now) store.delete(k);
  }

  return {
    async get(k) {
      _sweep();
      const v = store.get(k);
      return v ? v.value : null;
    },
    async set(k, value, modeA, ttlA, modeB) {
      // Support `SET k v PX ms` and `SET k v NX PX ms`
      const flags = [modeA, modeB].filter(Boolean).map(x => String(x).toUpperCase());
      const ttlIdx = flags.indexOf('PX');
      const ttl = ttlIdx >= 0 ? Number([ttlA, modeB][ttlIdx === 0 ? 0 : 0]) : null; // simplified: only one PX
      const nx = flags.includes('NX');
      _sweep();
      if (nx && store.has(k)) return null;
      const effectiveTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : 24 * 60 * 60 * 1000;
      store.set(k, { value, expiresAt: Date.now() + effectiveTtl });
      return 'OK';
    },
    async exists(k) {
      _sweep();
      return store.has(k) ? 1 : 0;
    },
    async del(k) {
      return store.delete(k) ? 1 : 0;
    },
    _size: () => store.size,
    _clear: () => store.clear(),
  };
}

function create(client, opts) {
  return new RedisIdempotencyStore(client, opts);
}

module.exports = { RedisIdempotencyStore, create, createInMemory };
