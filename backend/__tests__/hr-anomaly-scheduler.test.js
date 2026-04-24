'use strict';

/**
 * hr-anomaly-scheduler.test.js — Phase 11 Commit 23 (4.0.40).
 *
 * Pure unit tests for the setInterval wrapper. No DB, no real timers
 * — setInterval/clearInterval are injected for determinism.
 */

const {
  createHrAnomalyScheduler,
  MIN_INTERVAL_MS,
  MAX_INTERVAL_MS,
  DEFAULT_INTERVAL_MS,
} = require('../services/hr/hrAnomalyScheduler');

function fakeTimers() {
  const handles = new Map();
  let handleId = 0;
  return {
    setInterval: jest.fn((fn, ms) => {
      handleId += 1;
      handles.set(handleId, { fn, ms });
      return handleId;
    }),
    clearInterval: jest.fn(id => {
      handles.delete(id);
    }),
    get handles() {
      return handles;
    },
    async invoke(id) {
      const h = handles.get(id);
      if (!h) throw new Error(`no handle ${id}`);
      return h.fn();
    },
    size() {
      return handles.size;
    },
  };
}

function fakeDetector({ scanResult = null, failEvery = 0 } = {}) {
  let calls = 0;
  return {
    scan: jest.fn(async () => {
      calls += 1;
      if (failEvery > 0 && calls % failEvery === 0) {
        throw new Error(`simulated scan failure on call ${calls}`);
      }
      return (
        scanResult || {
          scannedAt: new Date().toISOString(),
          totals: { read_anomalies: 0, export_anomalies: 0, cooldown_skipped: 0 },
          flagged: [],
        }
      );
    }),
    getCalls: () => calls,
  };
}

// ─── Construction ───────────────────────────────────────────────

describe('createHrAnomalyScheduler — construction', () => {
  it('throws without detector.scan', () => {
    expect(() => createHrAnomalyScheduler({})).toThrow(/detector with scan/);
  });

  it('throws when detector lacks scan', () => {
    expect(() => createHrAnomalyScheduler({ detector: { notScan: () => {} } })).toThrow(
      /detector with scan/
    );
  });

  it('accepts minimal deps', () => {
    const svc = createHrAnomalyScheduler({ detector: fakeDetector() });
    expect(typeof svc.start).toBe('function');
    expect(typeof svc.stop).toBe('function');
    expect(typeof svc.tick).toBe('function');
    expect(svc.isRunning()).toBe(false);
  });
});

// ─── Interval clamping ──────────────────────────────────────────

describe('interval clamping', () => {
  const timers = fakeTimers();

  it('clamps below MIN_INTERVAL_MS to MIN_INTERVAL_MS', async () => {
    const t = fakeTimers();
    const svc = createHrAnomalyScheduler({
      detector: fakeDetector(),
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      intervalMs: 100, // below 60s floor
      runOnStart: false,
    });
    svc.start();
    const handle = [...t.handles.values()][0];
    expect(handle.ms).toBe(MIN_INTERVAL_MS);
  });

  it('clamps above MAX_INTERVAL_MS to MAX_INTERVAL_MS', () => {
    const t = fakeTimers();
    const svc = createHrAnomalyScheduler({
      detector: fakeDetector(),
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      intervalMs: 100 * 24 * 60 * 60 * 1000, // 100 days
      runOnStart: false,
    });
    svc.start();
    const handle = [...t.handles.values()][0];
    expect(handle.ms).toBe(MAX_INTERVAL_MS);
  });

  it('defaults to DEFAULT_INTERVAL_MS when not provided', () => {
    const t = fakeTimers();
    const svc = createHrAnomalyScheduler({
      detector: fakeDetector(),
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      runOnStart: false,
    });
    svc.start();
    const handle = [...t.handles.values()][0];
    expect(handle.ms).toBe(DEFAULT_INTERVAL_MS);
  });
});

// ─── start() / stop() ───────────────────────────────────────────

describe('start() / stop()', () => {
  it('start schedules the interval + fires immediate tick by default', async () => {
    const t = fakeTimers();
    const det = fakeDetector();
    const svc = createHrAnomalyScheduler({
      detector: det,
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      intervalMs: 60_000,
    });
    const r = await svc.start();
    expect(r.alreadyStarted).toBe(false);
    expect(svc.isRunning()).toBe(true);
    expect(t.size()).toBe(1);
    // wait a tick for the immediate-fire promise
    await new Promise(r => setImmediate(r));
    expect(det.getCalls()).toBe(1);
  });

  it('runOnStart: false skips the immediate fire', async () => {
    const t = fakeTimers();
    const det = fakeDetector();
    const svc = createHrAnomalyScheduler({
      detector: det,
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      intervalMs: 60_000,
      runOnStart: false,
    });
    await svc.start();
    await new Promise(r => setImmediate(r));
    expect(det.getCalls()).toBe(0);
    expect(svc.isRunning()).toBe(true);
  });

  it('start is idempotent — second call is a no-op', async () => {
    const t = fakeTimers();
    const svc = createHrAnomalyScheduler({
      detector: fakeDetector(),
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      runOnStart: false,
    });
    await svc.start();
    const r2 = await svc.start();
    expect(r2.alreadyStarted).toBe(true);
    expect(t.size()).toBe(1);
  });

  it('stop clears the interval', async () => {
    const t = fakeTimers();
    const svc = createHrAnomalyScheduler({
      detector: fakeDetector(),
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      runOnStart: false,
    });
    await svc.start();
    const r = svc.stop();
    expect(r.stopped).toBe(true);
    expect(svc.isRunning()).toBe(false);
    expect(t.size()).toBe(0);
  });

  it('stop on a not-running scheduler returns not_running', () => {
    const svc = createHrAnomalyScheduler({ detector: fakeDetector() });
    const r = svc.stop();
    expect(r.stopped).toBe(false);
    expect(r.reason).toBe('not_running');
  });

  it('can restart after stop', async () => {
    const t = fakeTimers();
    const svc = createHrAnomalyScheduler({
      detector: fakeDetector(),
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      runOnStart: false,
    });
    await svc.start();
    svc.stop();
    const r = await svc.start();
    expect(r.alreadyStarted).toBe(false);
    expect(svc.isRunning()).toBe(true);
  });
});

