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

const CircuitBreaker = require('../../adapterCircuitBreaker');
const rateLimiter = require('../../adapterRateLimiter');
const metricsRegistry = require('../../adapterMetricsRegistry');
const adapterAuditLogger = require('../../adapterAuditLogger');

const live = require('./hikvisionISAPIAdapter');
const mock = require('./hikvisionMockAdapter');

const MODE = (process.env.HIKVISION_MODE || 'mock').toLowerCase();

const breaker = CircuitBreaker.create({
  name: 'hikvision',
  maxFailures: parseInt(process.env.HIKVISION_BREAKER_MAX_FAILURES, 10) || 5,
  cooldownMs: parseInt(process.env.HIKVISION_BREAKER_COOLDOWN_MS, 10) || 60_000,
});

function selectImpl() {
  if (MODE === 'live') return live;
  if (MODE === 'mock') return mock;
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
    if (breaker.isOpen()) {
      return { ok: false, code: 'CIRCUIT_OPEN', message: breaker.openMessage, mode: impl.mode };
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

const adapter = { mode: MODE };
for (const fn of surface) adapter[fn] = wrap(fn);

adapter.getConfig = () => ({
  mode: MODE,
  surface,
  breaker: breaker.snapshot ? breaker.snapshot() : { name: 'hikvision' },
});

adapter._live = live;
adapter._mock = mock;
adapter._breaker = breaker;

module.exports = adapter;
