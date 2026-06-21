/**
 * wave144-llm-anomaly-history.test.js — Wave 144.
 *
 * Persistence + trend layer for the Wave 142 LLM anomaly detector.
 *
 * Sections:
 *   1. recordSnapshot — happy path + summary derivation + strip details
 *   2. recordSnapshot — detector failed → ANOMALY_SCAN_FAILED, not persisted
 *   3. recordSnapshot — null detection rejected without crashing
 *   4. recordSnapshot — model validation rejection surfaces VALIDATION_FAILED
 *   5. recordSnapshot — save failure logs structured diagnostics
 *   6. listRecent — recent-first order + limit + since/source filters
 *   7. getTrend — gauge semantics (latest snapshot in bucket wins)
 *   8. getTrend — empty range gives all-zero buckets
 *   9. getTrend — clamps hours/bucketMinutes to sane bounds
 *   10. factory guard — snapshotModel required
 */

'use strict';

const { createLlmAnomalyHistoryService } = require('../intelligence/llm-anomaly-history.service');
const { ANOMALY_KIND, REASON } = require('../intelligence/llm-anomaly-detector.service');

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

// ─── Mock snapshot model (mirrors Wave 114 mock) ─────────────────

function buildSnapshotModel({ failValidation = false, failSave = false } = {}) {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `llm-snap-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {
      if (failValidation) {
        const e = new Error('Validation failed');
        e.errors = { 'summary.total': { message: 'mismatch' } };
        throw e;
      }
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
      if (failSave) {
        const e = new Error('connection timed out');
        e.name = 'MongooseError';
        e.code = 89;
        throw e;
      }
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

// ─── 1. recordSnapshot happy path ────────────────────────────────

describe('llm-anomaly-history — recordSnapshot happy path', () => {
  test('persists snapshot with summary preserved + strips diagnostic fields', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createLlmAnomalyHistoryService({
      snapshotModel: Model,
      logger: SILENT,
      now: clock.now,
    });
    const detection = {
      ok: true,
      generatedAt: clock.now().toISOString(),
      items: [
        {
          id: 'llm-cost-spike:global',
          kind: ANOMALY_KIND.COST_SPIKE,
          severity: 'critical',
          summaryAr: 'ارتفاع تكلفة',
          details: { ratio: 8.4 },
          suggestedAction: 'افحص ...',
          deepLink: '/ai/parent-chatbot',
          detectedAt: clock.now().toISOString(),
        },
        {
          id: 'llm-fallback-rate-high:cross-service',
          kind: ANOMALY_KIND.FALLBACK_RATE_HIGH,
          severity: 'warning',
          summaryAr: 'fallback مرتفع',
          details: { fallbackRate: 0.7 },
          suggestedAction: 'تحقّق ...',
          deepLink: '/ai/llm-anomalies',
          detectedAt: clock.now().toISOString(),
        },
        {
          id: 'llm-cache-ineffective:parent-chatbot',
          kind: ANOMALY_KIND.CACHE_INEFFECTIVE,
          severity: 'info',
          summaryAr: 'cache ضعيف',
          details: { cacheHitRate: 0.02 },
          suggestedAction: 'راجع ...',
          deepLink: '/ai/llm-anomalies',
          detectedAt: clock.now().toISOString(),
        },
      ],
      summary: { total: 3, critical: 1, warning: 1, info: 1 },
    };
    const r = await s.recordSnapshot({
      detectionResult: detection,
      source: 'manual',
      meta: { actor: 'op-7' },
    });
    expect(r.ok).toBe(true);
    expect(r.snapshot.source).toBe('manual');
    expect(r.snapshot.summary).toEqual({ total: 3, critical: 1, warning: 1, info: 1 });
    expect(r.snapshot.items).toHaveLength(3);
    // Diagnostic fields must be stripped to keep storage compact
    expect(r.snapshot.items[0].summaryAr).toBeUndefined();
    expect(r.snapshot.items[0].details).toBeUndefined();
    expect(r.snapshot.items[0].suggestedAction).toBeUndefined();
    // id/kind/severity preserved
    expect(r.snapshot.items[0]).toEqual({
      id: 'llm-cost-spike:global',
      kind: ANOMALY_KIND.COST_SPIKE,
      severity: 'critical',
    });
    expect(r.snapshot.meta).toEqual({ actor: 'op-7' });
  });

  test('derives summary when detector omits it', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const detection = {
      ok: true,
      items: [
        { id: 'a', kind: ANOMALY_KIND.COST_SPIKE, severity: 'critical' },
        { id: 'b', kind: ANOMALY_KIND.SERVICE_DOWN, severity: 'warning' },
        { id: 'c', kind: ANOMALY_KIND.CACHE_INEFFECTIVE, severity: 'info' },
      ],
    };
    const r = await s.recordSnapshot({ detectionResult: detection });
    expect(r.ok).toBe(true);
    expect(r.snapshot.summary).toEqual({ total: 3, critical: 1, warning: 1, info: 1 });
  });

  test('zero-anomaly snapshot persists with all-zero summary', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [],
        summary: { total: 0, critical: 0, warning: 0, info: 0 },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.snapshot.summary.total).toBe(0);
    expect(r.snapshot.items).toHaveLength(0);
  });

  test('default source is scheduler', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [],
        summary: { total: 0, critical: 0, warning: 0, info: 0 },
      },
    });
    expect(r.ok).toBe(true);
    expect(r.snapshot.source).toBe('scheduler');
  });
});

// ─── 2. recordSnapshot — detector failed ─────────────────────────

describe('llm-anomaly-history — detector failed', () => {
  test('returns ANOMALY_SCAN_FAILED + does NOT persist when detection.ok=false', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({
      detectionResult: { ok: false, reason: 'whatever', message: 'broken' },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.ANOMALY_SCAN_FAILED);
    expect(r.message).toContain('broken');
    expect(Model._store).toHaveLength(0);
  });

  test('null detectionResult rejected without crashing', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.ANOMALY_SCAN_FAILED);
    expect(Model._store).toHaveLength(0);
  });
});

// ─── 3. recordSnapshot — model validation rejection ──────────────

describe('llm-anomaly-history — validation rejection', () => {
  test('returns VALIDATION_FAILED when model.validate() throws', async () => {
    const Model = buildSnapshotModel({ failValidation: true });
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [],
        summary: { total: 0, critical: 0, warning: 0, info: 0 },
      },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.VALIDATION_FAILED);
    expect(r.errors).toBeDefined();
    expect(Model._store).toHaveLength(0);
  });
});

// ─── 4. recordSnapshot — save failure diagnostics ────────────────

describe('llm-anomaly-history — save failure', () => {
  test('returns SAVE_FAILED and logs structured diagnostics', async () => {
    const Model = buildSnapshotModel({ failSave: true });
    const logs = [];
    const logger = {
      info: () => {},
      warn: () => {},
      error: (...args) => logs.push(args),
    };
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger });
    const r = await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [
          { id: 'x:1', kind: ANOMALY_KIND.COST_SPIKE, severity: 'critical' },
          { id: 'x:2', kind: ANOMALY_KIND.SERVICE_DOWN, severity: 'warning' },
        ],
        summary: { total: 2, critical: 1, warning: 1, info: 0 },
      },
      source: 'scheduler',
      durationMs: 42,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.SAVE_FAILED);
    expect(Model._store).toHaveLength(0);
    expect(logs).toHaveLength(1);
    const logLine = logs[0].join(' ');
    expect(logLine).toContain('[llm-anomaly-history] save failed:');
    expect(logLine).toContain('connection timed out');
    expect(logLine).toContain('name=MongooseError');
    expect(logLine).toContain('code=89');
    expect(logLine).toContain('source=scheduler');
    expect(logLine).toContain('total=2');
  });
});

// ─── 5. listRecent ───────────────────────────────────────────────

describe('llm-anomaly-history — listRecent', () => {
  test('returns rows in recent-first order + respects limit', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createLlmAnomalyHistoryService({
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
    expect(r.items).toHaveLength(3);
    const ts = r.items.map(it => new Date(it.recordedAt).getTime());
    expect(ts[0]).toBeGreaterThanOrEqual(ts[1]);
    expect(ts[1]).toBeGreaterThanOrEqual(ts[2]);
    // total reflects everything in store, not just the page
    expect(r.total).toBe(5);
  });

  test('source filter narrows results', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const empty = { ok: true, items: [], summary: { total: 0, critical: 0, warning: 0, info: 0 } };
    await s.recordSnapshot({ detectionResult: empty, source: 'scheduler' });
    await s.recordSnapshot({ detectionResult: empty, source: 'manual' });
    await s.recordSnapshot({ detectionResult: empty, source: 'scheduler' });
    const r = await s.listRecent({ source: 'manual' });
    expect(r.items.every(x => x.source === 'manual')).toBe(true);
    expect(r.items).toHaveLength(1);
  });

  test('since filter excludes older rows', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createLlmAnomalyHistoryService({
      snapshotModel: Model,
      logger: SILENT,
      now: clock.now,
    });
    const empty = { ok: true, items: [], summary: { total: 0, critical: 0, warning: 0, info: 0 } };
    await s.recordSnapshot({ detectionResult: empty });
    clock.advance(2 * 60_000);
    const cutoff = clock.now().toISOString();
    clock.advance(60_000);
    await s.recordSnapshot({ detectionResult: empty });
    const r = await s.listRecent({ since: cutoff });
    expect(r.items).toHaveLength(1);
  });

  test('limit is clamped to [1, 500]', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const empty = { ok: true, items: [], summary: { total: 0, critical: 0, warning: 0, info: 0 } };
    await s.recordSnapshot({ detectionResult: empty });
    const r = await s.listRecent({ limit: 99999 });
    expect(r.items.length).toBeLessThanOrEqual(500);
  });
});

// ─── 5. getTrend — gauge semantics ───────────────────────────────

describe('llm-anomaly-history — getTrend', () => {
  test('latest snapshot in bucket wins (gauge, not sum)', async () => {
    const Model = buildSnapshotModel();
    const clock = makeClock();
    const s = createLlmAnomalyHistoryService({
      snapshotModel: Model,
      logger: SILENT,
      now: clock.now,
    });
    // First snapshot at t=0 with total=5
    await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: Array.from({ length: 5 }, (_, i) => ({
          id: `a:${i}`,
          kind: ANOMALY_KIND.COST_SPIKE,
          severity: 'critical',
        })),
        summary: { total: 5, critical: 5, warning: 0, info: 0 },
      },
    });
    // Second snapshot 5 minutes later (same bucket if bucketMinutes≥30)
    // with total=2 — gauge semantics means bucket should show 2, NOT 7.
    clock.advance(5 * 60_000);
    await s.recordSnapshot({
      detectionResult: {
        ok: true,
        items: [
          { id: 'b:1', kind: ANOMALY_KIND.COST_SPIKE, severity: 'critical' },
          { id: 'b:2', kind: ANOMALY_KIND.SERVICE_DOWN, severity: 'warning' },
        ],
        summary: { total: 2, critical: 1, warning: 1, info: 0 },
      },
    });
    // Advance to make sure the snapshot times fall inside the trend window
    clock.advance(10 * 60_000);
    const r = await s.getTrend({ hours: 1, bucketMinutes: 30 });
    expect(r.ok).toBe(true);
    const dataBucket = r.buckets.find(b => b.hasData);
    expect(dataBucket).toBeDefined();
    // Latest in the bucket should be the second snapshot (total=2)
    expect(dataBucket.total).toBe(2);
    expect(dataBucket.critical).toBe(1);
    expect(dataBucket.warning).toBe(1);
  });

  test('empty range → all zero buckets, no crash', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.getTrend({ hours: 1, bucketMinutes: 15 });
    expect(r.ok).toBe(true);
    expect(r.buckets).toHaveLength(4);
    expect(r.buckets.every(b => b.total === 0)).toBe(true);
    expect(r.buckets.every(b => b.hasData === false)).toBe(true);
  });

  test('clamps hours + bucketMinutes to sane bounds', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.getTrend({ hours: 9999, bucketMinutes: 99999 });
    expect(r.windowHours).toBeLessThanOrEqual(30 * 24);
    expect(r.bucketMinutes).toBeLessThanOrEqual(24 * 60);
  });

  test('clamps minimum bucketMinutes to 5', async () => {
    const Model = buildSnapshotModel();
    const s = createLlmAnomalyHistoryService({ snapshotModel: Model, logger: SILENT });
    const r = await s.getTrend({ hours: 1, bucketMinutes: 1 });
    expect(r.bucketMinutes).toBe(5);
  });
});

// ─── 6. Factory guard ────────────────────────────────────────────

describe('llm-anomaly-history — factory guard', () => {
  test('throws when snapshotModel missing', () => {
    expect(() => createLlmAnomalyHistoryService({})).toThrow(/snapshotModel/);
  });
});
