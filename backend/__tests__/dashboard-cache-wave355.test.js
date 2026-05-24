'use strict';

/**
 * W355 — dashboard cache util drift guard.
 *
 * Pure unit tests on the cache + integration shape assertions on the 3 routes
 * that use it (heatmap / workload / executive).
 */

const fs = require('fs');
const path = require('path');

const {
  createDashboardCache,
  stableJsonKey,
  DEFAULT_MAX_ENTRIES,
  DEFAULT_TTL_MS,
} = require('../services/quality/dashboard-cache.util');

const HEATMAP_ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'branchQualityHeatmap.routes.js'),
  'utf8'
);
const WORKLOAD_ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'therapistWorkload.routes.js'),
  'utf8'
);
const EXEC_ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'executiveOnePage.routes.js'),
  'utf8'
);

describe('W355 — stableJsonKey determinism', () => {
  it('same input → same key (object key order does not matter)', () => {
    const a = stableJsonKey([{ b: 1, a: 2, c: 3 }]);
    const b = stableJsonKey([{ a: 2, c: 3, b: 1 }]);
    expect(a).toBe(b);
  });

  it('undefined args serialize to null (not omitted) so different signatures hash distinctly', () => {
    const noArgs = stableJsonKey([]);
    const undefArg = stableJsonKey([undefined]);
    expect(noArgs).not.toBe(undefArg);
    expect(undefArg).toContain('null');
  });

  it('Date instances serialize to ISO strings', () => {
    const key = stableJsonKey([{ now: new Date('2026-05-24T12:00:00Z') }]);
    expect(key).toContain('2026-05-24T12:00:00.000Z');
  });
});

