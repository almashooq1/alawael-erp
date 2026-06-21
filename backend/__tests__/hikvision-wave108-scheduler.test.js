/**
 * hikvision-wave108-scheduler.test.js — Wave 108.
 *
 * Unit tests for the Hikvision operational scheduler.
 *
 * Sections:
 *   1. Registry constants — JOB_ID coverage + JOB_STATUSES + REASON codes
 *   2. listJobs — registry shape with no runs yet
 *   3. runJob — happy path (handler returns, status succeeded)
 *   4. runJob — missing handler → SKIPPED + JOB_HANDLER_UNAVAILABLE
 *   5. runJob — handler throws → FAILED + error captured
 *   6. runJob — already running (lock active) → SKIPPED + JOB_ALREADY_RUNNING
 *   7. runJob — stale running row (older than lockTimeoutMs) → fresh run wins
 *   8. listRuns — recent-first ordering + limit cap
 *   9. listJobs after runs — latest run reflected per job
 *  10. unknown jobId → JOB_NOT_FOUND
 *  11. History pruning — runs over HISTORY_RETAIN_RUNS get deleted
 */

'use strict';

const reg = require('../intelligence/hikvision.registry');
const { createHikvisionScheduler } = require('../intelligence/hikvision-scheduler.service');

// ─── In-memory model mock for HikvisionJobRun ──────────────────

function buildRunModel() {
  const store = [];
  let counter = 0;

  function Model(data) {
    Object.assign(this, data);
    this._id = data._id || `run-${++counter}`;
    this.toObject = () => ({ ...this });

    this.validate = async () => {
      // Mimic the Wave-18 invariants on the real model.
      if (!this.startedAt) {
        const err = new Error('Validation failed');
        err.errors = { startedAt: { message: 'required' } };
        throw err;
      }
      if (this.status === reg.JOB_STATUS.SUCCEEDED && !this.finishedAt) {
        const err = new Error('Validation failed');
        err.errors = { finishedAt: { message: 'required' } };
        throw err;
      }
      if (this.status === reg.JOB_STATUS.FAILED && (!this.error || !this.error.message)) {
        const err = new Error('Validation failed');
        err.errors = { error: { message: 'required' } };
        throw err;
      }
      if (this.status === reg.JOB_STATUS.SKIPPED && !this.reason) {
        const err = new Error('Validation failed');
        err.errors = { reason: { message: 'required' } };
        throw err;
      }
    };

    this.save = async () => {
      const existing = store.findIndex(r => String(r._id) === String(this._id));
      if (existing >= 0) {
        store[existing] = { ...this };
      } else {
        store.push({ ...this });
      }
      return this;
    };
  }

  Model.find = function (query = {}) {
    let matches = store.filter(r => {
      for (const [k, v] of Object.entries(query)) {
        if (v && typeof v === 'object' && '$in' in v) {
          if (!v.$in.some(x => String(x) === String(r[k]))) return false;
        } else if (String(r[k]) !== String(v)) {
          return false;
        }
      }
      return true;
    });
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        matches = matches.slice().sort((a, b) => {
          const av = new Date(a[key]).getTime();
          const bv = new Date(b[key]).getTime();
          return (av - bv) * dir;
        });
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
      then: resolve => resolve(matches.map(r => ({ ...r }))),
    };
    return chain;
  };

  Model.updateOne = async function (query, update) {
    const t = store.find(r => String(r._id) === String(query._id));
    if (t && update.$set) Object.assign(t, update.$set);
    return { acknowledged: true, modifiedCount: t ? 1 : 0 };
  };

  Model.deleteMany = async function (query) {
    let removed = 0;
    if (query._id && query._id.$in) {
      const ids = new Set(query._id.$in.map(String));
      for (let i = store.length - 1; i >= 0; i--) {
        if (ids.has(String(store[i]._id))) {
          store.splice(i, 1);
          removed += 1;
        }
      }
    }
    return { acknowledged: true, deletedCount: removed };
  };

  Model._store = store;
  return Model;
}

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// Manual clock helper — lets us simulate time advances for lock-timeout tests.
function makeClock(initial = 1_700_000_000_000) {
  const state = { t: initial };
  return {
    now: () => new Date(state.t),
    advance: ms => {
      state.t += ms;
    },
    set: ts => {
      state.t = ts;
    },
  };
}

// ─── 1. Registry constants ─────────────────────────────────────

