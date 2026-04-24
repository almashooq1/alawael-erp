/**
 * Dead Letter Queue (DLQ) — records external-integration calls that exhausted
 * every retry so an operator (or an automated replay worker) can act on them
 * later.
 *
 * Primary producers:
 *   - AclClient (ZATCA, Nafath, Madaa, Wasel, Yakeen, Absher, payment gateways)
 *   - Webhook dispatchers (HR, DDD, reporting)
 *   - Scheduled batch jobs (GOSI monthly, MoHRSD quarterly)
 *
 * Consumers:
 *   - Admin dashboard at /api/v1/admin/ops/dlq (list / inspect / replay / discard)
 *   - Scheduled replay worker (optional) that re-invokes the original callable
 *
 * Design goals:
 *   - Storage-agnostic: same in-memory / Mongo / Redis adapter contract as the
 *     idempotency store.
 *   - Safe by default: on storage failure, log but never throw — losing the
 *     ability to DLQ must not cascade into a caller-facing error.
 *   - Replayable: each entry stores enough context (integration name, endpoint,
 *     method, payload, headers, lastError) that a human or worker can replay
 *     it without reconstructing state.
 */

'use strict';

const crypto = require('crypto');
const logger = require('../utils/logger');

class InMemoryDeadLetterStore {
  constructor() {
    this._entries = new Map(); // id -> entry
  }

  async add(entry) {
    this._entries.set(entry.id, entry);
    return entry;
  }
  async get(id) {
    return this._entries.get(id) || null;
  }
  async list({ integration, status, limit = 100, offset = 0 } = {}) {
    let rows = [...this._entries.values()];
    if (integration) rows = rows.filter(r => r.integration === integration);
    if (status) rows = rows.filter(r => r.status === status);
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return { total: rows.length, rows: rows.slice(offset, offset + limit) };
  }
  async updateStatus(id, status, extra = {}) {
    const cur = this._entries.get(id);
    if (!cur) return null;
    const next = { ...cur, ...extra, status, updatedAt: Date.now() };
    this._entries.set(id, next);
    return next;
  }
  async remove(id) {
    return this._entries.delete(id);
  }
  _clear() {
    this._entries.clear();
  }
  _size() {
    return this._entries.size;
  }
}

let activeStore = new InMemoryDeadLetterStore();

// Monotonic process-lifetime counters. Never reset — Prometheus rate() does
// the right thing across process restarts. Labels: {integration, outcome}
// where outcome ∈ { parked, resolved, discarded, replay_success, replay_fail }.
const counters = new Map();
function _bump(integration, outcome) {
  const key = `${integration || 'unknown'}|${outcome}`;
  counters.set(key, (counters.get(key) || 0) + 1);
}
function snapshotCounters() {
  const rows = [];
  for (const [key, value] of counters) {
    const [integration, outcome] = key.split('|');
    rows.push({ integration, outcome, value });
  }
  return rows;
}
function _resetCountersForTests() {
  counters.clear();
}

function setStore(store) {
  const required = ['add', 'get', 'list', 'updateStatus', 'remove'];
  for (const m of required) {
    if (typeof store?.[m] !== 'function') {
      throw new Error(`deadLetterQueue: adapter must implement ${m}()`);
    }
  }
  activeStore = store;
}

function getStore() {
  return activeStore;
}

/**
 * Park a failed integration call in the DLQ.
 *
 * @param {object} call
 * @param {string} call.integration   — e.g. "nafath", "zatca", "madaa"
 * @param {string} [call.operation]   — logical action ("submitClaim", "postInvoice")
 * @param {string} [call.method]      — HTTP method
 * @param {string} [call.endpoint]    — target URL / path
 * @param {*}      [call.payload]     — request body (will be PII-redacted by caller before passing)
 * @param {object} [call.headers]
 * @param {string} [call.idempotencyKey]
 * @param {string} [call.correlationId]
 * @param {number} [call.attempts]    — how many retries were already spent
 * @param {Error|string} [call.lastError]
 * @param {object} [call.meta]        — freeform tenant/branch/user tags
 */
async function park(call) {
  const id = call.id || crypto.randomUUID();
  const entry = {
    id,
    status: 'parked',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    integration: call.integration || 'unknown',
    operation: call.operation || null,
    method: call.method || null,
    endpoint: call.endpoint || null,
    payload: call.payload ?? null,
    headers: call.headers || null,
    idempotencyKey: call.idempotencyKey || null,
    correlationId: call.correlationId || null,
    attempts: Number.isFinite(call.attempts) ? call.attempts : 0,
    lastError: _serializeError(call.lastError),
    meta: call.meta || {},
    replayCount: 0,
  };

  try {
    await activeStore.add(entry);
    _bump(entry.integration, 'parked');
    logger.warn &&
      logger.warn(
        `[DLQ] parked ${entry.integration}:${entry.operation || entry.endpoint} id=${id}`
      );
  } catch (err) {
    // Storage failure must never break the caller. Fallback log only.
    (logger.error || console.error)(
      `[DLQ] failed to park entry for ${entry.integration}: ${err.message}`
    );
  }
  return entry;
}

async function list(query) {
  return activeStore.list(query);
}

async function get(id) {
  return activeStore.get(id);
}

/**
 * Replay a parked entry by invoking the supplied callable. The callable gets
 * the original call context and must return the normal response or throw.
 *
 * The DLQ is oblivious to the integration specifics — the replay worker
 * passes in the adapter function.
 */
async function replay(id, callable) {
  if (typeof callable !== 'function') {
    throw new Error('deadLetterQueue.replay: callable required');
  }
  const entry = await activeStore.get(id);
  if (!entry) throw new Error(`DLQ entry ${id} not found`);
  if (entry.status === 'resolved') return entry;

  await activeStore.updateStatus(id, 'replaying', {});
  try {
    const result = await callable(entry);
    await activeStore.updateStatus(id, 'resolved', {
      resolvedAt: Date.now(),
      replayCount: (entry.replayCount || 0) + 1,
      lastError: null,
    });
    _bump(entry.integration, 'replay_success');
    _bump(entry.integration, 'resolved');
    return { ok: true, entry, result };
  } catch (err) {
    await activeStore.updateStatus(id, 'parked', {
      lastError: _serializeError(err),
      replayCount: (entry.replayCount || 0) + 1,
    });
    _bump(entry.integration, 'replay_fail');
    return { ok: false, entry, error: err };
  }
}

async function discard(id, reason = 'manual') {
  const r = await activeStore.updateStatus(id, 'discarded', {
    discardedAt: Date.now(),
    discardReason: reason,
  });
  if (r) _bump(r.integration, 'discarded');
  return r;
}

function _serializeError(err) {
  if (!err) return null;
  if (typeof err === 'string') return { message: err };
  return {
    message: err.message || String(err),
    code: err.code,
    status: err.status,
    name: err.name,
  };
}

module.exports = {
  InMemoryDeadLetterStore,
  setStore,
  getStore,
  park,
  list,
  get,
  replay,
  discard,
  snapshotCounters,
  _resetCountersForTests,
};