describe('W355 — cache basic operations', () => {
  it('miss → undefined, then set + get returns value', () => {
    const cache = createDashboardCache({});
    expect(cache.get('k1')).toBeUndefined();
    cache.set('k1', { hello: 'world' });
    expect(cache.get('k1')).toEqual({ hello: 'world' });
  });

  it('entries expire after TTL', () => {
    let nowVal = 1000;
    const cache = createDashboardCache({ now: () => nowVal });
    cache.set('k1', 'value', 500);
    expect(cache.get('k1')).toBe('value');
    nowVal = 1600; // 600 ms later → expired
    expect(cache.get('k1')).toBeUndefined();
  });

  it('stats track hits, misses, evictions, and hitRate', () => {
    const cache = createDashboardCache({});
    cache.get('k1'); // miss
    cache.set('k1', 'v');
    cache.get('k1'); // hit
    cache.get('k1'); // hit
    const s = cache.stats();
    expect(s.hits).toBe(2);
    expect(s.misses).toBe(1);
    expect(s.hitRate).toBeCloseTo(2 / 3);
  });

  it('LRU eviction when maxEntries reached', () => {
    const cache = createDashboardCache({ maxEntries: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // should evict 'a'
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('d')).toBe(4);
    expect(cache.stats().evictions).toBe(1);
  });

  it('LRU touch: getting a key moves it to back of insertion order', () => {
    const cache = createDashboardCache({ maxEntries: 3 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // touch a → a is now newest
    cache.set('d', 4); // should evict 'b' (oldest now)
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('invalidateAll clears store + resets stats', () => {
    const cache = createDashboardCache({});
    cache.set('a', 1);
    cache.get('a');
    cache.invalidateAll();
    expect(cache.stats()).toMatchObject({ size: 0, hits: 0, misses: 0, evictions: 0 });
  });

  it('defaults expose to opts', () => {
    const cache = createDashboardCache({});
    const s = cache.stats();
    expect(s.maxEntries).toBe(DEFAULT_MAX_ENTRIES);
    expect(s.defaultTtlMs).toBe(DEFAULT_TTL_MS);
  });
});

describe('W355 — cache.wrap memoization', () => {
  it('wrapped function caches by argument signature', async () => {
    const cache = createDashboardCache({});
    let calls = 0;
    const expensive = async args => {
      calls += 1;
      return { args, calls };
    };
    const memoized = cache.wrap(expensive, { namespace: 'test' });

    const r1 = await memoized({ branchId: 'b1' });
    const r2 = await memoized({ branchId: 'b1' });
    expect(calls).toBe(1); // second call hit cache
    expect(r1).toEqual(r2);

    const r3 = await memoized({ branchId: 'b2' });
    expect(calls).toBe(2); // different args → call again
    expect(r3.args.branchId).toBe('b2');
  });

  it('wrapped function does NOT cache thrown errors (retry on next call)', async () => {
    const cache = createDashboardCache({ logger: { warn: () => {} } });
    let throws = true;
    const flaky = async () => {
      if (throws) throw new Error('boom');
      return 'ok';
    };
    const memoized = cache.wrap(flaky, { namespace: 'flaky' });
    await expect(memoized()).rejects.toThrow('boom');
    throws = false;
    await expect(memoized()).resolves.toBe('ok'); // would fail if error was cached
  });

  it('respects per-wrap ttl override', () => {
    let nowVal = 0;
    const cache = createDashboardCache({ now: () => nowVal, defaultTtlMs: 100_000 });
    const fn = async () => 'v';
    const memoized = cache.wrap(fn, { namespace: 'x', ttl: 50 });
    // synchronous-feeling test using set directly since wrap is async
    // Actual test: ttl is passed-through to set, verified via store inspection.
    // Easier to verify via behavior:
    return (async () => {
      await memoized();
      nowVal = 49;
      expect(cache.get('x::[]')).toBe('v');
      nowVal = 51;
      expect(cache.get('x::[]')).toBeUndefined();
    })();
  });

  it('namespace prevents collision between wrapped fns with identical args', async () => {
    const cache = createDashboardCache({});
    const fnA = async args => ({ src: 'A', args });
    const fnB = async args => ({ src: 'B', args });
    const ma = cache.wrap(fnA, { namespace: 'A' });
    const mb = cache.wrap(fnB, { namespace: 'B' });
    const ra = await ma({ x: 1 });
    const rb = await mb({ x: 1 });
    expect(ra.src).toBe('A');
    expect(rb.src).toBe('B');
    expect(cache.stats().size).toBe(2);
  });
});

describe('W355 — route integration: cache wired on all 3 dashboards', () => {
  it('branchQualityHeatmap route imports + wraps via createDashboardCache', () => {
    expect(HEATMAP_ROUTE_SRC).toMatch(
      /require\(\s*['"]\.\.\/\.\.\/services\/quality\/dashboard-cache\.util['"]\s*\)/
    );
    expect(HEATMAP_ROUTE_SRC).toMatch(/cache\.wrap\(\s*service\.buildHeatmap\.bind\(service\)/);
    expect(HEATMAP_ROUTE_SRC).toMatch(/namespace:\s*['"]branchHeatmap['"]/);
  });

  it('therapistWorkload route imports + wraps via createDashboardCache', () => {
    expect(WORKLOAD_ROUTE_SRC).toMatch(
      /require\(\s*['"]\.\.\/\.\.\/services\/quality\/dashboard-cache\.util['"]\s*\)/
    );
    expect(WORKLOAD_ROUTE_SRC).toMatch(/cache\.wrap\(\s*service\.buildWorkload\.bind\(service\)/);
    expect(WORKLOAD_ROUTE_SRC).toMatch(/namespace:\s*['"]therapistWorkload['"]/);
  });

  it('executiveOnePage route imports + wraps via createDashboardCache', () => {
    expect(EXEC_ROUTE_SRC).toMatch(
      /require\(\s*['"]\.\.\/\.\.\/services\/quality\/dashboard-cache\.util['"]\s*\)/
    );
    expect(EXEC_ROUTE_SRC).toMatch(/cache\.wrap\(\s*service\.build\.bind\(service\)/);
    expect(EXEC_ROUTE_SRC).toMatch(/namespace:\s*['"]executiveOnePage['"]/);
  });

  it('all 3 routes expose GET /cache/stats with tier 1', () => {
    for (const [name, src] of [
      ['heatmap', HEATMAP_ROUTE_SRC],
      ['workload', WORKLOAD_ROUTE_SRC],
      ['executive', EXEC_ROUTE_SRC],
    ]) {
      expect(src).toMatch(/router\.get\(\s*['"]\/cache\/stats['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
      // confirm the stats response includes namespace + spread of cache.stats()
      expect(src).toMatch(/cache\.stats\(\)/);
    }
  });

  it('route handlers call cached* wrapper, NOT service directly, for the build call', () => {
    expect(HEATMAP_ROUTE_SRC).toMatch(/await cachedBuildHeatmap\(/);
    expect(WORKLOAD_ROUTE_SRC).toMatch(/await cachedBuildWorkload\(/);
    expect(EXEC_ROUTE_SRC).toMatch(/await cachedBuild\(/);
  });
});