describe('hikvision.registry — scheduler constants', () => {
  test('JOB_IDS covers the expected ids (Wave 108 + 114)', () => {
    expect(reg.JOB_IDS).toEqual(
      expect.arrayContaining([
        'hikvision.sync-all',
        'hikvision.drift-detect-all',
        'hikvision.fraud.scan-templates',
        'hikvision.fraud.scan-unregistered',
        'hikvision.fraud.sweep-expired',
        'hikvision.fraud.decay-all',
        'hikvision.recognition.parse-pending',
        'hikvision.health.sweep',
        'hikvision.anomaly.scan', // Wave 114
      ])
    );
    // Wave 108 shipped 8 ids; Wave 114 added 1 — guard against
    // accidental drift in either direction.
    expect(reg.JOB_IDS.length).toBe(9);
  });

  test('JOB_STATUSES has the 5 lifecycle states', () => {
    expect([...reg.JOB_STATUSES].sort()).toEqual(
      ['failed', 'pending', 'running', 'skipped', 'succeeded'].sort()
    );
  });

  test('JOB_CRON_DEFAULTS exists for every JOB_ID', () => {
    for (const id of reg.JOB_IDS) {
      expect(reg.JOB_CRON_DEFAULTS[id]).toBeTruthy();
      expect(typeof reg.JOB_CRON_DEFAULTS[id]).toBe('string');
    }
  });

  test('REASON has scheduler codes', () => {
    expect(reg.REASON.JOB_NOT_FOUND).toBe('JOB_NOT_FOUND');
    expect(reg.REASON.JOB_HANDLER_UNAVAILABLE).toBe('JOB_HANDLER_UNAVAILABLE');
    expect(reg.REASON.JOB_ALREADY_RUNNING).toBe('JOB_ALREADY_RUNNING');
    expect(reg.REASON.JOB_HANDLER_THREW).toBe('JOB_HANDLER_THREW');
  });
});

// ─── 2. listJobs — registry shape with no runs yet ─────────────

describe('scheduler.listJobs', () => {
  test('with no services wired, every job is available=false', async () => {
    const runModel = buildRunModel();
    const s = createHikvisionScheduler({ runModel, logger: SILENT });
    const r = await s.listJobs();
    expect(r.items).toHaveLength(9);
    for (const it of r.items) {
      expect(it.available).toBe(false);
      expect(it.latest).toBeNull();
      expect(it.defaultCron).toBeTruthy();
    }
  });

  test('with syncWorker wired, only sync-related jobs are available', async () => {
    const runModel = buildRunModel();
    const s = createHikvisionScheduler({
      runModel,
      syncWorker: {
        syncAll: async () => ({ ok: true }),
        detectDriftAll: async () => ({ ok: true }),
      },
      logger: SILENT,
    });
    const r = await s.listJobs();
    const idx = Object.fromEntries(r.items.map(j => [j.id, j.available]));
    expect(idx[reg.JOB_ID.SYNC_ALL]).toBe(true);
    expect(idx[reg.JOB_ID.DRIFT_DETECT_ALL]).toBe(true);
    expect(idx[reg.JOB_ID.FRAUD_SCAN_TEMPLATES]).toBe(false);
  });
});

// ─── 3. runJob — happy path ─────────────────────────────────────

describe('scheduler.runJob — happy path', () => {
  test('handler returns → status=succeeded + result persisted', async () => {
    const runModel = buildRunModel();
    const syncWorker = {
      syncAll: jest.fn(async () => ({ ok: true, libraries: [], summary: { librariesScanned: 0 } })),
    };
    const clock = makeClock();
    const s = createHikvisionScheduler({
      runModel,
      syncWorker,
      logger: SILENT,
      now: clock.now,
    });

    const r = await s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    expect(r.ok).toBe(true);
    expect(r.jobId).toBe(reg.JOB_ID.SYNC_ALL);
    expect(r.run.status).toBe(reg.JOB_STATUS.SUCCEEDED);
    expect(r.run.result.summary.librariesScanned).toBe(0);
    expect(syncWorker.syncAll).toHaveBeenCalledTimes(1);
  });

  test('args forwarded to handler', async () => {
    const runModel = buildRunModel();
    const fraudDetection = {
      scanTemplates: jest.fn(async args => ({ scanned: 1, args })),
    };
    const s = createHikvisionScheduler({ runModel, fraudDetection, logger: SILENT });
    await s.runJob({ jobId: reg.JOB_ID.FRAUD_SCAN_TEMPLATES, args: { since: '2026-01-01' } });
    expect(fraudDetection.scanTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ since: '2026-01-01', actor: expect.any(Object) })
    );
  });

  test('trigger + initiator persisted on the run row', async () => {
    const runModel = buildRunModel();
    const fraudScore = { decayAllScores: jest.fn(async () => ({ scanned: 5, recomputed: 5 })) };
    const s = createHikvisionScheduler({ runModel, fraudScore, logger: SILENT });
    await s.runJob({
      jobId: reg.JOB_ID.FRAUD_DECAY_ALL,
      trigger: reg.JOB_TRIGGER.CRON,
      initiator: 'scheduler',
    });
    const all = await s.listRuns({ jobId: reg.JOB_ID.FRAUD_DECAY_ALL });
    expect(all.items[0].trigger).toBe(reg.JOB_TRIGGER.CRON);
    expect(all.items[0].initiator).toBe('scheduler');
  });
});

