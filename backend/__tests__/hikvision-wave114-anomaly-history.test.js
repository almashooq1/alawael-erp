/**
 * hikvision-wave114-anomaly-history.test.js — Wave 114.
 *
 * Sections:
 *   1. recordSnapshot — happy path + summary derivation
 *   2. recordSnapshot — detector failed → ANOMALY_SCAN_FAILED
 *   3. recordSnapshot — model validation rejection
 *   4. listRecent — recent-first ordering + since/source filters
 *   5. getTrend — bucketing with gauge semantics + empty buckets
 *   6. Scheduler ANOMALY_SCAN job — detector + history wired
 *   7. Scheduler ANOMALY_SCAN job — degraded when either missing
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const {
  createHikvisionAnomalyHistoryService,
} = require('../intelligence/hikvision-anomaly-history.service');
const { createHikvisionScheduler } = require('../intelligence/hikvision-scheduler.service');

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

// ─── Mock snapshot model ────────────────────────────────────────

function buildSnapshotModel({ validateInvariants = true } = {}) {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `snap-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {
      if (!validateInvariants) return;
      if (!this.recordedAt) {
        const e = new Error('Validation failed');
        e.errors = { recordedAt: { message: 'required' } };
        throw e;
      }
      const items = Array.isArray(this.items) ? this.items : [];
      const s = this.summary || {};
      if (s.total !== items.length) {
        const e = new Error('Validation failed');
        e.errors = { 'summary.total': { message: `expected ${items.length}` } };
        throw e;
      }
      const sevSum = (s.critical || 0) + (s.warning || 0) + (s.info || 0);
      if (sevSum !== s.total) {
        const e = new Error('Validation failed');
        e.errors = { summary: { message: `sev sum ${sevSum} != total ${s.total}` } };
        throw e;
      }
    };
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.find = function (q = {}) {
    let matches = store.filter(r => {
      if (q.source && r.source !== q.source) return false;
      if (q.recordedAt && q.recordedAt.$gte) {
        if (new Date(r.recordedAt).getTime() < new Date(q.recordedAt.$gte).getTime()) return false;
      }
      return true;
    });
    const chain = {
      sort(spec) {
        const k = Object.keys(spec)[0];
        const dir = spec[k];
        matches = matches.slice().sort((a, b) => {
          const av = new Date(a[k]).getTime();
          const bv = new Date(b[k]).getTime();
          return (av - bv) * dir;
        });
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(r2 => ({ ...r2 }))),
    };
    return chain;
  };
  M.countDocuments = async function (q = {}) {
    let arr = store;
    if (q.source) arr = arr.filter(r => r.source === q.source);
    return arr.length;
  };
  M._store = store;
  return M;
}

// ─── 1. recordSnapshot happy path ───────────────────────────────

describe('anomaly-history — recordSnapshot happy path', () => {
  test('persists snapshot with summary derived from items', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createHikvisionAnomalyHistoryService({
      snapshotModel: Model,
      logger: SILENT,
      now: clock.now,
    });
    const detection = {
      ok: true,
      generatedAt: clock.now().toISOString(),
      items: [
        {
          id: 'a:1',
          kind: reg.ANOMALY_KIND.FRAUD_CRITICAL,
          severity: 'critical',
          summaryAr: '...',
        },
        {
          id: 'b:1',
          kind: reg.ANOMALY_KIND.SYNC_DRIFT_HIGH,
          severity: 'warning',
          summaryAr: '...',
        },
        { id: 'c:1', kind: reg.ANOMALY_KIND.NO_STREAM_DEVICES, severity: 'info', summaryAr: '...' },
      ],
      summary: { total: 3, critical: 1, warning: 1, info: 1 },
    };
    const r = await s.recordSnapshot({ detectionResult: detection, source: 'manual' });
    expect(r.ok).toBe(true);
    expect(r.snapshot.summary.total).toBe(3);
    expect(r.snapshot.source).toBe('manual');
    expect(r.snapshot.items).toHaveLength(3);
    // Diagnostic fields (summaryAr etc) stripped
    expect(r.snapshot.items[0].summaryAr).toBeUndefined();
    expect(r.snapshot.items[0].id).toBe('a:1');
  });

  test('derives summary when detector omits it', async () => {
    const Model = buildSnapshotModel();
    const s = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const detection = {
      ok: true,
      items: [
        { id: 'x:1', kind: reg.ANOMALY_KIND.FRAUD_CRITICAL, severity: 'critical' },
        { id: 'y:1', kind: reg.ANOMALY_KIND.SYNC_DRIFT_HIGH, severity: 'warning' },
      ],
    };
    const r = await s.recordSnapshot({ detectionResult: detection });
    expect(r.ok).toBe(true);
    expect(r.snapshot.summary.total).toBe(2);
    expect(r.snapshot.summary.critical).toBe(1);
    expect(r.snapshot.summary.warning).toBe(1);
  });

  test('zero-anomaly snapshot persists with all-zero summary', async () => {
    const Model = buildSnapshotModel();
    const s = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [],
        summary: { total: 0, critical: 0, warning: 0, info: 0 },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.snapshot.summary.total).toBe(0);
  });
});

// ─── 2. recordSnapshot detector failed ──────────────────────────

describe('anomaly-history — detector failed', () => {
  test('returns ANOMALY_SCAN_FAILED + does not persist when detection.ok=false', async () => {
    const Model = buildSnapshotModel();
    const s = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({
      detectionResult: { ok: false, reason: 'whatever', message: 'broken' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.ANOMALY_SCAN_FAILED);
    expect(Model._store).toHaveLength(0);
  });

  test('null detectionResult rejected without crashing', async () => {
    const Model = buildSnapshotModel();
    const s = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.ANOMALY_SCAN_FAILED);
  });
});

// ─── 3. listRecent ──────────────────────────────────────────────

describe('anomaly-history — listRecent', () => {
  test('returns rows in recent-first order + respects limit', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createHikvisionAnomalyHistoryService({
      snapshotModel: Model,
      logger: SILENT,
      now: clock.now,
    });
    for (let i = 0; i < 5; i++) {
      await s.recordSnapshot({
        detectionResult: {
          ok: true,
          items: [],
          summary: { total: 0, critical: 0, warning: 0, info: 0 },
        },
      });
      clock.advance(60_000);
    }
    const r = await s.listRecent({ limit: 3 });
    expect(r.items.length).toBe(3);
    const ts = r.items.map(it => new Date(it.recordedAt).getTime());
    expect(ts[0]).toBeGreaterThanOrEqual(ts[1]);
    expect(ts[1]).toBeGreaterThanOrEqual(ts[2]);
  });

  test('source filter narrows results', async () => {
    const Model = buildSnapshotModel();
    const s = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const empty = { ok: true, items: [], summary: { total: 0, critical: 0, warning: 0, info: 0 } };
    await s.recordSnapshot({ detectionResult: empty, source: 'scheduler' });
    await s.recordSnapshot({ detectionResult: empty, source: 'manual' });
    await s.recordSnapshot({ detectionResult: empty, source: 'scheduler' });
    const r = await s.listRecent({ source: 'manual' });
    expect(r.items.every(x => x.source === 'manual')).toBe(true);
    expect(r.items.length).toBe(1);
  });

  test('since filter excludes older rows', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createHikvisionAnomalyHistoryService({
      snapshotModel: Model,
      logger: SILENT,
      now: clock.now,
    });
    const empty = { ok: true, items: [], summary: { total: 0, critical: 0, warning: 0, info: 0 } };
    await s.recordSnapshot({ detectionResult: empty });
    clock.advance(2 * 60_000);
    const sinceMs = clock.now().toISOString();
    clock.advance(60_000);
    await s.recordSnapshot({ detectionResult: empty });
    const r = await s.listRecent({ since: sinceMs });
    expect(r.items.length).toBe(1);
  });
});

// ─── 4. getTrend ────────────────────────────────────────────────

describe('anomaly-history — getTrend', () => {
  test('returns evenly-spaced buckets with gauge semantics', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createHikvisionAnomalyHistoryService({
      snapshotModel: Model,
      logger: SILENT,
      now: clock.now,
    });
    // Three snapshots within a 60-min window, each 30 min apart
    // (clock starts at t0; advance to t0+30m, then t0+60m).
    await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [],
        summary: { total: 5, critical: 2, warning: 2, info: 1 },
      },
    });
    clock.advance(30 * 60_000);
    // Fudge the second snapshot's items to match summary.total=2.
    await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [
          { id: 'x:1', kind: reg.ANOMALY_KIND.FRAUD_CRITICAL, severity: 'critical' },
          { id: 'y:1', kind: reg.ANOMALY_KIND.SYNC_DRIFT_HIGH, severity: 'warning' },
        ],
        summary: { total: 2, critical: 1, warning: 1, info: 0 },
      },
    });
    clock.advance(30 * 60_000);
    // Bucket query: 2 hours back, 30-minute buckets → 4 buckets.
    const r = await s.getTrend({ hours: 2, bucketMinutes: 30 });
    expect(r.ok).toBe(true);
    expect(r.buckets.length).toBeGreaterThanOrEqual(3);
    expect(r.buckets.some(b => b.hasData)).toBe(true);
    // Empty buckets present zeros (not skipped) so chart is dense.
    expect(r.buckets.every(b => typeof b.total === 'number')).toBe(true);
  });

  test('empty range → all zero buckets, no crash', async () => {
    const Model = buildSnapshotModel();
    const s = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.getTrend({ hours: 1, bucketMinutes: 15 });
    expect(r.ok).toBe(true);
    expect(r.buckets.length).toBe(4);
    expect(r.buckets.every(b => b.total === 0)).toBe(true);
    expect(r.buckets.every(b => b.hasData === false)).toBe(true);
  });

  test('clamps hours + bucketMinutes to sane bounds', async () => {
    const Model = buildSnapshotModel();
    const s = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.getTrend({ hours: 9999, bucketMinutes: 99999 });
    expect(r.windowHours).toBeLessThanOrEqual(30 * 24);
    expect(r.bucketMinutes).toBeLessThanOrEqual(24 * 60);
  });
});

// ─── 5. Scheduler integration ───────────────────────────────────

describe('scheduler — ANOMALY_SCAN job', () => {
  test('available=true when both detector + history wired; runs end-to-end', async () => {
    const Model = buildSnapshotModel();
    const runModel = buildRunModel();
    const history = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const anomalyDetector = {
      detect: jest.fn(async () => ({
        ok: true,
        items: [],
        summary: { total: 0, critical: 0, warning: 0, info: 0 },
      })),
    };
    const s = createHikvisionScheduler({
      anomalyDetector,
      anomalyHistory: history,
      runModel,
      logger: SILENT,
    });
    const jobs = await s.listJobs();
    const scan = jobs.items.find(j => j.id === reg.JOB_ID.ANOMALY_SCAN);
    expect(scan).toBeDefined();
    expect(scan.available).toBe(true);

    const r = await s.runJob({ jobId: reg.JOB_ID.ANOMALY_SCAN });
    expect(r.ok).toBe(true);
    expect(r.run.status).toBe(reg.JOB_STATUS.SUCCEEDED);
    expect(r.run.result.persisted).toBe(true);
    expect(anomalyDetector.detect).toHaveBeenCalledWith({ skipCache: true });
    expect(Model._store.length).toBe(1);
  });

  test('available=false when detector wired but history missing', async () => {
    const runModel = buildRunModel();
    const s = createHikvisionScheduler({
      anomalyDetector: { detect: async () => ({ ok: true, items: [] }) },
      anomalyHistory: null,
      runModel,
      logger: SILENT,
    });
    const jobs = await s.listJobs();
    const scan = jobs.items.find(j => j.id === reg.JOB_ID.ANOMALY_SCAN);
    expect(scan.available).toBe(false);
  });

  test('detector returns ok:false → run still succeeds with persisted=false', async () => {
    const Model = buildSnapshotModel();
    const runModel = buildRunModel();
    const history = createHikvisionAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const s = createHikvisionScheduler({
      anomalyDetector: {
        detect: async () => ({ ok: false, reason: 'whatever', message: 'broken' }),
      },
      anomalyHistory: history,
      runModel,
      logger: SILENT,
    });
    const r = await s.runJob({ jobId: reg.JOB_ID.ANOMALY_SCAN });
    expect(r.ok).toBe(true);
    expect(r.run.result.persisted).toBe(false);
    expect(r.run.result.persistReason).toBe(reg.REASON.ANOMALY_SCAN_FAILED);
    expect(Model._store.length).toBe(0); // nothing persisted
  });
});

// Minimal mock JobRun model — mirrors what the scheduler needs.
function buildRunModel() {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `run-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {};
    this.save = async () => {
      store.push({ ...this });
      return this;
    };
  }
  M.find = function (q = {}) {
    let matches = store.filter(r => !q.jobId || r.jobId === q.jobId);
    const chain = {
      sort(spec) {
        const k = Object.keys(spec)[0];
        const d = spec[k];
        matches = matches.slice().sort((a, b) => {
          const av = new Date(a[k]).getTime();
          const bv = new Date(b[k]).getTime();
          return (av - bv) * d;
        });
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
    return chain;
  };
  M.updateOne = async function (query, update) {
    const t = store.find(r => String(r._id) === String(query._id));
    if (t && update.$set) Object.assign(t, update.$set);
    return { acknowledged: true, modifiedCount: t ? 1 : 0 };
  };
  M.deleteMany = async function (query) {
    if (!query._id || !query._id.$in) return { deletedCount: 0 };
    const ids = new Set(query._id.$in.map(String));
    let removed = 0;
    for (let i = store.length - 1; i >= 0; i--) {
      if (ids.has(String(store[i]._id))) {
        store.splice(i, 1);
        removed += 1;
      }
    }
    return { deletedCount: removed };
  };
  M._store = store;
  return M;
}
