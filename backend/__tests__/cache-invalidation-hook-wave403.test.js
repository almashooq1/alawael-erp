'use strict';

/**
 * W403 — unit tests for the cachingService cache-invalidation hook.
 *
 * Verifies system.cache.invalidated emit on:
 *   - clear() — broadcasts every key purged
 *   - invalidateByPattern(p) — broadcasts only the matched keys
 * Quiet (no emit) when:
 *   - cache is empty at clear time
 *   - pattern matches nothing
 *
 * Pairs with the W382 ratchet (KNOWN_DEAD_CONTRACTS:
 * `system.CACHE_INVALIDATED` removed).
 *
 * The W392 LIVE-orphan guard does NOT cover this — the cache.invalidated
 * subscriber lives elsewhere (or doesn't exist yet). W403 closes the
 * producer side per the contract; subscriber wiring is independent.
 */

const CachingServiceClass = (() => {
  // Module exports a singleton; reach into the class via fresh require.
  jest.resetModules();
  const mod = require('../services/cachingService');
  return mod.constructor;
})();

function newSvc(bus) {
  return new CachingServiceClass({
    integrationBus: bus,
    ttl: 60_000,
    maxSize: 100,
    cacheModule: 'test-cache',
  });
}

function mockBus() {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

describe('W403 cachingService.cache.invalidated emit', () => {
  it('clear() emits system.cache.invalidated with every purged key', async () => {
    const bus = mockBus();
    const svc = newSvc(bus);
    svc.set('a', 1);
    svc.set('b', 2);
    svc.set('c', 3);
    svc.clear();
    await new Promise(setImmediate); // flush fire-and-forget then-chain
    expect(bus.publish).toHaveBeenCalledTimes(1);
    const [domain, eventType, envelope] = bus.publish.mock.calls[0];
    expect(domain).toBe('system');
    expect(eventType).toBe('cache.invalidated');
    expect(envelope.keys.sort()).toEqual(['a', 'b', 'c']);
    expect(envelope.reason).toBe('clear');
    expect(envelope.module).toBe('test-cache');
  });

  it('clear() is silent when the cache is already empty', async () => {
    const bus = mockBus();
    const svc = newSvc(bus);
    svc.clear();
    await new Promise(setImmediate);
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('invalidateByPattern() emits only when at least one key matched', async () => {
    const bus = mockBus();
    const svc = newSvc(bus);
    svc.set('report_1', 'a');
    svc.set('report_2', 'b');
    svc.set('filter_x', 'c');

    const matched = svc.invalidateByPattern('report_');
    expect(matched).toBe(2);
    await new Promise(setImmediate);
    expect(bus.publish).toHaveBeenCalledTimes(1);
    const [, , envelope] = bus.publish.mock.calls[0];
    expect(envelope.keys.sort()).toEqual(['report_1', 'report_2']);
    expect(envelope.reason).toBe('pattern:report_');
    expect(envelope.module).toBe('test-cache');
  });

  it('invalidateByPattern() is silent when no keys matched', async () => {
    const bus = mockBus();
    const svc = newSvc(bus);
    svc.set('a', 1);
    const n = svc.invalidateByPattern('zzz');
    expect(n).toBe(0);
    await new Promise(setImmediate);
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('delete() of a single key is NOT a publish trigger (avoids TTL/LRU spam)', async () => {
    const bus = mockBus();
    const svc = newSvc(bus);
    svc.set('a', 1);
    svc.delete('a');
    await new Promise(setImmediate);
    expect(bus.publish).not.toHaveBeenCalled();
  });

  it('bus publish failure does NOT throw inside clear() / invalidateByPattern()', () => {
    const bus = { publish: jest.fn().mockRejectedValue(new Error('bus down')) };
    const svc = newSvc(bus);
    svc.set('a', 1);
    expect(() => svc.clear()).not.toThrow();
  });

  it('falls back to lazy-loaded integrationBus when not injected (no throw)', () => {
    const svc = new CachingServiceClass({ ttl: 60_000, maxSize: 100 });
    svc.set('a', 1);
    expect(() => svc.clear()).not.toThrow();
  });
});
