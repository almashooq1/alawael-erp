/**
 * beneficiary-lifecycle-routes-wave40.test.js — Wave 40 (Phase 2).
 *
 * HTTP-layer tests for the lifecycle routes. Service is mocked
 * (since Wave 39 already covers the service-layer behavior).
 *
 * Covers:
 *   • POST /transitions — happy path + permission gating + bad transitionId
 *   • POST /transitions/:id/approve — happy + permission + decision/reject mapping
 *   • POST /transitions/:id/execute — happy + permission
 *   • POST /transitions/:id/cancel — permission gating
 *   • POST /transitions/:id/reverse — happy + reversal-window denial mapping
 *   • GET /transitions/:id — happy + not-found
 *   • GET /beneficiaries/:id/transitions — history
 *   • GET /beneficiaries/:id/allowed-transitions — UI helper
 *   • GET /_health — ops probe
 *   • Status code mapping for every REASON
 */

'use strict';

const express = require('express');
const request = require('supertest');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');

function makeService(overrides = {}) {
  return {
    requestTransition: jest.fn(async () => ({
      ok: true,
      transitionRecord: { _id: 'txn-1', status: 'pending' },
    })),
    approveTransition: jest.fn(async () => ({
      ok: true,
      transitionRecord: { _id: 'txn-1', status: 'approved' },
      statusChanged: true,
    })),
    executeTransition: jest.fn(async () => ({
      ok: true,
      transitionRecord: { _id: 'txn-1', status: 'executed' },
    })),
    cancelTransition: jest.fn(async () => ({
      ok: true,
      transitionRecord: { _id: 'txn-1', status: 'cancelled' },
    })),
    reverseTransition: jest.fn(async () => ({
      ok: true,
      transitionRecord: { _id: 'txn-1', status: 'reversed' },
    })),
    getTransitionById: jest.fn(async id =>
      id === 'txn-1' ? { _id: 'txn-1', status: 'pending', transitionId: 'suspend' } : null
    ),
    getTransitionHistory: jest.fn(async () => [
      { _id: 'txn-1', transitionId: 'suspend', status: 'executed' },
    ]),
    getAllowedTransitionsFor: jest.fn(({ currentState }) =>
      currentState === 'active'
        ? [
            { id: 'suspend', to: 'suspended' },
            { id: 'discharge', to: 'discharged' },
          ]
        : []
    ),
    ...overrides,
  };
}

function makeGovernance({ allowedPermissions = null, holdersByCode = {} } = {}) {
  return {
    hasPermission: jest.fn((role, code) => {
      if (allowedPermissions === null) return true; // default-allow for happy path
      if (allowedPermissions === 'all') return true;
      return allowedPermissions.includes(code);
    }),
    _holdersByCode: holdersByCode,
  };
}

function makeApp({ service, governance, userId = 'U-1', role = 'branch_manager' } = {}) {
  const svc = service || makeService();
  const gov = governance || makeGovernance();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (userId) {
      req.user = { id: userId, role };
    }
    next();
  });
  app.use(
    '/api/v1/beneficiary-lifecycle',
    createBeneficiaryLifecycleRouter({ service: svc, governance: gov })
  );
  return { app, svc, gov };
}

// ─── POST /transitions ───────────────────────────────────────────

describe('POST /transitions', () => {
  test('happy path creates pending record', async () => {
    const { app, svc } = makeApp();
    const r = await request(app).post('/api/v1/beneficiary-lifecycle/transitions').send({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      transitionId: 'suspend',
      reasonCode: 'family',
    });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(svc.requestTransition).toHaveBeenCalled();
    const callArg = svc.requestTransition.mock.calls[0][0];
    expect(callArg.transitionId).toBe('suspend');
    expect(callArg.actor.userId).toBe('U-1');
  });

  test('unknown transitionId → 400 TRANSITION_NOT_FOUND', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions')
      .send({ beneficiaryId: 'b-1', transitionId: 'not_a_thing' });
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('TRANSITION_NOT_FOUND');
  });

  test('permission denied → 403 with required permission', async () => {
    const { app } = makeApp({
      governance: makeGovernance({ allowedPermissions: [] }),
    });
    const r = await request(app).post('/api/v1/beneficiary-lifecycle/transitions').send({
      beneficiaryId: 'b-1',
      transitionId: 'suspend',
      reasonCode: 'family',
    });
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe('PERMISSION_DENIED');
    expect(r.body.requiredPermission).toBe('beneficiary.lifecycle.suspend.request');
  });

  test('unauthenticated → 401 ACTOR_REQUIRED', async () => {
    const { app } = makeApp({ userId: null });
    const r = await request(app).post('/api/v1/beneficiary-lifecycle/transitions').send({
      beneficiaryId: 'b-1',
      transitionId: 'suspend',
      reasonCode: 'family',
    });
    expect(r.status).toBe(401);
    expect(r.body.reason).toBe('ACTOR_REQUIRED');
  });

  test('service returns INVALID_REASON_CODE → 400', async () => {
    const { app } = makeApp({
      service: makeService({
        requestTransition: jest.fn(async () => ({
          ok: false,
          reason: 'INVALID_REASON_CODE',
        })),
      }),
    });
    const r = await request(app).post('/api/v1/beneficiary-lifecycle/transitions').send({
      beneficiaryId: 'b-1',
      transitionId: 'suspend',
      reasonCode: 'attacker',
    });
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('INVALID_REASON_CODE');
  });

  test('service returns INVALID_FROM_STATE → 409 with allowed states', async () => {
    const { app } = makeApp({
      service: makeService({
        requestTransition: jest.fn(async () => ({
          ok: false,
          reason: 'INVALID_FROM_STATE',
          allowed: ['active'],
        })),
      }),
    });
    const r = await request(app).post('/api/v1/beneficiary-lifecycle/transitions').send({
      beneficiaryId: 'b-1',
      transitionId: 'suspend',
      reasonCode: 'family',
    });
    expect(r.status).toBe(409);
    expect(r.body.reason).toBe('INVALID_FROM_STATE');
    expect(r.body.allowed).toEqual(['active']);
  });
});

