/**
 * alertStateStore.service.js — per-correlation-key state for the
 * dashboard alert coordinator.
 *
 * Phase 18 Commit 8.
 *
 * Alert coordination needs to remember, per `(policyId, kpiId,
 * branchScope)` correlation key:
 *
 *   - the current classification streak (to satisfy
 *     `trigger.minConsecutiveTicks` flapping guards)
 *   - the last time we dispatched, so we can honour `dedupWindowMs`
 *   - the current escalation-ladder step (so we don't re-page the
 *     same people every tick)
 *   - the ack/snooze/mute state (so operators can silence a known
 *     alert without disabling the underlying policy)
 *
 * This module ships an in-memory store by default. It also exposes
 * a `KEYS` helper for the coordinator and an `inspect()` method
 * for the admin HTTP surface. A Redis-backed implementation can
 * be plugged in later by matching the same public shape.
 */

'use strict';

const DEFAULT_ENTRY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_ENTRIES = 5000;

function makeCorrelationKey({ policyId, kpiId, scope }) {
  const s = scope && typeof scope === 'object' ? JSON.stringify(scope) : String(scope || '');
  return `${policyId}|${kpiId}|${s}`;
}

function createInMemoryStore({
  maxEntries = DEFAULT_MAX_ENTRIES,
  ttlMs = DEFAULT_ENTRY_TTL_MS,
  clock = { now: () => Date.now() },
} = {}) {
  const store = new Map();

  function evictExpired() {
    const now = clock.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt < now) store.delete(key);
    }
  }

  function sweepLru() {
    while (store.size > maxEntries) {
      const oldest = store.keys().next().value;
      store.delete(oldest);
    }
  }

  function get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < clock.now()) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  function upsert(key, patch) {
    const now = clock.now();
    const existing = get(key) || {
      key,
      policyId: null,
      kpiId: null,
      scope: null,
      classification: 'unknown',
      consecutiveTicks: 0,
      firstFiredAt: null,
      lastFiredAt: null,
      lastEvaluatedAt: now,
      escalationStep: -1,
      ackedAt: null,
      ackedBy: null,
      snoozeUntil: null,
      mutedUntil: null,
      muteReason: null,
    };
    const next = { ...existing, ...patch, lastEvaluatedAt: now };
    next.expiresAt = now + ttlMs;
    store.delete(key);
    store.set(key, next);
    sweepLru();
    return next;
  }

  function remove(key) {
    store.delete(key);
  }

  function list() {
    evictExpired();
    return Array.from(store.values());
  }

  function clear() {
    store.clear();
  }

  function size() {
    evictExpired();
    return store.size;
  }

  return {
    get,
    upsert,
    remove,
    list,
    clear,
    size,
    _internals: { evictExpired, sweepLru },
  };
}

module.exports = {
  createInMemoryStore,
  makeCorrelationKey,
  DEFAULT_ENTRY_TTL_MS,
  DEFAULT_MAX_ENTRIES,
};
