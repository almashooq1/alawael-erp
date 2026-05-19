/**
 * wave147-llm-anomaly-ack.test.js — Wave 147.
 *
 * Sections:
 *   1. Factory guard
 *   2. ack — happy path persists with computed expiresAt
 *   3. ack — replaces existing ack for same anomalyId (extend)
 *   4. ack — duration validation (zero / negative / NaN / > 30 days)
 *   5. ack — anomalyId required
 *   6. unack — removes when present; NOT_FOUND when absent
 *   7. isAcked — true while active, false when expired
 *   8. listActive — only returns unexpired rows, sorted by expiresAt asc
 *   9. dispatcher integration — acked id skipped from fired set
 *  10. dispatcher integration — resolves still fire even when acked
 *  11. dispatcher integration — ackService throws → fail-open (still fires)
 */

'use strict';

const {
  createLlmAnomalyAckService,
  VALID_DURATIONS,
  MAX_DURATION_MS,
  REASON,
} = require('../intelligence/llm-anomaly-ack.service');
const {
  createLlmAnomalyDispatcher,
  EVENT_KIND,
} = require('../intelligence/llm-anomaly-dispatcher.service');

const SILENT = { info() {}, warn() {}, error() {} };

function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
  };
}

function makeAckModel() {
  const store = [];
  let counter = 0;
  function M(data) {
    Object.assign(this, data);
    this._id = data._id || `ack-${++counter}`;
    this.toObject = () => ({ ...this });
    this.validate = async () => {
      if (!this.anomalyId) {
        const e = new Error('Validation failed');
        e.errors = { anomalyId: { message: 'required' } };
        throw e;
      }
      if (!this.expiresAt || this.expiresAt <= this.acknowledgedAt) {
        const e = new Error('Validation failed');
        e.errors = { expiresAt: { message: 'must be after acknowledgedAt' } };
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
      if (
        q.expiresAt?.$gt &&
        new Date(r.expiresAt).getTime() <= new Date(q.expiresAt.$gt).getTime()
      )
        return false;
      if (q.anomalyId && r.anomalyId !== q.anomalyId) return false;
      return true;
    });
    const chain = {
      sort(spec) {
        const k = Object.keys(spec)[0];
        const dir = spec[k];
        matches = matches.slice().sort((a, b) => {
          return (new Date(a[k]).getTime() - new Date(b[k]).getTime()) * dir;
        });
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(r2 => ({ ...r2 }))),
    };
    return chain;
  };
  M.findOne = function (q = {}) {
    const matches = store.filter(r => {
      if (q.anomalyId && r.anomalyId !== q.anomalyId) return false;
      if (
        q.expiresAt?.$gt &&
        new Date(r.expiresAt).getTime() <= new Date(q.expiresAt.$gt).getTime()
      )
        return false;
      return true;
    });
    const hit = matches[0] || null;
    return {
      lean: async () => (hit ? { ...hit } : null),
      then: r => r(hit ? { ...hit } : null),
    };
  };
  M.deleteMany = async function (filter = {}) {
    const before = store.length;
    for (let i = store.length - 1; i >= 0; i--) {
      if (filter.anomalyId && store[i].anomalyId !== filter.anomalyId) continue;
      store.splice(i, 1);
    }
    return { deletedCount: before - store.length };
  };
  M._store = store;
  return M;
}

// ─── 1. Factory guard ─────────────────────────────────────────

describe('llm-anomaly-ack — factory', () => {
  test('throws when ackModel missing', () => {
    expect(() => createLlmAnomalyAckService({})).toThrow(/ackModel/);
  });
});

// ─── 2. ack happy path ────────────────────────────────────────

describe('llm-anomaly-ack — ack happy path', () => {
  test('persists with computed expiresAt + actor metadata', async () => {
    const M = makeAckModel();
    const c = makeClock();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT, now: c.now });
    const r = await s.ack({
      anomalyId: 'llm-cost-spike:global',
      durationMs: VALID_DURATIONS.SIX_HOURS_MS,
      actor: 'op-1',
      role: 'head_office',
      reason: 'investigating with on-call',
      anomaly: { kind: 'llm-cost-spike', severity: 'critical', summaryAr: 'تكلفة مرتفعة' },
    });
    expect(r.ok).toBe(true);
    expect(r.ack.anomalyId).toBe('llm-cost-spike:global');
    expect(r.ack.acknowledgedBy).toBe('op-1');
    expect(r.ack.acknowledgedByRole).toBe('head_office');
    expect(r.ack.reason).toBe('investigating with on-call');
    expect(r.ack.anomalyKind).toBe('llm-cost-spike');
    expect(r.ack.anomalySeverity).toBe('critical');
    expect(r.ack.anomalySummary).toBe('تكلفة مرتفعة');
    expect(new Date(r.ack.expiresAt).getTime() - new Date(r.ack.acknowledgedAt).getTime()).toBe(
      VALID_DURATIONS.SIX_HOURS_MS
    );
  });
});