// ─── 4. Missing handler → JOB_HANDLER_UNAVAILABLE ───────────────

describe('scheduler.runJob — missing handler', () => {
  test('returns SKIPPED + JOB_HANDLER_UNAVAILABLE when service not wired', async () => {
    const runModel = buildRunModel();
    const s = createHikvisionScheduler({ runModel, logger: SILENT }); // nothing wired
    const r = await s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.JOB_HANDLER_UNAVAILABLE);
    expect(r.run.status).toBe(reg.JOB_STATUS.SKIPPED);
  });
});

// ─── 5. Handler throws → status=failed ──────────────────────────

describe('scheduler.runJob — handler throws', () => {
  test('caught exception becomes failed run with error payload', async () => {
    const runModel = buildRunModel();
    const syncWorker = {
      syncAll: async () => {
        const e = new Error('upstream NVR unreachable');
        e.code = 'SYNC_DEVICE_UNREACHABLE';
        throw e;
      },
    };
    const s = createHikvisionScheduler({ runModel, syncWorker, logger: SILENT });
    const r = await s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.JOB_HANDLER_THREW);
    expect(r.run.status).toBe(reg.JOB_STATUS.FAILED);
    expect(r.run.error.message).toMatch(/upstream NVR/);
    expect(r.run.error.code).toBe('SYNC_DEVICE_UNREACHABLE');
  });

  test('error without code falls back to JOB_HANDLER_THREW', async () => {
    const runModel = buildRunModel();
    const syncWorker = {
      syncAll: async () => {
        throw new Error('plain boom');
      },
    };
    const s = createHikvisionScheduler({ runModel, syncWorker, logger: SILENT });
    const r = await s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    expect(r.run.error.code).toBe(reg.REASON.JOB_HANDLER_THREW);
  });
});

// ─── 6. Lock active → SKIPPED + JOB_ALREADY_RUNNING ─────────────

describe('scheduler.runJob — concurrent lock', () => {
  test('second concurrent invocation is rejected while first runs', async () => {
    const runModel = buildRunModel();
    let release;
    const blocked = new Promise(resolve => {
      release = resolve;
    });
    const syncWorker = {
      syncAll: async () => {
        await blocked;
        return { ok: true };
      },
    };
    const s = createHikvisionScheduler({ runModel, syncWorker, logger: SILENT });

    const inflight = s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    // Give the first call a chance to write its running row.
    await new Promise(r => setImmediate(r));

    const second = await s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    expect(second.ok).toBe(false);
    expect(second.reason).toBe(reg.REASON.JOB_ALREADY_RUNNING);

    release();
    const first = await inflight;
    expect(first.ok).toBe(true);
  });
});

// ─── 7. Stale running row → fresh run wins ──────────────────────

describe('scheduler.runJob — stale lock auto-release', () => {
  test('row older than lockTimeoutMs is treated as released', async () => {
    const runModel = buildRunModel();
    const clock = makeClock();
    // Seed a long-running row from "long ago".
    runModel._store.push({
      _id: 'stale-1',
      jobId: reg.JOB_ID.SYNC_ALL,
      trigger: reg.JOB_TRIGGER.CRON,
      status: reg.JOB_STATUS.RUNNING,
      startedAt: new Date(clock.now().getTime() - 60 * 60 * 1000), // 60 min ago
      finishedAt: null,
    });
    const syncWorker = { syncAll: async () => ({ ok: true, recovered: true }) };
    const s = createHikvisionScheduler({
      runModel,
      syncWorker,
      logger: SILENT,
      now: clock.now,
      lockTimeoutMs: 15 * 60 * 1000,
    });
    const r = await s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    expect(r.ok).toBe(true);
    expect(r.run.result.recovered).toBe(true);
  });
});