// ─── POST /transitions/:id/approve ───────────────────────────────

describe('POST /transitions/:id/approve', () => {
  test('happy path passes through to service', async () => {
    const { app, svc } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/approve')
      .send({ approverRole: 'branch_manager' });
    expect(r.status).toBe(200);
    expect(svc.approveTransition).toHaveBeenCalled();
    const arg = svc.approveTransition.mock.calls[0][0];
    expect(arg.transitionRecordId).toBe('txn-1');
    expect(arg.approverRole).toBe('branch_manager');
    expect(arg.decision).toBe('approve');
  });

  test('SELF_APPROVAL → 403', async () => {
    const { app } = makeApp({
      service: makeService({
        approveTransition: jest.fn(async () => ({
          ok: false,
          reason: 'SELF_APPROVAL',
        })),
      }),
    });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/approve')
      .send({ approverRole: 'branch_manager' });
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe('SELF_APPROVAL');
  });

  test('NAFATH_REQUIRED → 412', async () => {
    const { app } = makeApp({
      service: makeService({
        approveTransition: jest.fn(async () => ({
          ok: false,
          reason: 'NAFATH_REQUIRED',
        })),
      }),
    });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/approve')
      .send({ approverRole: 'dpo' });
    expect(r.status).toBe(412);
    expect(r.body.reason).toBe('NAFATH_REQUIRED');
  });

  test('DUPLICATE_APPROVAL → 409', async () => {
    const { app } = makeApp({
      service: makeService({
        approveTransition: jest.fn(async () => ({
          ok: false,
          reason: 'DUPLICATE_APPROVAL',
        })),
      }),
    });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/approve')
      .send({ approverRole: 'branch_manager' });
    expect(r.status).toBe(409);
    expect(r.body.reason).toBe('DUPLICATE_APPROVAL');
  });

  test('decision=reject passes through', async () => {
    const { app, svc } = makeApp();
    await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/approve')
      .send({ approverRole: 'branch_manager', decision: 'reject', comment: 'no' });
    expect(svc.approveTransition.mock.calls[0][0].decision).toBe('reject');
  });
});

// ─── POST /transitions/:id/execute ────────────────────────────────

describe('POST /transitions/:id/execute', () => {
  test('happy path → 200', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/execute')
      .send({});
    expect(r.status).toBe(200);
    expect(r.body.data.transitionRecord.status).toBe('executed');
  });

  test('NOT_APPROVED → 409', async () => {
    const { app } = makeApp({
      service: makeService({
        executeTransition: jest.fn(async () => ({
          ok: false,
          reason: 'NOT_APPROVED',
          status: 'pending',
        })),
      }),
    });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/execute')
      .send({});
    expect(r.status).toBe(409);
    expect(r.body.reason).toBe('NOT_APPROVED');
    expect(r.body.currentWorkflowStatus).toBe('pending');
  });
});

// ─── POST /transitions/:id/cancel ────────────────────────────────

describe('POST /transitions/:id/cancel', () => {
  test('happy path → 200', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/cancel')
      .send({ reason: 'changed mind' });
    expect(r.status).toBe(200);
    expect(r.body.data.transitionRecord.status).toBe('cancelled');
  });

  test('user with neither cancel-own nor cancel-any → 403', async () => {
    const { app } = makeApp({
      governance: makeGovernance({ allowedPermissions: [] }),
    });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/cancel')
      .send({});
    expect(r.status).toBe(403);
  });

  test('unauthenticated → 401', async () => {
    const { app } = makeApp({ userId: null });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/cancel')
      .send({});
    expect(r.status).toBe(401);
    expect(r.body.reason).toBe('ACTOR_REQUIRED');
  });
});

// ─── POST /transitions/:id/reverse ────────────────────────────────

