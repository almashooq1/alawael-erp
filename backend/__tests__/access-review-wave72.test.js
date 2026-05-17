/**
 * access-review-wave72.test.js — Wave 72.
 *
 * Workflow + HTTP tests for the Access Review service introduced in
 * Wave 72 (red-team #12 closure). Wave-38 foundations are exercised
 * via the simulator and registry stays untouched.
 *
 * Sections:
 *   1. Hash-chain helper (computeHash determinism + sensitivity)
 *   2. createAttestation guards (reviewer / target / decision /
 *      review-type / justification / cosigners / self-attestation)
 *   3. createAttestation happy path (CERTIFY) — verifies hash chain
 *      links to prior attestation
 *   4. createAttestation HIGH-sensitivity path (PRIVILEGED) — wires
 *      a fake anchorLedger and confirms commit + saved.anchorTxId
 *   5. getCycleStatus / listAttestations / verifyHashChain helpers
 *   6. simulator passthrough exposure on the service
 *
 * All tests use the same chainable Mongoose-style mock the
 * lifecycle and care-plan suites use — no live DB.
 */

'use strict';

const { createAccessReviewService, computeHash } = require('../intelligence/access-review.service');
const { createAccessReviewSimulator } = require('../intelligence/access-review-simulator.service');
const reg = require('../intelligence/access-review.registry');

// ─── Chainable mock for AccessReviewAttestation model ───────────────

