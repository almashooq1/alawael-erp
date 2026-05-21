'use strict';

/**
 * branch-reassessment-policy-wave230.test.js — Wave 230.
 *
 * Verifies the per-branch policy overrides for W222 + W225:
 *
 *   getPolicy:
 *     - No doc → returns DEFAULT_POLICY
 *     - Active doc → merges defaults + overrides
 *     - Inactive doc → returns DEFAULT_POLICY
 *     - Doc outside effectiveFrom/Until window → returns DEFAULT_POLICY
 *     - DB error → returns DEFAULT_POLICY (graceful)
 *
 *   upsertPolicy:
 *     - First call creates; second call updates same doc
 *     - createdBy stamped only on create; lastModifiedBy on every save
 *     - Requires actor.userId
 *     - Requires branchId
 *
 *   Tightening-only invariant:
 *     - escalateAfterDays > default rejected
 *     - breachAfterDays > default rejected
 *     - overdueDays > default rejected
 *     - dueSoonDays < default rejected (wider lookahead is "stricter")
 *     - Equal-to-default values accepted
 *     - Tighter-than-default values accepted
 *     - Negative values rejected
 *
 *   getRecipientHints:
 *     - Returns supervisorByBranchId + qaByBranchId Maps
 *     - Only includes active policies
 *     - Skips branches without supervisor/qa set
 *
 *   deactivate:
 *     - Soft-disable; getPolicy returns defaults after
 *
 *   Model invariants:
 *     - effectiveUntil before effectiveFrom rejected
 *     - branchId unique
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongod;
let BranchReassessmentPolicy;
let policySvc;
let lifecycle;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w230-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  ({ BranchReassessmentPolicy } = require('../domains/goals/models/BranchReassessmentPolicy'));
  policySvc = require('../services/branchReassessmentPolicy.service');
  lifecycle = require('../services/reassessmentLifecycle.service');
  await BranchReassessmentPolicy.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await BranchReassessmentPolicy.deleteMany({});
});

// ════════════════════════════════════════════════════════════════════════
// 1. getPolicy
// ════════════════════════════════════════════════════════════════════════

describe('W230 — getPolicy', () => {
  test('no doc → returns DEFAULT_POLICY', async () => {
    const result = await policySvc.getPolicy(new mongoose.Types.ObjectId());
    expect(result).toEqual(lifecycle.DEFAULT_POLICY);
  });

  test('no branchId → returns DEFAULT_POLICY', async () => {
    const result = await policySvc.getPolicy(null);
    expect(result).toEqual(lifecycle.DEFAULT_POLICY);
  });

  test('active doc merges defaults + overrides', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: 5, breachAfterDays: 10 },
      actor: { userId: actor },
    });
    const merged = await policySvc.getPolicy(branchId);
    expect(merged.escalateAfterDays).toBe(5); // override
    expect(merged.breachAfterDays).toBe(10); // override
    expect(merged.dueSoonDays).toBe(lifecycle.DEFAULT_POLICY.dueSoonDays); // default
  });

  test('inactive doc → DEFAULT_POLICY', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: 3, breachAfterDays: 7 },
      actor: { userId: actor },
    });
    await policySvc.deactivate({ branchId, actor: { userId: actor } });
    const result = await policySvc.getPolicy(branchId);
    expect(result).toEqual(lifecycle.DEFAULT_POLICY);
  });

  test('doc before effectiveFrom → DEFAULT_POLICY', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    const future = new Date(Date.now() + 30 * 86400000);
    await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: 5 },
      effectiveFrom: future,
      actor: { userId: actor },
    });
    const result = await policySvc.getPolicy(branchId);
    expect(result).toEqual(lifecycle.DEFAULT_POLICY);
  });

  test('doc past effectiveUntil → DEFAULT_POLICY', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    const past = new Date(Date.now() - 30 * 86400000);
    await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: 5 },
      effectiveFrom: new Date(Date.now() - 60 * 86400000),
      effectiveUntil: past,
      actor: { userId: actor },
    });
    const result = await policySvc.getPolicy(branchId);
    expect(result).toEqual(lifecycle.DEFAULT_POLICY);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 2. upsertPolicy
// ════════════════════════════════════════════════════════════════════════

describe('W230 — upsertPolicy', () => {
  test('first call creates, second updates same doc', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const actor1 = new mongoose.Types.ObjectId();
    const actor2 = new mongoose.Types.ObjectId();
    const a = await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: 5 },
      actor: { userId: actor1 },
    });
    const b = await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: 3 },
      actor: { userId: actor2 },
    });
    expect(String(a._id)).toBe(String(b._id));
    expect(String(b.createdBy)).toBe(String(actor1)); // unchanged
    expect(String(b.lastModifiedBy)).toBe(String(actor2));
    expect(b.policy.escalateAfterDays).toBe(3);
    // Only one doc per branchId.
    const all = await BranchReassessmentPolicy.find({ branchId });
    expect(all.length).toBe(1);
  });

  test('requires actor.userId', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await expect(
      policySvc.upsertPolicy({ branchId, policy: { escalateAfterDays: 5 } })
    ).rejects.toThrow(/actor\.userId required/);
  });

  test('requires branchId', async () => {
    await expect(
      policySvc.upsertPolicy({
        policy: { escalateAfterDays: 5 },
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/branchId required/);
  });

  test('upsert respects supervisorUserId + qaReviewerId fields', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const supervisor = new mongoose.Types.ObjectId();
    const qa = new mongoose.Types.ObjectId();
    const doc = await policySvc.upsertPolicy({
      branchId,
      supervisorUserId: supervisor,
      qaReviewerId: qa,
      actor: { userId: new mongoose.Types.ObjectId() },
    });
    expect(String(doc.supervisorUserId)).toBe(String(supervisor));
    expect(String(doc.qaReviewerId)).toBe(String(qa));
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. Tightening invariant
// ════════════════════════════════════════════════════════════════════════

describe('W230 — tightening-only invariant', () => {
  test('escalateAfterDays > default rejected', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await expect(
      policySvc.upsertPolicy({
        branchId,
        policy: { escalateAfterDays: 14 }, // default is 7
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/escalateAfterDays.*cannot exceed/);
  });

  test('breachAfterDays > default rejected', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await expect(
      policySvc.upsertPolicy({
        branchId,
        policy: { breachAfterDays: 21 }, // default is 14
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/breachAfterDays.*cannot exceed/);
  });

  test('overdueDays > default rejected', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await expect(
      policySvc.upsertPolicy({
        branchId,
        policy: { overdueDays: 3 }, // default is 1
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/overdueDays.*cannot exceed/);
  });

  test('dueSoonDays < default rejected (wider lookahead is "stricter")', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await expect(
      policySvc.upsertPolicy({
        branchId,
        policy: { dueSoonDays: 3 }, // default is 7
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/dueSoonDays.*cannot be less than/);
  });

  test('equal-to-default values accepted', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const doc = await policySvc.upsertPolicy({
      branchId,
      policy: { ...lifecycle.DEFAULT_POLICY },
      actor: { userId: new mongoose.Types.ObjectId() },
    });
    expect(doc.policy.escalateAfterDays).toBe(lifecycle.DEFAULT_POLICY.escalateAfterDays);
  });

  test('tighter-than-default values accepted', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const doc = await policySvc.upsertPolicy({
      branchId,
      policy: {
        escalateAfterDays: 3, // tighter (default 7)
        breachAfterDays: 7, // tighter (default 14)
        overdueDays: 0, // tighter (default 1)
        dueSoonDays: 14, // wider lookahead = stricter
        dueNowDays: 2, // wider on-day window = stricter
      },
      actor: { userId: new mongoose.Types.ObjectId() },
    });
    expect(doc.policy.escalateAfterDays).toBe(3);
    expect(doc.policy.overdueDays).toBe(0);
  });

  test('negative value rejected', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await expect(
      policySvc.upsertPolicy({
        branchId,
        policy: { escalateAfterDays: -1 },
        actor: { userId: new mongoose.Types.ObjectId() },
      })
    ).rejects.toThrow(/non-negative/);
  });

  test('null override values skip the check (use default)', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const doc = await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: null }, // skip
      actor: { userId: new mongoose.Types.ObjectId() },
    });
    const merged = await policySvc.getPolicy(branchId);
    expect(merged.escalateAfterDays).toBe(lifecycle.DEFAULT_POLICY.escalateAfterDays);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 4. getRecipientHints
// ════════════════════════════════════════════════════════════════════════

describe('W230 — getRecipientHints', () => {
  test('returns Maps in shape W225 expects', async () => {
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const supA = new mongoose.Types.ObjectId();
    const qaA = new mongoose.Types.ObjectId();
    const supB = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    await policySvc.upsertPolicy({
      branchId: branchA,
      supervisorUserId: supA,
      qaReviewerId: qaA,
      actor: { userId: actor },
    });
    await policySvc.upsertPolicy({
      branchId: branchB,
      supervisorUserId: supB,
      // no QA
      actor: { userId: actor },
    });
    const hints = await policySvc.getRecipientHints({ branchIds: [branchA, branchB] });
    expect(hints.supervisorByBranchId.get(String(branchA))).toEqual(supA);
    expect(hints.qaByBranchId.get(String(branchA))).toEqual(qaA);
    expect(hints.supervisorByBranchId.get(String(branchB))).toEqual(supB);
    expect(hints.qaByBranchId.has(String(branchB))).toBe(false); // unset
  });

  test('inactive policy excluded', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const supervisor = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    await policySvc.upsertPolicy({
      branchId,
      supervisorUserId: supervisor,
      actor: { userId: actor },
    });
    await policySvc.deactivate({ branchId, actor: { userId: actor } });
    const hints = await policySvc.getRecipientHints({ branchIds: [branchId] });
    expect(hints.supervisorByBranchId.size).toBe(0);
  });

  test('empty branchIds returns empty Maps', async () => {
    const hints = await policySvc.getRecipientHints({});
    expect(hints.supervisorByBranchId.size).toBe(0);
    expect(hints.qaByBranchId.size).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// 5. deactivate
// ════════════════════════════════════════════════════════════════════════

describe('W230 — deactivate', () => {
  test('soft-disables; getPolicy returns defaults after', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const actor = new mongoose.Types.ObjectId();
    await policySvc.upsertPolicy({
      branchId,
      policy: { escalateAfterDays: 3 },
      actor: { userId: actor },
    });
    await policySvc.deactivate({ branchId, actor: { userId: actor } });
    const result = await policySvc.getPolicy(branchId);
    expect(result).toEqual(lifecycle.DEFAULT_POLICY);
    const doc = await BranchReassessmentPolicy.findOne({ branchId });
    expect(doc.isActive).toBe(false);
    expect(String(doc.lastModifiedBy)).toBe(String(actor));
  });

  test('no doc to deactivate → returns null silently', async () => {
    const result = await policySvc.deactivate({
      branchId: new mongoose.Types.ObjectId(),
      actor: { userId: new mongoose.Types.ObjectId() },
    });
    expect(result).toBeNull();
  });

  test('requires actor.userId', async () => {
    await expect(policySvc.deactivate({ branchId: new mongoose.Types.ObjectId() })).rejects.toThrow(
      /actor\.userId required/
    );
  });
});

// ════════════════════════════════════════════════════════════════════════
// 6. Model invariants
// ════════════════════════════════════════════════════════════════════════

describe('W230 — model invariants', () => {
  test('effectiveUntil before effectiveFrom rejected', async () => {
    await expect(
      BranchReassessmentPolicy.create({
        branchId: new mongoose.Types.ObjectId(),
        effectiveFrom: new Date('2026-06-01'),
        effectiveUntil: new Date('2026-05-01'),
      })
    ).rejects.toThrow(/effectiveUntil must be after effectiveFrom/);
  });

  test('branchId unique', async () => {
    const branchId = new mongoose.Types.ObjectId();
    await BranchReassessmentPolicy.create({ branchId });
    await expect(BranchReassessmentPolicy.create({ branchId })).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════
// 7. Integration with W222 lifecycle.tick({policy})
// ════════════════════════════════════════════════════════════════════════

describe('W230 — integration with W222', () => {
  test('getPolicy result drops cleanly into lifecycle.computePhase', () => {
    // The shape returned by getPolicy must match what computePhase
    // accepts as its policy arg. Pure synchronous check.
    const branchPolicy = {
      escalateAfterDays: 3,
      breachAfterDays: 5,
    };
    const dueAt = new Date('2026-05-21T12:00:00Z');
    // T+4d with tighter policy (escalateAfter=3) → ESCALATED
    const computed = lifecycle.computePhase({
      dueAt,
      now: new Date(dueAt.getTime() + 4 * 86400000),
      policy: branchPolicy,
    });
    expect(computed).toBe('ESCALATED');
    // Without override → default escalateAfter=7 → still OVERDUE at T+4d
    const computedDefault = lifecycle.computePhase({
      dueAt,
      now: new Date(dueAt.getTime() + 4 * 86400000),
    });
    expect(computedDefault).toBe('OVERDUE');
  });
});
