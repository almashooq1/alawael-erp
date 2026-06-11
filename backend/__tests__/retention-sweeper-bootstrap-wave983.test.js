'use strict';

/**
 * W983 drift guard — retentionSweeperBootstrap.
 *
 * Schedules the dormant beneficiary-retention sweep (services/care/retention.service
 * `sweep()`), which careBootstrap builds + exposes but only a manual POST ever ran
 * (W225 dormant-capability pattern; careBootstrap notes "Future commits add retention
 * sweepers"). Env-gated, default OFF — a run mutates state + emits interventions, so
 * activation is an operator decision; the wiring ships inert.
 *
 * Locks: env-gated default OFF; throws without logger; graceful skip when the service
 * is absent; schedules when enabled; each tick calls sweep (per branch); a sweep throw
 * is swallowed; wired into schedulers.js after bootstrapCare. node-cron mocked.
 */

jest.mock('node-cron', () => ({ schedule: jest.fn(() => ({ stop() {} })) }));
const cron = require('node-cron');

const fs = require('fs');
const path = require('path');
const { wireRetentionSweeper } = require('../startup/retentionSweeperBootstrap');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'retentionSweeperBootstrap.js'),
  'utf8'
);
const SCHED_SRC = fs.readFileSync(path.join(__dirname, '..', 'startup', 'schedulers.js'), 'utf8');

const silent = { info() {}, warn() {}, error() {} };

afterEach(() => {
  delete process.env.ENABLE_RETENTION_SWEEP;
  delete process.env.RETENTION_SWEEP_BRANCH_IDS;
  delete process.env.RETENTION_SWEEP_LIMIT;
  cron.schedule.mockClear();
});

describe('W983 retentionSweeperBootstrap — source shape', () => {
  it('env-gates on ENABLE_RETENTION_SWEEP', () => {
    expect(SRC).toMatch(/process\.env\.ENABLE_RETENTION_SWEEP\s*!==\s*'true'/);
  });
  it('calls retentionService.sweep', () => {
    expect(SRC).toMatch(/retentionService\.sweep\(/);
  });
  it('loads node-cron via loadOptional', () => {
    expect(SRC).toMatch(/loadOptional\(\s*'node-cron'\s*\)/);
  });
  it('guards each tick', () => {
    expect(SRC).toMatch(/catch \(err\)/);
  });
  it('exports wireRetentionSweeper', () => {
    expect(SRC).toMatch(/module\.exports\s*=\s*\{\s*wireRetentionSweeper\s*\}/);
  });
  it('is wired into schedulers.js after bootstrapCare', () => {
    expect(SCHED_SRC).toMatch(/wireRetentionSweeper\(\{/);
    expect(SCHED_SRC.indexOf('bootstrapCare(')).toBeLessThan(
      SCHED_SRC.indexOf('wireRetentionSweeper(')
    );
  });
});

describe('W983 retentionSweeperBootstrap — behavior', () => {
  it('throws without a logger', () => {
    expect(() => wireRetentionSweeper({})).toThrow(/logger required/);
  });

  it('is inert when the flag is unset (no cron scheduled)', () => {
    const res = wireRetentionSweeper({ logger: silent, retentionService: { sweep: jest.fn() } });
    expect(res).toEqual({ started: false });
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('skips gracefully when retentionService is absent', () => {
    process.env.ENABLE_RETENTION_SWEEP = 'true';
    expect(wireRetentionSweeper({ logger: silent })).toEqual({ started: false });
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('schedules when enabled; the tick sweeps once (all-branches) by default', async () => {
    process.env.ENABLE_RETENTION_SWEEP = 'true';
    const sweep = jest.fn(async () => ({ assessed: 3, totalCandidates: 3, errors: [] }));
    const res = wireRetentionSweeper({ logger: silent, retentionService: { sweep } });
    expect(res.started).toBe(true);
    expect(cron.schedule).toHaveBeenCalledTimes(1);
    await cron.schedule.mock.calls[0][1](); // invoke the tick
    expect(sweep).toHaveBeenCalledTimes(1);
    expect(sweep.mock.calls[0][0]).toMatchObject({ branchId: null, triggeredBy: 'scheduler' });
  });

  it('sweeps per branch when RETENTION_SWEEP_BRANCH_IDS is set', async () => {
    process.env.ENABLE_RETENTION_SWEEP = 'true';
    process.env.RETENTION_SWEEP_BRANCH_IDS = 'b1, b2';
    const sweep = jest.fn(async () => ({ assessed: 1, totalCandidates: 1, errors: [] }));
    wireRetentionSweeper({ logger: silent, retentionService: { sweep } });
    await cron.schedule.mock.calls[0][1]();
    expect(sweep).toHaveBeenCalledTimes(2);
    expect(sweep.mock.calls.map(c => c[0].branchId)).toEqual(['b1', 'b2']);
  });

  it('swallows a sweep throw (one branch failure never aborts the tick)', async () => {
    process.env.ENABLE_RETENTION_SWEEP = 'true';
    process.env.RETENTION_SWEEP_BRANCH_IDS = 'b1, b2';
    const sweep = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ assessed: 1, totalCandidates: 1, errors: [] });
    wireRetentionSweeper({ logger: silent, retentionService: { sweep } });
    await expect(cron.schedule.mock.calls[0][1]()).resolves.toBeUndefined();
    expect(sweep).toHaveBeenCalledTimes(2); // b2 still ran after b1 threw
  });
});
