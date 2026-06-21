/**
 * beneficiary-lifecycle-beneficiary-side-effects-summary-route-wave599.test.js
 *   — W599.
 *
 * HTTP-layer tests for the new beneficiary-level roll-up
 *   GET /api/v1/beneficiary-lifecycle/beneficiaries/:beneficiaryId/side-effects-summary
 * which aggregates the persisted `sideEffectsAudit` rows across EVERY
 * transition in a beneficiary's lifecycle history and feeds them through
 * the same W595 reducer used by the per-transition W597 endpoint.
 *
 * Service is mocked (Wave 39/595/596/597 cover the underlying behavior);
 * these tests assert: permission gating, multi-transition aggregation,
 * empty-history tolerance, and cross-branch filtering (a restricted caller
 * only aggregates rows from transitions owned by their branch).
 */

'use strict';

const express = require('express');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

const PATH = '/api/v1/beneficiary-lifecycle/beneficiaries/BEN-1/side-effects-summary';

// Two transitions in branch-a (one with real data effects, one notify-only)
// + one transition in branch-b (real data effects) to exercise filtering.
function historyFixture() {
  return [
    {
      _id: 'txn-1',
      transitionId: 'suspend',
      status: 'executed',
      sourceBranchId: 'branch-a',
      sideEffectsAudit: [
        {
          operation: 'end-active-schedules',
          status: 'ok',
          metadata: { name: 'end-active-schedules', category: 'data', cancelledAppointments: 3 },
        },
        {
          operation: 'notify-family',
          status: 'ok',
          metadata: {
            name: 'notify-family',
            category: 'notification',
            deferred: true,
            emitted: true,
          },
        },
      ],
    },
    {
      _id: 'txn-2',
      transitionId: 'record_deceased',
      status: 'executed',
      sourceBranchId: 'branch-a',
      sideEffectsAudit: [
        {
          operation: 'close-open-episodes',
          status: 'ok',
          metadata: { name: 'close-open-episodes', category: 'data', closedEpisodes: 2 },
        },
        {
          operation: 'release-care-team',
          status: 'ok',
          metadata: { name: 'release-care-team', category: 'data', releasedFromEpisodes: 1 },
        },
      ],
    },
    {
      _id: 'txn-3',
      transitionId: 'transfer',
      status: 'executed',
      sourceBranchId: 'branch-b',
      sideEffectsAudit: [
        {
          operation: 'end-active-schedules',
          status: 'ok',
          metadata: { name: 'end-active-schedules', category: 'data', cancelledAppointments: 9 },
        },
      ],
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
    getTransitionById: jest.fn(async () => null),
    getAllowedTransitionsFor: jest.fn(() => []),
    getTransitionHistory: jest.fn(async () => historyFixture()),
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
  branchScope,
} = {}) {
  const svc = service || makeService();
  const gov = governance || makeGovernance();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) req.user = { id: userId, role };
    if (branchScope) req.branchScope = branchScope;
    next();
  });
  app.use(
    '/api/v1/beneficiary-lifecycle',
    createBeneficiaryLifecycleRouter({ service: svc, governance: gov })
  );
  return { app, svc, gov };
}

describe('W599 GET /beneficiaries/:beneficiaryId/side-effects-summary', () => {
  test('401 when no actor', async () => {
    const { app } = makeApp({ userId: null });
    const r = await request(app).get(PATH);
    expect(r.status).toBe(401);
  });

  test('403 when permission denied', async () => {
    const { app } = makeApp({ governance: makeGovernance(false) });
    const r = await request(app).get(PATH);
    expect(r.status).toBe(403);
    expect(r.body.requiredPermission).toBe('beneficiary.lifecycle.transitions.read');
  });

  test('200 aggregates side-effects across all transitions (unrestricted)', async () => {
    const { app } = makeApp();
    const r = await request(app).get(PATH);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    const d = r.body.data;
    expect(d.beneficiaryId).toBe('BEN-1');
    expect(d.transitionsConsidered).toBe(3);
    expect(d.transitionsWithSideEffects).toBe(3);

    const s = d.sideEffectsSummary;
    expect(s.total).toBe(5); // 2 + 2 + 1 audit rows
    expect(s.real).toBe(4); // 4 real data effects (3 branch-a + 1 branch-b)
    expect(s.deferred).toBe(1);
    expect(s.byCategory.data).toBe(4);
    expect(s.byCategory.notification).toBe(1);
    expect(s.dataMutations).toEqual({
      cancelledAppointments: 12, // 3 + 9
      closedEpisodes: 2,
      releasedFromEpisodes: 1,
      pausedAppointments: 0,
      resumedAppointments: 0,
      restoredAppointments: 0,
      reopenedEpisodes: 0,
      reactivatedFromEpisodes: 0,
      rolledBackTransfers: 0,
      total: 15,
    });
  });

  test('empty history → zeroed summary, 0 transitions', async () => {
    const service = makeService({ getTransitionHistory: jest.fn(async () => []) });
    const { app } = makeApp({ service });
    const r = await request(app).get(PATH);
    expect(r.status).toBe(200);
    expect(r.body.data.transitionsConsidered).toBe(0);
    expect(r.body.data.transitionsWithSideEffects).toBe(0);
    expect(r.body.data.sideEffectsSummary.total).toBe(0);
    expect(r.body.data.sideEffectsSummary.dataMutations.total).toBe(0);
  });

  test('aggregation skips transitions with no audit rows but still counts them', async () => {
    const service = makeService({
      getTransitionHistory: jest.fn(async () => [
        {
          _id: 'txn-1',
          transitionId: 'suspend',
          status: 'executed',
          sourceBranchId: 'branch-a',
          sideEffectsAudit: [
            {
              operation: 'close-open-episodes',
              status: 'ok',
              metadata: { name: 'close-open-episodes', category: 'data', closedEpisodes: 5 },
            },
          ],
        },
        // executed transition that produced no side-effects (e.g. a no-op)
        { _id: 'txn-2', transitionId: 'reinstate', status: 'executed', sourceBranchId: 'branch-a' },
      ]),
    });
    const { app } = makeApp({ service });
    const r = await request(app).get(PATH);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.transitionsConsidered).toBe(2);
    expect(d.transitionsWithSideEffects).toBe(1);
    expect(d.sideEffectsSummary.total).toBe(1);
    expect(d.sideEffectsSummary.dataMutations.closedEpisodes).toBe(5);
  });
});
