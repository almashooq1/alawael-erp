/**
 * hash-chain-stability-wave87.test.js — Wave 87.
 *
 * Closes structural flaw S4 from the Session-Waves 64-83 critical
 * review: Access-review attestation hash chain was hashing
 * `signedAt.toISOString()` — fragile under timezone / precision /
 * round-trip serialization drift. The Wave-87 fix:
 *
 *   • new default encoding: `String(new Date(signedAt).getTime())`
 *     — pure number, stable across JSON / Mongoose Date / cross-tz
 *   • verifyHashChain accepts both encodings — legacy attestations
 *     hashed with toISOString still verify (their IDs surface in
 *     `legacyAttestationIds` for a future migration script)
 *
 * This file proves:
 *   1. Default encoding produces deterministic, equal hashes for
 *      the same logical signedAt regardless of which Date-equivalent
 *      input you pass (Date instance / ISO string / epoch ms number /
 *      bigger-precision string)
 *   2. The legacy encoding still verifies — backwards compatible
 *   3. Mixed-encoding chains verify clean (some EPOCH_MS, some ISO)
 *   4. A truly tampered attestation surfaces in `broken`, not
 *      `legacyAttestationIds`
 *   5. The new encoding survives JSON round-trip — yesterday's
 *      hash matches today's hash on the same record
 */

'use strict';

const {
  createAccessReviewService,
  computeHash,
  HASH_ENCODING_VERSIONS,
} = require('../intelligence/access-review.service');

// ─── Helper: minimal in-memory attestationModel ────────────────────