// ─── 3. ack replaces existing ────────────────────────────────

describe('llm-anomaly-ack — replace existing', () => {
  test('second ack for same anomalyId replaces (extends) the first', async () => {
    const M = makeAckModel();
    const c = makeClock();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT, now: c.now });
    await s.ack({ anomalyId: 'x:1', durationMs: VALID_DURATIONS.ONE_HOUR_MS });
    c.advance(30 * 60_000);
    const r = await s.ack({ anomalyId: 'x:1', durationMs: VALID_DURATIONS.ONE_DAY_MS });
    expect(r.ok).toBe(true);
    expect(M._store).toHaveLength(1);
    expect(M._store[0].acknowledgedAt.getTime()).toBe(c.now().getTime());
  });
});

// ─── 4. duration validation ───────────────────────────────────

describe('llm-anomaly-ack — duration validation', () => {
  test('rejects zero / negative / NaN duration', async () => {
    const M = makeAckModel();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT });
    for (const d of [0, -1, NaN, 'abc']) {
      const r = await s.ack({ anomalyId: 'x', durationMs: d });
      expect(r.ok).toBe(false);
      expect(r.reason).toBe(REASON.VALIDATION_FAILED);
      expect(r.errors).toHaveProperty('durationMs');
    }
  });

  test('rejects duration > 30 days', async () => {
    const M = makeAckModel();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT });
    const r = await s.ack({ anomalyId: 'x', durationMs: MAX_DURATION_MS + 1000 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.VALIDATION_FAILED);
    expect(r.errors).toHaveProperty('durationMs');
  });
});

// ─── 5. anomalyId required ────────────────────────────────────

describe('llm-anomaly-ack — anomalyId required', () => {
  test('rejects empty / whitespace anomalyId', async () => {
    const M = makeAckModel();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT });
    for (const id of ['', '   ', null, undefined]) {
      const r = await s.ack({ anomalyId: id, durationMs: VALID_DURATIONS.ONE_HOUR_MS });
      expect(r.ok).toBe(false);
      expect(r.errors).toHaveProperty('anomalyId');
    }
  });
});

// ─── 6. unack ─────────────────────────────────────────────────

describe('llm-anomaly-ack — unack', () => {
  test('removes existing ack', async () => {
    const M = makeAckModel();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT });
    await s.ack({ anomalyId: 'x:1', durationMs: VALID_DURATIONS.ONE_HOUR_MS });
    const r = await s.unack({ anomalyId: 'x:1' });
    expect(r.ok).toBe(true);
    expect(r.removed).toBe(1);
    expect(M._store).toHaveLength(0);
  });

  test('returns NOT_FOUND when no ack exists', async () => {
    const M = makeAckModel();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT });
    const r = await s.unack({ anomalyId: 'missing' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.NOT_FOUND);
  });
});

// ─── 7. isAcked ────────────────────────────────────────────────

describe('llm-anomaly-ack — isAcked', () => {
  test('true while active', async () => {
    const M = makeAckModel();
    const c = makeClock();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT, now: c.now });
    await s.ack({ anomalyId: 'x:1', durationMs: VALID_DURATIONS.ONE_HOUR_MS });
    expect(await s.isAcked('x:1')).toBe(true);
  });

  test('false when no ack', async () => {
    const M = makeAckModel();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT });
    expect(await s.isAcked('never-acked')).toBe(false);
  });

  test('false after expiration', async () => {
    const M = makeAckModel();
    const c = makeClock();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT, now: c.now });
    await s.ack({ anomalyId: 'x:1', durationMs: VALID_DURATIONS.ONE_HOUR_MS });
    c.advance(2 * VALID_DURATIONS.ONE_HOUR_MS);
    expect(await s.isAcked('x:1')).toBe(false);
  });
});

// ─── 8. listActive ────────────────────────────────────────────

