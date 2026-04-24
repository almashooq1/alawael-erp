/**
 * finance-bootstrap.test.js — Phase 12 Commit 6.
 *
 * Module-level sanity check on startup/financeBootstrap.js. We don't
 * boot Mongo here — we just verify the module exports the right
 * shape and that bootstrapFinance() returns the expected no-scheduler
 * result when called in test mode.
 */

'use strict';

describe('startup/financeBootstrap', () => {
  test('exports the expected public API', () => {
    const m = require('../startup/financeBootstrap');
    expect(typeof m.bootstrapFinance).toBe('function');
    expect(typeof m.seedChartOfAccounts).toBe('function');
    expect(typeof m.startChequeExpiryScheduler).toBe('function');
  });

  test('bootstrapFinance({ isTestEnv: true }) returns { scheduler: null } without throwing', () => {
    const { bootstrapFinance } = require('../startup/financeBootstrap');
    const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };
    const result = bootstrapFinance({ logger: silentLogger, isTestEnv: true });
    expect(result).toEqual({ scheduler: null });
  });

  test('startChequeExpiryScheduler returns a stoppable handle', () => {
    const { startChequeExpiryScheduler } = require('../startup/financeBootstrap');
    const silentLogger = { info: () => {}, warn: () => {} };
    const handle = startChequeExpiryScheduler({ logger: silentLogger, tickMs: 3600000 });
    expect(typeof handle.stop).toBe('function');
    expect(typeof handle._tick).toBe('function');
    handle.stop();
  });
});
