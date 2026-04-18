/**
 * adapterCircuitBreaker.js — reusable circuit breaker for gov adapters.
 *
 * Complements adapterRateLimiter: the rate limiter caps how many calls
 * per minute you're allowed to make; the circuit breaker trips when the
 * provider itself is failing, so you stop hammering a broken endpoint.
 *
 * Contract (matches the original GOSI implementation byte-for-byte):
 *   • Count failures in a rolling 60s window.
 *   • After `maxFailures` consecutive failures, open the circuit for
 *     `cooldownMs`. Subsequent calls return short-circuit `{ open: true }`.
 *   • On any success, reset failures and close the circuit.
 *   • `snapshot()` returns { open, failures, cooldownRemainingMs } —
 *     the exact shape the AdminGovIntegrations / AdminIntegrationsOps
 *     pages already expect inside `getConfig().circuit`.
 *
 * Usage:
 *   const CircuitBreaker = require('./adapterCircuitBreaker');
 *   const breaker = CircuitBreaker.create({
 *     name: 'absher',
 *     maxFailures: 5,
 *     cooldownMs: 120_000,
 *     windowMs: 60_000,
 *   });
 *
 *   // In your adapter's live verify path:
 *   if (breaker.isOpen()) {
 *     return { status: 'unknown', mode: 'live',
 *              message: breaker.openMessage, circuitOpen: true };
 *   }
 *   try {
 *     const r = await callUpstream(...);
 *     breaker.recordSuccess();
 *     return r;
 *   } catch (err) {
 *     breaker.recordFailure();
 *     throw err;
 *   }
 *
 *   // In getConfig():
 *   return { ..., circuit: breaker.snapshot() };
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// Registry so admin routes can look up a breaker by provider name
// without every adapter needing to export its own reset function.
const _registry = new Map();

function create({ name, maxFailures, cooldownMs, windowMs } = {}) {
  if (!name) throw new Error('adapterCircuitBreaker.create: name is required');

  const KEY = name.toUpperCase();
  const cfg = {
    maxFailures: envInt(`${KEY}_MAX_FAILURES`, maxFailures || 5),
    cooldownMs: envInt(`${KEY}_COOLDOWN_MS`, cooldownMs || 120_000),
    windowMs: envInt(`${KEY}_FAILURE_WINDOW_MS`, windowMs || 60_000),
  };

  const state = {
    failures: 0,
    firstFailureAt: 0,
    openUntil: 0,
  };

  function isOpen() {
    return state.openUntil > Date.now();
  }

  function recordFailure() {
    const now = Date.now();
    if (state.failures === 0 || now - state.firstFailureAt > cfg.windowMs) {
      state.firstFailureAt = now;
      state.failures = 1;
    } else {
      state.failures += 1;
    }
    if (state.failures >= cfg.maxFailures) {
      state.openUntil = now + cfg.cooldownMs;
    }
    return snapshot();
  }

  function recordSuccess() {
    state.failures = 0;
    state.firstFailureAt = 0;
    state.openUntil = 0;
    return snapshot();
  }

  function snapshot() {
    return {
      open: isOpen(),
      failures: state.failures,
      cooldownRemainingMs: Math.max(0, state.openUntil - Date.now()),
    };
  }

  function reset() {
    state.failures = 0;
    state.firstFailureAt = 0;
    state.openUntil = 0;
  }

  const instance = {
    name,
    cfg,
    isOpen,
    recordFailure,
    recordSuccess,
    snapshot,
    reset,
    openMessage: `مؤقت: خدمة ${name} غير متاحة (circuit breaker)`,
  };
  _registry.set(name, instance);
  return instance;
}

function get(name) {
  return _registry.get(name);
}

function list() {
  return Array.from(_registry.keys());
}

function resetByName(name) {
  const b = _registry.get(name);
  if (!b) return false;
  b.reset();
  return true;
}

function snapshotAll() {
  const out = {};
  for (const [name, b] of _registry) out[name] = b.snapshot();
  return out;
}

function _resetRegistry() {
  _registry.clear();
}

module.exports = { create, get, list, resetByName, snapshotAll, _resetRegistry };
