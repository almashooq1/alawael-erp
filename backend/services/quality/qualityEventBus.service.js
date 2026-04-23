'use strict';

/**
 * qualityEventBus.service.js — Phase 13 Commit 5 (4.0.62).
 *
 * Thin, in-process pub/sub for `quality.*` and `compliance.*`
 * events. Drop-in-compatible with the `{ emit(name, payload) }`
 * dispatcher contract every Phase 13 service already accepts, so
 * the bootstrap can hand one bus to every service and subscribers
 * register once, centrally.
 *
 * Why a dedicated bus instead of just using Node's `EventEmitter`?
 *
 *   1. **Wildcard prefix matching** — listeners subscribe to
 *      `quality.review.*` or `compliance.evidence.*` rather than
 *      one exact event name. Cross-module adapters (C7 NCR chain,
 *      future integrations) care about families of events, not
 *      specific ones.
 *
 *   2. **Async listener safety** — a thrown or rejected listener
 *      must NEVER break event emission for other listeners. The
 *      bus wraps each call in try/catch and logs; an integration
 *      bug can't cascade into a transaction failure.
 *
 *   3. **Replay + wait** — tests can `await bus.flush()` to wait
 *      for all in-flight listeners to settle before asserting side
 *      effects. Native EventEmitter provides no such guarantee.
 *
 *   4. **Observable** — the bus keeps a ring buffer of the most
 *      recent N events for ops + debugging; visible via
 *      `bus.recent()` and optionally mountable at an admin route.
 */

const DEFAULT_RECENT_BUFFER = 200;

class QualityEventBus {
  constructor({ logger = console, recentBufferSize = DEFAULT_RECENT_BUFFER } = {}) {
    this.logger = logger;
    this._listeners = new Map(); // pattern string → Set<fn>
    this._recent = [];
    this._recentMax = recentBufferSize;
    this._pending = 0;
    this._pendingResolvers = [];
  }

  /**
   * Subscribe to events matching a pattern. Returns an
   * unsubscribe function. Patterns:
   *
   *   'quality.review.closed'   — exact match
   *   'quality.review.*'        — any event under quality.review.
   *   'quality.*'               — any quality.* event
   *   '*'                       — all events
   */
  on(pattern, fn) {
    if (typeof pattern !== 'string') throw new TypeError('pattern must be a string');
    if (typeof fn !== 'function') throw new TypeError('listener must be a function');
    if (!this._listeners.has(pattern)) this._listeners.set(pattern, new Set());
    this._listeners.get(pattern).add(fn);
    return () => this.off(pattern, fn);
  }

  off(pattern, fn) {
    const set = this._listeners.get(pattern);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) this._listeners.delete(pattern);
  }

  /**
   * Emit an event. Listeners fire concurrently but we track their
   * completion so `flush()` can wait for them. A thrown listener
   * is logged; the rest proceed.
   *
   * Contract matches the dispatcher DI used by every Phase 13
   * service — just pass the bus as the `dispatcher`.
   */
  async emit(name, payload) {
    if (typeof name !== 'string') throw new TypeError('event name required');
    this._recordRecent(name, payload);

    const matching = this._matchingListeners(name);
    if (!matching.length) return { dispatched: 0 };

    const task = Promise.allSettled(matching.map(fn => this._safeInvoke(fn, name, payload)));
    this._pending++;
    task.then(() => {
      this._pending--;
      if (this._pending === 0) {
        const rs = this._pendingResolvers.splice(0);
        for (const r of rs) r();
      }
    });

    // Return synchronously-ish — we don't await the listeners so
    // the emitter isn't blocked, but tests can `await bus.flush()`.
    return { dispatched: matching.length };
  }

  /**
   * Resolve once every in-flight listener has settled. Used in
   * tests and in the bootstrap's graceful-shutdown hook so we
   * don't drop events on the way out.
   */
  flush() {
    if (this._pending === 0) return Promise.resolve();
    return new Promise(resolve => this._pendingResolvers.push(resolve));
  }

  /**
   * Most-recent emitted events (newest-first). Useful for ops +
   * debugging; bounded by `recentBufferSize`.
   */
  recent(limit = 50) {
    return this._recent.slice(0, Math.min(limit, this._recent.length));
  }

  /**
   * Subscriber list snapshot (patterns + counts) — diagnostic use.
   */
  subscribers() {
    const out = {};
    for (const [pattern, set] of this._listeners.entries()) {
      out[pattern] = set.size;
    }
    return out;
  }

  // ── internals ──────────────────────────────────────────────────

  _recordRecent(name, payload) {
    this._recent.unshift({ name, payload, at: new Date() });
    if (this._recent.length > this._recentMax) {
      this._recent.length = this._recentMax;
    }
  }

  _matchingListeners(name) {
    const result = [];
    for (const [pattern, set] of this._listeners.entries()) {
      if (_matches(pattern, name)) {
        for (const fn of set) result.push(fn);
      }
    }
    return result;
  }

  async _safeInvoke(fn, name, payload) {
    try {
      await fn(payload, name);
    } catch (err) {
      this.logger.warn(`[EventBus] listener for ${name} failed: ${err.message}`);
    }
  }
}

/**
 * Pattern matcher. Supports:
 *   exact:       "a.b.c"  matches only "a.b.c"
 *   star suffix: "a.b.*"  matches "a.b.c" and "a.b.c.d"
 *   wildcard:    "*"      matches everything
 */
function _matches(pattern, name) {
  if (pattern === '*') return true;
  if (pattern === name) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return name === prefix || name.startsWith(prefix + '.');
  }
  return false;
}

// ── factory + singleton ────────────────────────────────────────────

function createQualityEventBus(opts) {
  return new QualityEventBus(opts);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    _defaultInstance = new QualityEventBus();
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  QualityEventBus,
  createQualityEventBus,
  getDefault,
  _replaceDefault,
  _matches, // exported for targeted unit tests
};
