'use strict';

/**
 * Wave 211 — Interop Operations Center backend tests.
 *
 * Pure unit tests against the factory contracts. Models are replaced with
 * in-memory mocks that mimic the Mongoose surface used by the services:
 * create / find / findOne / findOneAndUpdate / updateOne / countDocuments.
 *
 * Covers:
 *   - integrationTrendRecorder.service (bucket alignment, percentile estimation,
 *     sample shape, write dedup, series + deltas)
 *   - integrationAlertEngine.service (rule firing, idempotent open, auto-resolve,
 *     ack/resolve lifecycle, scheduler-stall first-boot exemption)
 *   - interopOperationsScheduler (tick orchestration, fail-isolation)
 */

const createTrendRecorder = require('../services/integrationTrendRecorder.service');
const {
  alignToBucket,
  approxPercentile,
  buildSampleForIntegration,
  BUCKET_MS,
} = require('../services/integrationTrendRecorder.service');
const createAlertEngine = require('../services/integrationAlertEngine.service');
const createInteropScheduler = require('../services/interopOperationsScheduler');

const NOW = new Date('2026-06-01T10:00:00Z');

// ── In-memory Mongoose-compat model factory ──────────────────────────────
function makeModelMock({ uniqueKey } = {}) {
  const docs = [];
  let idSeq = 1;

  function matches(doc, filter) {
    for (const [k, v] of Object.entries(filter || {})) {
      const docVal = doc[k];
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('$gte' in v && !(docVal >= v.$gte)) return false;
        if ('$gt' in v && !(docVal > v.$gt)) return false;
        if ('$lte' in v && !(docVal <= v.$lte)) return false;
        if ('$lt' in v && !(docVal < v.$lt)) return false;
        if ('$in' in v && !v.$in.includes(docVal)) return false;
      } else if (docVal !== v) {
        return false;
      }
    }
    return true;
  }

  function uniqueViolation(doc) {
    if (!uniqueKey) return false;
    return docs.some(d =>
      uniqueKey.every(k => {
        if (k === 'status' && d.status !== 'open') return false; // partial index
        const a = d[k] instanceof Date ? d[k].getTime() : d[k];
        const b = doc[k] instanceof Date ? doc[k].getTime() : doc[k];
        return a === b;
      })
    );
  }

  function chainable(items, opts = {}) {
    const sorted = items.slice();
    let limit = Infinity;
    let skip = 0;
    const single = !!opts.single;
    const project = () => {
      const list = sorted.slice(skip, skip + (single ? 1 : limit));
      return single ? list[0] || null : list;
    };
    const chain = {
      sort(s) {
        const [key, dir] = Object.entries(s)[0];
        sorted.sort((a, b) => {
          const av = a[key] instanceof Date ? a[key].getTime() : a[key];
          const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
          if (av < bv) return dir < 0 ? 1 : -1;
          if (av > bv) return dir < 0 ? -1 : 1;
          return 0;
        });
        return chain;
      },
      limit(n) {
        limit = n;
        return chain;
      },
      skip(n) {
        skip = n;
        return chain;
      },
      lean() {
        return Promise.resolve(project());
      },
      then(resolve, reject) {
        return Promise.resolve(project()).then(resolve, reject);
      },
    };
    return chain;
  }

  const Model = {
    _docs: docs,
    async create(input) {
      if (uniqueViolation(input)) {
        const err = new Error('duplicate key');
        err.code = 11000;
        throw err;
      }
      const doc = {
        _id: 'doc_' + idSeq++,
        ...input,
      };
      docs.push(doc);
      return doc;
    },
    find(filter = {}) {
      const items = docs.filter(d => matches(d, filter));
      return chainable(items);
    },
    findOne(filter = {}) {
      const items = docs.filter(d => matches(d, filter));
      return chainable(items, { single: true });
    },
    findOneAndUpdate(filter, update, opts = {}) {
      // Real Mongoose returns a Query that's both thenable AND chainable with
      // .lean(). The mock mirrors that surface so service code can keep its
      // `.findOneAndUpdate(...).lean()` chain.
      const exec = () => {
        const idx = docs.findIndex(d => matches(d, filter));
        if (idx < 0) return null;
        const set = (update && update.$set) || {};
        docs[idx] = { ...docs[idx], ...set };
        return opts.new === false ? null : docs[idx];
      };
      const result = exec();
      return {
        lean: () => Promise.resolve(result),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
    },
    async updateOne(filter, update) {
      const idx = docs.findIndex(d => matches(d, filter));
      if (idx < 0) return { modifiedCount: 0 };
      const set = (update && update.$set) || {};
      const inc = (update && update.$inc) || {};
      docs[idx] = { ...docs[idx], ...set };
      for (const [k, v] of Object.entries(inc)) {
        docs[idx][k] = (docs[idx][k] || 0) + v;
      }
      return { modifiedCount: 1 };
    },
    async countDocuments(filter = {}) {
      return docs.filter(d => matches(d, filter)).length;
    },
  };
  return Model;
}

