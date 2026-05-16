/**
 * kpi-anomaly-detected.test.js — Wave 5.
 *
 * Verifies the EWMA anomaly bridge produces alerts when (and only
 * when) the underlying detector trips. Covers:
 *   - empty / missing kpiHistoryStore  → graceful no-op
 *   - too-few-points series             → no finding
 *   - stable series                     → no finding
 *   - sudden spike                      → finding with correct
 *                                         severity + direction
 *   - rule registered in the global index
 */

'use strict';

const { AlertsEngine } = require('../alerts');
const rule = require('../alerts/rules/kpi-anomaly-detected');
const rules = require('../alerts/rules');

// Tiny fake store that satisfies the same shape kpiHistoryStore returns.
function fakeStore(entries) {
  return {
    list: jest.fn(() => entries.slice()),
  };
}

function buildStableSeries(value, count, startMs) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ t: startMs + i * 60 * 60 * 1000, v: value });
  }
  return out;
}

function buildJitterSeries(base, jitter, count, startMs) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const v = base + (i % 2 === 0 ? jitter : -jitter);
    out.push({ t: startMs + i * 60 * 60 * 1000, v });
  }
  return out;
}

const T0 = Date.parse('2026-05-01T00:00:00Z');

describe('kpi-anomaly-detected — registration', () => {
  test('is included in the bundled rule list', () => {
    expect(rules.find(r => r.id === 'kpi-anomaly-detected')).toBeTruthy();
  });

  test('has the expected shape', () => {
    expect(rule.id).toBe('kpi-anomaly-detected');
    expect(rule.severity).toBe('warning');
    expect(typeof rule.evaluate).toBe('function');
  });
});

describe('kpi-anomaly-detected — evaluate', () => {
  test('returns [] when no store is supplied', async () => {
    const out = await rule.evaluate({});
    expect(out).toEqual([]);
  });

  test('returns [] when store throws', async () => {
    const store = {
      list: jest.fn(() => {
        throw new Error('boom');
      }),
    };
    const out = await rule.evaluate({ kpiHistoryStore: store });
    expect(out).toEqual([]);
  });

  test('returns [] when no entries', async () => {
    const out = await rule.evaluate({ kpiHistoryStore: fakeStore([]) });
    expect(out).toEqual([]);
  });

  test('skips entries with fewer than 8 points', async () => {
    const points = buildStableSeries(50, 6, T0);
    const out = await rule.evaluate({
      kpiHistoryStore: fakeStore([{ kpiId: 'k1', scope: null, points }]),
    });
    expect(out).toEqual([]);
  });

  test('does not fire on a stable series', async () => {
    // 20 ticks of jitter ±0.5 around 50 — z-score stays well below warnZ.
    const points = buildJitterSeries(50, 0.5, 20, T0);
    const out = await rule.evaluate({
      kpiHistoryStore: fakeStore([{ kpiId: 'k1', scope: null, points }]),
    });
    expect(out).toEqual([]);
  });

  test('fires on a sudden spike with the right direction + metadata', async () => {
    // 20 ticks around 50, then a 21st at 200 — large positive z.
    const baseline = buildJitterSeries(50, 1, 20, T0);
    baseline.push({ t: T0 + 21 * 60 * 60 * 1000, v: 200 });
    const out = await rule.evaluate({
      kpiHistoryStore: fakeStore([
        { kpiId: 'crm.complaints.sla_breach.count', scope: 'br-1', points: baseline },
      ]),
    });
    expect(out).toHaveLength(1);
    const finding = out[0];
    expect(finding.key).toContain('crm.complaints.sla_breach.count');
    expect(finding.key).toContain('br-1');
    expect(finding.metadata.direction).toBe('above');
    expect(finding.metadata.zScore).toBeGreaterThan(2.5);
    expect(finding.subject.type).toBe('Kpi');
    expect(finding.message).toContain('ارتفاع');
  });

  test('serializes object scopes deterministically in the key', async () => {
    const baseline = buildJitterSeries(50, 1, 20, T0);
    baseline.push({ t: T0 + 21 * 60 * 60 * 1000, v: 200 });
    const scope = { branchId: 'br-1', dept: 'pt' };
    const out = await rule.evaluate({
      kpiHistoryStore: fakeStore([{ kpiId: 'k1', scope, points: baseline }]),
    });
    expect(out).toHaveLength(1);
    expect(out[0].key).toContain(JSON.stringify(scope));
  });
});

describe('kpi-anomaly-detected — end-to-end through the engine', () => {
  test('engine surfaces the finding on first run, dedupes on second', async () => {
    const baseline = buildJitterSeries(50, 1, 20, T0);
    baseline.push({ t: T0 + 21 * 60 * 60 * 1000, v: 200 });
    const store = fakeStore([{ kpiId: 'k1', scope: null, points: baseline }]);

    const eng = new AlertsEngine();
    eng.register(rule);
    const first = await eng.runAll({ kpiHistoryStore: store });
    expect(first.raised).toHaveLength(1);
    expect(first.raised[0].ruleId).toBe('kpi-anomaly-detected');

    const second = await eng.runAll({ kpiHistoryStore: store });
    expect(second.raised).toHaveLength(0); // dedup'd
    expect(second.activeCount).toBe(1);
  });
});