function buildMockAttestationModel() {
  const store = [];
  let counter = 0;

  function ModelCtor(data) {
    Object.assign(this, data);
    this._id = data._id || `att-${++counter}`;
    this.toObject = () => ({ ...this });
    this.save = async function () {
      const idx = store.findIndex(r => r._id === this._id);
      if (idx >= 0) store[idx] = { ...this };
      else store.push({ ...this });
      return this;
    };
    this.validate = async function () {
      /* skip — covered elsewhere */
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

  ModelCtor.findById = function (id) {
    return { lean: async () => store.find(r => String(r._id) === String(id)) || null };
  };

  ModelCtor.find = function (query = {}) {
    let matches = store.filter(r =>
      Object.entries(query).every(([k, v]) => String(r[k]) === String(v))
    );
    const chain = {
      sort(spec) {
        const key = Object.keys(spec)[0];
        const dir = spec[key];
        matches = matches.slice().sort((a, b) => {
          const av = new Date(a[key]).getTime();
          const bv = new Date(b[key]).getTime();
          return (av - bv) * dir;
        });
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
    };
    return chain;
  };

  ModelCtor._store = store;
  return ModelCtor;
}

// ─── 1. Deterministic encoding ─────────────────────────────────────

describe('Wave 87 — computeHash encoding stability (S4 closure)', () => {
  test('same logical signedAt → same hash regardless of input form', () => {
    const iso = '2026-05-18T10:00:00.000Z';
    const dateObj = new Date(iso);
    const epoch = dateObj.getTime();

    const base = {
      cycleId: 'Q2-2026',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      priorHash: null,
    };

    const h1 = computeHash({ ...base, signedAt: iso });
    const h2 = computeHash({ ...base, signedAt: dateObj });
    const h3 = computeHash({ ...base, signedAt: epoch });
    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  test('new EPOCH_MS encoding differs from legacy ISO_STRING encoding for the same record', () => {
    const base = {
      cycleId: 'C',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt: '2026-05-18T10:00:00.000Z',
      priorHash: null,
    };
    const newHash = computeHash({
      ...base,
      encodingVersion: HASH_ENCODING_VERSIONS.EPOCH_MS,
    });
    const legacyHash = computeHash({
      ...base,
      encodingVersion: HASH_ENCODING_VERSIONS.ISO_STRING,
    });
    expect(newHash).not.toBe(legacyHash);
    expect(newHash).toMatch(/^[a-f0-9]{64}$/);
    expect(legacyHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('default encoding is EPOCH_MS', () => {
    const base = {
      cycleId: 'C',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt: '2026-05-18T10:00:00Z',
      priorHash: null,
    };
    const noVersion = computeHash(base);
    const explicitNew = computeHash({
      ...base,
      encodingVersion: HASH_ENCODING_VERSIONS.EPOCH_MS,
    });
    expect(noVersion).toBe(explicitNew);
  });

  test('hash survives JSON round-trip on the signedAt field', () => {
    const base = {
      cycleId: 'C',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      priorHash: null,
    };
    const original = new Date('2026-05-18T10:00:00.123Z');
    const h1 = computeHash({ ...base, signedAt: original });

    // Simulate JSON round-trip: Mongo writes Date, reads back as Date
    // or as ISO string from .lean(); both must rehash to the same value.
    const asJSON = JSON.stringify({ d: original });
    const parsed = JSON.parse(asJSON); // d is now an ISO string
    const h2 = computeHash({ ...base, signedAt: parsed.d });

    // Through a fresh Date() rebuild
    const h3 = computeHash({ ...base, signedAt: new Date(parsed.d) });

    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
  });
});

// ─── 2. verifyHashChain accepts both encodings ─────────────────────

describe('Wave 87 — verifyHashChain accepts legacy + new encodings', () => {
  test('chain of all-EPOCH_MS records verifies clean (zero broken, zero legacy)', async () => {
    const model = buildMockAttestationModel();
    const svc = createAccessReviewService({ attestationModel: model });

    await svc.createAttestation({
      cycleId: 'Q1',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      reviewerRole: 'branch_manager',
      targetUserId: 't1',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    await svc.createAttestation({
      cycleId: 'Q2',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      reviewerRole: 'branch_manager',
      targetUserId: 't1',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });

    const result = await svc.verifyHashChain('t1');
    expect(result.ok).toBe(true);
    expect(result.broken).toEqual([]);
    expect(result.legacyEncodingCount).toBe(0);
    expect(result.legacyAttestationIds).toEqual([]);
    expect(result.chainLength).toBe(2);
  });

  test('chain with a legacy-encoded record verifies but flags it as legacy', async () => {
    const model = buildMockAttestationModel();
    const svc = createAccessReviewService({ attestationModel: model });

    // Plant a legacy-encoded record directly in the store
    const signedAt = new Date('2026-01-01T12:00:00Z');
    const legacyHash = computeHash({
      cycleId: 'Q-old',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt,
      priorHash: null,
      encodingVersion: HASH_ENCODING_VERSIONS.ISO_STRING,
    });
    model._store.push({
      _id: 'att-legacy-1',
      cycleId: 'Q-old',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt,
      priorAttestationHash: null,
      currentHash: legacyHash,
    });

    const result = await svc.verifyHashChain('t1');
    expect(result.ok).toBe(true);
    expect(result.broken).toEqual([]);
    expect(result.legacyEncodingCount).toBe(1);
    expect(result.legacyAttestationIds).toEqual(['att-legacy-1']);
    expect(result.chainLength).toBe(1);
  });

  test('mixed chain: legacy first, then EPOCH_MS chained to it', async () => {
    const model = buildMockAttestationModel();
    const svc = createAccessReviewService({ attestationModel: model });

    // Plant a legacy record
    const signedAt1 = new Date('2026-01-01T12:00:00Z');
    const legacyHash = computeHash({
      cycleId: 'Q-old',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt: signedAt1,
      priorHash: null,
      encodingVersion: HASH_ENCODING_VERSIONS.ISO_STRING,
    });
    model._store.push({
      _id: 'att-legacy-1',
      cycleId: 'Q-old',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      targetUserId: 't1',
      targetRole: 'therapist',
      decision: 'CERTIFY',
      signedAt: signedAt1,
      priorAttestationHash: null,
      currentHash: legacyHash,
    });

    // Now createAttestation will chain to legacyHash as priorHash
    await svc.createAttestation({
      cycleId: 'Q-new',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      reviewerRole: 'branch_manager',
      targetUserId: 't1',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });

    const result = await svc.verifyHashChain('t1');
    expect(result.ok).toBe(true);
    expect(result.broken).toEqual([]);
    expect(result.legacyEncodingCount).toBe(1);
    expect(result.legacyAttestationIds).toEqual(['att-legacy-1']);
    expect(result.chainLength).toBe(2);
  });
});

// ─── 3. Real tampering still surfaces as broken ────────────────────

describe('Wave 87 — tampered record still flagged broken (not legacy)', () => {
  test('flipping a decision after the fact breaks the chain', async () => {
    const model = buildMockAttestationModel();
    const svc = createAccessReviewService({ attestationModel: model });

    const r1 = await svc.createAttestation({
      cycleId: 'Q1',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      reviewerRole: 'branch_manager',
      targetUserId: 't1',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    expect(r1.ok).toBe(true);

    // Tamper: flip the decision in the stored record
    const stored = model._store.find(r => r._id === r1.attestation._id);
    stored.decision = 'REVOKE';

    const result = await svc.verifyHashChain('t1');
    expect(result.ok).toBe(true);
    expect(result.broken.length).toBe(1);
    expect(result.broken[0].attestationId).toBe(String(r1.attestation._id));
    expect(result.broken[0].triedEncodings).toEqual([
      HASH_ENCODING_VERSIONS.EPOCH_MS,
      HASH_ENCODING_VERSIONS.ISO_STRING,
    ]);
    expect(result.legacyEncodingCount).toBe(0);
  });

  test('rewriting only the hash (without changing payload) is also caught', async () => {
    const model = buildMockAttestationModel();
    const svc = createAccessReviewService({ attestationModel: model });

    const r1 = await svc.createAttestation({
      cycleId: 'Q1',
      reviewType: 'quarterly',
      reviewerId: 'r1',
      reviewerRole: 'branch_manager',
      targetUserId: 't1',
      targetRole: 'therapist',
      targetScope: 'BRANCH',
      decision: 'CERTIFY',
    });
    expect(r1.ok).toBe(true);

    const stored = model._store.find(r => r._id === r1.attestation._id);
    stored.currentHash = 'a'.repeat(64); // attacker replaces hash

    const result = await svc.verifyHashChain('t1');
    expect(result.broken.length).toBe(1);
    expect(result.broken[0].actual).toBe('a'.repeat(64));
  });
});

// ─── 4. Encoding-version constants are exported ────────────────────

describe('Wave 87 — HASH_ENCODING_VERSIONS exports', () => {
  test('two named encodings are exposed', () => {
    expect(HASH_ENCODING_VERSIONS.EPOCH_MS).toBe('epoch-ms');
    expect(HASH_ENCODING_VERSIONS.ISO_STRING).toBe('iso');
  });

  test('the object is frozen', () => {
    expect(Object.isFrozen(HASH_ENCODING_VERSIONS)).toBe(true);
  });
});