// ── Aggregator mock ──────────────────────────────────────────────────────
function makeAggregatorMock(overrides = {}) {
  return {
    ADAPTER_NAMES: ['gosi', 'absher'],
    buildSnapshot: jest.fn().mockImplementation(() => ({
      generatedAt: new Date().toISOString(),
      durationMs: 1,
      overall: 'healthy',
      adapters: [
        {
          name: 'gosi',
          mode: 'live',
          configured: true,
          missing: [],
          circuitOpen: false,
          circuitFailures: 0,
          circuitCooldownMs: 0,
        },
        {
          name: 'absher',
          mode: 'mock',
          configured: true,
          missing: [],
          circuitOpen: false,
          circuitFailures: 0,
          circuitCooldownMs: 0,
        },
      ],
      dlq: { totals: {}, byIntegration: {} },
      idempotency: { totals: {}, topRoutes: [] },
      ...overrides,
    })),
  };
}

function makeMetricsRegistryMock(counters = {}, latency = {}) {
  return {
    snapshotCounters: jest.fn().mockReturnValue(counters),
    snapshotLatency: jest.fn().mockReturnValue(latency),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Pure helper functions
// ═══════════════════════════════════════════════════════════════════════════

describe('Wave 211 — alignToBucket', () => {
  test('snaps to nearest 5-minute UTC floor', () => {
    const d = new Date('2026-06-01T10:03:27.123Z');
    const aligned = alignToBucket(d, BUCKET_MS);
    expect(aligned.toISOString()).toBe('2026-06-01T10:00:00.000Z');
  });

  test('bucket boundary stays put', () => {
    const d = new Date('2026-06-01T10:05:00.000Z');
    expect(alignToBucket(d, BUCKET_MS).toISOString()).toBe('2026-06-01T10:05:00.000Z');
  });

  test('honors custom bucket size', () => {
    const d = new Date('2026-06-01T10:11:00.000Z');
    expect(alignToBucket(d, 60_000).toISOString()).toBe('2026-06-01T10:11:00.000Z');
    expect(alignToBucket(d, 600_000).toISOString()).toBe('2026-06-01T10:10:00.000Z');
  });
});

describe('Wave 211 — approxPercentile', () => {
  const buckets = [
    { le: 50, count: 80 },
    { le: 200, count: 15 },
    { le: 1000, count: 4 },
    { le: 5000, count: 1 },
    { le: Infinity, count: 0 },
  ];
  const total = 100;

  test('returns null on empty input', () => {
    expect(approxPercentile([], 0, 0.5)).toBeNull();
    expect(approxPercentile(buckets, 0, 0.5)).toBeNull();
  });

  test('p50 lands inside first bucket', () => {
    const p50 = approxPercentile(buckets, total, 0.5);
    expect(p50).not.toBeNull();
    expect(p50).toBeGreaterThan(0);
    expect(p50).toBeLessThanOrEqual(50);
  });

  test('p95 lands in second bucket', () => {
    const p95 = approxPercentile(buckets, total, 0.95);
    expect(p95).toBeGreaterThan(50);
    expect(p95).toBeLessThanOrEqual(200);
  });

  test('p99 lands in third bucket', () => {
    const p99 = approxPercentile(buckets, total, 0.99);
    expect(p99).toBeGreaterThan(200);
    expect(p99).toBeLessThanOrEqual(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. buildSampleForIntegration
// ═══════════════════════════════════════════════════════════════════════════

describe('Wave 211 — buildSampleForIntegration', () => {
  test('builds full sample with all snapshots populated', () => {
    const sample = buildSampleForIntegration({
      integration: 'gosi',
      adapterEntry: {
        name: 'gosi',
        mode: 'live',
        configured: true,
        circuitOpen: false,
        circuitFailures: 0,
        circuitCooldownMs: 0,
      },
      dlqByIntegration: {
        gosi: { parked: 10, resolved: 3, discarded: 1, replay_success: 5, replay_fail: 2 },
      },
      latencyForIntegration: {
        count: 50,
        sum: 1000,
        buckets: [
          { le: 50, count: 40 },
          { le: 200, count: 8 },
          { le: 1000, count: 2 },
          { le: 5000, count: 0 },
          { le: Infinity, count: 0 },
        ],
      },
      counterSnapshot: { gosi: { success: 80, failed: 5, rate_limited: 3 } },
      rateLimiterStatus: { utilization: 42 },
      capturedAt: NOW,
    });
    expect(sample.integration).toBe('gosi');
    expect(sample.mode).toBe('live');
    expect(sample.circuitOpen).toBe(false);
    expect(sample.callsSuccessCumul).toBe(80);
    expect(sample.callsFailedCumul).toBe(5);
    expect(sample.dlqParkedNet).toBe(6); // 10 - 3 - 1
    expect(sample.rateLimitUtilizationPct).toBe(42);
    expect(sample.latencyP50Ms).not.toBeNull();
  });

  test('defaults sensibly when DLQ + counters absent', () => {
    const sample = buildSampleForIntegration({
      integration: 'absher',
      adapterEntry: { name: 'absher', mode: 'mock', configured: true },
      dlqByIntegration: {},
      latencyForIntegration: null,
      counterSnapshot: {},
      rateLimiterStatus: null,
      capturedAt: NOW,
    });
    expect(sample.dlqParkedNet).toBe(0);
    expect(sample.callsSuccessCumul).toBe(0);
    expect(sample.latencyP50Ms).toBeNull();
    expect(sample.rateLimitUtilizationPct).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Trend recorder service
// ═══════════════════════════════════════════════════════════════════════════

describe('Wave 211 — integrationTrendRecorder', () => {
  test('factory rejects missing IntegrationTrendSample', () => {
    expect(() =>
      createTrendRecorder({
        aggregator: makeAggregatorMock(),
        metricsRegistry: makeMetricsRegistryMock(),
      })
    ).toThrow(/IntegrationTrendSample/);
  });

  test('factory rejects missing aggregator', () => {
    expect(() =>
      createTrendRecorder({
        IntegrationTrendSample: makeModelMock(),
        metricsRegistry: makeMetricsRegistryMock(),
      })
    ).toThrow(/aggregator/);
  });

  test('factory rejects missing metricsRegistry', () => {
    expect(() =>
      createTrendRecorder({
        IntegrationTrendSample: makeModelMock(),
        aggregator: makeAggregatorMock(),
      })
    ).toThrow(/metricsRegistry/);
  });

  test('recordOnce writes one doc per adapter', async () => {
    const Model = makeModelMock({ uniqueKey: ['integration', 'capturedAt'] });
    const recorder = createTrendRecorder({
      IntegrationTrendSample: Model,
      aggregator: makeAggregatorMock(),
      metricsRegistry: makeMetricsRegistryMock(),
    });
    const summary = await recorder.recordOnce({ now: NOW });
    expect(summary.written).toBe(2);
    expect(summary.deduped).toBe(0);
    expect(summary.errors).toBe(0);
    expect(Model._docs).toHaveLength(2);
    const names = Model._docs.map(d => d.integration).sort();
    expect(names).toEqual(['absher', 'gosi']);
  });

  test('recordOnce treats E11000 as deduped (not error)', async () => {
    const Model = makeModelMock({ uniqueKey: ['integration', 'capturedAt'] });
    const recorder = createTrendRecorder({
      IntegrationTrendSample: Model,
      aggregator: makeAggregatorMock(),
      metricsRegistry: makeMetricsRegistryMock(),
    });
    await recorder.recordOnce({ now: NOW });
    const summary2 = await recorder.recordOnce({ now: NOW }); // same bucket
    expect(summary2.deduped).toBe(2);
    expect(summary2.written).toBe(0);
    expect(Model._docs).toHaveLength(2); // no duplicates
  });

  test('getSeries returns rows with computed per-bucket deltas', async () => {
    const Model = makeModelMock();
    // Seed two samples: process restart between them (negative raw delta).
    Model._docs.push(
      {
        _id: '1',
        integration: 'gosi',
        capturedAt: new Date('2026-06-01T10:00:00Z'),
        callsSuccessCumul: 100,
        callsFailedCumul: 5,
        callsRateLimitedCumul: 0,
        dlqParkedCumul: 0,
        circuitOpen: false,
      },
      {
        _id: '2',
        integration: 'gosi',
        capturedAt: new Date('2026-06-01T10:05:00Z'),
        callsSuccessCumul: 130,
        callsFailedCumul: 7,
        callsRateLimitedCumul: 1,
        dlqParkedCumul: 2,
        circuitOpen: false,
      },
      {
        _id: '3',
        integration: 'gosi',
        capturedAt: new Date('2026-06-01T10:10:00Z'),
        // Restart — counters reset to 10/0/0/0
        callsSuccessCumul: 10,
        callsFailedCumul: 0,
        callsRateLimitedCumul: 0,
        dlqParkedCumul: 0,
        circuitOpen: false,
      }
    );
    const recorder = createTrendRecorder({
      IntegrationTrendSample: Model,
      aggregator: makeAggregatorMock(),
      metricsRegistry: makeMetricsRegistryMock(),
    });
    const res = await recorder.getSeries({
      integration: 'gosi',
      since: new Date('2026-06-01T09:00:00Z'),
      until: new Date('2026-06-01T11:00:00Z'),
    });
    expect(res.count).toBe(3);
    expect(res.series[0].deltaSuccess).toBeNull(); // first sample = no prev
    expect(res.series[1].deltaSuccess).toBe(30);
    expect(res.series[1].deltaFailed).toBe(2);
    // Process restart → max(0, 10-130) = 0
    expect(res.series[2].deltaSuccess).toBe(0);
  });

  test('getSeries throws without integration', async () => {
    const recorder = createTrendRecorder({
      IntegrationTrendSample: makeModelMock(),
      aggregator: makeAggregatorMock(),
      metricsRegistry: makeMetricsRegistryMock(),
    });
    await expect(recorder.getSeries({})).rejects.toThrow(/integration/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Alert engine — rule unit tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Wave 211 — integrationAlertEngine rules', () => {
  function makeEngine({ alertDocs = [], trendDocs = [], aggregator } = {}) {
    const Alert = makeModelMock({ uniqueKey: ['integration', 'ruleCode', 'status'] });
    Alert._docs.push(...alertDocs);
    const Trend = makeModelMock();
    Trend._docs.push(...trendDocs);
    return {
      Alert,
      Trend,
      engine: createAlertEngine({
        IntegrationAlert: Alert,
        IntegrationTrendSample: Trend,
        aggregator: aggregator || makeAggregatorMock(),
      }),
    };
  }

  test('factory rejects missing deps', () => {
    expect(() =>
      createAlertEngine({
        IntegrationTrendSample: makeModelMock(),
        aggregator: makeAggregatorMock(),
      })
    ).toThrow(/IntegrationAlert/);
    expect(() =>
      createAlertEngine({
        IntegrationAlert: makeModelMock(),
        aggregator: makeAggregatorMock(),
      })
    ).toThrow(/IntegrationTrendSample/);
    expect(() =>
      createAlertEngine({
        IntegrationAlert: makeModelMock(),
        IntegrationTrendSample: makeModelMock(),
      })
    ).toThrow(/aggregator/);
  });

  test('ruleCircuitOpen fires only when circuit is open', () => {
    const { engine } = makeEngine();
    expect(
      engine._rules.ruleCircuitOpen({ name: 'gosi', circuitOpen: false, circuitFailures: 0 })
    ).toBeNull();
    const firing = engine._rules.ruleCircuitOpen({
      name: 'gosi',
      circuitOpen: true,
      circuitFailures: 7,
      circuitCooldownMs: 1000,
    });
    expect(firing.code).toBe('CIRCUIT_OPEN');
    expect(firing.severity).toBe('critical');
    expect(firing.observed.failures).toBe(7);
  });

  test('ruleDlqBuildup escalates from warn → critical', () => {
    const { engine } = makeEngine();
    const dlqSmall = { byIntegration: { gosi: { parked: 5, resolved: 0, discarded: 0 } } };
    expect(engine._rules.ruleDlqBuildup({ name: 'gosi' }, dlqSmall)).toBeNull();
    const dlqWarn = { byIntegration: { gosi: { parked: 20, resolved: 0, discarded: 0 } } };
    expect(engine._rules.ruleDlqBuildup({ name: 'gosi' }, dlqWarn).severity).toBe('warning');
    const dlqCrit = { byIntegration: { gosi: { parked: 80, resolved: 0, discarded: 0 } } };
    expect(engine._rules.ruleDlqBuildup({ name: 'gosi' }, dlqCrit).severity).toBe('critical');
  });

  test('ruleUnconfiguredLive fires when mode=live AND configured=false', () => {
    const { engine } = makeEngine();
    expect(
      engine._rules.ruleUnconfiguredLive({
        name: 'gosi',
        mode: 'live',
        configured: true,
      })
    ).toBeNull();
    expect(
      engine._rules.ruleUnconfiguredLive({
        name: 'gosi',
        mode: 'mock',
        configured: false,
      })
    ).toBeNull();
    const firing = engine._rules.ruleUnconfiguredLive({
      name: 'gosi',
      mode: 'live',
      configured: false,
      missing: ['CLIENT_ID'],
    });
    expect(firing).toBeTruthy();
    expect(firing.observed.missing).toEqual(['CLIENT_ID']);
  });

  test('ruleHighFailureRate fires above threshold with sufficient volume', async () => {
    const trendDocs = [
      {
        _id: 'a',
        integration: 'gosi',
        capturedAt: new Date(NOW.getTime() - 10 * 60_000),
        callsSuccessCumul: 100,
        callsFailedCumul: 5,
      },
      {
        _id: 'b',
        integration: 'gosi',
        capturedAt: new Date(NOW.getTime() - 5 * 60_000),
        callsSuccessCumul: 110,
        callsFailedCumul: 25, // +5 success, +20 failed over window
      },
    ];
    const { engine } = makeEngine({ trendDocs });
    const firing = await engine._rules.ruleHighFailureRate({ name: 'gosi' }, NOW);
    expect(firing).toBeTruthy();
    expect(firing.observed.failureRate).toBeGreaterThan(0.2);
  });

  test('ruleHighFailureRate skips when volume below failureMinCalls', async () => {
    const trendDocs = [
      {
        _id: 'a',
        integration: 'gosi',
        capturedAt: new Date(NOW.getTime() - 10 * 60_000),
        callsSuccessCumul: 5,
        callsFailedCumul: 0,
      },
      {
        _id: 'b',
        integration: 'gosi',
        capturedAt: new Date(NOW.getTime() - 5 * 60_000),
        callsSuccessCumul: 8,
        callsFailedCumul: 5, // total delta = 8 calls < 20 min
      },
    ];
    const { engine } = makeEngine({ trendDocs });
    expect(await engine._rules.ruleHighFailureRate({ name: 'gosi' }, NOW)).toBeNull();
  });

  test('ruleRateLimitSaturation honors freshness check', async () => {
    const trendDocs = [
      {
        _id: 'a',
        integration: 'gosi',
        capturedAt: new Date(NOW.getTime() - 2 * 60_000),
        rateLimitUtilizationPct: 95,
      },
    ];
    const { engine } = makeEngine({ trendDocs });
    const firing = await engine._rules.ruleRateLimitSaturation({ name: 'gosi' }, NOW);
    expect(firing.observed.utilizationPct).toBe(95);

    const staleTrend = [
      {
        _id: 'b',
        integration: 'gosi',
        capturedAt: new Date(NOW.getTime() - 90 * 60_000), // 1.5h old
        rateLimitUtilizationPct: 95,
      },
    ];
    const e2 = makeEngine({ trendDocs: staleTrend }).engine;
    expect(await e2._rules.ruleRateLimitSaturation({ name: 'gosi' }, NOW)).toBeNull();
  });

  test('ruleSchedulerStalled is exempt at first boot (no alerts ever)', async () => {
    const { engine } = makeEngine();
    expect(await engine._rules.ruleSchedulerStalled(NOW)).toBeNull();
  });

  test('ruleSchedulerStalled fires when latest sample is too old AND history exists', async () => {
    const oldSample = {
      _id: 'old',
      integration: 'gosi',
      capturedAt: new Date(NOW.getTime() - 60 * 60_000), // 1h ago, way over 15min stall threshold
    };
    const oldAlert = {
      _id: 'a1',
      integration: 'gosi',
      ruleCode: 'CIRCUIT_OPEN',
      status: 'resolved',
    };
    const { engine } = makeEngine({ trendDocs: [oldSample], alertDocs: [oldAlert] });
    const firing = await engine._rules.ruleSchedulerStalled(NOW);
    expect(firing.code).toBe('SCHEDULER_STALLED');
    expect(firing.integration).toBe('system');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Alert engine — lifecycle (evaluate → fire → refresh → resolve)
// ═══════════════════════════════════════════════════════════════════════════

describe('Wave 211 — integrationAlertEngine lifecycle', () => {
  function setup(aggregatorOverrides) {
    const Alert = makeModelMock({ uniqueKey: ['integration', 'ruleCode', 'status'] });
    const Trend = makeModelMock();
    const aggregator = makeAggregatorMock(aggregatorOverrides);
    const engine = createAlertEngine({
      IntegrationAlert: Alert,
      IntegrationTrendSample: Trend,
      aggregator,
    });
    return { Alert, Trend, aggregator, engine };
  }

  test('evaluate opens new alerts on first fire', async () => {
    const { Alert, engine } = setup({
      adapters: [
        {
          name: 'gosi',
          mode: 'live',
          configured: true,
          circuitOpen: true,
          circuitFailures: 5,
          circuitCooldownMs: 1000,
        },
      ],
    });
    const summary = await engine.evaluate({ now: NOW });
    expect(summary.opened).toBe(1);
    expect(summary.refreshed).toBe(0);
    expect(Alert._docs).toHaveLength(1);
    expect(Alert._docs[0].ruleCode).toBe('CIRCUIT_OPEN');
    expect(Alert._docs[0].status).toBe('open');
    expect(Alert._docs[0].observedCount).toBe(1);
  });

  test('evaluate refreshes existing open alert via updateOne (no duplicate)', async () => {
    const { Alert, engine } = setup({
      adapters: [
        {
          name: 'gosi',
          mode: 'live',
          configured: true,
          circuitOpen: true,
          circuitFailures: 5,
          circuitCooldownMs: 1000,
        },
      ],
    });
    await engine.evaluate({ now: NOW });
    await engine.evaluate({ now: new Date(NOW.getTime() + 5 * 60_000) });
    expect(Alert._docs).toHaveLength(1); // still one alert
    expect(Alert._docs[0].observedCount).toBe(2);
  });

  test('evaluate auto-resolves stale open alerts when rule no longer fires', async () => {
    // Phase 1: circuit open → alert fires
    const { Alert, aggregator, engine } = setup({
      adapters: [
        {
          name: 'gosi',
          mode: 'live',
          configured: true,
          circuitOpen: true,
          circuitFailures: 5,
          circuitCooldownMs: 1000,
        },
      ],
    });
    await engine.evaluate({ now: NOW });
    expect(Alert._docs[0].status).toBe('open');

    // Phase 2: circuit closes → snapshot reflects fix
    aggregator.buildSnapshot.mockImplementationOnce(() => ({
      generatedAt: new Date().toISOString(),
      overall: 'healthy',
      adapters: [
        {
          name: 'gosi',
          mode: 'live',
          configured: true,
          circuitOpen: false,
          circuitFailures: 0,
          circuitCooldownMs: 0,
        },
      ],
      dlq: { byIntegration: {} },
    }));
    // 20 minutes later — past the 15min auto-resolve threshold
    const later = new Date(NOW.getTime() + 20 * 60_000);
    const summary = await engine.evaluate({ now: later });
    expect(summary.autoResolved).toBe(1);
    expect(Alert._docs[0].status).toBe('resolved');
    expect(Alert._docs[0].resolvedReason).toBe('auto');
  });

  test('acknowledgeAlert moves open → acknowledged', async () => {
    const Alert = makeModelMock({ uniqueKey: ['integration', 'ruleCode', 'status'] });
    Alert._docs.push({
      _id: 'a1',
      integration: 'gosi',
      ruleCode: 'CIRCUIT_OPEN',
      status: 'open',
      firstObservedAt: NOW,
      lastObservedAt: NOW,
      observedCount: 1,
    });
    const engine = createAlertEngine({
      IntegrationAlert: Alert,
      IntegrationTrendSample: makeModelMock(),
      aggregator: makeAggregatorMock(),
    });
    const updated = await engine.acknowledgeAlert({ id: 'a1', userId: 'u42', now: NOW });
    expect(updated.status).toBe('acknowledged');
    expect(updated.acknowledgedBy).toBe('u42');
  });

  test('acknowledgeAlert returns null when alert is not open', async () => {
    const Alert = makeModelMock();
    Alert._docs.push({
      _id: 'a1',
      integration: 'gosi',
      ruleCode: 'CIRCUIT_OPEN',
      status: 'resolved',
    });
    const engine = createAlertEngine({
      IntegrationAlert: Alert,
      IntegrationTrendSample: makeModelMock(),
      aggregator: makeAggregatorMock(),
    });
    const updated = await engine.acknowledgeAlert({ id: 'a1', userId: 'u42', now: NOW });
    expect(updated).toBeNull();
  });

  test('resolveAlert sets resolvedReason=manual', async () => {
    const Alert = makeModelMock();
    Alert._docs.push({
      _id: 'a1',
      integration: 'gosi',
      ruleCode: 'CIRCUIT_OPEN',
      status: 'acknowledged',
    });
    const engine = createAlertEngine({
      IntegrationAlert: Alert,
      IntegrationTrendSample: makeModelMock(),
      aggregator: makeAggregatorMock(),
    });
    const updated = await engine.resolveAlert({ id: 'a1', userId: 'u42', now: NOW });
    expect(updated.status).toBe('resolved');
    expect(updated.resolvedReason).toBe('manual');
  });

  test('listAlerts filters by status + integration', async () => {
    const Alert = makeModelMock();
    Alert._docs.push(
      {
        _id: 'a',
        integration: 'gosi',
        ruleCode: 'CIRCUIT_OPEN',
        status: 'open',
        lastObservedAt: NOW,
      },
      {
        _id: 'b',
        integration: 'gosi',
        ruleCode: 'DLQ_BUILDUP',
        status: 'resolved',
        lastObservedAt: NOW,
      },
      {
        _id: 'c',
        integration: 'absher',
        ruleCode: 'CIRCUIT_OPEN',
        status: 'open',
        lastObservedAt: NOW,
      }
    );
    const engine = createAlertEngine({
      IntegrationAlert: Alert,
      IntegrationTrendSample: makeModelMock(),
      aggregator: makeAggregatorMock(),
    });
    const res = await engine.listAlerts({ status: 'open' });
    expect(res.total).toBe(2);
    const onlyGosi = await engine.listAlerts({ status: 'open', integration: 'gosi' });
    expect(onlyGosi.total).toBe(1);
    expect(onlyGosi.items[0].integration).toBe('gosi');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. interopOperationsScheduler
// ═══════════════════════════════════════════════════════════════════════════

describe('Wave 211 — interopOperationsScheduler', () => {
  test('factory rejects missing recorder', () => {
    expect(() => createInteropScheduler({ alertEngine: { evaluate: jest.fn() } })).toThrow(
      /recorder/
    );
  });

  test('factory rejects missing alertEngine', () => {
    expect(() => createInteropScheduler({ recorder: { recordOnce: jest.fn() } })).toThrow(
      /alertEngine/
    );
  });

  test('runOnce calls both halves and returns summary', async () => {
    const recorder = { recordOnce: jest.fn().mockResolvedValue({ written: 2 }) };
    const alertEngine = { evaluate: jest.fn().mockResolvedValue({ opened: 1 }) };
    const sched = createInteropScheduler({ recorder, alertEngine });
    const out = await sched.runOnce({ now: NOW });
    expect(recorder.recordOnce).toHaveBeenCalledTimes(1);
    expect(alertEngine.evaluate).toHaveBeenCalledTimes(1);
    expect(out.recorder.written).toBe(2);
    expect(out.alerts.opened).toBe(1);
    expect(out.errors).toBe(0);
  });

  test('runOnce is fail-isolated — recorder crash does not block alerts', async () => {
    const recorder = { recordOnce: jest.fn().mockRejectedValue(new Error('boom')) };
    const alertEngine = { evaluate: jest.fn().mockResolvedValue({ opened: 0 }) };
    const sched = createInteropScheduler({ recorder, alertEngine });
    const out = await sched.runOnce({ now: NOW });
    expect(out.errors).toBe(1);
    expect(out.recorder).toBeNull();
    expect(out.alerts.opened).toBe(0);
  });

  test('runOnce is fail-isolated — alert engine crash does not nullify recorder', async () => {
    const recorder = { recordOnce: jest.fn().mockResolvedValue({ written: 2 }) };
    const alertEngine = { evaluate: jest.fn().mockRejectedValue(new Error('alerts down')) };
    const sched = createInteropScheduler({ recorder, alertEngine });
    const out = await sched.runOnce({ now: NOW });
    expect(out.errors).toBe(1);
    expect(out.recorder.written).toBe(2);
    expect(out.alerts).toBeNull();
  });

  test('start requires cron-compatible dep', () => {
    const sched = createInteropScheduler({
      recorder: { recordOnce: jest.fn() },
      alertEngine: { evaluate: jest.fn() },
    });
    expect(() => sched.start({})).toThrow(/cron/);
  });

  test('start schedules with provided cron', () => {
    const stop = jest.fn();
    const cron = { schedule: jest.fn().mockReturnValue({ stop }) };
    const sched = createInteropScheduler({
      recorder: { recordOnce: jest.fn() },
      alertEngine: { evaluate: jest.fn() },
    });
    const handle = sched.start({ schedule: '*/5 * * * *', cron });
    expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    handle.stop();
    expect(stop).toHaveBeenCalled();
  });
});
