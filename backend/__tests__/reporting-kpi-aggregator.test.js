/**
 * reporting-kpi-aggregator.test.js — Phase 10 Commit 7h.
 */

'use strict';

const {
  aggregate,
  createDefaultValueResolver,
  navigatePath,
} = require('../services/reporting/builders/kpiAggregator');

function makeRegistry(entries) {
  return {
    KPIS: entries,
    classify(kpi, value) {
      if (value == null) return 'unknown';
      if (kpi.direction === 'lower_is_better') {
        if (value <= kpi.target) return 'green';
        if (value <= kpi.warningThreshold) return 'amber';
        return 'red';
      }
      // higher_is_better
      if (value >= kpi.target) return 'green';
      if (value >= kpi.warningThreshold) return 'amber';
      return 'red';
    },
  };
}

function kpi(overrides = {}) {
  return {
    id: 'quality.incidents.mttr.critical_hours',
    nameEn: 'Incident MTTR',
    domain: 'quality',
    unit: 'hours',
    direction: 'lower_is_better',
    target: 4,
    warningThreshold: 8,
    criticalThreshold: 16,
    dataSource: { service: 'incidentsAnalyticsService', method: 'bySeverity', path: 'avg' },
    owner: 'quality_coordinator',
    compliance: ['CBAHI 8.7'],
    frequency: 'daily',
    ...overrides,
  };
}

// ─── navigatePath ─────────────────────────────────────────────────

describe('navigatePath', () => {
  test('walks simple dot-paths', () => {
    expect(navigatePath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
    expect(navigatePath({ x: 7 }, 'x')).toBe(7);
  });
  test('top-level number with empty path', () => {
    expect(navigatePath(5, '')).toBe(5);
    expect(navigatePath(5)).toBe(5);
  });
  test('returns null for missing segments', () => {
    expect(navigatePath({ a: 1 }, 'b')).toBeNull();
    expect(navigatePath(null, 'a')).toBeNull();
  });
  test('refuses bracket/JMESPath expressions', () => {
    expect(navigatePath({ x: 1 }, "[?severity=='CRITICAL'].avg")).toBeNull();
    expect(navigatePath({ x: 1 }, 'a.b[0]')).toBeNull();
  });
  test('non-number leaf returns null', () => {
    expect(navigatePath({ a: 'five' }, 'a')).toBeNull();
  });
});

// ─── aggregate ────────────────────────────────────────────────────

describe('aggregate', () => {
  test('resolves each KPI + classifies into counts', async () => {
    const registry = makeRegistry([
      kpi({ id: 'k1', target: 4, direction: 'lower_is_better' }),
      kpi({ id: 'k2', target: 4, direction: 'lower_is_better' }),
      kpi({ id: 'k3', target: 4, direction: 'lower_is_better' }),
    ]);
    const valueResolver = jest.fn(async k => {
      if (k.id === 'k1') return 3; // green
      if (k.id === 'k2') return 6; // amber
      if (k.id === 'k3') return 20; // red
      return null;
    });
    const out = await aggregate(registry, { valueResolver });
    expect(out.items).toHaveLength(3);
    expect(out.counts).toEqual({ green: 1, amber: 1, red: 1, unknown: 0 });
    expect(out.items[0]).toMatchObject({ id: 'k1', value: 3, status: 'green' });
    expect(valueResolver).toHaveBeenCalledTimes(3);
  });

  test('null / undefined value → status=unknown', async () => {
    const registry = makeRegistry([kpi({ id: 'k1' })]);
    const out = await aggregate(registry, { valueResolver: async () => null });
    expect(out.items[0].value).toBeNull();
    expect(out.items[0].status).toBe('unknown');
    expect(out.counts.unknown).toBe(1);
  });

  test('resolver that throws is caught per-KPI', async () => {
    const registry = makeRegistry([kpi({ id: 'k1' })]);
    const valueResolver = async () => {
      throw new Error('boom');
    };
    const out = await aggregate(registry, { valueResolver });
    expect(out.items[0].status).toBe('unknown');
  });

  test('filters by domain / frequency / owner / compliance / ids', async () => {
    const registry = makeRegistry([
      kpi({ id: 'q1', domain: 'quality', frequency: 'daily' }),
      kpi({ id: 'f1', domain: 'finance', frequency: 'daily' }),
      kpi({ id: 'h1', domain: 'hr', frequency: 'monthly' }),
    ]);
    const valueResolver = async () => 1;
    const byDomain = await aggregate(registry, { valueResolver, filter: { domain: 'quality' } });
    expect(byDomain.items.map(i => i.id)).toEqual(['q1']);

    const byFreq = await aggregate(registry, { valueResolver, filter: { frequency: 'monthly' } });
    expect(byFreq.items.map(i => i.id)).toEqual(['h1']);

    const byIds = await aggregate(registry, { valueResolver, filter: { ids: ['q1', 'h1'] } });
    expect(byIds.items.map(i => i.id)).toEqual(['q1', 'h1']);

    const byCompliance = await aggregate(registry, {
      valueResolver,
      filter: { compliance: 'CBAHI' },
    });
    expect(byCompliance.items.length).toBe(3); // all have CBAHI 8.7
  });

  test('never throws even when resolver is missing', async () => {
    const registry = makeRegistry([kpi({ id: 'k1' })]);
    const out = await aggregate(registry, {});
    expect(out.items[0].status).toBe('unknown');
  });
});

// ─── createDefaultValueResolver ──────────────────────────────────

describe('createDefaultValueResolver', () => {
  test('returns null when serviceLocator is absent', async () => {
    const resolve = createDefaultValueResolver({});
    expect(await resolve(kpi())).toBeNull();
  });

  test('calls service.method via .get() lookup and navigates path', async () => {
    const incidents = {
      async bySeverity(_ctx) {
        return { avg: 5.5 };
      },
    };
    const locator = {
      get(name) {
        return name === 'incidentsAnalyticsService' ? incidents : null;
      },
    };
    const resolve = createDefaultValueResolver({ serviceLocator: locator });
    const out = await resolve(kpi());
    expect(out).toBe(5.5);
  });

  test('calls service.method via direct object-property lookup (no .get)', async () => {
    const locator = {
      incidentsAnalyticsService: {
        async bySeverity() {
          return { avg: 9 };
        },
      },
    };
    const resolve = createDefaultValueResolver({ serviceLocator: locator });
    expect(await resolve(kpi())).toBe(9);
  });

  test('service missing → null', async () => {
    const resolve = createDefaultValueResolver({ serviceLocator: {} });
    expect(await resolve(kpi())).toBeNull();
  });

  test('method throws → warn + null', async () => {
    const warn = jest.fn();
    const locator = {
      incidentsAnalyticsService: {
        async bySeverity() {
          throw new Error('db down');
        },
      },
    };
    const resolve = createDefaultValueResolver({ serviceLocator: locator, logger: { warn } });
    expect(await resolve(kpi())).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  test('JMESPath-style path returns null (defers to advanced resolver)', async () => {
    const locator = {
      incidentsAnalyticsService: {
        async bySeverity() {
          return { rows: [{ avg: 5 }] };
        },
      },
    };
    const resolve = createDefaultValueResolver({ serviceLocator: locator });
    const out = await resolve(
      kpi({
        dataSource: {
          service: 'incidentsAnalyticsService',
          method: 'bySeverity',
          path: "[?x=='y'].avg",
        },
      })
    );
    expect(out).toBeNull();
  });
});
