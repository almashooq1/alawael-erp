/**
 * beneficiary-lifecycle-side-effects-summary-route-wave597.test.js — W597.
 *
 * HTTP-layer tests for the new
 *   GET /api/v1/beneficiary-lifecycle/transitions/:id/side-effects-summary
 * endpoint. The endpoint recomputes the W595 actionable summary from a
 * transition's persisted `sideEffectsAudit` rows (the same rows
 * executeTransition wrote via W596) so dashboards/operators get the
 * roll-up without re-aggregating.
 *
 * Service is mocked (Wave 39/595/596 cover the underlying behavior); these
 * tests assert: permission gating, 404 on unknown id, the recomputed
 * summary shape + mutation totals, empty-audit tolerance, and cross-branch
 * 403 isolation.
 */

'use strict';

const express = require('express');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

const SUMMARY_PATH = '/api/v1/beneficiary-lifecycle/transitions/txn-1/side-effects-summary';

// A realistic persisted audit array: 3 real data effects + 2 deferred.
function auditFixture() {
  return [
    {
      operation: 'end-active-schedules',
      status: 'ok',
      metadata: { name: 'end-active-schedules', category: 'data', cancelledAppointments: 4 },
    },
    {
      operation: 'close-open-episodes',
      status: 'ok',
      metadata: { name: 'close-open-episodes', category: 'data', closedEpisodes: 2 },
    },
    {
      operation: 'release-care-team',
      status: 'ok',
      metadata: { name: 'release-care-team', category: 'data', releasedFromEpisodes: 2 },
    },
    {
      operation: 'notify-family',
      status: 'ok',
      metadata: { name: 'notify-family', category: 'notification', deferred: true, emitted: true },
    },
    {
      operation: 'archive-records',
      status: 'ok',
      metadata: { name: 'archive-records', category: 'compliance', deferred: true, emitted: true },
    },
  ];
}

function makeService(overrides = {}) {
  return {
    requestTransition: jest.fn(),
    approveTransition: jest.fn(),
    executeTransition: jest.fn(),
    cancelTransition: jest.fn(),
    reverseTransition: jest.fn(),
    getTransitionHistory: jest.fn(async () => []),
    getAllowedTransitionsFor: jest.fn(() => []),
    getTransitionById: jest.fn(async id =>
      id === 'txn-1'
        ? {
            _id: 'txn-1',
            transitionId: 'record_deceased',
            status: 'executed',
            sourceBranchId: 'branch-a',
            sideEffectsAudit: auditFixture(),
          }
        : null
    ),
    ...overrides,
  };
}

function makeGovernance(allow = true) {
  return { hasPermission: jest.fn(() => allow) };
}

function makeApp({
  service,
  governance,
  userId = 'U-1',
  role = 'branch_manager',
  userBranchId,
} = {}) {
  const svc = service || makeService();
  const gov = governance || makeGovernance();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    // Drive branch scope through req.user (the real production path): the
    // router mounts requireBranchAccess (W833), which RECOMPUTES
    // req.branchScope from req.user on every request — so injecting
    // req.branchScope directly here would be overwritten. A restricted
    // role (branch_manager) + branchId yields { restricted, branchId }.
    if (userId)
      req.user = { id: userId, role, ...(userBranchId ? { branchId: userBranchId } : {}) };
    next();
  });
  app.use(
    '/api/v1/beneficiary-lifecycle',
    createBeneficiaryLifecycleRouter({ service: svc, governance: gov })
  );
  return { app, svc, gov };
}

describe('W597 GET /transitions/:id/side-effects-summary', () => {
  test('401 when no actor', async () => {
    const { app } = makeApp({ userId: null });
    const r = await request(app).get(SUMMARY_PATH);
    expect(r.status).toBe(401);
  });

  test('403 when permission denied', async () => {
    const { app } = makeApp({ governance: makeGovernance(false) });
    const r = await request(app).get(SUMMARY_PATH);
    expect(r.status).toBe(403);
    expect(r.body.requiredPermission).toBe('beneficiary.lifecycle.transitions.read');
  });

  test('404 when transition id is unknown', async () => {
    const { app } = makeApp();
    const r = await request(app).get(
      '/api/v1/beneficiary-lifecycle/transitions/nope/side-effects-summary'
    );
    expect(r.status).toBe(404);
    expect(r.body.reason).toBe('TRANSITION_NOT_FOUND');
  });

  test('200 returns the recomputed actionable summary + raw audit', async () => {
    const { app } = makeApp();
    const r = await request(app).get(SUMMARY_PATH);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    const d = r.body.data;
    expect(d.transitionRecordId).toBe('txn-1');
    expect(d.transitionId).toBe('record_deceased');
    expect(Array.isArray(d.sideEffectsAudit)).toBe(true);
    expect(d.sideEffectsAudit).toHaveLength(5);

    const s = d.sideEffectsSummary;
    expect(s.total).toBe(5);
    expect(s.real).toBe(3);
    expect(s.failed).toBe(0);
    expect(s.deferred).toBe(2);
    expect(s.emitted).toBe(2);
    expect(s.byCategory.data).toBe(3);
    expect(s.byCategory.notification).toBe(1);
    expect(s.byCategory.compliance).toBe(1);
    expect(s.byCategory.unknown).toBe(0);
    expect(s.dataMutations).toEqual({
      cancelledAppointments: 4,
      closedEpisodes: 2,
      releasedFromEpisodes: 2,
      pausedAppointments: 0,
      resumedAppointments: 0,
      restoredAppointments: 0,
      reopenedEpisodes: 0,
      reactivatedFromEpisodes: 0,
      rolledBackTransfers: 0,
      total: 8,
    });
  });

  test('tolerates a record with no sideEffectsAudit (empty summary)', async () => {
    const service = makeService({
      getTransitionById: jest.fn(async () => ({
        _id: 'txn-1',
        transitionId: 'suspend',
        status: 'executed',
        sourceBranchId: 'branch-a',
        // no sideEffectsAudit field at all
      })),
    });
    const { app } = makeApp({ service });
    const r = await request(app).get(SUMMARY_PATH);
    expect(r.status).toBe(200);
    expect(r.body.data.sideEffectsAudit).toEqual([]);
    expect(r.body.data.sideEffectsSummary.total).toBe(0);
    expect(r.body.data.sideEffectsSummary.dataMutations.total).toBe(0);
  });

  test('403 cross-branch: restricted caller from another branch is denied', async () => {
    // Restricted caller owns branch-b; the transition belongs to branch-a.
    // requireBranchAccess derives { restricted, branchId: 'branch-b' }; the
    // handler's assertBranchMatch then rejects the cross-branch read.
    const { app } = makeApp({ userBranchId: 'branch-b' });
    const r = await request(app).get(SUMMARY_PATH);
    expect(r.status).toBe(403);
  });

  test('200 same-branch: restricted caller from owning branch is allowed', async () => {
    const { app } = makeApp({ userBranchId: 'branch-a' });
    const r = await request(app).get(SUMMARY_PATH);
    expect(r.status).toBe(200);
    expect(r.body.data.sideEffectsSummary.total).toBe(5);
  });
});
