'use strict';

/**
 * beneficiary-lifecycle-transition-behavioral-wave39.test.js — behavioral
 * counterpart to the W39 static drift guard (`beneficiary-lifecycle-wave39.test.js`).
 *
 * BeneficiaryLifecycleTransition is the append-only workflow record for the
 * 12-state beneficiary lifecycle. Each transition is a multi-stage workflow
 * (request → approve → execute → optional reverse). 5 Wave-18 invariants on
 * the `__invariants` virtual-path validator that the static guard catches by
 * source-regex but cannot verify by execution:
 *   1. transitionId must be registered + fromState in transition's `from` set
 *   2. requiresReason transitions must have reason or reasonCode in allowlist
 *   3. status='executed' requires ALL required approvers signed + Nafath when required + executedAt set
 *   4. status='reversed' requires executedAt + reversedAt + within reversalWindowDays
 *   5. requestedBy cannot be in approvals (no self-approval)
 *
 * Per CLAUDE.md doctrine — 23× application across W38 + W39 + W356-W470.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/beneficiary-lifecycle.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Transition;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w39-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Transition = require('../models/BeneficiaryLifecycleTransition');
  await Transition.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Transition.deleteMany({});
});

// ─── Fixtures ─────────────────────────────────────────────────────────

const oid = () => new mongoose.Types.ObjectId();

// Baseline = 'admit' transition (DRAFT → ACTIVE, no reason required, no Nafath)
function baseTransition(overrides = {}) {
  return {
    beneficiaryId: oid(),
    sourceBranchId: oid(),
    transitionId: 'admit',
    fromState: 'draft',
    toState: 'active',
    requestedBy: oid(),
    ...overrides,
  };
}

function admissionsApproval(extra = {}) {
  return {
    approverUserId: oid(),
    approverRole: 'admissions_officer',
    decision: 'approve',
    ...extra,
  };
}

function clinicalApproval(extra = {}) {
  return {
    approverUserId: oid(),
    approverRole: 'clinical_lead',
    decision: 'approve',
    ...extra,
  };
}

// ─── 1. Required-field invariants ─────────────────────────────────────

describe('W39 behavioral — required fields', () => {
  it('REJECTS without beneficiaryId', async () => {
    const p = new Transition({ ...baseTransition(), beneficiaryId: undefined });
    await expect(p.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('REJECTS without sourceBranchId', async () => {
    const p = new Transition({ ...baseTransition(), sourceBranchId: undefined });
    await expect(p.save()).rejects.toThrow(/sourceBranchId/);
  });

  it('REJECTS without transitionId / fromState / toState / requestedBy', async () => {
    for (const missing of ['transitionId', 'fromState', 'toState', 'requestedBy']) {
      const doc = baseTransition();
      delete doc[missing];
      const p = new Transition(doc);
      await expect(p.save()).rejects.toThrow(new RegExp(missing));
    }
  });

  it('SAVES baseline pending admit transition + defaults populate', async () => {
    const doc = await Transition.create(baseTransition());
    expect(doc.status).toBe('pending');
    expect(doc.approvals).toEqual([]);
    expect(doc.evidenceLinks).toEqual([]);
    expect(doc.sideEffectsAudit).toEqual([]);
  });
});

// ─── 2. Wave-18: transitionId + state alignment ───────────────────────

describe('W39 behavioral — transitionId + fromState alignment', () => {
  it('REJECTS unknown transitionId', async () => {
    const p = new Transition(baseTransition({ transitionId: 'mystic_transition' }));
    await expect(p.save()).rejects.toThrow(/unknown transition: mystic_transition/);
  });

  it('REJECTS fromState not in transition.from set', async () => {
    // admit is DRAFT → ACTIVE; trying from suspended is invalid
    const p = new Transition(baseTransition({ fromState: 'suspended' }));
    await expect(p.save()).rejects.toThrow(/fromState 'suspended' not allowed for admit/);
  });

  it('REJECTS toState that does not match transition target', async () => {
    const p = new Transition(baseTransition({ toState: 'archived' }));
    await expect(p.save()).rejects.toThrow(/toState 'archived' does not match/);
  });

  it('SAVES suspend transition (ACTIVE → SUSPENDED) with reason', async () => {
    const doc = await Transition.create(
      baseTransition({
        transitionId: 'suspend',
        fromState: 'active',
        toState: 'suspended',
        reason: 'Family request: medical hospitalization',
        reasonCode: 'medical',
      })
    );
    expect(doc.transitionId).toBe('suspend');
  });
});

// ─── 3. Wave-18: requiresReason + reasonCode allowlist ───────────────

describe('W39 behavioral — reason invariants', () => {
  it('REJECTS suspend (requiresReason=true) without reason or reasonCode', async () => {
    const p = new Transition(
      baseTransition({
        transitionId: 'suspend',
        fromState: 'active',
        toState: 'suspended',
      })
    );
    await expect(p.save()).rejects.toThrow(/suspend requires a reason or reasonCode/);
  });

  it('REJECTS reasonCode not in allowlist', async () => {
    const p = new Transition(
      baseTransition({
        transitionId: 'suspend',
        fromState: 'active',
        toState: 'suspended',
        reasonCode: 'vacation', // not in SUSPEND list
      })
    );
    await expect(p.save()).rejects.toThrow(/reasonCode 'vacation' not in allowlist for suspend/);
  });

  it('SAVES suspend with a valid reasonCode from the allowlist', async () => {
    for (const code of ['medical', 'family', 'billing', 'admin']) {
      const doc = await Transition.create(
        baseTransition({
          transitionId: 'suspend',
          fromState: 'active',
          toState: 'suspended',
          reasonCode: code,
        })
      );
      expect(doc.reasonCode).toBe(code);
    }
  });

  it('admit transition does NOT require reason (requiresReason=false)', async () => {
    const doc = await Transition.create(baseTransition());
    expect(doc.reason).toBeNull();
    expect(doc.reasonCode).toBeNull();
  });
});

// ─── 4. Wave-18: status='executed' requires approvers + executedAt ───

describe('W39 behavioral — executed status invariants', () => {
  it('REJECTS status=executed without ANY approvers', async () => {
    const p = new Transition(baseTransition({ status: 'executed', executedAt: new Date() }));
    await expect(p.save()).rejects.toThrow(
      /cannot be executed; missing approvers: admissions_officer, clinical_lead/
    );
  });

  it('REJECTS status=executed missing one required approver role', async () => {
    const p = new Transition(
      baseTransition({
        status: 'executed',
        executedAt: new Date(),
        approvals: [admissionsApproval()], // missing clinical_lead
      })
    );
    await expect(p.save()).rejects.toThrow(/missing approvers: clinical_lead/);
  });

  it('REJECTS status=executed without executedAt timestamp', async () => {
    const p = new Transition(
      baseTransition({
        status: 'executed',
        approvals: [admissionsApproval(), clinicalApproval()],
      })
    );
    await expect(p.save()).rejects.toThrow(/executed records must have executedAt/);
  });

  it('SAVES status=executed with both approvers + executedAt', async () => {
    const doc = await Transition.create(
      baseTransition({
        status: 'executed',
        executedAt: new Date(),
        approvals: [admissionsApproval(), clinicalApproval()],
      })
    );
    expect(doc.status).toBe('executed');
    expect(doc.approvals).toHaveLength(2);
  });

  it('counts only approve decisions (rejects ignored toward quorum)', async () => {
    const p = new Transition(
      baseTransition({
        status: 'executed',
        executedAt: new Date(),
        approvals: [
          admissionsApproval(),
          clinicalApproval({ decision: 'reject', comment: 'clinical concerns' }),
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/missing approvers: clinical_lead/);
  });
});

// ─── 5. Wave-18: status='reversed' invariants ─────────────────────────

describe('W39 behavioral — reversed status invariants', () => {
  it('REJECTS status=reversed without executedAt (never executed)', async () => {
    const p = new Transition(
      baseTransition({
        transitionId: 'discharge',
        fromState: 'active',
        toState: 'discharged',
        reason: 'completed',
        status: 'reversed',
        reversedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/cannot reverse a transition that was never executed/);
  });

  it('REJECTS status=reversed without reversedAt timestamp', async () => {
    const p = new Transition(
      baseTransition({
        transitionId: 'discharge',
        fromState: 'active',
        toState: 'discharged',
        reason: 'completed',
        status: 'reversed',
        executedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      })
    );
    await expect(p.save()).rejects.toThrow(/reversed records must have reversedAt/);
  });

  it('REJECTS reversal beyond reversalWindowDays (discharge = 14d window)', async () => {
    const long_ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const p = new Transition(
      baseTransition({
        transitionId: 'discharge',
        fromState: 'active',
        toState: 'discharged',
        reason: 'completed',
        status: 'reversed',
        executedAt: long_ago,
        reversedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/reversal window of 14d exceeded/);
  });

  it('SAVES status=reversed within reversalWindowDays', async () => {
    const recent = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago (within 14d window)
    const doc = await Transition.create(
      baseTransition({
        transitionId: 'discharge',
        fromState: 'active',
        toState: 'discharged',
        reason: 'completed',
        status: 'reversed',
        executedAt: recent,
        reversedAt: new Date(),
      })
    );
    expect(doc.status).toBe('reversed');
  });

  it('REJECTS reversed status for non-reversible transition (admit)', async () => {
    const p = new Transition(
      baseTransition({
        status: 'reversed',
        executedAt: new Date(Date.now() - 60 * 60 * 1000),
        reversedAt: new Date(),
      })
    );
    await expect(p.save()).rejects.toThrow(/admit is not reversible/);
  });
});

// ─── 6. Wave-18: self-approval guard ──────────────────────────────────

describe('W39 behavioral — self-approval guard', () => {
  it('REJECTS when requestedBy is also in approvals', async () => {
    const requesterId = oid();
    const p = new Transition(
      baseTransition({
        requestedBy: requesterId,
        approvals: [
          {
            approverUserId: requesterId, // same person trying to self-approve
            approverRole: 'admissions_officer',
            decision: 'approve',
          },
        ],
      })
    );
    await expect(p.save()).rejects.toThrow(/requester cannot also approve their own transition/);
  });

  it('SAVES when approvals are by different users than requestedBy', async () => {
    const doc = await Transition.create(
      baseTransition({
        approvals: [admissionsApproval(), clinicalApproval()],
      })
    );
    expect(doc.approvals).toHaveLength(2);
  });
});

// ─── 7. Indexes + collection ──────────────────────────────────────────

describe('W39 behavioral — indexes + collection', () => {
  it('declares the 4 documented compound indexes', async () => {
    const indexes = await Transition.collection.indexes();
    const keys = indexes.map(i => Object.keys(i.key).join('+'));
    expect(keys).toContain('beneficiaryId+requestedAt');
    expect(keys).toContain('sourceBranchId+status+requestedAt');
    expect(keys).toContain('status+requestedAt');
    expect(keys).toContain('transitionId+executedAt');
  });

  it('uses canonical collection name beneficiary_lifecycle_transitions', () => {
    expect(Transition.collection.collectionName).toBe('beneficiary_lifecycle_transitions');
  });
});

// ─── 8. End-to-end happy-path lifecycle ───────────────────────────────

describe('W39 behavioral — full request → approve → execute → reverse lifecycle', () => {
  it('discharge transition: pending → executed → reversed within window', async () => {
    // 1. Request — pending
    const doc = await Transition.create(
      baseTransition({
        transitionId: 'discharge',
        fromState: 'active',
        toState: 'discharged',
        reason: 'Treatment goals achieved; family agrees',
      })
    );
    expect(doc.status).toBe('pending');

    // 2. Execute with required approvers (discharge needs branch_manager + clinical_lead)
    doc.approvals = [
      { approverUserId: oid(), approverRole: 'clinical_lead', decision: 'approve' },
      { approverUserId: oid(), approverRole: 'branch_manager', decision: 'approve' },
    ];
    doc.status = 'executed';
    doc.executedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    await doc.save();
    expect(doc.status).toBe('executed');

    // 3. Reverse within 14d window
    doc.status = 'reversed';
    doc.reversedAt = new Date();
    await doc.save();

    const reloaded = await Transition.findById(doc._id);
    expect(reloaded.status).toBe('reversed');
    expect(reloaded.executedAt).toBeInstanceOf(Date);
    expect(reloaded.reversedAt).toBeInstanceOf(Date);
  });
});
