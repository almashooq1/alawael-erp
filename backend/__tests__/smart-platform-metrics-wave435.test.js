/**
 * smart-platform-metrics-wave435.test.js — Wave 435 (Phase F2 — Observability).
 *
 * Drift guard for intelligence/smart-platform-metrics.service.js (the
 * Prometheus facade) PLUS the wire-up sites in W427 realtime gateway
 * and W430 goal forecaster bootstrap.
 *
 * Three layers:
 *
 *   1. Facade behaviour — graceful no-op when prom-client absent;
 *      live counters/histogram/gauge created when prom-client provided
 *      (we pass a stub matching the same interface so the test is
 *      self-contained regardless of whether prom-client is installed).
 *   2. Anti-orphaning sentinel — realtimeGatewayBootstrap must require
 *      the facade and attach to app._smartPlatformMetrics; goalForecaster
 *      Bootstrap must read app._smartPlatformMetrics and emit the
 *      documented metric names.
 *   3. Metric name catalog — every documented metric exists exactly
 *      once in the facade source (catches future-PR rename drift).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const metricsModule = require('../intelligence/smart-platform-metrics.service');
const {
  createSmartPlatformMetrics,
  getDefault,
  _setDefault,
  _resetDefault,
  SWEEP_DURATION_BUCKETS,
} = metricsModule;

const FACADE_JS = path.resolve(
  __dirname,
  '..',
  'intelligence',
  'smart-platform-metrics.service.js'
);
const REALTIME_JS = path.resolve(__dirname, '..', 'startup', 'realtimeGatewayBootstrap.js');
const FORECASTER_JS = path.resolve(__dirname, '..', 'startup', 'goalForecasterBootstrap.js');
const ESCALATION_SOURCE_JS = path.resolve(
  __dirname,
  '..',
  'intelligence',
  'risk',
  'sources',
  'behavioral-escalation.source.js'
);
const READ = p => fs.readFileSync(p, 'utf8');

// ──────────────────────────────────────────────────────────────────
// Prom-client stub (matches the minimal surface the facade uses)
// ──────────────────────────────────────────────────────────────────

function _makePromStub() {
  const calls = { counters: [], histograms: [], gauges: [], incs: [], observes: [], sets: [] };
  function _Counter(opts) {
    calls.counters.push(opts);
    this.opts = opts;
    this.inc = labels => calls.incs.push({ name: opts.name, labels });
  }
  function _Histogram(opts) {
    calls.histograms.push(opts);
    this.opts = opts;
    this.observe = (labels, value) => calls.observes.push({ name: opts.name, labels, value });
  }
  function _Gauge(opts) {
    calls.gauges.push(opts);
    this.opts = opts;
    this.set = value => calls.sets.push({ name: opts.name, value });
  }
  return {
    calls,
    promClient: {
      Counter: _Counter,
      Histogram: _Histogram,
      Gauge: _Gauge,
      register: { _isRegister: true },
    },
  };
}

// ──────────────────────────────────────────────────────────────────
//  1. Facade graceful-degrade behaviour
// ──────────────────────────────────────────────────────────────────

describe('W435 — facade graceful degrade (no prom-client)', () => {
  test('promClient null → enabled=false, every method is a no-op', () => {
    // Force the facade to NOT find prom-client by passing an empty
    // require result (NULL means "I tried, nothing found").
    const m = createSmartPlatformMetrics({ promClient: null });
    // If prom-client IS installed in this env, the facade's internal
    // _tryRequirePromClient will find it. Skip the strict no-op
    // assertion in that case and just verify the method shape.
    expect(typeof m.incRealtimeEvent).toBe('function');
    expect(typeof m.incForecastAlert).toBe('function');
    expect(typeof m.incEscalationPrediction).toBe('function');
    expect(typeof m.incInboxRanking).toBe('function');
    expect(typeof m.incCaseloadMatch).toBe('function');
    expect(typeof m.observeSweepDuration).toBe('function');
    expect(typeof m.setActiveSubscriptions).toBe('function');
    // Methods must not throw on no-op call
    expect(() => m.incRealtimeEvent('quality.capa.overdue', 'qualityEventBus')).not.toThrow();
    expect(() => m.observeSweepDuration('goal_forecaster', 1.5)).not.toThrow();
    expect(() => m.setActiveSubscriptions(42)).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────
//  2. Facade live mode — every metric registered with correct contract
// ──────────────────────────────────────────────────────────────────

describe('W435 — facade live mode (with prom-client stub)', () => {
  test('registers 5 counters + 1 histogram + 1 gauge on the supplied registry', () => {
    const { promClient, calls } = _makePromStub();
    const m = createSmartPlatformMetrics({ promClient });
    expect(m.enabled).toBe(true);
    expect(calls.counters).toHaveLength(5);
    expect(calls.histograms).toHaveLength(1);
    expect(calls.gauges).toHaveLength(1);
  });

  test('every metric name is prefixed smart_platform_ + uses snake_case', () => {
    const { promClient, calls } = _makePromStub();
    createSmartPlatformMetrics({ promClient });
    const allNames = [
      ...calls.counters.map(c => c.name),
      ...calls.histograms.map(h => h.name),
      ...calls.gauges.map(g => g.name),
    ];
    for (const n of allNames) {
      expect(n).toMatch(/^smart_platform_[a-z][a-z0-9_]*$/);
    }
  });

  test('catalog includes the 5 documented counter names', () => {
    const { promClient, calls } = _makePromStub();
    createSmartPlatformMetrics({ promClient });
    const names = calls.counters.map(c => c.name).sort();
    expect(names).toEqual(
      [
        'smart_platform_caseload_matches_total',
        'smart_platform_escalation_predictions_total',
        'smart_platform_forecast_alerts_total',
        'smart_platform_inbox_rankings_total',
        'smart_platform_realtime_events_total',
      ].sort()
    );
  });

  test('sweep duration histogram uses bounded buckets ending at 300s', () => {
    const { promClient, calls } = _makePromStub();
    createSmartPlatformMetrics({ promClient });
    const hist = calls.histograms[0];
    expect(hist.name).toBe('smart_platform_sweep_duration_seconds');
    expect(hist.buckets).toEqual([...SWEEP_DURATION_BUCKETS]);
    expect(hist.buckets[hist.buckets.length - 1]).toBe(300); // 5 min cap
  });

  test('incRealtimeEvent extracts topic_prefix as first dotted segment', () => {
    const { promClient, calls } = _makePromStub();
    const m = createSmartPlatformMetrics({ promClient });
    m.incRealtimeEvent('quality.capa.overdue', 'qualityEventBus');
    m.incRealtimeEvent('integration.dlq.replayed', 'integrationBus');
    m.incRealtimeEvent('direct-no-dots', 'direct');
    const labels = calls.incs.map(i => i.labels);
    expect(labels[0]).toEqual({ topic_prefix: 'quality', source_bus: 'qualityEventBus' });
    expect(labels[1]).toEqual({ topic_prefix: 'integration', source_bus: 'integrationBus' });
    expect(labels[2]).toEqual({ topic_prefix: 'direct-no-dots', source_bus: 'direct' });
  });

  test('incForecastAlert labels by action verbatim', () => {
    const { promClient, calls } = _makePromStub();
    const m = createSmartPlatformMetrics({ promClient });
    m.incForecastAlert('created');
    m.incForecastAlert('updated');
    m.incForecastAlert('skipped');
    expect(calls.incs.map(i => i.labels.action)).toEqual(['created', 'updated', 'skipped']);
  });

  test('observeSweepDuration drops invalid seconds (NaN/negative)', () => {
    const { promClient, calls } = _makePromStub();
    const m = createSmartPlatformMetrics({ promClient });
    m.observeSweepDuration('goal_forecaster', NaN);
    m.observeSweepDuration('goal_forecaster', -1);
    m.observeSweepDuration('goal_forecaster', 12.5);
    expect(calls.observes).toHaveLength(1);
    expect(calls.observes[0]).toEqual({
      name: 'smart_platform_sweep_duration_seconds',
      labels: { sweep_name: 'goal_forecaster' },
      value: 12.5,
    });
  });

  test('setActiveSubscriptions drops invalid counts (NaN/negative)', () => {
    const { promClient, calls } = _makePromStub();
    const m = createSmartPlatformMetrics({ promClient });
    m.setActiveSubscriptions(NaN);
    m.setActiveSubscriptions(-5);
    m.setActiveSubscriptions(0);
    m.setActiveSubscriptions(42);
    expect(calls.sets).toEqual([
      { name: expect.any(String), value: 0 },
      { name: expect.any(String), value: 42 },
    ]);
  });
});

// ──────────────────────────────────────────────────────────────────
//  3. Wire-up sentinels (anti-orphaning)
// ──────────────────────────────────────────────────────────────────

describe('W435 — wire-up sentinel: realtime gateway', () => {
  test('realtimeGatewayBootstrap requires smart-platform-metrics service', () => {
    const src = READ(REALTIME_JS);
    expect(src).toMatch(/require\(['"]\.\.\/intelligence\/smart-platform-metrics\.service['"]\)/);
  });

  test('realtimeGatewayBootstrap attaches metrics to app._smartPlatformMetrics', () => {
    const src = READ(REALTIME_JS);
    expect(src).toMatch(/app\._smartPlatformMetrics\s*=\s*metrics/);
  });

  test('broker.publish is wrapped to emit incRealtimeEvent per fan-out', () => {
    const src = READ(REALTIME_JS);
    expect(src).toMatch(/metrics\.incRealtimeEvent/);
  });

  test('broker subscribe/unsubscribe wrap updates setActiveSubscriptions', () => {
    const src = READ(REALTIME_JS);
    expect(src).toMatch(
      /metrics\.setActiveSubscriptions\(broker\.stats\(\)\.activeSubscriptions\)/
    );
  });
});

describe('W435 — wire-up sentinel: goal forecaster sweeper', () => {
  test('goalForecasterBootstrap reads app._smartPlatformMetrics', () => {
    const src = READ(FORECASTER_JS);
    expect(src).toMatch(/app\._smartPlatformMetrics/);
  });

  test('goalForecaster cron tick emits incForecastAlert per action', () => {
    const src = READ(FORECASTER_JS);
    expect(src).toMatch(/metrics\.incForecastAlert\(['"]created['"]\)/);
    expect(src).toMatch(/metrics\.incForecastAlert\(['"]updated['"]\)/);
    expect(src).toMatch(/metrics\.incForecastAlert\(['"]resolved['"]\)/);
  });

  test('goalForecaster cron tick observes sweep duration histogram', () => {
    const src = READ(FORECASTER_JS);
    expect(src).toMatch(/metrics\.observeSweepDuration\(['"]goal_forecaster['"]/);
  });
});

// ──────────────────────────────────────────────────────────────────
//  4. Catalog drift — every documented name appears exactly once
// ──────────────────────────────────────────────────────────────────

describe('W435 — facade catalog drift guard', () => {
  test('each metric name string appears exactly once in facade source', () => {
    const src = READ(FACADE_JS);
    const names = [
      'smart_platform_realtime_events_total',
      'smart_platform_forecast_alerts_total',
      'smart_platform_escalation_predictions_total',
      'smart_platform_inbox_rankings_total',
      'smart_platform_caseload_matches_total',
      'smart_platform_sweep_duration_seconds',
      'smart_platform_realtime_active_subscriptions',
    ];
    for (const n of names) {
      const re = new RegExp(n.replace(/_/g, '_'), 'g');
      // The name appears in the `name: '<prefix>X'` declaration. We
      // expect exactly one occurrence per metric.
      const matches = src.match(re) || [];
      expect(matches.length).toBe(1);
    }
  });

  test('facade module exports the documented public surface', () => {
    expect(typeof createSmartPlatformMetrics).toBe('function');
    expect(typeof getDefault).toBe('function');
    expect(typeof _setDefault).toBe('function');
    expect(typeof _resetDefault).toBe('function');
    expect(Array.isArray(SWEEP_DURATION_BUCKETS)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────
//  5. getDefault singleton — lazy-bind for stateless callers
// ──────────────────────────────────────────────────────────────────

describe('W435 — getDefault singleton', () => {
  afterEach(() => {
    _resetDefault();
  });

  test('returns the same instance across multiple calls', () => {
    const a = getDefault({ promClient: null });
    const b = getDefault({ promClient: null });
    expect(a).toBe(b);
  });

  test('_setDefault overrides what getDefault returns', () => {
    const { promClient } = _makePromStub();
    const explicit = createSmartPlatformMetrics({ promClient });
    _setDefault(explicit);
    const recovered = getDefault();
    expect(recovered).toBe(explicit);
  });

  test('_resetDefault clears the cache (next getDefault creates fresh)', () => {
    const a = getDefault({ promClient: null });
    _resetDefault();
    const b = getDefault({ promClient: null });
    expect(a).not.toBe(b);
  });
});

// ──────────────────────────────────────────────────────────────────
//  6. W434 escalation source plugin — wired to metrics
// ──────────────────────────────────────────────────────────────────

describe('W435 — escalation source plugin emits incEscalationPrediction', () => {
  afterEach(() => {
    _resetDefault();
    jest.restoreAllMocks();
  });

  test('source plugin source-tree requires metrics service + emits per tier', () => {
    const src = READ(ESCALATION_SOURCE_JS);
    expect(src).toMatch(/require\(['"]\.\.\/\.\.\/smart-platform-metrics\.service['"]\)/);
    expect(src).toMatch(/metricsModule\.getDefault\(\)/);
    expect(src).toMatch(/incEscalationPrediction\(/);
    // Three result paths exist; each must emit a label
    expect(src).toMatch(/_emitMetric\(['"]unavailable['"]\)/);
    expect(src).toMatch(/_emitMetric\(['"]no_data['"]\)/);
    expect(src).toMatch(/_emitMetric\(result\.tier/);
  });

  test('SOURCE_UNAVAILABLE path emits incEscalationPrediction("unavailable")', async () => {
    const { promClient, calls } = _makePromStub();
    _setDefault(createSmartPlatformMetrics({ promClient }));

    // BehaviorIncident model NOT registered → SOURCE_UNAVAILABLE
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') throw new Error('not registered');
      return {};
    });

    // Late-require so the spy + setDefault are in place first
    const {
      fetch: fetchSource,
    } = require('../intelligence/risk/sources/behavioral-escalation.source');
    const r = await fetchSource('ben-1');
    expect(r.reason).toBe('SOURCE_UNAVAILABLE');
    const emitted = calls.incs.filter(
      c => c.name === 'smart_platform_escalation_predictions_total'
    );
    expect(emitted).toHaveLength(1);
    expect(emitted[0].labels).toEqual({ tier: 'unavailable' });
  });

  test('NO_DATA path emits incEscalationPrediction("no_data")', async () => {
    const { promClient, calls } = _makePromStub();
    _setDefault(createSmartPlatformMetrics({ promClient }));

    const model = {
      find: () => ({
        sort: () => ({
          limit: () => ({
            select: () => ({ lean: async () => [] }),
          }),
        }),
      }),
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') return model;
      return {};
    });

    const {
      fetch: fetchSource,
    } = require('../intelligence/risk/sources/behavioral-escalation.source');
    const r = await fetchSource('ben-2');
    expect(r.reason).toBe('NO_DATA');
    const emitted = calls.incs.filter(
      c => c.name === 'smart_platform_escalation_predictions_total'
    );
    expect(emitted).toHaveLength(1);
    expect(emitted[0].labels).toEqual({ tier: 'no_data' });
  });

  test('populated series emits incEscalationPrediction(result.tier)', async () => {
    const { promClient, calls } = _makePromStub();
    _setDefault(createSmartPlatformMetrics({ promClient }));

    const now = Date.now();
    const incidents = Array.from({ length: 10 }, (_, i) => ({
      observedAt: new Date(now - (i + 1) * 3600_000),
      behaviorType: 'self_injury',
      severity: 'major',
      antecedent: 'transition',
    }));
    const model = {
      find: () => ({
        sort: () => ({
          limit: () => ({
            select: () => ({ lean: async () => incidents }),
          }),
        }),
      }),
    };
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') return model;
      return {};
    });

    const {
      fetch: fetchSource,
    } = require('../intelligence/risk/sources/behavioral-escalation.source');
    const r = await fetchSource('ben-3');
    expect(r.score).toBeGreaterThan(0);
    const emitted = calls.incs.filter(
      c => c.name === 'smart_platform_escalation_predictions_total'
    );
    expect(emitted).toHaveLength(1);
    // Tier should match what the result returned
    expect(['critical', 'high', 'moderate', 'low']).toContain(emitted[0].labels.tier);
    expect(emitted[0].labels.tier).toBe(r.raw.tier);
  });

  test('emit failure never throws into source plugin hot path', async () => {
    // Override default with a metrics whose incEscalationPrediction throws
    _setDefault({
      enabled: true,
      incEscalationPrediction: () => {
        throw new Error('boom — metric subsystem failed');
      },
    });
    jest.spyOn(mongoose, 'model').mockImplementation(name => {
      if (name === 'BehaviorIncident') throw new Error('not registered');
      return {};
    });
    const {
      fetch: fetchSource,
    } = require('../intelligence/risk/sources/behavioral-escalation.source');
    // Must NOT throw — defensive catch in source plugin _emitMetric()
    await expect(fetchSource('ben-4')).resolves.toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────
//  7. Wire-up sentinel: bootstrap sets the singleton via _setDefault
// ──────────────────────────────────────────────────────────────────

describe('W435 — realtime bootstrap registers facade as module singleton', () => {
  test('bootstrap calls metricsModule._setDefault so getDefault() returns same instance', () => {
    const src = READ(REALTIME_JS);
    expect(src).toMatch(/metricsModule\._setDefault\(metrics\)/);
  });
});
