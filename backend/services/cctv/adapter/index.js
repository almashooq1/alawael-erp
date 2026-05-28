/**
 * CCTV adapter selector.
 *
 * Picks `mock` or `live` based on HIKVISION_MODE (default 'mock').
 * Wraps every call with the existing circuit breaker so a single misbehaving
 * NVR can't take down the whole CCTV service path.
 *
 * Public API mirrors hikvisionISAPIAdapter; the live and mock both expose the
 * same async functions and return shape `{ ok, data?, code?, message?, mode }`.
 */
'use strict';

const rateLimiter = require('../../adapterRateLimiter');
const metricsRegistry = require('../../adapterMetricsRegistry');
const adapterAuditLogger = require('../../adapterAuditLogger');
const perTargetBreaker = require('./perTargetBreaker');
const httpAgentPool = require('./httpAgentPool');

const live = require('./hikvisionISAPIAdapter');
const mock = require('./hikvisionMockAdapter');

// HIKVISION_MODE is lazy-read inside selectImpl (Phase 27 gotcha — top-level
// process.env reads break under Dynatrace agent injection).

function _targetKey(opts) {
  return opts?.ip || 'global';
}

// W548: single lazy reader for HIKVISION_MODE — keeps the env read inside a
// plain function (Dynatrace-safe per Phase 27 + detectable by the W414 guard,
// which can't see getter/`=> ({` arrow bodies) and DRY across all call sites.
function resolveMode() {
  return (process.env.HIKVISION_MODE || 'mock').toLowerCase();
}

function selectImpl() {
  const mode = resolveMode();
  if (mode === 'live') return live;
  if (mode === 'mock') return mock;
  return mock;
}

function wrap(name) {
  return async function wrapped(opts = {}) {
    const impl = selectImpl();
    if (typeof impl[name] !== 'function') {
      return {
        ok: false,
        code: 'NOT_IMPLEMENTED',
        message: `adapter has no ${name}`,
        mode: impl.mode,
      };
    }
    const key = `hikvision:${opts.ip || 'global'}:${name}`;
    if (rateLimiter && typeof rateLimiter.check === 'function') {
      const ok = await rateLimiter.check(key, { limit: 30, windowMs: 1000 }).catch(() => true);
      if (ok === false) {
        return { ok: false, code: 'RATE_LIMITED', message: 'too many calls', mode: impl.mode };
      }
    }
    const breaker = perTargetBreaker.get(_targetKey(opts));
    if (breaker.isOpen()) {
      return {
        ok: false,
        code: 'CIRCUIT_OPEN',
        message: `circuit open for target ${_targetKey(opts)}`,
        mode: impl.mode,
        target: _targetKey(opts),
      };
    }
    const start = Date.now();
    try {
      const result = await impl[name](opts);
      const latencyMs = Date.now() - start;
      if (result.ok) breaker.recordSuccess();
      else breaker.recordFailure();
      if (metricsRegistry?.observe) {
        metricsRegistry.observe(`hikvision_${name}_ms`, latencyMs, {
          mode: impl.mode,
          ok: result.ok,
        });
      }
      if (adapterAuditLogger?.log) {
        adapterAuditLogger.log({
          adapter: 'hikvision',
          op: name,
          ok: result.ok,
          latencyMs,
          target: opts.ip,
          mode: impl.mode,
        });
      }
      return { ...result, latencyMs };
    } catch (err) {
      breaker.recordFailure();
      const latencyMs = Date.now() - start;
      if (metricsRegistry?.observe) {
        metricsRegistry.observe(`hikvision_${name}_ms`, latencyMs, { mode: impl.mode, ok: false });
      }
      return {
        ok: false,
        code: err.code || 'ADAPTER_ERROR',
        message: err.message,
        mode: impl.mode,
        latencyMs,
        target: _targetKey(opts),
      };
    }
  };
}

const surface = [
  'getDeviceInfo',
  'getStatus',
  'listChannels',
  'snapshot',
  'getStreamUrl',
  'searchPlayback',
  'ptzContinuous',
  'ptzStop',
  'gotoPreset',
  'setLineDetection',
  'setFieldDetection',
  'addFaceToLib',
  'deleteFace',
  'pollEvents',
  'ping',
];

const adapter = {
  get mode() {
    return resolveMode();
  },
};
for (const fn of surface) adapter[fn] = wrap(fn);

adapter.getConfig = () => ({
  mode: resolveMode(),
  surface,
  breakers: perTargetBreaker.snapshot(),
  agents: httpAgentPool.snapshot(),
});

adapter.resetBreaker = key => perTargetBreaker.reset(key);
adapter._live = live;
adapter._mock = mock;
adapter._breaker = perTargetBreaker;
adapter._agents = httpAgentPool;

module.exports = adapter;
