/**
 * adapter-metrics-registry.test.js — in-memory counter + latency
 * histogram for the Prometheus metrics endpoint.
 */

'use strict';

const registry = require('../services/adapterMetricsRegistry');

beforeEach(() => registry._resetAll());

describe('counters', () => {
  it('buckets by provider + status (success|failed|rate_limited)', () => {
    registry.recordCall({ provider: 'gosi', status: 'active', success: true, latencyMs: 120 });
    registry.recordCall({ provider: 'gosi', status: 'error', success: false });
    registry.recordCall({ provider: 'gosi', status: 'rate_limited', success: false });
    registry.recordCall({ provider: 'absher', status: 'match', success: true, latencyMs: 50 });

    const snap = registry.snapshotCounters();
    expect(snap.gosi).toEqual({ success: 1, failed: 1, rate_limited: 1 });
    expect(snap.absher).toEqual({ success: 1, failed: 0, rate_limited: 0 });
  });

  it('unknown status with success=false counts as failed', () => {
    registry.recordCall({ provider: 'qiwa', status: 'unknown', success: false });
    expect(registry.snapshotCounters().qiwa.failed).toBe(1);
  });

  it('is monotonic — never resets on read', () => {
    registry.recordCall({ provider: 'nphies', success: true, latencyMs: 10 });
    registry.snapshotCounters();
    registry.snapshotCounters();
    registry.recordCall({ provider: 'nphies', success: true, latencyMs: 10 });
    expect(registry.snapshotCounters().nphies.success).toBe(2);
  });
});

describe('latency histogram', () => {
  it('bucketizes across the 50/200/1000/5000/+Inf thresholds', () => {
    registry.recordCall({ provider: 'fatoora', success: true, latencyMs: 30 });
    registry.recordCall({ provider: 'fatoora', success: true, latencyMs: 150 });
    registry.recordCall({ provider: 'fatoora', success: true, latencyMs: 750 });
    registry.recordCall({ provider: 'fatoora', success: true, latencyMs: 3000 });
    registry.recordCall({ provider: 'fatoora', success: true, latencyMs: 9000 });

    const snap = registry.snapshotLatency();
    expect(snap.fatoora.count).toBe(5);
    expect(snap.fatoora.sum).toBe(30 + 150 + 750 + 3000 + 9000);
    // Non-cumulative bucket counts
    const byLe = Object.fromEntries(snap.fatoora.buckets.map(b => [b.le, b.count]));
    expect(byLe[50]).toBe(1); // 30
    expect(byLe[200]).toBe(1); // 150
    expect(byLe[1000]).toBe(1); // 750
    expect(byLe[5000]).toBe(1); // 3000
    expect(byLe[Infinity]).toBe(1); // 9000
  });

  it('ignores missing/negative latency', () => {
    registry.recordCall({ provider: 'muqeem', success: true });
    registry.recordCall({ provider: 'muqeem', success: true, latencyMs: -1 });
    const snap = registry.snapshotLatency();
    expect(snap.muqeem).toBeUndefined();
  });
});

describe('integration with audit logger', () => {
  it('adapterAuditLogger.record() bumps the registry', async () => {
    const audit = require('../services/adapterAuditLogger');
    await audit.record({
      provider: 'scfhs',
      operation: 'verify',
      status: 'active',
      latencyMs: 42,
    });
    // record() may await a Mongo write that fails (no DB in this file),
    // but the in-memory counter runs first so it always updates.
    const snap = registry.snapshotCounters();
    expect(snap.scfhs?.success).toBe(1);
  });
});
