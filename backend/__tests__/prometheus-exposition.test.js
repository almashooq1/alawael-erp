'use strict';
/**
 * prometheus-exposition.test.js — Wave 302
 *
 * Verifies that the `/metrics` Prometheus endpoint emits the W297 risk
 * lifecycle counters + the gov adapter counters in valid exposition
 * format (so Prometheus + Grafana can scrape without parser errors).
 */

const { metricsHandler } = require('../middleware/metrics.middleware');
const metrics = require('../intelligence/risk-metrics.registry');
const adapter = require('../services/adapterMetricsRegistry');

function fakeRes() {
  const headers = {};
  let body = '';
  return {
    set: (k, v) => {
      headers[k] = v;
    },
    send: txt => {
      body = txt;
    },
    get body() {
      return body;
    },
    get headers() {
      return headers;
    },
  };
}

describe('W302 — Prometheus /metrics exposition', () => {
  beforeEach(() => {
    metrics._reset();
    adapter._resetAll();
  });

  test('emits text/plain content-type with version=0.0.4', () => {
    const res = fakeRes();
    metricsHandler({}, res);
    expect(res.headers['Content-Type']).toMatch(/text\/plain.*version=0\.0\.4/);
  });

  test('includes risk lifecycle counter with sanitized name + labels', () => {
    metrics.inc(metrics.NAMES.AUDIT_APPENDED, { action: 'TRIGGERED' }, 3);
    metrics.inc(metrics.NAMES.AUDIT_APPENDED, { action: 'ACK' }, 1);
    metrics.inc(metrics.NAMES.AUDIT_VERIFIED, { result: 'broken' }, 2);

    const res = fakeRes();
    metricsHandler({}, res);
    const body = res.body;

    // Dots are converted to underscores for Prometheus name rules.
    expect(body).toContain('# TYPE risk_plan_review_audit_appended counter');
    expect(body).toMatch(/risk_plan_review_audit_appended\{action="TRIGGERED"\} 3 \d+/);
    expect(body).toMatch(/risk_plan_review_audit_appended\{action="ACK"\} 1 \d+/);
    expect(body).toMatch(/risk_plan_review_audit_verified\{result="broken"\} 2 \d+/);
  });

  test('includes gov adapter counters and latency histogram (cumulative buckets)', () => {
    adapter.recordCall({ provider: 'sehhaty', status: 'success', success: true, latencyMs: 120 });
    adapter.recordCall({ provider: 'sehhaty', status: 'success', success: true, latencyMs: 30 });
    adapter.recordCall({ provider: 'sehhaty', status: 'error', success: false, latencyMs: 4000 });

    const res = fakeRes();
    metricsHandler({}, res);
    const body = res.body;

    expect(body).toContain('# TYPE gov_adapter_calls_total counter');
    expect(body).toMatch(/gov_adapter_calls_total\{provider="sehhaty",status="success"\} 2 /);
    expect(body).toMatch(/gov_adapter_calls_total\{provider="sehhaty",status="failed"\} 1 /);
    expect(body).toContain('# TYPE gov_adapter_call_latency_ms histogram');
    expect(body).toMatch(/gov_adapter_call_latency_ms_count\{provider="sehhaty"\} 3 /);
    // Cumulative bucket check: the +Inf bucket >= every smaller bucket.
    const m50 = body.match(/_bucket\{provider="sehhaty",le="50"\} (\d+)/);
    const mInf = body.match(/_bucket\{provider="sehhaty",le="\+Inf"\} (\d+)/);
    expect(m50).toBeTruthy();
    expect(mInf).toBeTruthy();
    expect(Number(mInf[1])).toBe(3);
    expect(Number(m50[1])).toBeLessThanOrEqual(Number(mInf[1]));
  });

  test('empty registries produce no risk_* or gov_adapter_* lines (no parser errors)', () => {
    const res = fakeRes();
    metricsHandler({}, res);
    const body = res.body;
    expect(body).not.toMatch(/^risk_/m);
    expect(body).not.toMatch(/^gov_adapter_/m);
    // Process metrics still present:
    expect(body).toContain('process_resident_memory_bytes');
  });
});
