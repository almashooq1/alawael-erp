/**
 * wave142-llm-anomaly-detector.test.js — Wave 142.
 *
 * Test sections:
 *   1. Factory guard
 *   2. COST_SPIKE rule (multiplier threshold)
 *   3. FALLBACK_RATE_HIGH (cross-service + per-service)
 *   4. FAILURE_RATE_HIGH (cross-service)
 *   5. CACHE_INEFFECTIVE (per-service with min-calls guard)
 *   6. SERVICE_DOWN (zero llm calls + rejects)
 *   7. No anomalies when traffic is too low (sub-20 calls)
 *   8. Deterministic anomaly ids
 *   9. Cache TTL behavior
 */

'use strict';

const {
  createLlmAnomalyDetector,
  ANOMALY_KIND,
  ANOMALY_SEVERITY,
} = require('../intelligence/llm-anomaly-detector.service');

const SILENT = { warn: () => {} };

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

/**
 * Build a fake registry that returns the supplied telemetry for the
 * latest-hour window and the 24h window. Two queries → two fixtures.
 */
function fakeRegistry({ lastHour, prior24h }) {
  return {
    getAllTelemetry: ({ since } = {}) => {
      // First call (longer since) = 24h window; second call (shorter
      // since) = latest hour. The detector calls latestHour first
      // then prior24h, so distinguish by `since` being older.
      const sinceMs = since ? new Date(since).getTime() : 0;
      const ageH = (Date.now() - sinceMs) / 3600_000;
      return ageH > 5 ? prior24h : lastHour;
    },
  };
}

function emptyTelemetry() {
  return {
    ok: true,
    services: {},
    merged: {
      totals: {
        calls: 0,
        llmCalls: 0,
        cacheHits: 0,
        rejects: 0,
        failures: 0,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        cacheHitRate: 0,
        fallbackRate: 0,
        failureRate: 0,
        avgLatencyMs: 0,
      },
      byReason: {},
      byIntent: {},
    },
  };
}

function buildTelemetry({ services = {}, costUsd = 0, calls = 0, ...overrides }) {
  return {
    ok: true,
    services,
    merged: {
      totals: {
        calls,
        llmCalls: 0,
        cacheHits: 0,
        rejects: 0,
        failures: 0,
        tokensIn: 0,
        tokensOut: 0,
        costUsd,
        cacheHitRate: 0,
        fallbackRate: 0,
        failureRate: 0,
        avgLatencyMs: 0,
        ...overrides,
      },
      byReason: {},
      byIntent: {},
    },
  };
}

// ─── 1. Factory guard ──────────────────────────────────────────────

describe('createLlmAnomalyDetector — factory', () => {
  test('throws when llmRegistry missing', () => {
    expect(() => createLlmAnomalyDetector({})).toThrow(/llmRegistry/);
  });

  test('detect() returns ok:false when registry throws', () => {
    const reg = {
      getAllTelemetry: () => {
        throw new Error('boom');
      },
    };
    const det = createLlmAnomalyDetector({ llmRegistry: reg, logger: SILENT });
    const r = det.detect();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('LLM_ANOMALY_DETECTOR_UNAVAILABLE');
  });
});

// ─── 2. COST_SPIKE ─────────────────────────────────────────────────

describe('COST_SPIKE rule', () => {
  test('triggers when latest-hour cost ≥ 5× prior 24h average', () => {
    const lastHour = buildTelemetry({ costUsd: 50, calls: 30 });
    // prior24h avg = 24 * 1 = 24$; lastHour = 50 → ratio ≈ 50/1 = 50× per hour
    const prior24h = buildTelemetry({ costUsd: 24, calls: 100 });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h }),
      logger: SILENT,
    });
    const r = det.detect();
    const spike = r.items.find(a => a.kind === ANOMALY_KIND.COST_SPIKE);
    expect(spike).toBeDefined();
    expect(spike.severity).toBe(ANOMALY_SEVERITY.CRITICAL);
    expect(spike.details.ratio).toBeGreaterThanOrEqual(5);
  });

  test('does NOT trigger when ratio < threshold', () => {
    const lastHour = buildTelemetry({ costUsd: 2, calls: 30 });
    const prior24h = buildTelemetry({ costUsd: 24 }); // avg/h = 1, ratio 2
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h }),
      logger: SILENT,
    });
    const r = det.detect();
    expect(r.items.find(a => a.kind === ANOMALY_KIND.COST_SPIKE)).toBeUndefined();
  });

  test('does NOT trigger when prior avg is zero (no historical baseline)', () => {
    const lastHour = buildTelemetry({ costUsd: 100, calls: 30 });
    const prior24h = buildTelemetry({ costUsd: 0 });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h }),
      logger: SILENT,
    });
    const r = det.detect();
    expect(r.items.find(a => a.kind === ANOMALY_KIND.COST_SPIKE)).toBeUndefined();
  });
});

