'use strict';
/**
 * risk-sweep-routes.test.js — Wave 289.
 *
 * Tests the HTTP route surface for the Risk Sweeper. Uses jest.doMock
 * to stub `authenticate`, `attachMfaActor`, `requireMfaTier` (since
 * those are well-covered by their own dedicated test files in W273+).
 * Mocks the RiskSnapshot model directly via jest.doMock so the route
 * file picks up the stub when it lazy-requires it.
 */

jest.unmock('mongoose');

const express = require('express');
const request = require('supertest');

describe('W289 — risk-sweep routes', () => {
  const snapshotsFixture = [
    {
      _id: 's1',
      beneficiaryId: 'b1',
      branchId: 'br1',
      sweepRunId: 'sweep-2026-05-23',
      overallScore: 88,
      overallTier: 'critical',
      previousTier: 'high',
      tierDelta: 'escalated',
      topFactors: [{ code: 'WEEKLY_INCIDENTS', source: 'clinical', contribution: 0.5 }],
      composite: { sourceCount: 2, sourcesContributing: ['clinical', 'cdss'] },
      computedAt: new Date('2026-05-23T02:05:00Z'),
    },
  ];

  let snapshotFind;
  let runSweep;
  let actor; // mutable per test

  function setupApp({ mfaTier = 2, branchId = 'br1', wired = true } = {}) {
    jest.resetModules();
    actor = { userId: 'u1', tier: mfaTier };

    // ── Auth + MFA middleware stubs ───────────────────────────────────
    jest.doMock('../middleware/auth', () => ({
      authenticate: (req, _res, next) => {
        req.user = { _id: 'u1', branchId };
        next();
      },
    }));
    jest.doMock('../middleware/requireMfaTier', () => ({
      attachMfaActor: (req, _res, next) => {
        req.mfaActor = actor;
        next();
      },
      requireMfaTier: required => (req, res, next) => {
        if (!req.mfaActor || req.mfaActor.tier < required)
          return res.status(403).json({ success: false, code: 'MFA_TIER_REQUIRED', required });
        return next();
      },
    }));

    // ── RiskSnapshot model stub ──────────────────────────────────────
    snapshotFind = jest.fn().mockImplementation(() => ({
      sort: () => ({
        limit: () => ({
          lean: async () => snapshotsFixture,
          select: () => ({ lean: async () => snapshotsFixture }),
        }),
        select: () => ({ limit: () => ({ lean: async () => snapshotsFixture }) }),
      }),
    }));
    jest.doMock('../models/RiskSnapshot', () => ({ find: snapshotFind }));

    // ── Sweeper service stub on app._riskSweeperService ──────────────
    runSweep = jest.fn(async ({ branchId: bId }) => ({
      sweepRunId: 'sweep-2026-05-23',
      branchId: bId,
      processed: 5,
      snapshotsCreated: 5,
      alertsRaised: 1,
      errors: [],
    }));

    const router = require('../routes/risk-sweep.routes');
    const app = express();
    app.use(express.json());
    if (wired) app._riskSweeperService = { runSweepForBranch: runSweep };
    app.use('/api/risk-sweep', router);
    return app;
  }

  // ── POST /run ────────────────────────────────────────────────────────
  describe('POST /api/risk-sweep/run', () => {
    test('tier-2 + branchId from user → 200 with summary', async () => {
      const app = setupApp({ mfaTier: 2, branchId: 'br1' });
      const res = await request(app).post('/api/risk-sweep/run').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.branchId).toBe('br1');
      expect(runSweep).toHaveBeenCalledWith({ branchId: 'br1', limit: 5000 });
    });

    test('tier-1 actor → 403 MFA_TIER_REQUIRED', async () => {
      const app = setupApp({ mfaTier: 1 });
      const res = await request(app).post('/api/risk-sweep/run').send({});
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('MFA_TIER_REQUIRED');
      expect(runSweep).not.toHaveBeenCalled();
    });

    test('service not wired → 503', async () => {
      const app = setupApp({ mfaTier: 2, wired: false });
      const res = await request(app).post('/api/risk-sweep/run').send({});
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('RISK_SWEEPER_SERVICE_NOT_WIRED');
    });

    test('missing branch (no user.branchId + no body) → 400 BRANCH_REQUIRED', async () => {
      const app = setupApp({ mfaTier: 2, branchId: null });
      const res = await request(app).post('/api/risk-sweep/run').send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BRANCH_REQUIRED');
    });

    test('tier-2 can override branch via body', async () => {
      const app = setupApp({ mfaTier: 2, branchId: 'br1' });
      const res = await request(app).post('/api/risk-sweep/run?branchId=br99').send({ limit: 100 });
      expect(res.status).toBe(200);
      expect(runSweep).toHaveBeenCalledWith({ branchId: 'br99', limit: 100 });
    });
  });

  // ── GET /snapshots ───────────────────────────────────────────────────
  describe('GET /api/risk-sweep/snapshots', () => {
    test('defaults sweepRunId to today + filters by branch', async () => {
      const app = setupApp({ mfaTier: 1, branchId: 'br1' });
      const res = await request(app).get('/api/risk-sweep/snapshots');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.branchId).toBe('br1');
      expect(res.body.sweepRunId).toMatch(/^sweep-\d{4}-\d{2}-\d{2}$/);
      expect(snapshotFind).toHaveBeenCalledWith(expect.objectContaining({ branchId: 'br1' }));
    });

    test('applies tier + delta filters', async () => {
      const app = setupApp({ mfaTier: 1, branchId: 'br1' });
      const res = await request(app).get(
        '/api/risk-sweep/snapshots?tier=high,critical&delta=escalated'
      );
      expect(res.status).toBe(200);
      const filter = snapshotFind.mock.calls[0][0];
      expect(filter.overallTier).toEqual({ $in: ['high', 'critical'] });
      expect(filter.tierDelta).toEqual({ $in: ['escalated'] });
    });

    test('tier-1 actor cannot peek another branch via query', async () => {
      const app = setupApp({ mfaTier: 1, branchId: 'br1' });
      await request(app).get('/api/risk-sweep/snapshots?branchId=br99');
      // actor forced to own branch despite query
      expect(snapshotFind.mock.calls[0][0].branchId).toBe('br1');
    });

    test('tier-2 actor may target another branch via query', async () => {
      const app = setupApp({ mfaTier: 2, branchId: 'br1' });
      await request(app).get('/api/risk-sweep/snapshots?branchId=br99');
      expect(snapshotFind.mock.calls[0][0].branchId).toBe('br99');
    });
  });

  // ── GET /beneficiary/:id/trend ───────────────────────────────────────
  describe('GET /api/risk-sweep/beneficiary/:id/trend', () => {
    test('returns chronologically-ordered trend', async () => {
      const app = setupApp({ mfaTier: 1, branchId: 'br1' });
      const res = await request(app).get('/api/risk-sweep/beneficiary/b1/trend');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.beneficiaryId).toBe('b1');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    test('blocks cross-branch peek for tier-1 actor', async () => {
      // snapshot belongs to br1, actor is on br2
      const app = setupApp({ mfaTier: 1, branchId: 'br2' });
      const res = await request(app).get('/api/risk-sweep/beneficiary/b1/trend');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CROSS_BRANCH_FORBIDDEN');
    });
  });
});
