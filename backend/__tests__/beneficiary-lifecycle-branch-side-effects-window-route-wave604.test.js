/**
 * beneficiary-lifecycle-branch-side-effects-window-route-wave604.test.js
 *   — W604.
 *
 * Covers the W604 additive `?windowDays=N` time-bound on the branch-level
 * operational roll-up
 *   GET /api/v1/beneficiary-lifecycle/side-effects-summary
 * introduced in W601. The window bounds the scan to transitions whose
 * best-effort timestamp (executedAt → requestedAt → createdAt → updatedAt)
 * falls within the last N days. Records WITHOUT any timestamp are kept
 * (never silently dropped). Omitted/invalid windowDays => whole history,
 * backward compatible with W601.
 *
 * Service is mocked; these tests assert: backward-compat (no param), recent
 * window filtering, undateable-row retention, validation (non-numeric /
 * zero / negative / > 3650 / fractional), and the echoed `windowDays` field.
 */

'use strict';

const express = require('express');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

const PATH = '/api/v1/beneficiary-lifecycle/side-effects-summary';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = n => new Date(Date.now() - n * DAY).toISOString();

// Three executed transitions in branch-a at different ages, plus one row
// with NO timestamp at all (must always be retained).
function historyFixture() {
  return [
    {
      _id: 'txn-recent',
      beneficiaryId: 'BEN-1',
      transitionId: 'suspend',
      status: 'executed',
      sourceBranchId: 'branch-a',
      executedAt: daysAgo(2),
      sideEffectsAudit: [
        {
          operation: 'end-active-schedules',
          status: 'ok',
          metadata: { name: 'end-active-schedules', category: 'data', cancelledAppointments: 3 },
        },
      ],
    },
    {
      _id: 'txn-mid',
      beneficiaryId: 'BEN-2',
      transitionId: 'record_deceased',
      status: 'executed',
      sourceBranchId: 'branch-a',
      executedAt: daysAgo(20),
      sideEffectsAudit: [
        {
          operation: 'close-open-episodes',
          status: 'ok',
          metadata: { name: 'close-open-episodes', category: 'data', closedEpisodes: 2 },
        },
      ],
    },
    {
      _id: 'txn-old',
      beneficiaryId: 'BEN-3',
      transitionId: 'transfer',
      status: 'executed',
      sourceBranchId: 'branch-a',
      executedAt: daysAgo(200),
      sideEffectsAudit: [
        {
          operation: 'release-care-team',
          status: 'ok',
          metadata: { name: 'release-care-team', category: 'data', releasedFromEpisodes: 1 },
        },
      ],
    },
    {
      _id: 'txn-undated',
      beneficiaryId: 'BEN-4',
      transitionId: 'reactivate',
      status: 'executed',
      sourceBranchId: 'branch-a',
      // no executedAt / requestedAt / createdAt / updatedAt on purpose
      sideEffectsAudit: [
        {
          operation: 'notify-family',
          status: 'ok',
          metadata: { name: 'notify-family', category: 'notification', emitted: true },
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

function makeApp({ service, governance, userId = 'U-1', role = 'admin' } = {}) {
  const svc = service || makeService();
  const gov = governance || makeGovernance();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) req.user = { id: userId, role };
    next();
  });
  app.use(
    '/api/v1/beneficiary-lifecycle',
    createBeneficiaryLifecycleRouter({ service: svc, governance: gov })
  );
  return { app, svc, gov };
}

describe('W604 GET /side-effects-summary?windowDays=N', () => {
  test('no windowDays => whole history (backward compatible with W601)', async () => {
    const { app } = makeApp();
    const r = await request(app).get(PATH);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.windowDays).toBeNull();
    expect(d.transitionsConsidered).toBe(4);
    expect(d.beneficiariesConsidered).toBe(4);
    expect(d.sideEffectsSummary.total).toBe(4);
  });

  test('windowDays=7 keeps only the 2-day txn + the undated row', async () => {
    const { app } = makeApp();
    const r = await request(app).get(`${PATH}?windowDays=7`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.windowDays).toBe(7);
    // txn-recent (2d) IN, txn-mid (20d) OUT, txn-old (200d) OUT, txn-undated kept
    expect(d.transitionsConsidered).toBe(2);
    expect(d.beneficiariesConsidered).toBe(2); // BEN-1 + BEN-4
    expect(d.sideEffectsSummary.total).toBe(2);
  });

  test('windowDays=30 keeps recent + mid + undated, drops the 200-day txn', async () => {
    const { app } = makeApp();
    const r = await request(app).get(`${PATH}?windowDays=30`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.windowDays).toBe(30);
    expect(d.transitionsConsidered).toBe(3); // BEN-1, BEN-2, BEN-4
    expect(d.beneficiariesConsidered).toBe(3);
  });

  test('undated row is retained even with a tiny window', async () => {
    const { app } = makeApp();
    const r = await request(app).get(`${PATH}?windowDays=1`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    // only the undated row survives a 1-day window (txn-recent is 2 days old)
    expect(d.transitionsConsidered).toBe(1);
    expect(d.beneficiariesConsidered).toBe(1); // BEN-4
  });

  test.each([['abc'], ['0'], ['-5'], ['3651'], ['2.5']])(
    'rejects invalid windowDays=%s with 400',
    async value => {
      const { app } = makeApp();
      const r = await request(app).get(`${PATH}?windowDays=${value}`);
      expect(r.status).toBe(400);
      expect(r.body.reason).toBe('INVALID_WINDOW_DAYS');
    }
  );

  test('empty windowDays string is treated as omitted (whole history)', async () => {
    const { app } = makeApp();
    const r = await request(app).get(`${PATH}?windowDays=`);
    expect(r.status).toBe(200);
    expect(r.body.data.windowDays).toBeNull();
    expect(r.body.data.transitionsConsidered).toBe(4);
  });
});
