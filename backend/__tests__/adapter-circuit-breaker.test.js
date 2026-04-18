/**
 * adapter-circuit-breaker.test.js — unit tests for the shared
 * circuit-breaker factory used by GOSI, Absher, NPHIES, and Fatoora.
 *
 * Covers:
 *   • defaults are applied when overrides are omitted
 *   • env overrides ({NAME}_MAX_FAILURES / _COOLDOWN_MS / _FAILURE_WINDOW_MS)
 *   • failure counting + rolling window
 *   • trip after N consecutive failures, open for cooldownMs
 *   • success resets the counter (closes circuit)
 *   • reset() clears state
 *   • each instance has independent state (no shared globals)
 *   • snapshot shape matches what AdminIntegrationsOps expects
 */

'use strict';

const CB = require('../services/adapterCircuitBreaker');

describe('adapterCircuitBreaker.create', () => {
  it('requires a name', () => {
    expect(() => CB.create({})).toThrow(/name is required/);
  });

  it('applies defaults when overrides are omitted', () => {
    const b = CB.create({ name: 'xtest' });
    expect(b.cfg.maxFailures).toBe(5);
    expect(b.cfg.cooldownMs).toBe(120_000);
    expect(b.cfg.windowMs).toBe(60_000);
  });

  it('honors constructor overrides', () => {
    const b = CB.create({ name: 'ytest', maxFailures: 3, cooldownMs: 1000, windowMs: 5000 });
    expect(b.cfg).toEqual({ maxFailures: 3, cooldownMs: 1000, windowMs: 5000 });
  });

  it('honors env overrides', () => {
    process.env.ZTEST_MAX_FAILURES = '2';
    process.env.ZTEST_COOLDOWN_MS = '500';
    process.env.ZTEST_FAILURE_WINDOW_MS = '2000';
    try {
      const b = CB.create({ name: 'ztest' });
      expect(b.cfg).toEqual({ maxFailures: 2, cooldownMs: 500, windowMs: 2000 });
    } finally {
      delete process.env.ZTEST_MAX_FAILURES;
      delete process.env.ZTEST_COOLDOWN_MS;
      delete process.env.ZTEST_FAILURE_WINDOW_MS;
    }
  });
});

describe('circuit behavior', () => {
  it('stays closed under threshold', () => {
    const b = CB.create({ name: 'c1', maxFailures: 3 });
    expect(b.isOpen()).toBe(false);
    b.recordFailure();
    b.recordFailure();
    expect(b.isOpen()).toBe(false);
    expect(b.snapshot().failures).toBe(2);
  });

  it('opens after N consecutive failures', () => {
    const b = CB.create({ name: 'c2', maxFailures: 3, cooldownMs: 10_000 });
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    expect(b.isOpen()).toBe(true);
    expect(b.snapshot().cooldownRemainingMs).toBeGreaterThan(0);
  });

  it('recordSuccess closes an open circuit', () => {
    const b = CB.create({ name: 'c3', maxFailures: 2, cooldownMs: 10_000 });
    b.recordFailure();
    b.recordFailure();
    expect(b.isOpen()).toBe(true);
    b.recordSuccess();
    expect(b.isOpen()).toBe(false);
    expect(b.snapshot().failures).toBe(0);
  });

  it('auto-closes after cooldown elapses', () => {
    const b = CB.create({ name: 'c4', maxFailures: 2, cooldownMs: 100 });
    b.recordFailure();
    b.recordFailure();
    expect(b.isOpen()).toBe(true);
    const realNow = Date.now;
    Date.now = () => realNow() + 200;
    try {
      expect(b.isOpen()).toBe(false);
      expect(b.snapshot().cooldownRemainingMs).toBe(0);
    } finally {
      Date.now = realNow;
    }
  });

  it('rolling window resets stale failure counter', () => {
    const b = CB.create({ name: 'c5', maxFailures: 3, windowMs: 100 });
    b.recordFailure();
    b.recordFailure();
    const realNow = Date.now;
    // Jump past the window
    Date.now = () => realNow() + 500;
    try {
      b.recordFailure();
      // Counter should have reset; we're at 1, not 3
      expect(b.isOpen()).toBe(false);
      expect(b.snapshot().failures).toBe(1);
    } finally {
      Date.now = realNow;
    }
  });

  it('reset() clears all state', () => {
    const b = CB.create({ name: 'c6', maxFailures: 2 });
    b.recordFailure();
    b.recordFailure();
    expect(b.isOpen()).toBe(true);
    b.reset();
    expect(b.isOpen()).toBe(false);
    expect(b.snapshot().failures).toBe(0);
  });
});

describe('instance isolation', () => {
  it('each instance has independent state', () => {
    const a = CB.create({ name: 'iso1', maxFailures: 2 });
    const b = CB.create({ name: 'iso2', maxFailures: 2 });
    a.recordFailure();
    a.recordFailure();
    expect(a.isOpen()).toBe(true);
    expect(b.isOpen()).toBe(false);
  });
});

describe('snapshot shape', () => {
  it('matches AdminIntegrationsOps contract', () => {
    const b = CB.create({ name: 'shape' });
    const s = b.snapshot();
    expect(s).toEqual({
      open: expect.any(Boolean),
      failures: expect.any(Number),
      cooldownRemainingMs: expect.any(Number),
    });
  });
});

describe('integration with adapters', () => {
  it('GOSI getConfig exposes breaker snapshot', () => {
    const gosi = require('../services/gosiAdapter');
    const cfg = gosi.getConfig();
    expect(cfg.circuit).toMatchObject({
      open: expect.any(Boolean),
      failures: expect.any(Number),
      cooldownRemainingMs: expect.any(Number),
    });
  });

  it('Absher getConfig exposes breaker snapshot', () => {
    const absher = require('../services/absherAdapter');
    expect(absher.getConfig().circuit).toBeDefined();
  });

  it('NPHIES getConfig exposes breaker snapshot', () => {
    const nphies = require('../services/nphiesAdapter');
    expect(nphies.getConfig().circuit).toBeDefined();
  });

  it('Fatoora getConfig exposes breaker snapshot', () => {
    const fatoora = require('../services/fatooraAdapter');
    expect(fatoora.getConfig().circuit).toBeDefined();
  });
});
