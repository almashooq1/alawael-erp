/**
 * perTargetBreaker — multi-tenant wrapper over adapterCircuitBreaker.
 *
 * The existing adapterCircuitBreaker creates ONE breaker per `name`. At
 * Phase 27 scale we have 100+ NVRs across 12+ branches; if one NVR
 * misbehaves we don't want it to open a global "hikvision" breaker and
 * cascade-fail the other 99.
 *
 * This module lazily creates a fresh breaker keyed by target identifier
 * (IP, NVR code, or whatever the caller picks). Inactive breakers are
 * not retained beyond `IDLE_TTL_MS` to keep memory bounded.
 */
'use strict';

const CircuitBreaker = require('../../adapterCircuitBreaker');

function _env() {
  return (typeof process !== 'undefined' && process.env) || {};
}
function maxFailures() {
  return parseInt(_env().HIKVISION_PER_TARGET_MAX_FAILURES, 10) || 4;
}
function cooldownMs() {
  return parseInt(_env().HIKVISION_PER_TARGET_COOLDOWN_MS, 10) || 30_000;
}
function idleTtlMs() {
  return parseInt(_env().HIKVISION_BREAKER_IDLE_TTL_MS, 10) || 10 * 60_000;
}
function softCap() {
  return parseInt(_env().HIKVISION_BREAKER_SOFT_CAP, 10) || 500;
}

const breakers = new Map(); // key → { breaker, lastUsedAt }

function _safeName(key) {
  return `hikvision-target-${String(key)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64)}`;
}

function _gc() {
  if (breakers.size <= softCap()) return;
  const cutoff = Date.now() - idleTtlMs();
  for (const [k, v] of breakers.entries()) {
    if (v.lastUsedAt < cutoff) breakers.delete(k);
  }
}

function get(key) {
  if (!key) key = 'default';
  const existing = breakers.get(key);
  if (existing) {
    existing.lastUsedAt = Date.now();
    return existing.breaker;
  }
  const breaker = CircuitBreaker.create({
    name: _safeName(key),
    maxFailures: maxFailures(),
    cooldownMs: cooldownMs(),
  });
  breakers.set(key, { breaker, lastUsedAt: Date.now() });
  _gc();
  return breaker;
}

function snapshot() {
  const out = {};
  for (const [k, v] of breakers.entries()) {
    out[k] = v.breaker.snapshot();
  }
  return {
    targets: breakers.size,
    softCap: softCap(),
    maxFailures: maxFailures(),
    cooldownMs: cooldownMs(),
    breakers: out,
  };
}

function reset(key) {
  if (!key) {
    breakers.clear();
    return;
  }
  const b = breakers.get(key);
  if (b) b.breaker.reset();
}

module.exports = { get, snapshot, reset, maxFailures, cooldownMs };
