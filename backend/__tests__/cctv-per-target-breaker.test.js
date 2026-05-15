'use strict';

/**
 * cctv-per-target-breaker.test.js — Phase 27 scale-up.
 *
 * Each NVR/IP gets its own circuit breaker so one bad device cannot
 * cascade-open a global breaker.
 */

jest.resetModules();
process.env.NODE_ENV = 'test';
process.env.HIKVISION_PER_TARGET_MAX_FAILURES = '3';
process.env.HIKVISION_PER_TARGET_COOLDOWN_MS = '1000';

const perTargetBreaker = require('../services/cctv/adapter/perTargetBreaker');

describe('perTargetBreaker', () => {
  beforeEach(() => perTargetBreaker.reset());

  test('returns the same breaker for the same key', () => {
    const a = perTargetBreaker.get('10.0.0.1');
    const b = perTargetBreaker.get('10.0.0.1');
    expect(a).toBe(b);
  });

  test('different keys yield different breakers', () => {
    const a = perTargetBreaker.get('10.0.0.1');
    const b = perTargetBreaker.get('10.0.0.2');
    expect(a).not.toBe(b);
  });

  test('opening one target does not open the others', () => {
    const bad = perTargetBreaker.get('10.0.0.9');
    const good = perTargetBreaker.get('10.0.0.10');
    for (let i = 0; i < 5; i++) bad.recordFailure();
    expect(bad.isOpen()).toBe(true);
    expect(good.isOpen()).toBe(false);
  });

  test('reset(key) closes a single target', () => {
    const b = perTargetBreaker.get('10.0.0.11');
    for (let i = 0; i < 5; i++) b.recordFailure();
    expect(b.isOpen()).toBe(true);
    perTargetBreaker.reset('10.0.0.11');
    // After reset the cached entry is gone — get() returns a fresh one
    const b2 = perTargetBreaker.get('10.0.0.11');
    expect(b2.isOpen()).toBe(false);
  });

  test('snapshot reports per-target state', () => {
    perTargetBreaker.get('a');
    perTargetBreaker.get('b');
    const s = perTargetBreaker.snapshot();
    expect(s.targets).toBeGreaterThanOrEqual(2);
    expect(s.breakers.a).toBeDefined();
    expect(s.breakers.b).toBeDefined();
  });
});
