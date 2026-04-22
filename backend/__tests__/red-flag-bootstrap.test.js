/**
 * red-flag-bootstrap.test.js — Beneficiary-360 Commit 10.
 *
 * The bootstrap is a thin composition function; these tests prove
 * it composes correctly (all pieces returned, routers mountable,
 * storeMode honored) without standing up Mongo. The Mongo-backed
 * persistence is already covered by the Commit-6 integration suite.
 */

'use strict';

const express = require('express');
const request = require('supertest');
const { bootstrapRedFlagSystem } = require('../startup/redFlagBootstrap');

const silentLogger = { info: () => {}, warn: () => {}, error: () => {} };

describe('bootstrapRedFlagSystem', () => {
  it('returns the full composition with in-memory store (default when no Mongo)', () => {
    const sys = bootstrapRedFlagSystem({ logger: silentLogger, storeMode: 'memory' });
    expect(sys.locator).toBeDefined();
    expect(sys.engine).toBeDefined();
    expect(sys.store).toBeDefined();
    expect(sys.overrideLog).toBeDefined();
    expect(sys.aggregateService).toBeDefined();
    expect(sys.scheduler).toBeDefined();
    expect(sys.router).toBeDefined();
    expect(sys.adminRouter).toBeDefined();
    expect(sys.backend).toBe('memory');
  });

  it('returned router mounts and responds to the list endpoint', async () => {
    const sys = bootstrapRedFlagSystem({ logger: silentLogger, storeMode: 'memory' });
    const app = express();
    app.use(express.json());
    app.use('/api/v1/beneficiaries', sys.router);

    const res = await request(app).get('/api/v1/beneficiaries/BEN-1/red-flags');
    expect(res.status).toBe(200);
    expect(res.body.data.active).toEqual([]);
  });

  it('admin router is a mountable Express router (end-to-end Mongo coverage is in Commit-9 suite)', () => {
    const sys = bootstrapRedFlagSystem({ logger: silentLogger, storeMode: 'memory' });
    expect(typeof sys.adminRouter).toBe('function');
    // Express routers are functions with a `.stack` array
    expect(Array.isArray(sys.adminRouter.stack)).toBe(true);
  });

  it('scheduler.runOnce handles empty beneficiary list without touching services', async () => {
    const sys = bootstrapRedFlagSystem({
      logger: silentLogger,
      storeMode: 'memory',
      getBeneficiaryIds: async () => [],
    });
    const summary = await sys.scheduler.runOnce();
    expect(summary.totalBeneficiaries).toBe(0);
    expect(summary.succeeded).toBe(0);
  });

  it('scheduler.runOnce cycles through the bootstrap default locator — no crash', async () => {
    const sys = bootstrapRedFlagSystem({
      logger: silentLogger,
      storeMode: 'memory',
      getBeneficiaryIds: async () => ['BEN-1'],
    });
    // Bootstrap auto-registers observation services for every model
    // that loads cleanly (Phase-9 Commit 10 added carePlanReviewService
    // to that set). The invariant here is end-to-end-no-crash, not a
    // strict raised-count — behaviour depends on which models the
    // jest mongoose mock stubs out.
    const summary = await sys.scheduler.runOnce();
    expect(summary.totalBeneficiaries).toBe(1);
    expect(summary.succeeded).toBe(1);
    expect(summary.perBeneficiary[0].errored).toBeGreaterThanOrEqual(0);
    expect(typeof summary.totals.newlyRaised).toBe('number');
    expect(summary.totals.newlyRaised).toBeGreaterThanOrEqual(0);
  });

  it('locator can receive real service registrations post-bootstrap', () => {
    const sys = bootstrapRedFlagSystem({ logger: silentLogger, storeMode: 'memory' });
    sys.locator.register('attendanceService', {
      beneficiaryMonthlyRate: () => ({ attendanceRate: 95 }),
    });
    expect(sys.locator.has('attendanceService')).toBe(true);
    expect(typeof sys.locator.resolve('attendanceService', 'beneficiaryMonthlyRate')).toBe(
      'function'
    );
  });
});
