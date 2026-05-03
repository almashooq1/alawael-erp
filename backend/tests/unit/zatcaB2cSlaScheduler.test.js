'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const { createZatcaB2cSlaScheduler, DEFAULTS } = require('../../startup/zatcaB2cSlaScheduler');

function makeService(impl = async () => ({ scanned: 0, breached: 0, retryFailed: 0 })) {
  return { sweep: jest.fn(impl) };
}

describe('startup/zatcaB2cSlaScheduler', () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    process.env = { ...ORIG };
  });
  afterAll(() => {
    process.env = ORIG;
  });

  test('throws if service is missing', () => {
    expect(() => createZatcaB2cSlaScheduler()).toThrow(/service is required/);
  });

  test('exports sane defaults', () => {
    expect(DEFAULTS.intervalMs).toBe(30 * 60 * 1000);
    expect(DEFAULTS.warnThresholdMs).toBeLessThan(DEFAULTS.breachThresholdMs);
  });

  test('tick() forwards thresholds + batch into sweep()', async () => {
    const service = makeService();
    const w = createZatcaB2cSlaScheduler({
      service,
      batchSize: 7,
      warnThresholdMs: 1000,
      breachThresholdMs: 2000,
    });
    await w.tick();
    expect(service.sweep).toHaveBeenCalledTimes(1);
    expect(service.sweep.mock.calls[0][0]).toEqual({
      batchSize: 7,
      warnThresholdMs: 1000,
      breachThresholdMs: 2000,
    });
  });

  test('honors env vars over defaults', async () => {
    process.env.ZATCA_SLA_BATCH_SIZE = '99';
    process.env.ZATCA_SLA_WARN_MS = '111';
    process.env.ZATCA_SLA_BREACH_MS = '222';
    const service = makeService();
    const w = createZatcaB2cSlaScheduler({ service });
    await w.tick();
    expect(service.sweep.mock.calls[0][0]).toEqual({
      batchSize: 99,
      warnThresholdMs: 111,
      breachThresholdMs: 222,
    });
  });

  test('caches lastStats, exposes via getStats()', async () => {
    const service = makeService(async () => ({ scanned: 4, breached: 1 }));
    const w = createZatcaB2cSlaScheduler({ service });
    await w.tick();
    expect(w.getStats()).toEqual({ scanned: 4, breached: 1 });
  });

  test('skips overlapping ticks (running guard)', async () => {
    let release;
    const blocker = new Promise(r => {
      release = r;
    });
    const service = {
      sweep: jest.fn(async () => {
        await blocker;
        return { scanned: 0 };
      }),
    };
    const w = createZatcaB2cSlaScheduler({ service });
    const first = w.tick();
    const second = w.tick(); // should be no-op while first is running
    release();
    await first;
    await second;
    expect(service.sweep).toHaveBeenCalledTimes(1);
  });

  test('thrown sweep does not crash the scheduler — logs + returns lastStats', async () => {
    const service = {
      sweep: jest.fn(async () => {
        throw new Error('boom');
      }),
    };
    const w = createZatcaB2cSlaScheduler({ service });
    // Should not throw
    await expect(w.tick()).resolves.not.toThrow();
  });
});
