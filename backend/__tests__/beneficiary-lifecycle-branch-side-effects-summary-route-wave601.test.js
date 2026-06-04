/**
 * beneficiary-lifecycle-branch-side-effects-summary-route-wave601.test.js
 *   — W601.
 *
 * HTTP-layer tests for the new branch-level operational roll-up
 *   GET /api/v1/beneficiary-lifecycle/side-effects-summary
 * which aggregates the persisted `sideEffectsAudit` rows across EVERY
 * transition of EVERY beneficiary, scoped to the caller's branch, and
 * feeds them through the same W595 reducer used by the per-transition
 * (W597) and per-beneficiary (W599) endpoints.
 *
 * Service is mocked (Wave 39/595/596/597 cover the underlying behavior);
 * these tests assert: permission gating, multi-beneficiary aggregation,
 * empty-history tolerance, restricted-caller branch filtering (only the
 * caller's own branch), and unrestricted cross-branch `?branchId=` scope.
 */

'use strict';

const express = require('express');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

const PATH = '/api/v1/beneficiary-lifecycle/side-effects-summary';

// Two beneficiaries in branch-a (real data effects + notify-only) and one
// in branch-b (real data effects) to exercise branch filtering + distinct
// beneficiary counting.
function historyFixture() {
  return [
    {
      _id: 'txn-1',
      beneficiaryId: 'BEN-1',
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
      beneficiaryId: 'BEN-2',
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
      beneficiaryId: 'BEN-9',
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

describe('W601 GET /side-effects-summary (branch-level)', () => {
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

  test('200 unrestricted caller aggregates EVERY branch', async () => {
    const { app } = makeApp();
    const r = await request(app).get(PATH);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    const d = r.body.data;
    expect(d.branchId).toBeNull();
    expect(d.beneficiariesConsidered).toBe(3); // BEN-1, BEN-2, BEN-9
    expect(d.transitionsConsidered).toBe(3);
    expect(d.transitionsWithSideEffects).toBe(3);

    const s = d.sideEffectsSummary;
    expect(s.total).toBe(5); // 2 + 2 + 1 audit rows
    expect(s.real).toBe(4); // 4 real data effects
    expect(s.deferred).toBe(1);
    expect(s.dataMutations).toEqual({
      cancelledAppointments: 12, // 3 + 9
      closedEpisodes: 2,
      releasedFromEpisodes: 1,
      total: 15,
    });
  });

  test('200 restricted caller only aggregates their own branch', async () => {
    const { app } = makeApp({ userBranchId: 'branch-a' });
    const r = await request(app).get(PATH);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.branchId).toBe('branch-a');
    expect(d.beneficiariesConsidered).toBe(2); // BEN-1, BEN-2 (BEN-9 excluded)
    expect(d.transitionsConsidered).toBe(2);
    expect(d.transitionsWithSideEffects).toBe(2);

    const s = d.sideEffectsSummary;
    expect(s.total).toBe(4); // branch-b's single row excluded
    expect(s.dataMutations.cancelledAppointments).toBe(3); // branch-b's 9 excluded
    expect(s.dataMutations.closedEpisodes).toBe(2);
    expect(s.dataMutations.releasedFromEpisodes).toBe(1);
  });

  test('403 restricted caller naming a foreign ?branchId= is rejected', async () => {
    // W833: with requireBranchAccess mounted, a restricted caller (branch-a)
    // that explicitly names a foreign branch in the query is hard-rejected at
    // the middleware (the W269 "explicit foreign branchId" contract) — even
    // stronger than the endpoint's own effectiveBranchScope spoof-ignore.
    const { app } = makeApp({ userBranchId: 'branch-a' });
    const r = await request(app).get(`${PATH}?branchId=branch-b`);
    expect(r.status).toBe(403);
  });

  test('200 unrestricted caller may scope via ?branchId=', async () => {
    const { app } = makeApp();
    const r = await request(app).get(`${PATH}?branchId=branch-b`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.branchId).toBe('branch-b');
    expect(d.beneficiariesConsidered).toBe(1); // BEN-9
    expect(d.transitionsConsidered).toBe(1);
    expect(d.sideEffectsSummary.dataMutations.cancelledAppointments).toBe(9);
  });

  test('empty history → zeroed summary, 0 transitions', async () => {
    const service = makeService({ getTransitionHistory: jest.fn(async () => []) });
    const { app } = makeApp({ service });
    const r = await request(app).get(PATH);
    expect(r.status).toBe(200);
    expect(r.body.data.beneficiariesConsidered).toBe(0);
    expect(r.body.data.transitionsConsidered).toBe(0);
    expect(r.body.data.transitionsWithSideEffects).toBe(0);
    expect(r.body.data.sideEffectsSummary.total).toBe(0);
  });
});
