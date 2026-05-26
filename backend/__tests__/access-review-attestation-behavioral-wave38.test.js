'use strict';

/**
 * access-review-attestation-behavioral-wave38.test.js — behavioral counterpart
 * to the W38 static drift guard (`access-review-wave38.test.js`).
 *
 * AccessReviewAttestation is the canonical attestation evidence model for the
 * User Access Review & Recertification Program — 7 review types × 6 decisions
 * × hash-chained merkle log per target user. 4 Wave-18 invariants on the
 * `__invariants` virtual-path validator:
 *   1. REVISE/REVOKE/ESCALATE/ROTATE decisions require bilingual justification
 *   2. PRIVILEGED/HQ/HIGH_RISK review types require ≥1 cosigner Nafath ID
 *   3. currentHash must differ from priorAttestationHash (no replay)
 *   4. reviewerId ≠ targetUserId (no self-attestation)
 *
 * This is exactly the bug class the doctrine memory documents — REVOKE
 * without justification is a silent-state-change risk; without behavioral
 * coverage a regex change could break the invariant without anyone noticing.
 *
 * Per CLAUDE.md doctrine — 22× application across W38 + W356-W470.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.unmock('../intelligence/access-review.registry');

let mongod;
let Attestation;

// Hard-coded registry mirror (defensive — registry is jest-mocked by default
// and `jest.unmock` above must apply before any other test's mock taints).
const REVIEW_TYPES = ['quarterly', 'privileged', 'branch', 'hq', 'dormant', 'mover', 'high-risk'];
const TYPES_NEEDING_COSIGNER = ['privileged', 'hq', 'high-risk'];
const DECISIONS_NEEDING_JUSTIFICATION = ['REVISE', 'REVOKE', 'ESCALATE', 'ROTATE'];

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w38-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Attestation = require('../models/AccessReviewAttestation');
  await Attestation.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Attestation.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

function baseAtt(overrides = {}) {
  // A baseline CERTIFY/QUARTERLY attestation (no special invariant triggers)
  return {
    cycleId: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    reviewType: 'quarterly',
    reviewerId: oid(),
    reviewerRole: 'branch_manager',
    targetUserId: oid(),
    targetRole: 'therapist',
    targetScope: 'BRANCH',
    decision: 'CERTIFY',
    currentHash: `hash-${Math.random().toString(36).slice(2, 18)}`,
    ...overrides,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W38 behavioral — required fields', () => {
  it('REJECTS without cycleId', async () => {
    const p = new Attestation({ ...baseAtt(), cycleId: undefined });
    await expect(p.save()).rejects.toThrow(/cycleId/);
  });

  it('REJECTS without reviewType', async () => {
    const p = new Attestation({ ...baseAtt(), reviewType: undefined });
    await expect(p.save()).rejects.toThrow(/reviewType/);
  });

  it('REJECTS without reviewerId / targetUserId / decision / currentHash', async () => {
    for (const missing of ['reviewerId', 'targetUserId', 'decision', 'currentHash']) {
      const doc = baseAtt();
      delete doc[missing];
      const p = new Attestation(doc);
      await expect(p.save()).rejects.toThrow(new RegExp(missing));
    }
  });

  it('SAVES baseline CERTIFY/QUARTERLY attestation', async () => {
    const doc = await Attestation.create(baseAtt());
    expect(doc.decision).toBe('CERTIFY');
    expect(doc.signedAt).toBeInstanceOf(Date);
    expect(doc.evidenceLinks).toEqual([]);
    expect(doc.coSignerNafathIds).toEqual([]);
  });
});

// ─── 2. Enum validation ───────────────────────────────────────────────

describe('W38 behavioral — reviewType + decision enums', () => {
  for (const rt of REVIEW_TYPES) {
    it(`SAVES with reviewType='${rt}' (when invariants satisfied)`, async () => {
      const needsCosigner = TYPES_NEEDING_COSIGNER.includes(rt);
      const extras = needsCosigner ? { coSignerNafathIds: ['NAFATH-CO-001'] } : {};
      const doc = await Attestation.create(baseAtt({ reviewType: rt, ...extras }));
      expect(doc.reviewType).toBe(rt);
    });
  }

  it('REJECTS invalid reviewType', async () => {
    const p = new Attestation(baseAtt({ reviewType: 'monthly_audit' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const d of ['CERTIFY', 'ABSTAIN']) {
    it(`SAVES decision='${d}' (no extra justification needed)`, async () => {
      const doc = await Attestation.create(baseAtt({ decision: d }));
      expect(doc.decision).toBe(d);
    });
  }

  it('REJECTS invalid decision', async () => {
    const p = new Attestation(baseAtt({ decision: 'MAYBE_LATER' }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 3. Wave-18: justification-required decisions ─────────────────────

describe('W38 behavioral — justification invariant (REVISE/REVOKE/ESCALATE/ROTATE)', () => {
  for (const d of ['REVISE', 'REVOKE', 'ESCALATE', 'ROTATE']) {
    it(`REJECTS decision='${d}' WITHOUT any justification`, async () => {
      const p = new Attestation(baseAtt({ decision: d }));
      await expect(p.save()).rejects.toThrow(
        new RegExp(`${d} decisions require justificationAr or justificationEn`)
      );
    });

    it(`SAVES decision='${d}' with justificationAr only`, async () => {
      const doc = await Attestation.create(
        baseAtt({ decision: d, justificationAr: 'سبب التغيير: انتهاء الصلاحية' })
      );
      expect(doc.decision).toBe(d);
    });

    it(`SAVES decision='${d}' with justificationEn only`, async () => {
      const doc = await Attestation.create(
        baseAtt({ decision: d, justificationEn: 'Reason: role no longer required' })
      );
      expect(doc.decision).toBe(d);
    });
  }

  it('CERTIFY decision does NOT require justification', async () => {
    const doc = await Attestation.create(baseAtt({ decision: 'CERTIFY' }));
    expect(doc.decision).toBe('CERTIFY');
    expect(doc.justificationAr).toBeNull();
    expect(doc.justificationEn).toBeNull();
  });

  it('ABSTAIN decision does NOT require justification', async () => {
    const doc = await Attestation.create(baseAtt({ decision: 'ABSTAIN' }));
    expect(doc.decision).toBe('ABSTAIN');
  });
});

// ─── 4. Wave-18: cosigner-required review types ───────────────────────

describe('W38 behavioral — cosigner invariant (PRIVILEGED/HQ/HIGH_RISK)', () => {
  for (const rt of ['privileged', 'hq', 'high-risk']) {
    it(`REJECTS reviewType='${rt}' WITHOUT cosigner Nafath ID`, async () => {
      const p = new Attestation(baseAtt({ reviewType: rt }));
      await expect(p.save()).rejects.toThrow(
        new RegExp(`${rt} attestations require at least 1 cosigner`)
      );
    });

    it(`REJECTS reviewType='${rt}' with empty coSignerNafathIds[]`, async () => {
      const p = new Attestation(baseAtt({ reviewType: rt, coSignerNafathIds: [] }));
      await expect(p.save()).rejects.toThrow(/at least 1 cosigner/);
    });

    it(`SAVES reviewType='${rt}' with ≥1 cosigner`, async () => {
      const doc = await Attestation.create(
        baseAtt({ reviewType: rt, coSignerNafathIds: ['NAFATH-CO-001', 'NAFATH-CO-002'] })
      );
      expect(doc.coSignerNafathIds).toHaveLength(2);
    });
  }

  it('QUARTERLY review type does NOT require cosigner', async () => {
    const doc = await Attestation.create(baseAtt({ reviewType: 'quarterly' }));
    expect(doc.reviewType).toBe('quarterly');
    expect(doc.coSignerNafathIds).toEqual([]);
  });

  it('BRANCH review type does NOT require cosigner', async () => {
    const doc = await Attestation.create(baseAtt({ reviewType: 'branch' }));
    expect(doc.reviewType).toBe('branch');
  });
});

// ─── 5. Wave-18: hash-chain replay protection ─────────────────────────

describe('W38 behavioral — currentHash ≠ priorAttestationHash invariant', () => {
  it('REJECTS when currentHash equals priorAttestationHash (replay)', async () => {
    const sameHash = 'hash-deadbeef-abcdef-0123456789';
    const p = new Attestation(baseAtt({ priorAttestationHash: sameHash, currentHash: sameHash }));
    await expect(p.save()).rejects.toThrow(/currentHash must differ from priorAttestationHash/);
  });

  it('SAVES with priorAttestationHash=null (first in chain)', async () => {
    const doc = await Attestation.create(
      baseAtt({ priorAttestationHash: null, currentHash: 'hash-first-001' })
    );
    expect(doc.priorAttestationHash).toBeNull();
  });

  it('SAVES when priorAttestationHash differs from currentHash', async () => {
    const doc = await Attestation.create(
      baseAtt({
        priorAttestationHash: 'hash-prev-001',
        currentHash: 'hash-curr-002',
      })
    );
    expect(doc.priorAttestationHash).not.toBe(doc.currentHash);
  });
});

// ─── 6. Wave-18: self-attestation guard ───────────────────────────────

describe('W38 behavioral — self-attestation guard (reviewer ≠ target)', () => {
  it('REJECTS when reviewerId === targetUserId', async () => {
    const sameId = oid();
    const p = new Attestation(baseAtt({ reviewerId: sameId, targetUserId: sameId }));
    await expect(p.save()).rejects.toThrow(/reviewer cannot be the target/);
  });

  it('SAVES when reviewerId differs from targetUserId', async () => {
    const doc = await Attestation.create(baseAtt());
    expect(String(doc.reviewerId)).not.toBe(String(doc.targetUserId));
  });
});

// ─── 7. Multiple invariants stacking ──────────────────────────────────

describe('W38 behavioral — multiple invariants stack correctly', () => {
  it('REJECTS PRIVILEGED+REVOKE without cosigner AND without justification', async () => {
    const p = new Attestation(baseAtt({ reviewType: 'privileged', decision: 'REVOKE' }));
    // Either invariant should fail — Mongoose collects all into a single error
    await expect(p.save()).rejects.toThrow();
  });

  it('SAVES PRIVILEGED+REVOKE with both cosigner AND justification', async () => {
    const doc = await Attestation.create(
      baseAtt({
        reviewType: 'privileged',
        decision: 'REVOKE',
        coSignerNafathIds: ['NAFATH-CO-001'],
        justificationAr: 'تم سحب الصلاحية بسبب التزام إعادة الهيكلة',
      })
    );
    expect(doc.reviewType).toBe('privileged');
    expect(doc.decision).toBe('REVOKE');
  });
});

// ─── 8. Indexes ───────────────────────────────────────────────────────

describe('W38 behavioral — indexes + collection', () => {
  it('declares the 5 documented compound indexes', async () => {
    const indexes = await Attestation.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('cycleId+reviewType');
    expect(keys).toContain('targetUserId+signedAt');
    expect(keys).toContain('reviewerId+signedAt');
    expect(keys).toContain('cycleId+decision');
    expect(keys).toContain('decision+signedAt');
  });

  it('uses canonical collection name access_review_attestations', () => {
    expect(Attestation.collection.collectionName).toBe('access_review_attestations');
  });
});