describe('POST /transitions/:id/reverse', () => {
  test('happy path → 200', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/reverse')
      .send({ reason: 'over-eager' });
    expect(r.status).toBe(200);
  });

  test('NOT_REVERSIBLE → 409', async () => {
    const { app } = makeApp({
      service: makeService({
        reverseTransition: jest.fn(async () => ({
          ok: false,
          reason: 'NOT_REVERSIBLE',
        })),
      }),
    });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/reverse')
      .send({});
    expect(r.status).toBe(409);
    expect(r.body.reason).toBe('NOT_REVERSIBLE');
  });

  test('REVERSAL_WINDOW_EXPIRED → 410 (gone)', async () => {
    const { app } = makeApp({
      service: makeService({
        reverseTransition: jest.fn(async () => ({
          ok: false,
          reason: 'REVERSAL_WINDOW_EXPIRED',
          ageDays: 45.3,
        })),
      }),
    });
    const r = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions/txn-1/reverse')
      .send({});
    expect(r.status).toBe(410);
    expect(r.body.reason).toBe('REVERSAL_WINDOW_EXPIRED');
    expect(r.body.ageDays).toBeCloseTo(45.3);
  });
});

// ─── GET /transitions/:id ─────────────────────────────────────────

describe('GET /transitions/:id', () => {
  test('found → 200', async () => {
    const { app } = makeApp();
    const r = await request(app).get('/api/v1/beneficiary-lifecycle/transitions/txn-1');
    expect(r.status).toBe(200);
    expect(r.body.data.transitionRecord._id).toBe('txn-1');
  });

  test('not found → 404', async () => {
    const { app } = makeApp();
    const r = await request(app).get('/api/v1/beneficiary-lifecycle/transitions/nope');
    expect(r.status).toBe(404);
    expect(r.body.reason).toBe('TRANSITION_NOT_FOUND');
  });
});

// ─── GET /beneficiaries/:id/transitions ──────────────────────────

describe('GET /beneficiaries/:id/transitions', () => {
  test('returns history', async () => {
    const { app, svc } = makeApp();
    const r = await request(app).get('/api/v1/beneficiary-lifecycle/beneficiaries/b-1/transitions');
    expect(r.status).toBe(200);
    expect(r.body.data.count).toBe(1);
    expect(svc.getTransitionHistory).toHaveBeenCalledWith('b-1');
  });
});

// ─── GET /beneficiaries/:id/allowed-transitions ──────────────────

describe('GET /beneficiaries/:id/allowed-transitions', () => {
  test('returns registry-allowed transitions for the state', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .get('/api/v1/beneficiary-lifecycle/beneficiaries/b-1/allowed-transitions')
      .query({ currentState: 'active' });
    expect(r.status).toBe(200);
    expect(r.body.data.transitions.length).toBe(2);
  });

  test('invalid currentState → 400 with allowed list', async () => {
    const { app } = makeApp();
    const r = await request(app)
      .get('/api/v1/beneficiary-lifecycle/beneficiaries/b-1/allowed-transitions')
      .query({ currentState: 'made-up' });
    expect(r.status).toBe(400);
    expect(r.body.reason).toBe('INVALID_CURRENT_STATE');
    expect(r.body.allowed).toEqual(
      expect.arrayContaining(['draft', 'active', 'suspended', 'archived'])
    );
  });
});

// ─── GET /_health ─────────────────────────────────────────────────

describe('GET /_health', () => {
  test('returns wave info + counts', async () => {
    const { app } = makeApp();
    const r = await request(app).get('/api/v1/beneficiary-lifecycle/_health');
    expect(r.status).toBe(200);
    expect(r.body.data.wave).toBe(40);
    expect(r.body.data.states).toBe(9);
    expect(r.body.data.transitions).toBe(12);
    expect(r.body.data.statuses).toBe(7);
  });
});

// ─── Permission integration with real governance service ──────────

describe('Routes integrate with real governance.service', () => {
  test('actor with branch_manager role can request suspend (registry says so)', async () => {
    const { createGovernanceService } = require('../intelligence/governance.service');
    const realGov = createGovernanceService({ logger: { warn: () => {}, info: () => {} } });
    const { app } = makeApp({
      governance: realGov,
      role: 'branch_manager',
    });
    const r = await request(app).post('/api/v1/beneficiary-lifecycle/transitions').send({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      transitionId: 'suspend',
      reasonCode: 'family',
    });
    expect(r.status).toBe(200);
  });

  test('actor with therapist role CANNOT request initiate_transfer (registry blocks)', async () => {
    const { createGovernanceService } = require('../intelligence/governance.service');
    const realGov = createGovernanceService({ logger: { warn: () => {}, info: () => {} } });
    const { app } = makeApp({
      governance: realGov,
      role: 'therapist',
    });
    const r = await request(app).post('/api/v1/beneficiary-lifecycle/transitions').send({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      transitionId: 'initiate_transfer',
      reasonCode: 'family-relocation',
    });
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe('PERMISSION_DENIED');
  });
});
