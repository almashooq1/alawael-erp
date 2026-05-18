/**
 * hikvision-wave113-anomaly.test.js — Wave 113.
 *
 * Each rule tested independently. The detector composes an
 * `orgSummaryService` (Wave 112) snapshot + a `streamSupervisor`
 * status; both are mocked so we drive the rules directly.
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createHikvisionAnomalyDetector,
} = require('../intelligence/hikvision-anomaly-detector.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

// Build a snapshot helper — defaults to all sections "ok with zero
// signal", individual tests override the ones they care about.
function buildSnapshot(overrides = {}) {
  const base = {
    devices: { ok: true, total: 0 },
    stream: { ok: true, running: true, totalDevices: 5, byState: {}, items: [] },
    reviews: { ok: true, totalOpen: 0, oldestOpenAt: null },
    reconciliation: { ok: true, totalOpen: 0 },
    fraud: { ok: true, totalEmployees: 0, byBand: {}, topBranches: [], topEmployees: [] },
    sync: { ok: true, librariesScanned: 0, withDrift: 0 },
    branchConfig: { ok: true, branchesWithOverrides: 0 },
    scheduler: { ok: true, jobsAvailable: 5, jobsRunning: 0, jobsFailedRecent: 0, items: [] },
  };
  return { ok: true, generatedAt: new Date().toISOString(), ...base, ...overrides };
}

function buildDetector(snapshot, streamItems = null, opts = {}) {
  const orgSummaryService = {
    snapshot: async () => snapshot,
  };
  const streamSupervisor =
    streamItems !== null
      ? {
          getStatus: () => ({
            running: true,
            totalDevices: streamItems.length,
            items: streamItems,
          }),
        }
      : null;
  return createHikvisionAnomalyDetector({
    orgSummaryService,
    streamSupervisor,
    logger: SILENT,
    ...opts,
  });
}

// ═══ 1. Empty snapshot → no anomalies ═══════════════════════════

describe('anomaly-detector — empty snapshot', () => {
  test('no anomalies emitted when every signal is clean', async () => {
    const d = buildDetector(buildSnapshot());
    const r = await d.detect();
    expect(r.ok).toBe(true);
    expect(r.items).toHaveLength(0);
    expect(r.summary.total).toBe(0);
  });
});

// ═══ 2. CIRCUIT_OPEN_CLUSTER ═════════════════════════════════════

describe('anomaly-detector — CIRCUIT_OPEN_CLUSTER', () => {
  test('emits critical when ≥ threshold devices in circuit-open', async () => {
    const snap = buildSnapshot({
      stream: {
        ok: true,
        running: true,
        totalDevices: 10,
        byState: { 'circuit-open': 3, connected: 7 },
        items: [],
      },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    expect(r.ok).toBe(true);
    expect(r.items[0].kind).toBe(reg.ANOMALY_KIND.CIRCUIT_OPEN_CLUSTER);
    expect(r.items[0].severity).toBe(reg.ANOMALY_SEVERITY.CRITICAL);
    expect(r.items[0].details.affectedDevices).toBe(3);
  });

  test('half-open counts toward the cluster threshold', async () => {
    const snap = buildSnapshot({
      stream: {
        ok: true,
        running: true,
        totalDevices: 10,
        byState: { 'circuit-open': 2, 'half-open': 1, connected: 7 },
        items: [],
      },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    expect(r.items.some(a => a.kind === reg.ANOMALY_KIND.CIRCUIT_OPEN_CLUSTER)).toBe(true);
  });

  test('below threshold → no anomaly', async () => {
    const snap = buildSnapshot({
      stream: {
        ok: true,
        running: true,
        totalDevices: 10,
        byState: { 'circuit-open': 2, connected: 8 },
        items: [],
      },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    expect(r.items.some(a => a.kind === reg.ANOMALY_KIND.CIRCUIT_OPEN_CLUSTER)).toBe(false);
  });
});

// ═══ 3. STREAM_ERRORS_SPIKE ═════════════════════════════════════

describe('anomaly-detector — STREAM_ERRORS_SPIKE', () => {
  test('emits one anomaly per device with ≥ threshold parse errors', async () => {
    const d = buildDetector(buildSnapshot(), [
      { deviceCode: 'A', state: 'connected', parseErrors: 5 },
      { deviceCode: 'B', state: 'reconnecting', parseErrors: 30 },
      { deviceCode: 'C', state: 'connected', parseErrors: 100 },
    ]);
    const r = await d.detect();
    const spikes = r.items.filter(a => a.kind === reg.ANOMALY_KIND.STREAM_ERRORS_SPIKE);
    expect(spikes).toHaveLength(2);
    expect(spikes.map(s => s.details.deviceCode).sort()).toEqual(['B', 'C']);
    expect(spikes[0].severity).toBe(reg.ANOMALY_SEVERITY.WARNING);
  });

  test('uses deterministic id (deviceCode-based dedup)', async () => {
    const d = buildDetector(buildSnapshot(), [
      { deviceCode: 'X-001', state: 'connected', parseErrors: 50 },
    ]);
    const r1 = await d.detect();
    d._clearCache();
    const r2 = await d.detect();
    expect(r1.items[0].id).toBe(r2.items[0].id);
    expect(r1.items[0].id).toContain('X-001');
  });
});

// ═══ 4. SYNC_DRIFT_HIGH ═════════════════════════════════════════

describe('anomaly-detector — SYNC_DRIFT_HIGH', () => {
  test('emits when ≥ 50% of libraries have drift', async () => {
    const snap = buildSnapshot({
      sync: { ok: true, librariesScanned: 10, withDrift: 6 },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    const drift = r.items.find(a => a.kind === reg.ANOMALY_KIND.SYNC_DRIFT_HIGH);
    expect(drift).toBeDefined();
    expect(drift.details.pct).toBeCloseTo(0.6, 1);
  });

  test('zero libraries → no division by zero', async () => {
    const snap = buildSnapshot({
      sync: { ok: true, librariesScanned: 0, withDrift: 0 },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    expect(r.items.some(a => a.kind === reg.ANOMALY_KIND.SYNC_DRIFT_HIGH)).toBe(false);
  });
});

// ═══ 5. FRAUD_CRITICAL ══════════════════════════════════════════

describe('anomaly-detector — FRAUD_CRITICAL', () => {
  test('emits one critical anomaly per employee in band=critical', async () => {
    const snap = buildSnapshot({
      fraud: {
        ok: true,
        totalEmployees: 3,
        byBand: { critical: 2, high: 1 },
        topBranches: [],
        topEmployees: [
          { employeeId: 'e1', branchId: 'br-A', currentScore: 95, band: 'critical' },
          { employeeId: 'e2', branchId: 'br-B', currentScore: 80, band: 'high' },
          { employeeId: 'e3', branchId: 'br-A', currentScore: 92, band: 'critical' },
        ],
      },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    const criticals = r.items.filter(a => a.kind === reg.ANOMALY_KIND.FRAUD_CRITICAL);
    expect(criticals).toHaveLength(2);
    expect(criticals.every(a => a.severity === reg.ANOMALY_SEVERITY.CRITICAL)).toBe(true);
    expect(criticals.map(a => a.details.employeeId).sort()).toEqual(['e1', 'e3']);
  });
});

// ═══ 6. REVIEW_QUEUE_STALE ══════════════════════════════════════

describe('anomaly-detector — REVIEW_QUEUE_STALE', () => {
  test('emits when oldest open review > threshold hours', async () => {
    const clock = makeClock();
    const snap = buildSnapshot({
      reviews: {
        ok: true,
        totalOpen: 12,
        oldestOpenAt: new Date(clock.now().getTime() - 30 * 60 * 60_000).toISOString(),
      },
    });
    const d = buildDetector(snap, null, { now: clock.now });
    const r = await d.detect();
    const stale = r.items.find(a => a.kind === reg.ANOMALY_KIND.REVIEW_QUEUE_STALE);
    expect(stale).toBeDefined();
    expect(stale.severity).toBe(reg.ANOMALY_SEVERITY.WARNING);
    expect(stale.details.ageHours).toBeGreaterThanOrEqual(24);
  });

  test('within threshold → no anomaly', async () => {
    const clock = makeClock();
    const snap = buildSnapshot({
      reviews: {
        ok: true,
        totalOpen: 12,
        oldestOpenAt: new Date(clock.now().getTime() - 2 * 60 * 60_000).toISOString(),
      },
    });
    const d = buildDetector(snap, null, { now: clock.now });
    const r = await d.detect();
    expect(r.items.some(a => a.kind === reg.ANOMALY_KIND.REVIEW_QUEUE_STALE)).toBe(false);
  });
});

// ═══ 7. RECONCILIATION_BACKLOG ═════════════════════════════════

describe('anomaly-detector — RECONCILIATION_BACKLOG', () => {
  test('emits when ≥ threshold open cases', async () => {
    const snap = buildSnapshot({
      reconciliation: { ok: true, totalOpen: 30 },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    const backlog = r.items.find(a => a.kind === reg.ANOMALY_KIND.RECONCILIATION_BACKLOG);
    expect(backlog).toBeDefined();
    expect(backlog.details.totalOpen).toBe(30);
  });
});

// ═══ 8. SCHEDULER_FAILURE ═══════════════════════════════════════

describe('anomaly-detector — SCHEDULER_FAILURE', () => {
  test('emits when any scheduler job latest=failed', async () => {
    const snap = buildSnapshot({
      scheduler: {
        ok: true,
        jobsAvailable: 5,
        jobsRunning: 0,
        jobsFailedRecent: 2,
        items: [
          { id: 'a', labelAr: 'A', available: true, latest: { status: 'succeeded' } },
          { id: 'b', labelAr: 'B', available: true, latest: { status: 'failed' } },
          { id: 'c', labelAr: 'C', available: true, latest: { status: 'failed' } },
        ],
      },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    const sched = r.items.find(a => a.kind === reg.ANOMALY_KIND.SCHEDULER_FAILURE);
    expect(sched).toBeDefined();
    expect(sched.details.failedCount).toBe(2);
    expect(sched.details.jobs.length).toBe(2);
  });
});

// ═══ 9. NO_STREAM_DEVICES ═══════════════════════════════════════

describe('anomaly-detector — NO_STREAM_DEVICES', () => {
  test('emits info when supervisor runs but 0 devices attached', async () => {
    const snap = buildSnapshot({
      stream: { ok: true, running: true, totalDevices: 0, byState: {}, items: [] },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    const noStream = r.items.find(a => a.kind === reg.ANOMALY_KIND.NO_STREAM_DEVICES);
    expect(noStream).toBeDefined();
    expect(noStream.severity).toBe(reg.ANOMALY_SEVERITY.INFO);
  });

  test('not emitted when running=false (supervisor off)', async () => {
    const snap = buildSnapshot({
      stream: { ok: true, running: false, totalDevices: 0, byState: {}, items: [] },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    expect(r.items.some(a => a.kind === reg.ANOMALY_KIND.NO_STREAM_DEVICES)).toBe(false);
  });
});

// ═══ 10. Sorting + summary counts ═══════════════════════════════

describe('anomaly-detector — sorting + summary', () => {
  test('items sorted critical → warning → info', async () => {
    const snap = buildSnapshot({
      stream: {
        ok: true,
        running: true,
        totalDevices: 0,
        byState: { 'circuit-open': 3 },
        items: [],
      },
      reviews: {
        ok: true,
        totalOpen: 12,
        oldestOpenAt: new Date(Date.now() - 30 * 60 * 60_000).toISOString(),
      },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    expect(r.items.length).toBeGreaterThan(1);
    // First item must be critical (CIRCUIT_OPEN_CLUSTER)
    expect(r.items[0].severity).toBe(reg.ANOMALY_SEVERITY.CRITICAL);
  });

  test('summary counts by severity', async () => {
    const snap = buildSnapshot({
      stream: {
        ok: true,
        running: true,
        totalDevices: 0,
        byState: { 'circuit-open': 3 },
        items: [],
      },
      reconciliation: { ok: true, totalOpen: 50 },
    });
    const d = buildDetector(snap);
    const r = await d.detect();
    expect(r.summary.critical).toBeGreaterThanOrEqual(1);
    expect(r.summary.warning).toBeGreaterThanOrEqual(1);
    expect(r.summary.total).toBe(r.items.length);
  });
});

// ═══ 11. Cache ══════════════════════════════════════════════════

describe('anomaly-detector — cache', () => {
  test('cached value returned within TTL (single org-summary call)', async () => {
    let calls = 0;
    const orgSummaryService = {
      snapshot: async () => {
        calls += 1;
        return buildSnapshot();
      },
    };
    const d = createHikvisionAnomalyDetector({
      orgSummaryService,
      logger: SILENT,
      cacheTtlMs: 60_000,
    });
    await d.detect();
    await d.detect();
    await d.detect();
    expect(calls).toBe(1);
  });

  test('skipCache=true bypasses cache', async () => {
    let calls = 0;
    const orgSummaryService = {
      snapshot: async () => {
        calls += 1;
        return buildSnapshot();
      },
    };
    const d = createHikvisionAnomalyDetector({
      orgSummaryService,
      logger: SILENT,
      cacheTtlMs: 60_000,
    });
    await d.detect();
    await d.detect({ skipCache: true });
    expect(calls).toBe(2);
  });
});

// ═══ 12. Service unavailable ════════════════════════════════════

describe('anomaly-detector — degraded', () => {
  test('returns ok:false when orgSummaryService is missing', async () => {
    const d = createHikvisionAnomalyDetector({ logger: SILENT });
    const r = await d.detect();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.ANOMALY_DETECTOR_UNAVAILABLE);
  });

  test('snapshot throw → returns ok:false (no crash)', async () => {
    const orgSummaryService = {
      snapshot: async () => {
        throw new Error('upstream broken');
      },
    };
    const d = createHikvisionAnomalyDetector({ orgSummaryService, logger: SILENT });
    const r = await d.detect();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.ANOMALY_DETECTOR_UNAVAILABLE);
    expect(r.message).toMatch(/upstream broken/);
  });
});
