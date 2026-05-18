/**
 * lifecycle-mfa-route-wiring-wave95.test.js — Wave 95.
 *
 * Integration test proving that the Wave-86 MFA-tier enforcement is
 * now actually wired on the beneficiary-lifecycle route chain — i.e.,
 * HIGH/CRITICAL transitions REFUSE when the actor has no fresh MFA
 * assertion, and PASS when loadMfaActor populates req.actor with a
 * sufficient tier + freshness.
 *
 * Closes the W91 route-wiring item that was tagged "out of scope" in
 * Wave 86 — converts MFA enforcement from "service-level available
 * (off by default)" to "production routes enforce by default".
 *
 * The test uses the canonical createBeneficiaryLifecycleService with
 * enforceMfa: true, the canonical loadMfaActor middleware, and a
 * synthetic mfaService stub so we don't need the full Mongo +
 * MfaChallenge model wiring.
 */

'use strict';

const express = require('express');
const request = require('supertest');

const {
  createBeneficiaryLifecycleService,
} = require('../intelligence/beneficiary-lifecycle.service');
const createBeneficiaryLifecycleRouter = require('../routes/beneficiary-lifecycle.routes');
const { loadMfaActor } = require('../middleware/mfa-actor');

function buildMockLog() {
  const created = [];
  return {
    _created: created,
    async create(doc) {
      const rec = { _id: `rec-${created.length}`, ...doc };
      created.push(rec);
      return rec;
    },
    async findOne() {
      return null;
    },
  };
}

function buildBeneficiaryMock() {
  return {
    findById() {
      return {
        select: () => ({
          lean: async () => ({
            _id: 'b-1',
            status: 'active',
            branchId: 'br-1',
            name: 'مستفيد تجريبي',
            primaryGuardianId: 'g-1',
            dateOfBirth: new Date('2018-06-15T00:00:00.000Z'),
            updatedAt: new Date('2026-05-15T08:00:00.000Z'),
          }),
        }),
      };
    },
  };
}

// Mfa service stub that mimics the Wave-86 mfa-challenge.service
// surface used by loadMfaActor — just getUserMfaState(userId).
function buildMfaServiceStub(stateMap) {
  return {
    getUserMfaState(userId) {
      return stateMap.get(userId) || { mfaLevel: 0, mfaAssertedAt: null };
    },
  };
}

function buildApp({ mfaStateMap, enforceMfa = true } = {}) {
  const app = express();
  app.use(express.json());

  const lifecycleSvc = createBeneficiaryLifecycleService({
    transitionLog: buildMockLog(),
    beneficiaryModel: buildBeneficiaryMock(),
    sideEffectHandlers: {},
    auditLogger: { log: jest.fn(async () => {}) },
    logger: { warn: () => {}, info: () => {} },
    enforceMfa,
  });

  // Fake authenticate middleware — sets req.user (the real one is
  // JWT-based and out of scope for this unit-integration test).
  function fakeAuthenticate(req, _res, next) {
    req.user = { id: req.headers['x-test-user-id'] || 'user-1', role: 'branch_manager' };
    next();
  }

  // Fake governance — every perm allowed.
  const governance = {
    hasPermission: () => true,
  };

  const mfaService = buildMfaServiceStub(mfaStateMap);

  app.use(
    '/api/v1/beneficiary-lifecycle',
    fakeAuthenticate,
    loadMfaActor(mfaService),
    createBeneficiaryLifecycleRouter({
      service: lifecycleSvc,
      governance,
      logger: { warn: () => {}, info: () => {} },
    })
  );

  return app;
}