// ─── 8. listRuns — recent-first + limit ─────────────────────────

describe('scheduler.listRuns', () => {
  test('returns rows sorted newest-first and respects limit', async () => {
    const runModel = buildRunModel();
    const fraudDetection = {
      scanTemplates: jest.fn(async () => ({ scanned: 1 })),
    };
    const clock = makeClock();
    const s = createHikvisionScheduler({
      runModel,
      fraudDetection,
      logger: SILENT,
      now: clock.now,
    });
    for (let i = 0; i < 5; i++) {
      await s.runJob({ jobId: reg.JOB_ID.FRAUD_SCAN_TEMPLATES });
      clock.advance(1_000);
    }
    const r = await s.listRuns({ jobId: reg.JOB_ID.FRAUD_SCAN_TEMPLATES, limit: 3 });
    expect(r.ok).toBe(true);
    expect(r.items.length).toBe(3);
    const ts = r.items.map(it => new Date(it.startedAt).getTime());
    expect(ts[0]).toBeGreaterThanOrEqual(ts[1]);
    expect(ts[1]).toBeGreaterThanOrEqual(ts[2]);
  });

  test('unknown jobId → JOB_NOT_FOUND', async () => {
    const runModel = buildRunModel();
    const s = createHikvisionScheduler({ runModel, logger: SILENT });
    const r = await s.listRuns({ jobId: 'does.not.exist' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.JOB_NOT_FOUND);
  });
});

// ─── 9. listJobs after runs reflects latest per job ─────────────

describe('scheduler.listJobs — populated', () => {
  test('latest status reflected per job', async () => {
    const runModel = buildRunModel();
    const syncWorker = { syncAll: async () => ({ ok: true }) };
    const fraudDetection = {
      scanTemplates: async () => {
        throw new Error('synthetic');
      },
    };
    const s = createHikvisionScheduler({ runModel, syncWorker, fraudDetection, logger: SILENT });
    await s.runJob({ jobId: reg.JOB_ID.SYNC_ALL });
    await s.runJob({ jobId: reg.JOB_ID.FRAUD_SCAN_TEMPLATES });

    const r = await s.listJobs();
    const idx = Object.fromEntries(r.items.map(j => [j.id, j.latest]));
    expect(idx[reg.JOB_ID.SYNC_ALL].status).toBe(reg.JOB_STATUS.SUCCEEDED);
    expect(idx[reg.JOB_ID.FRAUD_SCAN_TEMPLATES].status).toBe(reg.JOB_STATUS.FAILED);
    expect(idx[reg.JOB_ID.DRIFT_DETECT_ALL]).toBeNull(); // never run
  });
});

// ─── 10. Unknown jobId ──────────────────────────────────────────

describe('scheduler.runJob — unknown jobId', () => {
  test('returns JOB_NOT_FOUND without writing a run row', async () => {
    const runModel = buildRunModel();
    const s = createHikvisionScheduler({ runModel, logger: SILENT });
    const r = await s.runJob({ jobId: 'hikvision.unknown' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.JOB_NOT_FOUND);
    expect(runModel._store).toHaveLength(0);
  });
});

// ─── 11. History pruning ────────────────────────────────────────

describe('scheduler._pruneHistory', () => {
  test('keeps only HISTORY_RETAIN_RUNS most recent rows for a job', async () => {
    const runModel = buildRunModel();
    const fraudScore = { decayAllScores: async () => ({ ok: true, recomputed: 0 }) };
    const clock = makeClock();
    const s = createHikvisionScheduler({
      runModel,
      fraudScore,
      logger: SILENT,
      now: clock.now,
      historyRetainRuns: 3,
    });
    for (let i = 0; i < 6; i++) {
      await s.runJob({ jobId: reg.JOB_ID.FRAUD_DECAY_ALL });
      clock.advance(1_000);
    }
    // pruneHistory is fire-and-forget on the success path; await an
    // explicit prune so the test is deterministic.
    await s._pruneHistory(reg.JOB_ID.FRAUD_DECAY_ALL);
    const r = await s.listRuns({ jobId: reg.JOB_ID.FRAUD_DECAY_ALL, limit: 100 });
    expect(r.items.length).toBeLessThanOrEqual(3);
  });
});
