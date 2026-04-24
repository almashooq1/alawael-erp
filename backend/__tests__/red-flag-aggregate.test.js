/**
 * red-flag-aggregate.test.js — Beneficiary-360 Commit 9.
 *
 * Integration test against mongodb-memory-server. Seeds a handful
 * of active state records + override log entries, then asserts the
 * dashboard summary shape + arithmetic.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createAggregateService } = require('../services/redFlagAggregateService');
const { createRedFlagAdminRouter } = require('../routes/red-flag-admin.routes');

let mongoServer;
let RedFlagState;
let RedFlagOverride;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'red-flag-aggregate-test' });
  RedFlagState = require('../models/RedFlagState');
  RedFlagOverride = require('../models/RedFlagOverride');
  await Promise.all([RedFlagState.syncIndexes(), RedFlagOverride.syncIndexes()]);
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await RedFlagState.deleteMany({});
  await RedFlagOverride.deleteMany({});
});

function activeDoc({ bId, flagId, severity = 'warning', domain = 'clinical', blocking = false }) {
  return {
    beneficiaryId: bId,
    flagId,
    status: 'active',
    severity,
    domain,
    blocking,
    raisedAt: new Date('2026-04-22T10:00:00.000Z'),
    lastObservedAt: new Date('2026-04-22T10:00:00.000Z'),
  };
}

// ─── Service-level ──────────────────────────────────────────────

describe('createAggregateService — empty state', () => {
  it('returns zeroed summary when nothing is active', async () => {
    const svc = createAggregateService({
      stateModel: RedFlagState,
      overrideModel: RedFlagOverride,
      now: () => new Date('2026-04-22T12:00:00.000Z'),
    });
    const summary = await svc.aggregate();
    expect(summary.generatedAt).toBe('2026-04-22T12:00:00.000Z');
    expect(summary.totals.active).toBe(0);
    expect(summary.totals.blocking).toBe(0);
    expect(summary.bySeverity).toEqual({ critical: 0, warning: 0, info: 0 });
    expect(Object.values(summary.byDomain).every(v => v === 0)).toBe(true);
    expect(summary.topBeneficiaries).toEqual([]);
    expect(summary.overrides).toEqual({ last7d: 0, last30d: 0 });
  });
});

describe('createAggregateService — populated state', () => {
  it('counts by severity, domain, blocking, and totals', async () => {
    await RedFlagState.insertMany([
      activeDoc({
        bId: 'BEN-1',
        flagId: 'a',
        severity: 'critical',
        domain: 'clinical',
        blocking: true,
      }),
      activeDoc({ bId: 'BEN-1', flagId: 'b', severity: 'warning', domain: 'attendance' }),
      activeDoc({
        bId: 'BEN-2',
        flagId: 'c',
        severity: 'critical',
        domain: 'safety',
        blocking: true,
      }),
      activeDoc({ bId: 'BEN-3', flagId: 'd', severity: 'info', domain: 'family' }),
      activeDoc({ bId: 'BEN-3', flagId: 'e', severity: 'warning', domain: 'financial' }),
    ]);

    const svc = createAggregateService({
      stateModel: RedFlagState,
      overrideModel: RedFlagOverride,
    });
    const summary = await svc.aggregate();

    expect(summary.totals.active).toBe(5);
    expect(summary.totals.blocking).toBe(2);
    expect(summary.bySeverity).toEqual({ critical: 2, warning: 2, info: 1 });
    expect(summary.byDomain.clinical).toBe(1);
    expect(summary.byDomain.attendance).toBe(1);
    expect(summary.byDomain.safety).toBe(1);
    expect(summary.byDomain.family).toBe(1);
    expect(summary.byDomain.financial).toBe(1);
  });

  it('ranks top beneficiaries by critical + blocking counts', async () => {
    await RedFlagState.insertMany([
      activeDoc({ bId: 'BEN-A', flagId: 'a1', severity: 'critical', blocking: true }),
      activeDoc({ bId: 'BEN-A', flagId: 'a2', severity: 'warning' }),
      activeDoc({ bId: 'BEN-A', flagId: 'a3', severity: 'info' }),
      activeDoc({ bId: 'BEN-B', flagId: 'b1', severity: 'critical' }),
      activeDoc({ bId: 'BEN-C', flagId: 'c1', severity: 'warning' }),
    ]);
    const svc = createAggregateService({
      stateModel: RedFlagState,
      overrideModel: RedFlagOverride,
    });
    const summary = await svc.aggregate();
    expect(summary.topBeneficiaries).toHaveLength(3);
    expect(summary.topBeneficiaries[0].beneficiaryId).toBe('BEN-A');
    expect(summary.topBeneficiaries[0].critical).toBe(1);
    expect(summary.topBeneficiaries[0].blocking).toBe(1);
  });

  it('counts overrides in the last 7d and 30d windows', async () => {
    const fixedNow = new Date('2026-04-22T00:00:00.000Z');
    await RedFlagOverride.insertMany([
      {
        beneficiaryId: 'BEN-1',
        overriddenBy: 'dr.a',
        reason: 'in 7d window',
        overriddenAt: new Date('2026-04-18T00:00:00.000Z'),
      },
      {
        beneficiaryId: 'BEN-2',
        overriddenBy: 'dr.b',
        reason: 'in 30d window only',
        overriddenAt: new Date('2026-04-05T00:00:00.000Z'),
      },
      {
        beneficiaryId: 'BEN-3',
        overriddenBy: 'dr.c',
        reason: 'older than 30d',
        overriddenAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ]);

    const svc = createAggregateService({
      stateModel: RedFlagState,
      overrideModel: RedFlagOverride,
      now: () => fixedNow,
    });
    const summary = await svc.aggregate();
    expect(summary.overrides.last7d).toBe(1);
    expect(summary.overrides.last30d).toBe(2);
  });
});

// ─── Route-level ────────────────────────────────────────────────

describe('GET /api/v1/admin/red-flags/dashboard', () => {
  it('returns 200 with the aggregated summary', async () => {
    const svc = createAggregateService({
      stateModel: RedFlagState,
      overrideModel: RedFlagOverride,
      now: () => new Date('2026-04-22T10:00:00.000Z'),
    });
    const router = createRedFlagAdminRouter({ aggregateService: svc });
    const app = express();
    app.use('/api/v1/admin/red-flags', router);

    const res = await request(app).get('/api/v1/admin/red-flags/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.totals.active).toBe(0);
    expect(res.body.data.generatedAt).toBe('2026-04-22T10:00:00.000Z');
  });

  it('router construction throws when aggregateService is missing', () => {
    expect(() => createRedFlagAdminRouter({})).toThrow(/aggregateService/);
  });
});
