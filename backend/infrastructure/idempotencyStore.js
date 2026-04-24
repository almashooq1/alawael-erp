/**
 * Idempotency Store — cache first response for an `Idempotency-Key` so that
 * retries of the same request return the exact same outcome instead of
 * re-executing side effects.
 *
 * Storage is pluggable. The default in-memory adapter is safe for single-node
 * dev/test. Production should pass a Redis- or Mongo-backed adapter via
 * `setStore()` during boot.
 *
 * Adapter contract (any object with these three methods):
 *   async get(key)          → { status, body, headers, completedAt } | null
 *   async put(key, entry, ttlMs)
 *   async reserve(key, ttlMs) → 'new' | 'pending' | 'done'
 *
 * `reserve()` is how we handle a second request arriving while the first is
 * still executing: the adapter atomically records a PENDING marker and tells
 * the caller what state the key was in.
 */

'use strict';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — ZATCA / payment providers typically retry within the day

class InMemoryIdempotencyStore {
  constructor() {
    this._entries = new Map(); // key -> { status, body, headers, completedAt, expiresAt }
    this._pending = new Map(); // key -> expiresAt (reservation only, no response yet)
  }

  async get(key) {
    this._sweep();
    const entry = this._entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this._entries.delete(key);
      return null;
    }
    return entry;
  }

  async put(key, entry, ttlMs = DEFAULT_TTL_MS) {
    this._entries.set(key, { ...entry, expiresAt: Date.now() + ttlMs });
    this._pending.delete(key);
  }

  async reserve(key, ttlMs = DEFAULT_TTL_MS) {
    this._sweep();
    if (this._entries.has(key)) return 'done';
    if (this._pending.has(key)) return 'pending';
    this._pending.set(key, Date.now() + ttlMs);
    return 'new';
  }

  async release(key) {
    this._pending.delete(key);
  }

  _sweep() {
    const now = Date.now();
    for (const [k, v] of this._entries) if (v.expiresAt <= now) this._entries.delete(k);
    for (const [k, exp] of this._pending) if (exp <= now) this._pending.delete(k);
  }

  // Testing helpers
  _size() {
    return this._entries.size;
  }
  _pendingSize() {
    return this._pending.size;
  }
  _clear() {
    this._entries.clear();
    this._pending.clear();
  }
}

let activeStore = new InMemoryIdempotencyStore();

// Monotonic counters keyed by route+outcome. Middleware bumps these.
// Outcome ∈ { hit, miss, pending_reject, invalid_key }.
const counters = new Map();
function _bump(route, outcome) {
  const key = `${route || 'unknown'}|${outcome}`;
  counters.set(key, (counters.get(key) || 0) + 1);
}
function snapshotCounters() {
  const rows = [];
  for (const [key, value] of counters) {
    const [route, outcome] = key.split('|');
    rows.push({ route, outcome, value });
  }
  return rows;
}
function _resetCountersForTests() {
  counters.clear();
}
function recordOutcome(route, outcome) {
  _bump(route, outcome);
}

function setStore(store) {
  if (
    !store ||
    typeof store.get !== 'function' ||
    typeof store.put !== 'function' ||
    typeof store.reserve !== 'function'
  ) {
    throw new Error('idempotencyStore: adapter must implement get/put/reserve');
  }
  activeStore = store;
}

function getStore() {
  return activeStore;
}

module.exports = {
  InMemoryIdempotencyStore,
  setStore,
  getStore,
  DEFAULT_TTL_MS,
  snapshotCounters,
  recordOutcome,
  _resetCountersForTests,
};
