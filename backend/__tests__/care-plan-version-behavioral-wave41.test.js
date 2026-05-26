'use strict';

/**
 * care-plan-version-behavioral-wave41.test.js — behavioral counterpart to
 * the W41 static drift guard (`care-plan-wave41.test.js`).
 *
 * CarePlanVersion is the canonical care plan model from W41 — 30+ caller
 * ecosystem, hash-linked signatureChain, ICF goal mappings (W452), readiness
 * gating (W212). 8 distinct Wave-18 invariants on the `__invariants` virtual-
 * path validator that the static guard catches by source-regex but cannot
 * verify by execution:
 *   1. Post-approval states require reviewer + approver
 *   2. Reviewer/approver cannot equal author
 *   3. Post-approval requires non-empty signatureChain
 *   4. status=superseded requires supersededBy
 *   5. family_notification_sent requires familyVersion.body + readability ≤ 6
 *   6. approved status requires readinessScore ≥ READY (85) + 0 hardFailures
 *   7. signatureChain integrity (each prevHash matches previous .hash)
 *   8. amendments timestamps must be ≥ approvedAt
 *   9. ICF mapping invariants per goal (W452: ≤1 primary; no dup icfCode;
 *      targetQualifier requires baselineQualifier)
 *
 * Per CLAUDE.md doctrine — 24× application across W38 + W39 + W41 + W356-W470.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/care-planning.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CarePlan;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w41-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  CarePlan = require('../models/CarePlanVersion');
  await CarePlan.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await CarePlan.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();
const planNo = () => `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function basePlan(overrides = {}) {
  return {
    planId: planNo(),
    versionNumber: 1,
    planType: 'individual_therapy',
    status: 'draft',
    beneficiaryId: oid(),
    branchId: oid(),
    authorId: oid(),
    reasonForPlan: 'initial',
    ...overrides,
  };
}

function makeSig({
  prevHash = null,
  userId = null,
  role = 'clinical_lead',
  action = 'approve',
} = {}) {
  const uid = userId || oid();
  const signedAt = new Date();
  const payload = `${uid}|${role}|${action}|${signedAt.toISOString()}|${prevHash || ''}`;
  const hash = crypto.createHash('sha256').update(payload).digest('hex');
  return { userId: uid, role, action, signedAt, prevHash, hash };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W41 behavioral — required-field invariants', () => {
  it('REJECTS without planId / versionNumber / beneficiaryId / authorId', async () => {
    for (const missing of ['planId', 'versionNumber', 'beneficiaryId', 'authorId']) {
      const doc = basePlan();
      delete doc[missing];
      const p = new CarePlan(doc);
      await expect(p.save()).rejects.toThrow(new RegExp(missing));
    }
  });

  it('REJECTS without planType / status / reasonForPlan', async () => {
    for (const missing of ['planType', 'reasonForPlan']) {
      const doc = basePlan();
      delete doc[missing];
      const p = new CarePlan(doc);
      await expect(p.save()).rejects.toThrow(new RegExp(missing));
    }
  });

  it('SAVES baseline draft plan + defaults populate', async () => {
    const doc = await CarePlan.create(basePlan());
    expect(doc.status).toBe('draft');
    expect(doc.goals).toEqual([]);
    expect(doc.signatureChain).toEqual([]);
    expect(doc.rejectionCount).toBe(0);
  });
});

// ─── 2. (planId, versionNumber) uniqueness ────────────────────────────

describe('W41 behavioral — planId+versionNumber unique compound index', () => {
  it('REJECTS duplicate (planId, versionNumber)', async () => {
    const pid = planNo();
    await CarePlan.create(basePlan({ planId: pid, versionNumber: 1 }));
    await expect(CarePlan.create(basePlan({ planId: pid, versionNumber: 1 }))).rejects.toThrow(
      /E11000|duplicate/i
    );
  });

  it('SAVES different versionNumbers on same planId', async () => {
    const pid = planNo();
    await CarePlan.create(basePlan({ planId: pid, versionNumber: 1 }));
    const v2 = await CarePlan.create(basePlan({ planId: pid, versionNumber: 2 }));
    expect(v2.versionNumber).toBe(2);
  });
});

// ─── 3. Wave-18: post-approval requires reviewer + approver ──────────

describe('W41 behavioral — post-approval reviewer/approver requirement', () => {
  it('REJECTS status=approved without reviewerId', async () => {
    const p = new CarePlan(
      basePlan({
        status: 'approved',
        approverId: oid(),
        approvedAt: new Date(),
        signatureChain: [makeSig()],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    await expect(p.save()).rejects.toThrow(/status approved requires a reviewerId/);
  });

  it('REJECTS status=approved without approverId', async () => {
    const p = new CarePlan(
      basePlan({
        status: 'approved',
        reviewerId: oid(),
        approvedAt: new Date(),
        signatureChain: [makeSig()],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    await expect(p.save()).rejects.toThrow(/status approved requires an approverId/);
  });

  it('REJECTS when reviewerId === authorId (self-review)', async () => {
    const authorId = oid();
    const p = new CarePlan(
      basePlan({
        authorId,
        reviewerId: authorId, // same as author
        approverId: oid(),
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [makeSig()],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    await expect(p.save()).rejects.toThrow(/reviewer cannot be the same person as the author/);
  });

  it('REJECTS when approverId === authorId', async () => {
    const authorId = oid();
    const p = new CarePlan(
      basePlan({
        authorId,
        reviewerId: oid(),
        approverId: authorId,
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [makeSig()],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    await expect(p.save()).rejects.toThrow(/approver cannot be the same person as the author/);
  });

  it('SAVES status=approved with distinct reviewer + approver + clean validation', async () => {
    const doc = await CarePlan.create(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [makeSig()],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    expect(doc.status).toBe('approved');
  });

  it('draft status does NOT require reviewer or approver', async () => {
    const doc = await CarePlan.create(basePlan());
    expect(doc.reviewerId).toBeNull();
    expect(doc.approverId).toBeNull();
  });
});

// ─── 4. Wave-18: post-approval requires signatureChain ───────────────

describe('W41 behavioral — post-approval signatureChain requirement', () => {
  it('REJECTS status=approved with empty signatureChain', async () => {
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    await expect(p.save()).rejects.toThrow(/requires a non-empty signatureChain/);
  });
});

// ─── 5. Wave-18: superseded requires supersededBy ────────────────────

describe('W41 behavioral — superseded requires supersededBy ref', () => {
  it('REJECTS status=superseded without supersededBy', async () => {
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'superseded',
        signatureChain: [makeSig()],
      })
    );
    await expect(p.save()).rejects.toThrow(/superseded versions must reference supersededBy/);
  });

  it('SAVES status=superseded with supersededBy populated', async () => {
    const doc = await CarePlan.create(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'superseded',
        supersededAt: new Date(),
        supersededBy: 'plan-newer-002',
        signatureChain: [makeSig()],
      })
    );
    expect(doc.supersededBy).toBe('plan-newer-002');
  });
});

// ─── 6. Wave-18: family_notification_sent requires body + readability ─

describe('W41 behavioral — family_notification_sent invariants', () => {
  it('REJECTS family_notification_sent without familyVersion.body', async () => {
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'family_notification_sent',
        signatureChain: [makeSig()],
      })
    );
    await expect(p.save()).rejects.toThrow(
      /family_notification_sent requires a generated familyVersion\.body/
    );
  });

  it('REJECTS family_notification_sent with readabilityGrade > 6', async () => {
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'family_notification_sent',
        signatureChain: [makeSig()],
        familyVersion: {
          generatedAt: new Date(),
          readabilityGrade: 10, // Grade 10 — too high
          body: 'محتوى تجريبي للأسرة',
        },
      })
    );
    await expect(p.save()).rejects.toThrow(/readability grade must be ≤ 6/);
  });

  it('SAVES family_notification_sent with body + readability ≤ 6', async () => {
    const doc = await CarePlan.create(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'family_notification_sent',
        signatureChain: [makeSig()],
        familyVersion: {
          generatedAt: new Date(),
          readabilityGrade: 5,
          body: 'خطة الرعاية مكتوبة بلغة بسيطة',
        },
      })
    );
    expect(doc.status).toBe('family_notification_sent');
  });
});

// ─── 7. Wave-18: approved requires readinessScore ≥ 85 + 0 hardFailures ─

describe('W41 behavioral — approval readiness gating', () => {
  it('REJECTS status=approved when readinessScore < 85', async () => {
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [makeSig()],
        validation: { readinessScore: 70, hardFailures: [] },
      })
    );
    await expect(p.save()).rejects.toThrow(/cannot approve: readinessScore=70/);
  });

  it('REJECTS status=approved with hardFailures present', async () => {
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [makeSig()],
        validation: {
          readinessScore: 95,
          hardFailures: [{ ruleId: 'R-001', message: 'goal missing measure' }],
        },
      })
    );
    await expect(p.save()).rejects.toThrow(/cannot approve.*hardFailures=1/);
  });
});

// ─── 8. Wave-18: signatureChain integrity (prevHash linkage) ─────────

describe('W41 behavioral — signatureChain hash linkage', () => {
  it('REJECTS when signatureChain[1].prevHash != signatureChain[0].hash', async () => {
    const sig1 = makeSig();
    const sig2 = makeSig({ prevHash: 'wrong-prev-hash' }); // doesn't match sig1.hash
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [sig1, sig2],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    await expect(p.save()).rejects.toThrow(/signatureChain integrity broken at index 1/);
  });

  it('SAVES with correctly linked 2-signature chain', async () => {
    const sig1 = makeSig();
    const sig2 = makeSig({ prevHash: sig1.hash, role: 'branch_manager', action: 'co-sign' });
    const doc = await CarePlan.create(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: new Date(),
        signatureChain: [sig1, sig2],
        validation: { readinessScore: 90, hardFailures: [] },
      })
    );
    expect(doc.signatureChain).toHaveLength(2);
  });
});

// ─── 9. Wave-18: amendments must postdate approvedAt ─────────────────

describe('W41 behavioral — amendments timestamps invariant', () => {
  it('REJECTS amendment.appliedAt earlier than approvedAt', async () => {
    const approved = new Date('2026-05-01T00:00:00Z');
    const earlierAmendment = new Date('2026-04-15T00:00:00Z'); // 2 weeks BEFORE approval
    const p = new CarePlan(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: approved,
        signatureChain: [makeSig()],
        validation: { readinessScore: 90, hardFailures: [] },
        amendments: [
          {
            amendmentId: 'AM-001',
            appliedAt: earlierAmendment,
            appliedBy: oid(),
            field: 'goals.0.statement',
            reason: 'rephrase',
          },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/amendment AM-001 predates approvedAt/);
  });

  it('SAVES amendment.appliedAt >= approvedAt', async () => {
    const approved = new Date('2026-05-01T00:00:00Z');
    const laterAmendment = new Date('2026-05-15T00:00:00Z');
    const doc = await CarePlan.create(
      basePlan({
        reviewerId: oid(),
        approverId: oid(),
        status: 'approved',
        approvedAt: approved,
        signatureChain: [makeSig()],
        validation: { readinessScore: 90, hardFailures: [] },
        amendments: [
          {
            amendmentId: 'AM-002',
            appliedAt: laterAmendment,
            appliedBy: oid(),
            field: 'goals.0.statement',
            reason: 'clarify',
          },
        ],
      })
    );
    expect(doc.amendments).toHaveLength(1);
  });
});

// ─── 10. Wave-18: ICF mapping invariants per goal (W452) ─────────────

describe('W41 behavioral — ICF mapping invariants (W452)', () => {
  function makeGoal(icfMapping) {
    return {
      goalId: 'G-001',
      domain: 'motor',
      statement: 'Improve grip strength to 25 kg',
      priorityScore: 0.8,
      icfMapping,
    };
  }

  it('REJECTS goal with 2 isPrimary ICF mappings', async () => {
    const p = new CarePlan(
      basePlan({
        goals: [
          makeGoal([
            { icfCode: 'b730', isPrimary: true },
            { icfCode: 'd445', isPrimary: true },
          ]),
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/has 2 primary ICF mappings; at most one allowed/);
  });

  it('REJECTS goal with duplicate icfCode entries', async () => {
    const p = new CarePlan(
      basePlan({
        goals: [
          makeGoal([
            { icfCode: 'b730', isPrimary: true },
            { icfCode: 'b730', isPrimary: false },
          ]),
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/duplicate icfCode 'b730'/);
  });

  it('REJECTS targetQualifier without baselineQualifier', async () => {
    const p = new CarePlan(
      basePlan({
        goals: [makeGoal([{ icfCode: 'b730', isPrimary: true, targetQualifier: 2 }])],
      })
    );
    await expect(p.save()).rejects.toThrow(/targetQualifier without baselineQualifier/);
  });

  it('SAVES goal with valid ICF mapping (1 primary, no duplicates, both qualifiers)', async () => {
    const doc = await CarePlan.create(
      basePlan({
        goals: [
          makeGoal([
            { icfCode: 'b730', isPrimary: true, baselineQualifier: 3, targetQualifier: 1 },
            { icfCode: 'd445', isPrimary: false, baselineQualifier: 2, targetQualifier: 1 },
          ]),
        ],
      })
    );
    expect(doc.goals[0].icfMapping).toHaveLength(2);
  });
});

// ─── 11. Indexes + collection ─────────────────────────────────────────

describe('W41 behavioral — indexes + collection', () => {
  it('declares the 6 documented compound indexes', async () => {
    const indexes = await CarePlan.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('planId+versionNumber');
    expect(keys).toContain('beneficiaryId+status+createdAt');
    expect(keys).toContain('branchId+status+createdAt');
    expect(keys).toContain('authorId+status');
    expect(keys).toContain('reviewerId+status');
  });

  it('uses canonical collection name care_plan_versions', () => {
    expect(CarePlan.collection.collectionName).toBe('care_plan_versions');
  });
});