describe('Wave 95 — lifecycle route-level MFA enforcement', () => {
  test('CRITICAL transition (initiate_transfer, tier 3) REFUSED when actor has no MFA', async () => {
    const stateMap = new Map(); // user-1 has no MFA state
    const app = buildApp({ mfaStateMap: stateMap });

    const res = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions')
      .set('x-test-user-id', 'user-1')
      .send({
        beneficiaryId: 'b-1',
        branchId: 'br-1',
        destinationBranchId: 'br-2',
        transitionId: 'initiate_transfer',
        reason: 'family relocation',
        reasonCode: 'family-relocation',
      });

    // Service returns { ok:false, reason: 'MFA_TIER_REQUIRED' }; router maps to 403.
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('MFA_TIER_REQUIRED');
    expect(res.body.requiredTier).toBe(3);
    expect(res.body.actorTier).toBe(0);
  });

  test('CRITICAL transition REFUSED when actor has tier 2 (need 3)', async () => {
    const stateMap = new Map([['user-1', { mfaLevel: 2, mfaAssertedAt: new Date() }]]);
    const app = buildApp({ mfaStateMap: stateMap });

    const res = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions')
      .set('x-test-user-id', 'user-1')
      .send({
        beneficiaryId: 'b-1',
        branchId: 'br-1',
        destinationBranchId: 'br-2',
        transitionId: 'initiate_transfer',
        reason: 'family relocation',
        reasonCode: 'family-relocation',
      });

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('MFA_TIER_REQUIRED');
  });

  test('CRITICAL transition REFUSED when MFA is stale (> 5 min for tier 3)', async () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000);
    const stateMap = new Map([['user-1', { mfaLevel: 3, mfaAssertedAt: tenMinAgo }]]);
    const app = buildApp({ mfaStateMap: stateMap });

    const res = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions')
      .set('x-test-user-id', 'user-1')
      .send({
        beneficiaryId: 'b-1',
        branchId: 'br-1',
        destinationBranchId: 'br-2',
        transitionId: 'initiate_transfer',
        reason: 'family relocation',
        reasonCode: 'family-relocation',
      });

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('MFA_FRESHNESS_REQUIRED');
    expect(res.body.maxAgeMin).toBe(5);
  });

  test('CRITICAL transition SUCCEEDS when actor has tier 3 + fresh assertion', async () => {
    const stateMap = new Map([['user-1', { mfaLevel: 3, mfaAssertedAt: new Date() }]]);
    const app = buildApp({ mfaStateMap: stateMap });

    const res = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions')
      .set('x-test-user-id', 'user-1')
      .send({
        beneficiaryId: 'b-1',
        branchId: 'br-1',
        destinationBranchId: 'br-2',
        transitionId: 'initiate_transfer',
        reason: 'family relocation',
        reasonCode: 'family-relocation',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transitionRecord.status).toBe('pending');
    expect(res.body.data.transitionRecord.subjectSnapshot).not.toBeNull();
  });

  test('MEDIUM transition (suspend, tier 2) SUCCEEDS when actor has tier 2 + fresh assertion', async () => {
    const stateMap = new Map([['user-1', { mfaLevel: 2, mfaAssertedAt: new Date() }]]);
    const app = buildApp({ mfaStateMap: stateMap });

    const res = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions')
      .set('x-test-user-id', 'user-1')
      .send({
        beneficiaryId: 'b-1',
        branchId: 'br-1',
        transitionId: 'suspend',
        reason: 'family request',
        reasonCode: 'family',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('back-compat — enforceMfa:false constructs service that ignores MFA tier (Wave 86 default)', async () => {
    const stateMap = new Map(); // no MFA state at all
    const app = buildApp({ mfaStateMap: stateMap, enforceMfa: false });

    const res = await request(app)
      .post('/api/v1/beneficiary-lifecycle/transitions')
      .set('x-test-user-id', 'user-1')
      .send({
        beneficiaryId: 'b-1',
        branchId: 'br-1',
        destinationBranchId: 'br-2',
        transitionId: 'initiate_transfer',
        reason: 'family relocation',
        reasonCode: 'family-relocation',
      });

    // With enforceMfa:false the service short-circuits the tier check.
    // The transition proceeds even with mfaLevel=0.
    expect(res.status).toBe(200);
  });
});