// ─── 3. FALLBACK_RATE_HIGH ─────────────────────────────────────────

describe('FALLBACK_RATE_HIGH rule', () => {
  test('cross-service trigger at fallbackRate ≥ 0.5', () => {
    const lastHour = buildTelemetry({
      calls: 100,
      fallbackRate: 0.6,
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    const hit = r.items.find(a => a.kind === ANOMALY_KIND.FALLBACK_RATE_HIGH);
    expect(hit).toBeDefined();
    expect(hit.severity).toBe(ANOMALY_SEVERITY.WARNING);
    expect(hit.details.service).toBeUndefined(); // cross-service has no service field
  });

  test('per-service trigger at fallbackRate ≥ 0.7', () => {
    const lastHour = buildTelemetry({
      calls: 50, // sub-cross-service threshold
      services: {
        chatbot: {
          ok: true,
          totals: { calls: 50, fallbackRate: 0.8, failureRate: 0, cacheHitRate: 0 },
        },
      },
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    const hits = r.items.filter(a => a.kind === ANOMALY_KIND.FALLBACK_RATE_HIGH);
    expect(hits).toHaveLength(1);
    expect(hits[0].details.service).toBe('chatbot');
  });
});

// ─── 4. FAILURE_RATE_HIGH ─────────────────────────────────────────

describe('FAILURE_RATE_HIGH rule', () => {
  test('triggers at failureRate ≥ 0.3 with sufficient calls', () => {
    const lastHour = buildTelemetry({
      calls: 100,
      failureRate: 0.4,
      failures: 40,
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    const hit = r.items.find(a => a.kind === ANOMALY_KIND.FAILURE_RATE_HIGH);
    expect(hit).toBeDefined();
    expect(hit.severity).toBe(ANOMALY_SEVERITY.CRITICAL);
  });
});

// ─── 5. CACHE_INEFFECTIVE ─────────────────────────────────────────

describe('CACHE_INEFFECTIVE rule', () => {
  test('triggers per service with low hit rate + sufficient calls', () => {
    const lastHour = buildTelemetry({
      calls: 200,
      services: {
        chatbot: {
          ok: true,
          totals: { calls: 200, cacheHitRate: 0.02, fallbackRate: 0, failureRate: 0 },
        },
      },
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    const hit = r.items.find(a => a.kind === ANOMALY_KIND.CACHE_INEFFECTIVE);
    expect(hit).toBeDefined();
    expect(hit.severity).toBe(ANOMALY_SEVERITY.INFO);
    expect(hit.details.service).toBe('chatbot');
  });

  test('does NOT trigger when call volume < 100 (insufficient signal)', () => {
    const lastHour = buildTelemetry({
      calls: 50,
      services: {
        chatbot: { ok: true, totals: { calls: 50, cacheHitRate: 0.02 } },
      },
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    expect(r.items.find(a => a.kind === ANOMALY_KIND.CACHE_INEFFECTIVE)).toBeUndefined();
  });
});

// ─── 6. SERVICE_DOWN ──────────────────────────────────────────────

describe('SERVICE_DOWN rule', () => {
  test('triggers when llmCalls=0 + rejects≥1', () => {
    const lastHour = buildTelemetry({
      calls: 30,
      services: {
        chatbot: {
          ok: true,
          totals: { calls: 30, llmCalls: 0, rejects: 30, cacheHitRate: 0 },
        },
      },
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    const hit = r.items.find(a => a.kind === ANOMALY_KIND.SERVICE_DOWN);
    expect(hit).toBeDefined();
    expect(hit.details.service).toBe('chatbot');
  });

  test('does NOT trigger when llmCalls=0 + rejects=0 (just no traffic)', () => {
    const lastHour = buildTelemetry({
      calls: 0,
      services: {
        chatbot: { ok: true, totals: { calls: 0, llmCalls: 0, rejects: 0 } },
      },
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    expect(r.items.find(a => a.kind === ANOMALY_KIND.SERVICE_DOWN)).toBeUndefined();
  });
});

// ─── 7. Sub-threshold traffic ─────────────────────────────────────

describe('low-traffic guard', () => {
  test('cross-service rules skip when calls < 20', () => {
    const lastHour = buildTelemetry({
      calls: 10,
      fallbackRate: 1.0, // 100% but only 10 calls
      failureRate: 1.0,
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    expect(r.items.find(a => a.kind === ANOMALY_KIND.FALLBACK_RATE_HIGH)).toBeUndefined();
    expect(r.items.find(a => a.kind === ANOMALY_KIND.FAILURE_RATE_HIGH)).toBeUndefined();
  });
});

// ─── 8. Deterministic ids ─────────────────────────────────────────

describe('deterministic anomaly ids', () => {
  test('cost spike has dedupSeed=global', () => {
    const lastHour = buildTelemetry({ costUsd: 100, calls: 30 });
    const prior24h = buildTelemetry({ costUsd: 24 });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h }),
      logger: SILENT,
    });
    const r = det.detect();
    const spike = r.items.find(a => a.kind === ANOMALY_KIND.COST_SPIKE);
    expect(spike.id).toBe('llm-cost-spike:global');
  });

  test('per-service anomaly id includes service name', () => {
    const lastHour = buildTelemetry({
      calls: 200,
      services: {
        'care-plan': { ok: true, totals: { calls: 200, cacheHitRate: 0.01 } },
      },
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    const hit = r.items.find(a => a.kind === ANOMALY_KIND.CACHE_INEFFECTIVE);
    expect(hit.id).toBe('llm-cache-ineffective:care-plan');
  });
});

// ─── 9. Cache behavior ────────────────────────────────────────────

describe('detect cache', () => {
  test('returns cached result on second call within TTL', () => {
    let callCount = 0;
    const reg = {
      getAllTelemetry: () => {
        callCount++;
        return emptyTelemetry();
      },
    };
    const clock = makeClock();
    const det = createLlmAnomalyDetector({
      llmRegistry: reg,
      cacheTtlMs: 30_000,
      logger: SILENT,
      now: clock.now,
    });
    det.detect();
    det.detect();
    // Detector calls getAllTelemetry twice per detect() (latest+prior),
    // so first detect = 2 calls. Cached second detect = +0.
    expect(callCount).toBe(2);
  });

  test('skipCache forces a fresh detection', () => {
    let callCount = 0;
    const reg = {
      getAllTelemetry: () => {
        callCount++;
        return emptyTelemetry();
      },
    };
    const det = createLlmAnomalyDetector({ llmRegistry: reg, logger: SILENT });
    det.detect();
    det.detect({ skipCache: true });
    expect(callCount).toBe(4); // 2 + 2
  });

  test('cache expires after TTL', () => {
    let callCount = 0;
    const reg = {
      getAllTelemetry: () => {
        callCount++;
        return emptyTelemetry();
      },
    };
    const clock = makeClock();
    const det = createLlmAnomalyDetector({
      llmRegistry: reg,
      cacheTtlMs: 1000,
      logger: SILENT,
      now: clock.now,
    });
    det.detect();
    clock.advance(2000);
    det.detect();
    expect(callCount).toBe(4);
  });
});

// ─── 10. Severity ordering ────────────────────────────────────────

describe('severity ordering', () => {
  test('critical anomalies sort before warning before info', () => {
    const lastHour = buildTelemetry({
      calls: 200,
      failureRate: 0.5, // → critical
      services: {
        chatbot: {
          ok: true,
          totals: { calls: 200, fallbackRate: 0.8, cacheHitRate: 0.01 },
        },
      },
    });
    const det = createLlmAnomalyDetector({
      llmRegistry: fakeRegistry({ lastHour, prior24h: emptyTelemetry() }),
      logger: SILENT,
    });
    const r = det.detect();
    const sevs = r.items.map(a => a.severity);
    // All "critical" come before "warning" before "info"
    const critIdx = sevs.lastIndexOf('critical');
    const warnIdx = sevs.indexOf('warning');
    const infoIdx = sevs.indexOf('info');
    if (critIdx !== -1 && warnIdx !== -1) expect(critIdx).toBeLessThan(warnIdx);
    if (warnIdx !== -1 && infoIdx !== -1) expect(warnIdx).toBeLessThan(infoIdx);
  });
});
