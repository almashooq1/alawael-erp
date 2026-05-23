'use strict';
/**
 * scheduler-snapshots-persistence.test.js — Wave 322
 *
 * Verifies the durable layer wired in W322:
 *   1. `hydrateFromSnapshots()` reads Mongo + populates the in-process Map
 *   2. After hydration, `recordRun()` upserts via `Snapshot.updateOne(...)`
 *   3. Persistence failures are swallowed (best-effort, never throw)
 *   4. The bootstrap helper logs hydrated count and survives errors
 */

jest.mock('../models/SchedulerHealthSnapshot', () => {
  const docs = [];
  const updateOne = jest.fn(() => ({ catch: jest.fn() }));
  return {
    __docs: docs,
    __updateOne: updateOne,
    find: jest.fn(() => ({ lean: () => Promise.resolve(docs.slice()) })),
    updateOne,
  };
});

describe('scheduler-registry durable snapshots (W322)', () => {
  let registry;
  let Snapshot;

  beforeEach(() => {
    jest.resetModules();
    Snapshot = require('../models/SchedulerHealthSnapshot');
    Snapshot.__docs.length = 0;
    Snapshot.__updateOne.mockClear();
    registry = require('../intelligence/scheduler-registry');
    registry._reset();
  });

  it('exposes hydrateFromSnapshots()', () => {
    expect(typeof registry.hydrateFromSnapshots).toBe('function');
  });

  it('hydrates the in-process Map from Mongo snapshots', async () => {
    Snapshot.__docs.push({
      key: 'audit-chain-archiver',
      lastRunAt: new Date('2026-05-20T03:30:00.000Z'),
      lastStatus: 'ok',
      lastError: null,
      lastDurationMs: 412,
      runs: 17,
      failures: 0,
    });
    const count = await registry.hydrateFromSnapshots();
    expect(count).toBe(1);
    const entry = registry.get('audit-chain-archiver');
    expect(entry.lastStatus).toBe('ok');
    expect(entry.runs).toBe(17);
    expect(entry.lastDurationMs).toBe(412);
  });

  it('persists via Snapshot.updateOne on recordRun after hydration', async () => {
    await registry.hydrateFromSnapshots();
    registry.register('risk-sweeper', { meta: { intervalMs: 60_000 } });
    registry.recordRun('risk-sweeper', { ok: true, durationMs: 88 });
    expect(Snapshot.__updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, opts] = Snapshot.__updateOne.mock.calls[0];
    expect(filter).toEqual({ key: 'risk-sweeper' });
    expect(update.$set.lastStatus).toBe('ok');
    expect(update.$set.lastDurationMs).toBe(88);
    expect(update.$set.runs).toBe(1);
    expect(opts).toEqual({ upsert: true });
  });

  it('does NOT persist before hydration is called', () => {
    registry.register('beta', { meta: { intervalMs: 60_000 } });
    registry.recordRun('beta', { ok: true, durationMs: 5 });
    expect(Snapshot.__updateOne).not.toHaveBeenCalled();
  });

  it('swallows persistence failures (best-effort, never throws)', async () => {
    await registry.hydrateFromSnapshots();
    Snapshot.__updateOne.mockImplementationOnce(() => {
      throw new Error('mongo disconnected');
    });
    expect(() => {
      registry.recordRun('gamma', { ok: false, error: new Error('cron-err'), durationMs: 2 });
    }).not.toThrow();
    const entry = registry.get('gamma');
    expect(entry.lastStatus).toBe('failed');
    expect(entry.failures).toBe(1);
  });

  it('persists failure metadata correctly', async () => {
    await registry.hydrateFromSnapshots();
    registry.recordRun('delta', { ok: false, error: new Error('NPE'), durationMs: 12 });
    const [, update] = Snapshot.__updateOne.mock.calls[0];
    expect(update.$set.lastStatus).toBe('failed');
    expect(update.$set.lastError).toBe('NPE');
    expect(update.$set.failures).toBe(1);
  });
});

describe('schedulerSnapshotsBootstrap (W322)', () => {
  beforeEach(() => {
    jest.resetModules();
    const Snapshot = require('../models/SchedulerHealthSnapshot');
    Snapshot.__docs.length = 0;
  });

  it('wireSchedulerSnapshots returns hydrated count + logs info', async () => {
    const logger = { info: jest.fn(), warn: jest.fn() };
    const { wireSchedulerSnapshots } = require('../startup/schedulerSnapshotsBootstrap');
    const count = await wireSchedulerSnapshots({ logger });
    expect(count).toBe(0);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[W322]'));
  });
});