describe('llm-anomaly-ack — listActive', () => {
  test('returns only unexpired rows sorted by expiresAt asc', async () => {
    const M = makeAckModel();
    const c = makeClock();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT, now: c.now });
    await s.ack({ anomalyId: 'a', durationMs: VALID_DURATIONS.SIX_HOURS_MS });
    await s.ack({ anomalyId: 'b', durationMs: VALID_DURATIONS.ONE_HOUR_MS });
    await s.ack({ anomalyId: 'c', durationMs: VALID_DURATIONS.ONE_DAY_MS });
    const r = await s.listActive();
    expect(r.ok).toBe(true);
    expect(r.items.map(x => x.anomalyId)).toEqual(['b', 'a', 'c']);
  });

  test('returns empty when nothing acked', async () => {
    const M = makeAckModel();
    const s = createLlmAnomalyAckService({ ackModel: M, logger: SILENT });
    const r = await s.listActive();
    expect(r.items).toEqual([]);
  });
});

// ─── 9-11. Dispatcher integration ─────────────────────────────

function fakeAnomaly({ id, kind = 'llm-cost-spike', severity = 'critical' } = {}) {
  return { id, kind, severity, summaryAr: id, details: {}, suggestedAction: '', deepLink: '' };
}
function detection(items) {
  const sev = { critical: 0, warning: 0, info: 0 };
  for (const a of items) sev[a.severity]++;
  return {
    ok: true,
    items,
    summary: { total: items.length, ...sev },
  };
}

describe('dispatcher + ack — integration', () => {
  test('acked id is skipped from fired set (reason=acknowledged)', async () => {
    const M = makeAckModel();
    const c = makeClock();
    const ackSvc = createLlmAnomalyAckService({ ackModel: M, logger: SILENT, now: c.now });
    const calls = [];
    const ch = {
      name: 'capture',
      deliver: async ev => {
        calls.push(ev);
        return { ok: true };
      },
    };
    const d = createLlmAnomalyDispatcher({
      channels: [ch],
      logger: SILENT,
      now: c.now,
      ackService: ackSvc,
    });

    // Pre-ack a specific anomaly
    await ackSvc.ack({ anomalyId: 'silenced:1', durationMs: VALID_DURATIONS.ONE_HOUR_MS });

    // Baseline
    await d.dispatch({ detectionResult: detection([]) });
    c.advance(120_000);

    // New anomalies: one is acked, one is not
    const r = await d.dispatch({
      detectionResult: detection([
        fakeAnomaly({ id: 'silenced:1' }),
        fakeAnomaly({ id: 'loud:2' }),
      ]),
    });

    expect(r.fired.map(x => x.id)).toEqual(['loud:2']);
    expect(r.skipped.find(s => s.id === 'silenced:1')?.reason).toBe('acknowledged');
    // Channel saw only the unsilenced one
    expect(calls.filter(c => c.kind === EVENT_KIND.FIRED).map(c => c.anomaly.id)).toEqual([
      'loud:2',
    ]);
  });

  test('resolves still fire even when an anomaly is acked', async () => {
    const M = makeAckModel();
    const c = makeClock();
    const ackSvc = createLlmAnomalyAckService({ ackModel: M, logger: SILENT, now: c.now });
    const calls = [];
    const ch = {
      name: 'capture',
      deliver: async ev => {
        calls.push(ev);
        return { ok: true };
      },
    };
    const d = createLlmAnomalyDispatcher({
      channels: [ch],
      logger: SILENT,
      now: c.now,
      ackService: ackSvc,
    });

    // Baseline with the anomaly already active + acked
    await ackSvc.ack({ anomalyId: 'silenced:1', durationMs: VALID_DURATIONS.ONE_HOUR_MS });
    await d.dispatch({ detectionResult: detection([fakeAnomaly({ id: 'silenced:1' })]) });
    c.advance(120_000);

    // It resolves — channel SHOULD see resolved event
    const r = await d.dispatch({ detectionResult: detection([]) });
    expect(r.resolved.map(x => x.id)).toEqual(['silenced:1']);
    expect(calls.find(c => c.kind === EVENT_KIND.RESOLVED)?.anomaly.id).toBe('silenced:1');
  });

  test('ackService throwing → fail-open (still fires)', async () => {
    const c = makeClock();
    const calls = [];
    const ch = {
      name: 'capture',
      deliver: async ev => {
        calls.push(ev);
        return { ok: true };
      },
    };
    const ackSvc = {
      isAcked: async () => {
        throw new Error('mongo unreachable');
      },
    };
    const d = createLlmAnomalyDispatcher({
      channels: [ch],
      logger: SILENT,
      now: c.now,
      ackService: ackSvc,
    });
    await d.dispatch({ detectionResult: detection([]) });
    c.advance(120_000);
    const r = await d.dispatch({
      detectionResult: detection([fakeAnomaly({ id: 'risky:1' })]),
    });
    expect(r.fired.map(x => x.id)).toEqual(['risky:1']);
    expect(calls).toHaveLength(1);
  });
});