// ─── tick() behavior ────────────────────────────────────────────

describe('tick()', () => {
  it('calls detector.scan and returns report', async () => {
    const det = fakeDetector();
    const svc = createHrAnomalyScheduler({ detector: det });
    const r = await svc.tick();
    expect(r.skipped).toBe(false);
    expect(r.report).toBeDefined();
    expect(det.getCalls()).toBe(1);
  });

  it('passes scanOptions through', async () => {
    const det = fakeDetector();
    const svc = createHrAnomalyScheduler({
      detector: det,
      scanOptions: { windowMinutes: 30, readsPerHourThreshold: 200 },
    });
    await svc.tick();
    expect(det.scan).toHaveBeenCalledWith({
      windowMinutes: 30,
      readsPerHourThreshold: 200,
    });
  });

  it('overlap guard: a second tick while one is in-flight is skipped', async () => {
    let resolveFirst;
    const slowDetector = {
      scan: jest.fn(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
          })
      ),
    };
    const svc = createHrAnomalyScheduler({ detector: slowDetector });

    const first = svc.tick();
    // Immediately call tick again while first is pending
    const second = await svc.tick();
    expect(second.skipped).toBe(true);
    expect(second.reason).toBe('overlap');
    // Let first resolve
    resolveFirst({ totals: { read_anomalies: 0, export_anomalies: 0 } });
    await first;
  });

  it('catches scan errors + invokes onError', async () => {
    const det = fakeDetector({ failEvery: 1 });
    const onError = jest.fn();
    const svc = createHrAnomalyScheduler({
      detector: det,
      onError,
    });
    const r = await svc.tick();
    expect(r.skipped).toBe(false);
    expect(r.error).toContain('simulated scan failure');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('error in one tick does NOT prevent the next', async () => {
    let n = 0;
    const det = {
      scan: jest.fn(async () => {
        n += 1;
        if (n === 1) throw new Error('boom');
        return { totals: { read_anomalies: 0, export_anomalies: 0 } };
      }),
    };
    const svc = createHrAnomalyScheduler({
      detector: det,
      onError: () => {},
    });
    const r1 = await svc.tick();
    expect(r1.error).toBeDefined();
    const r2 = await svc.tick();
    expect(r2.skipped).toBe(false);
    expect(r2.error).toBeUndefined();
  });
});

// ─── getStatus() ────────────────────────────────────────────────

describe('getStatus()', () => {
  it('reports default state before any tick', () => {
    const svc = createHrAnomalyScheduler({ detector: fakeDetector() });
    const s = svc.getStatus();
    expect(s.isRunning).toBe(false);
    expect(s.scanInFlight).toBe(false);
    expect(s.runCount).toBe(0);
    expect(s.skipCount).toBe(0);
    expect(s.lastReport).toBeNull();
    expect(s.lastError).toBeNull();
    expect(s.lastRunAt).toBeNull();
  });

  it('increments runCount on each successful tick', async () => {
    const svc = createHrAnomalyScheduler({ detector: fakeDetector() });
    await svc.tick();
    await svc.tick();
    await svc.tick();
    expect(svc.getStatus().runCount).toBe(3);
  });

  it('tracks lastError on failed tick', async () => {
    const det = fakeDetector({ failEvery: 1 });
    const svc = createHrAnomalyScheduler({
      detector: det,
      onError: () => {},
    });
    await svc.tick();
    const s = svc.getStatus();
    expect(s.lastError).toBeDefined();
    expect(s.lastError.message).toContain('simulated scan failure');
  });

  it('exposes intervalMs', () => {
    const t = fakeTimers();
    const svc = createHrAnomalyScheduler({
      detector: fakeDetector(),
      setInterval: t.setInterval,
      clearInterval: t.clearInterval,
      intervalMs: 5 * 60 * 1000,
      runOnStart: false,
    });
    expect(svc.getStatus().intervalMs).toBe(5 * 60 * 1000);
  });

  it('logs when anomalies are flagged', async () => {
    const det = fakeDetector({
      scanResult: {
        scannedAt: new Date().toISOString(),
        totals: { read_anomalies: 2, export_anomalies: 1, cooldown_skipped: 0 },
        flagged: [],
      },
    });
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const svc = createHrAnomalyScheduler({ detector: det, logger });
    await svc.tick();
    expect(logger.info).toHaveBeenCalled();
    const msg = logger.info.mock.calls[0][0];
    expect(msg).toContain('2 read');
    expect(msg).toContain('1 export');
  });

  it('stays silent on clean scans', async () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const svc = createHrAnomalyScheduler({ detector: fakeDetector(), logger });
    await svc.tick();
    // info is only called when anomalies > 0; clean scan → no log noise
    expect(logger.info).not.toHaveBeenCalled();
  });
});
