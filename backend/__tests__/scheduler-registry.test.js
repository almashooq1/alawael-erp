'use strict';
/**
 * scheduler-registry.test.js — Wave 315
 *
 * Pure-unit coverage for the in-process scheduler registry that powers the
 * live-status column on /api/ops/schedulers.
 */

const registry = require('../intelligence/scheduler-registry');

describe('scheduler-registry (W315)', () => {
  beforeEach(() => registry._reset());

  it('register() seeds an entry with zero counters', () => {
    const e = registry.register('foo', { meta: { schedule: '* * * * *' } });
    expect(e.key).toBe('foo');
    expect(e.runs).toBe(0);
    expect(e.failures).toBe(0);
    expect(e.lastStatus).toBeNull();
    expect(e.meta).toEqual({ schedule: '* * * * *' });
    expect(typeof e.registeredAt).toBe('string');
  });

  it('register() is idempotent and preserves counters on re-registration', () => {
    registry.register('foo');
    registry.recordRun('foo', { ok: true, durationMs: 10 });
    const e = registry.register('foo', { meta: { v: 2 } });
    expect(e.runs).toBe(1);
    expect(e.meta).toEqual({ v: 2 });
  });

  it('register() rejects missing key', () => {
    expect(() => registry.register()).toThrow(/key required/);
    expect(() => registry.register(null)).toThrow(/key required/);
  });

  it('recordRun({ok:true}) updates lastStatus + increments runs only', () => {
    registry.register('foo');
    registry.recordRun('foo', { ok: true, durationMs: 42 });
    const e = registry.get('foo');
    expect(e.lastStatus).toBe('ok');
    expect(e.lastDurationMs).toBe(42);
    expect(e.runs).toBe(1);
    expect(e.failures).toBe(0);
    expect(e.lastError).toBeNull();
    expect(e.lastRunAt).toMatch(/T.*Z$/);
  });

  it('recordRun({ok:false, error}) increments runs AND failures + truncates long errors', () => {
    registry.register('foo');
    const longMsg = 'x'.repeat(600);
    registry.recordRun('foo', { ok: false, error: new Error(longMsg), durationMs: 7 });
    const e = registry.get('foo');
    expect(e.lastStatus).toBe('failed');
    expect(e.runs).toBe(1);
    expect(e.failures).toBe(1);
    expect(e.lastError).toMatch(/^x+…$/);
    expect(e.lastError.length).toBeLessThanOrEqual(501);
  });

  it('recordRun() auto-registers an unknown key', () => {
    registry.recordRun('lazy', { ok: true });
    const e = registry.get('lazy');
    expect(e).not.toBeNull();
    expect(e.runs).toBe(1);
  });

  it('getAll() returns plain object snapshots (no internal mutation)', () => {
    registry.register('a');
    registry.register('b');
    registry.recordRun('a', { ok: true });
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    all[0].runs = 999;
    expect(registry.get('a').runs).toBe(1);
  });

  it('get() returns null for unknown key', () => {
    expect(registry.get('missing')).toBeNull();
  });
});