function buildMockAttestationModel() {
  const store = [];
  let counter = 0;

  function ModelCtor(data) {
    Object.assign(this, data);
    this._id = data._id || `att-${++counter}`;
    this.toObject = () => ({ ...this });
    this.save = async function () {
      // Replace existing or insert
      const idx = store.findIndex(r => r._id === this._id);
      if (idx >= 0) store[idx] = { ...this };
      else store.push({ ...this });
      return this;
    };
    this.validate = async function () {
      // Mirror the model's invariants minimally
      const TYPES_COSIGN = new Set(['privileged', 'hq', 'high-risk']);
      const DEC_JUST = new Set(['REVISE', 'REVOKE', 'ESCALATE', 'ROTATE']);
      if (DEC_JUST.has(this.decision) && !this.justificationAr && !this.justificationEn) {
        const err = new Error('Validation failed');
        err.errors = { justificationAr: { message: 'required' } };
        throw err;
      }
      if (
        TYPES_COSIGN.has(this.reviewType) &&
        (!Array.isArray(this.coSignerNafathIds) || this.coSignerNafathIds.length < 1)
      ) {
        const err = new Error('Validation failed');
        err.errors = { coSignerNafathIds: { message: 'required' } };
        throw err;
      }
      if (String(this.reviewerId) === String(this.targetUserId)) {
        const err = new Error('Validation failed');
        err.errors = { reviewerId: { message: 'self-attestation' } };
        throw err;
      }
    };
  }

  ModelCtor.findOne = function (query) {
    const matches = store
      .filter(r => Object.entries(query).every(([k, v]) => String(r[k]) === String(v)))
      .sort((a, b) => new Date(b.signedAt) - new Date(a.signedAt));
    const chain = {
      sort() {
        return chain;
      },
      select() {
        return chain;
      },
      lean: async () => matches[0] || null,
    };
    return chain;
  };

  ModelCtor.findById = async function (id) {
    const hit = store.find(r => String(r._id) === String(id));
    if (!hit) return null;
    return { ...hit, lean: async () => ({ ...hit }) };
  };
  // Direct lean()-style usage
  ModelCtor.findById = function (id) {
    const chain = {
      lean: async () => store.find(r => String(r._id) === String(id)) || null,
    };
    return chain;
  };

  ModelCtor.find = function (query = {}) {
    let matches = store.filter(r =>
      Object.entries(query).every(([k, v]) => {
        if (typeof v === 'object' && v !== null && '$gte' in v) {
          return new Date(r[k]) >= new Date(v.$gte);
        }
        return String(r[k]) === String(v);
      })
    );
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        matches = matches.slice().sort((a, b) => {
          const av = a[key];
          const bv = b[key];
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
        return chain;
      },
      skip(n) {
        matches = matches.slice(n);
        return chain;
      },
      limit(n) {
        matches = matches.slice(0, n);
        return chain;
      },
      select() {
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
    };
    return chain;
  };

  ModelCtor.countDocuments = async function (query = {}) {
    return store.filter(r => Object.entries(query).every(([k, v]) => String(r[k]) === String(v)))
      .length;
  };

  ModelCtor._store = store;
  return ModelCtor;
}

// ─── 1. computeHash determinism ─────────────────────────────────────

describe('access-review.service — computeHash', () => {
  test('same inputs → same hash', () => {
    const inp = {
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      targetUserId: 'u2',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt: new Date('2026-01-15T12:00:00Z'),
      priorHash: null,
    };
    const h1 = computeHash(inp);
    const h2 = computeHash(inp);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  test('different prior hash → different current hash', () => {
    const base = {
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      targetUserId: 'u2',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt: new Date('2026-01-15T12:00:00Z'),
    };
    expect(computeHash({ ...base, priorHash: null })).not.toBe(
      computeHash({ ...base, priorHash: 'abc' })
    );
  });

  test('different decision → different hash', () => {
    const base = {
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      targetUserId: 'u2',
      targetRole: 'therapist',
      signedAt: new Date('2026-01-15T12:00:00Z'),
      priorHash: null,
    };
    expect(computeHash({ ...base, decision: 'CERTIFY' })).not.toBe(
      computeHash({ ...base, decision: 'REVOKE' })
    );
  });
});

// ─── 2. createAttestation guards ────────────────────────────────────

describe('access-review.service — createAttestation guards', () => {
  let service;
  beforeEach(() => {
    service = createAccessReviewService({
      attestationModel: buildMockAttestationModel(),
    });
  });

  test('rejects missing reviewerId', async () => {
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      targetUserId: 'u2',
      decision: 'CERTIFY',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('REVIEWER_REQUIRED');
  });

  test('rejects missing targetUserId', async () => {
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      decision: 'CERTIFY',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('TARGET_REQUIRED');
  });

  test('rejects self-attestation', async () => {
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'same',
      targetUserId: 'same',
      decision: 'CERTIFY',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('SELF_ATTESTATION');
  });

  test('rejects invalid reviewType', async () => {
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'made-up',
      reviewerId: 'u1',
      targetUserId: 'u2',
      decision: 'CERTIFY',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('INVALID_REVIEW_TYPE');
  });

  test('rejects invalid decision', async () => {
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      targetUserId: 'u2',
      decision: 'MAYBE',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('INVALID_DECISION');
  });

  test('REVOKE without justification → JUSTIFICATION_REQUIRED', async () => {
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      reviewerRole: 'branch_manager',
      targetUserId: 'u2',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'REVOKE',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('JUSTIFICATION_REQUIRED');
  });

  test('PRIVILEGED without cosigners → COSIGNERS_REQUIRED', async () => {
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'privileged',
      reviewerId: 'u1',
      reviewerRole: 'ciso',
      targetUserId: 'u2',
      targetRole: 'iam.role_granter',
      targetScope: 'GLOBAL',
      decision: 'CERTIFY',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('COSIGNERS_REQUIRED');
  });
});

// ─── 3. createAttestation happy path ────────────────────────────────

describe('access-review.service — createAttestation happy path', () => {
  test('CERTIFY succeeds and produces a 64-char hash', async () => {
    const model = buildMockAttestationModel();
    const service = createAccessReviewService({ attestationModel: model });
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      reviewerRole: 'branch_manager',
      targetUserId: 'u2',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    expect(res.ok).toBe(true);
    expect(res.attestation.currentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.attestation.priorAttestationHash).toBeNull();
  });

  test('second attestation for same target chains to prior hash', async () => {
    const model = buildMockAttestationModel();
    const service = createAccessReviewService({ attestationModel: model });

    const first = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      reviewerRole: 'branch_manager',
      targetUserId: 'u2',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    expect(first.ok).toBe(true);

    const second = await service.createAttestation({
      cycleId: 'Q2-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      reviewerRole: 'branch_manager',
      targetUserId: 'u2',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    expect(second.ok).toBe(true);
    expect(second.attestation.priorAttestationHash).toBe(first.attestation.currentHash);
    expect(second.attestation.currentHash).not.toBe(first.attestation.currentHash);
  });
});

// ─── 4. HIGH-sensitivity attestation with anchor ledger ─────────────

describe('access-review.service — anchor ledger on HIGH types', () => {
  test('PRIVILEGED with cosigners commits to ledger and stores txId', async () => {
    const model = buildMockAttestationModel();
    const anchorCalls = [];
    const fakeAnchor = {
      commit: async args => {
        anchorCalls.push(args);
        return { txId: `tx-${anchorCalls.length}` };
      },
    };
    const service = createAccessReviewService({
      attestationModel: model,
      anchorLedger: fakeAnchor,
    });
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'privileged',
      reviewerId: 'ciso-1',
      reviewerRole: 'ciso',
      targetUserId: 'iam-1',
      targetRole: 'iam.role_granter',
      targetScope: 'GLOBAL',
      decision: 'CERTIFY',
      coSignerNafathIds: ['nafath-cosign-1'],
    });
    expect(res.ok).toBe(true);
    expect(anchorCalls).toHaveLength(1);
    expect(anchorCalls[0].kind).toBe('access-review.attestation');
    expect(res.attestation.anchorTxId).toBe('tx-1');
  });

  test('QUARTERLY does NOT commit to ledger', async () => {
    const model = buildMockAttestationModel();
    const anchorCalls = [];
    const fakeAnchor = {
      commit: async args => {
        anchorCalls.push(args);
        return { txId: 'tx-x' };
      },
    };
    const service = createAccessReviewService({
      attestationModel: model,
      anchorLedger: fakeAnchor,
    });
    const res = await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      reviewerRole: 'branch_manager',
      targetUserId: 'u2',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    expect(res.ok).toBe(true);
    expect(anchorCalls).toHaveLength(0);
    expect(res.attestation.anchorTxId).toBeUndefined();
  });
});

// ─── 5. Cycle status / list / chain verify ──────────────────────────

describe('access-review.service — read helpers', () => {
  let service;
  let model;
  beforeEach(async () => {
    model = buildMockAttestationModel();
    service = createAccessReviewService({ attestationModel: model });
    await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      reviewerRole: 'branch_manager',
      targetUserId: 'u2',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    await service.createAttestation({
      cycleId: 'Q1-2026',
      reviewType: 'quarterly',
      reviewerId: 'u1',
      reviewerRole: 'branch_manager',
      targetUserId: 'u3',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'REVOKE',
      justificationAr: 'لم يعد يعمل',
    });
  });

  test('getCycleStatus reports correct totals + revoke rate', async () => {
    const res = await service.getCycleStatus('Q1-2026');
    expect(res.ok).toBe(true);
    expect(res.totals.total).toBe(2);
    expect(res.totals.byDecision.CERTIFY).toBe(1);
    expect(res.totals.byDecision.REVOKE).toBe(1);
    expect(res.totals.revokeRate).toBe(50);
  });

  test('getCycleStatus requires cycleId', async () => {
    const res = await service.getCycleStatus('');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('CYCLE_ID_REQUIRED');
  });

  test('listAttestations filters by decision', async () => {
    const res = await service.listAttestations({ decision: 'REVOKE' });
    expect(res.ok).toBe(true);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].targetUserId).toBe('u3');
  });

  test('verifyHashChain returns no broken links for a clean chain', async () => {
    const res = await service.verifyHashChain('u2');
    expect(res.ok).toBe(true);
    expect(res.broken).toEqual([]);
    expect(res.chainLength).toBe(1);
  });

  test('verifyHashChain flags a tampered link', async () => {
    // Tamper with the only attestation for u2 in the store
    const att = model._store.find(r => r.targetUserId === 'u2');
    att.currentHash = 'a'.repeat(64);
    const res = await service.verifyHashChain('u2');
    expect(res.ok).toBe(true);
    expect(res.broken).toHaveLength(1);
    expect(res.broken[0].attestationId).toBe(att._id);
  });
});

// ─── 6. Simulator passthrough ───────────────────────────────────────

describe('access-review.service — simulator handle', () => {
  test('exposes the simulator passed in (for the route layer)', () => {
    const sim = createAccessReviewSimulator();
    const service = createAccessReviewService({
      attestationModel: buildMockAttestationModel(),
      simulator: sim,
    });
    expect(service.simulator).toBe(sim);
    const report = service.simulator.simulateActor({
      userId: 'u1',
      roles: ['therapist'],
    });
    expect(report.actorUserId).toBe('u1');
    expect(report.violations).toEqual([]);
  });
});

// ─── 7. Registry coverage proof ─────────────────────────────────────

describe('access-review-wave72 — registry alignment', () => {
  test('every TYPE_REQUIRING_COSIGNER in the service is in the registry', () => {
    ['privileged', 'hq', 'high-risk'].forEach(t => {
      expect(reg.REVIEW_TYPES).toContain(t);
    });
  });

  test('every DECISION_REQUIRING_JUSTIFICATION is in the registry', () => {
    ['REVISE', 'REVOKE', 'ESCALATE', 'ROTATE'].forEach(d => {
      expect(reg.DECISIONS).toContain(d);
    });
  });
});
