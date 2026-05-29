/**
 * beneficiary-lifecycle-wave39.test.js — Wave 39 (Beneficiary 360 Phase 1).
 *
 * Foundational tests for the lifecycle state machine + transition
 * workflow service. Covers:
 *
 *   1. Registry surface (states / statuses / transitions / helpers)
 *   2. BeneficiaryLifecycleTransition model — cross-field invariants
 *   3. Service workflow — request → approve → execute / cancel / reverse
 *      with chainable Mongoose mocks (no live DB).
 */

'use strict';

// Opt out of global mongoose mock (jest.setup.js:19) — required so
// new Model(...) returns a real constructor. See insight-foundation-wave18.test.js.
jest.unmock('mongoose');

const mongoose = require('mongoose');
const reg = require('../intelligence/beneficiary-lifecycle.registry');
const {
  createBeneficiaryLifecycleService,
  REASON,
} = require('../intelligence/beneficiary-lifecycle.service');

// ─── 1. Registry surface ───────────────────────────────────────────

describe('beneficiary-lifecycle.registry — constants', () => {
  test('exports the 11 lifecycle states', () => {
    // W581: added 'waitlisted' (after draft) + 'deceased' (after discharged).
    expect(reg.STATES).toEqual([
      'draft',
      'waitlisted',
      'active',
      'suspended',
      'transferred-pending',
      'transferred',
      'discharged',
      'deceased',
      'archived',
      'deletion-pending',
      'deleted',
    ]);
  });

  test('exports the 7 workflow statuses', () => {
    expect(reg.STATUSES).toEqual(
      expect.arrayContaining([
        'pending',
        'approved',
        'executed',
        'rejected',
        'cancelled',
        'reversed',
        'failed',
      ])
    );
  });

  test('exports the 15 lifecycle transitions', () => {
    // W581: added waitlist + cancel_waitlist + record_deceased.
    expect(reg.TRANSITIONS.length).toBe(15);
    const ids = reg.TRANSITIONS.map(t => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'waitlist',
        'cancel_waitlist',
        'admit',
        'suspend',
        'reactivate',
        'initiate_transfer',
        'complete_transfer',
        'reverse_transfer',
        'discharge',
        'record_deceased',
        'archive',
        'restore',
        'request_deletion',
        'approve_deletion',
        'cancel_deletion',
      ])
    );
  });

  test('every transition has required shape', () => {
    for (const t of reg.TRANSITIONS) {
      expect(t.id).toBeTruthy();
      expect(t.descriptionAr).toBeTruthy();
      expect(t.descriptionEn).toBeTruthy();
      expect(Array.isArray(t.from)).toBe(true);
      expect(reg.STATES).toContain(t.to);
      expect(Array.isArray(t.requiredApproverRoles)).toBe(true);
      expect([1, 2, 3]).toContain(t.mfaTier);
      expect(typeof t.requiresNafath).toBe('boolean');
      expect(typeof t.requiresReason).toBe('boolean');
      expect(['low', 'medium', 'high', 'critical']).toContain(t.severity);
      expect(Array.isArray(t.sideEffects)).toBe(true);
    }
  });
});

describe('beneficiary-lifecycle.registry — helpers', () => {
  test('findTransition returns the transition by id', () => {
    const t = reg.findTransition('admit');
    expect(t).toBeTruthy();
    expect(t.to).toBe('active');
  });

  test('findTransition returns null for unknown id', () => {
    expect(reg.findTransition('not_a_thing')).toBeNull();
  });

  test('getAllowedTransitionsFrom("active") includes suspend + discharge + initiate_transfer', () => {
    const ids = reg.getAllowedTransitionsFrom('active').map(t => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'suspend',
        'discharge',
        'initiate_transfer',
        'archive',
        'request_deletion',
      ])
    );
  });

  test('getAllowedTransitionsFrom("draft") allows admit + waitlist', () => {
    const ids = reg.getAllowedTransitionsFrom('draft').map(t => t.id);
    expect(ids).toEqual(expect.arrayContaining(['admit', 'waitlist']));
    expect(ids).toHaveLength(2);
  });

  test('getAllowedTransitionsFrom("waitlisted") allows admit + cancel_waitlist', () => {
    const ids = reg.getAllowedTransitionsFrom('waitlisted').map(t => t.id);
    expect(ids).toEqual(expect.arrayContaining(['admit', 'cancel_waitlist']));
    expect(ids).toHaveLength(2);
  });

  test('getAllowedTransitionsFrom("deceased") only allows archive (terminal)', () => {
    const ids = reg.getAllowedTransitionsFrom('deceased').map(t => t.id);
    expect(ids).toEqual(['archive']);
  });

  test('getAllowedTransitionsFrom("deleted") returns nothing', () => {
    expect(reg.getAllowedTransitionsFrom('deleted')).toEqual([]);
  });

  test('validateTransitionRequest blocks wrong fromState', () => {
    const r = reg.validateTransitionRequest({
      fromState: 'archived',
      transitionId: 'suspend',
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('INVALID_FROM_STATE');
  });

  test('validateTransitionRequest accepts valid pair', () => {
    const r = reg.validateTransitionRequest({
      fromState: 'active',
      transitionId: 'suspend',
    });
    expect(r.valid).toBe(true);
    expect(r.transition.id).toBe('suspend');
  });

  test('requiresNafath returns true for HIGH-sensitivity transitions', () => {
    expect(reg.requiresNafath('initiate_transfer')).toBe(true);
    expect(reg.requiresNafath('discharge')).toBe(true);
    expect(reg.requiresNafath('approve_deletion')).toBe(true);
  });

  test('requiresNafath returns false for low-sensitivity', () => {
    expect(reg.requiresNafath('suspend')).toBe(false);
    expect(reg.requiresNafath('reactivate')).toBe(false);
  });

  test('isHighSensitivity captures critical + high', () => {
    expect(reg.isHighSensitivity('initiate_transfer')).toBe(true);
    expect(reg.isHighSensitivity('approve_deletion')).toBe(true);
    expect(reg.isHighSensitivity('admit')).toBe(false);
  });

  test('isValidReasonCode allows from allowlist + blocks outside', () => {
    expect(reg.isValidReasonCode('suspend', 'medical')).toBe(true);
    expect(reg.isValidReasonCode('suspend', 'attacker-code')).toBe(false);
    // Transitions with no allowlist accept anything
    expect(reg.isValidReasonCode('admit', 'whatever')).toBe(true);
  });

  test('getMfaTier returns the right tier per transition', () => {
    expect(reg.getMfaTier('suspend')).toBe(2);
    expect(reg.getMfaTier('initiate_transfer')).toBe(3);
    expect(reg.getMfaTier('approve_deletion')).toBe(3);
  });

  test('approve_deletion requires 3-party approval (dpo + legal + ceo)', () => {
    expect(reg.getRequiredApprovers('approve_deletion')).toEqual(['dpo', 'legal', 'ceo']);
  });
});

// ─── 2. BeneficiaryLifecycleTransition model ───────────────────────

describe('BeneficiaryLifecycleTransition — Mongoose model', () => {
  const Model = require('../models/BeneficiaryLifecycleTransition');

  function baseDoc(overrides = {}) {
    return new Model({
      beneficiaryId: new mongoose.Types.ObjectId(),
      sourceBranchId: new mongoose.Types.ObjectId(),
      transitionId: 'suspend',
      fromState: 'active',
      toState: 'suspended',
      requestedBy: new mongoose.Types.ObjectId(),
      reason: 'family request',
      reasonCode: 'family',
      status: 'pending',
      ...overrides,
    });
  }

  test('valid pending request passes validation', () => {
    expect(baseDoc().validateSync()).toBeUndefined();
  });

  test('unknown transitionId → validation error', () => {
    const doc = baseDoc({ transitionId: 'nope' });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.transitionId).toBeDefined();
  });

  test('fromState not allowed for transition → validation error', () => {
    const doc = baseDoc({ fromState: 'archived' });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.fromState).toBeDefined();
  });

  test('toState mismatch → validation error', () => {
    const doc = baseDoc({ toState: 'discharged' });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.toState).toBeDefined();
  });

  test('reasonCode not in allowlist → validation error', () => {
    const doc = baseDoc({ reasonCode: 'attacker-code' });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.reasonCode).toBeDefined();
  });

  test('executed status without approvers → validation error', () => {
    const doc = baseDoc({
      status: 'executed',
      executedAt: new Date(),
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    // missing branch_manager approver
    expect(err.errors.status).toBeDefined();
  });

  test('executed status with all approvers + executedAt passes', () => {
    const doc = baseDoc({
      status: 'executed',
      executedAt: new Date(),
      approvals: [
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'branch_manager',
          decision: 'approve',
          signedAt: new Date(),
        },
      ],
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('Nafath-required transition executed without nafathSignatureId → validation error', () => {
    const doc = new Model({
      beneficiaryId: new mongoose.Types.ObjectId(),
      sourceBranchId: new mongoose.Types.ObjectId(),
      transitionId: 'discharge',
      fromState: 'active',
      toState: 'discharged',
      requestedBy: new mongoose.Types.ObjectId(),
      reason: 'goals met',
      reasonCode: 'goals-met',
      status: 'executed',
      executedAt: new Date(),
      approvals: [
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'clinical_lead',
          decision: 'approve',
          signedAt: new Date(),
        },
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'family_acknowledgment',
          decision: 'approve',
          signedAt: new Date(),
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.approvals).toBeDefined();
  });

  test('Nafath-required transition with Nafath IDs passes', () => {
    const doc = new Model({
      beneficiaryId: new mongoose.Types.ObjectId(),
      sourceBranchId: new mongoose.Types.ObjectId(),
      transitionId: 'discharge',
      fromState: 'active',
      toState: 'discharged',
      requestedBy: new mongoose.Types.ObjectId(),
      reason: 'goals met',
      reasonCode: 'goals-met',
      status: 'executed',
      executedAt: new Date(),
      approvals: [
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'clinical_lead',
          decision: 'approve',
          signedAt: new Date(),
          nafathSignatureId: 'nafath-cl-1',
        },
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'family_acknowledgment',
          decision: 'approve',
          signedAt: new Date(),
          nafathSignatureId: 'nafath-family-1',
        },
      ],
    });
    expect(doc.validateSync()).toBeUndefined();
  });

  test('self-approval (requestedBy in approvers) → validation error', () => {
    const sharedId = new mongoose.Types.ObjectId();
    const doc = baseDoc({
      requestedBy: sharedId,
      approvals: [
        {
          approverUserId: sharedId,
          approverRole: 'branch_manager',
          decision: 'approve',
          signedAt: new Date(),
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.approvals).toBeDefined();
  });

  test('reversed without executedAt → validation error', () => {
    const doc = baseDoc({
      transitionId: 'discharge',
      fromState: 'active',
      toState: 'discharged',
      reasonCode: 'goals-met',
      status: 'reversed',
      reversedAt: new Date(),
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.executedAt).toBeDefined();
  });

  test('reversed beyond reversal window → validation error', () => {
    const executedAt = new Date('2026-01-01T10:00:00Z');
    const reversedAt = new Date('2026-02-15T10:00:00Z'); // 45d later, discharge window is 14d
    const doc = new Model({
      beneficiaryId: new mongoose.Types.ObjectId(),
      sourceBranchId: new mongoose.Types.ObjectId(),
      transitionId: 'discharge',
      fromState: 'active',
      toState: 'discharged',
      requestedBy: new mongoose.Types.ObjectId(),
      reason: 'goals met',
      reasonCode: 'goals-met',
      status: 'reversed',
      executedAt,
      reversedAt,
      approvals: [
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'clinical_lead',
          decision: 'approve',
          signedAt: executedAt,
          nafathSignatureId: 'sig',
        },
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'family_acknowledgment',
          decision: 'approve',
          signedAt: executedAt,
          nafathSignatureId: 'sig2',
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.reversedAt).toBeDefined();
  });

  test('reversing a non-reversible transition (suspend) → validation error', () => {
    const doc = baseDoc({
      status: 'reversed',
      executedAt: new Date(),
      reversedAt: new Date(),
      approvals: [
        {
          approverUserId: new mongoose.Types.ObjectId(),
          approverRole: 'branch_manager',
          decision: 'approve',
          signedAt: new Date(),
        },
      ],
    });
    const err = doc.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });
});

// ─── 3. Service workflow ───────────────────────────────────────────

describe('beneficiary-lifecycle.service — workflow', () => {
  // Lightweight chainable mock that mimics the small slice of Mongoose
  // the service uses: create / findById / save / updateOne / find.
  function buildMockLog() {
    const store = new Map();
    let counter = 0;
    function genId() {
      counter += 1;
      return `txn-${counter}`;
    }
    return {
      _store: store,
      async create(doc) {
        const id = genId();
        const record = {
          _id: id,
          ...doc,
          approvals: doc.approvals || [],
          metadata: doc.metadata || {},
          sideEffectsAudit: doc.sideEffectsAudit || [],
          save: async function () {
            store.set(id, this);
            return this;
          },
        };
        store.set(id, record);
        return record;
      },
      async findById(id) {
        return store.get(id) || null;
      },
      find(filter) {
        const matches = [...store.values()].filter(r =>
          Object.entries(filter).every(([k, v]) => String(r[k]) === String(v))
        );
        const result = matches.slice();
        return {
          sort: () => ({
            lean: async () => result,
          }),
        };
      },
    };
  }

  function buildMockBeneficiary(state = 'active') {
    return {
      _ops: [],
      // Chainable query — must NOT be async at the head
      findById(id) {
        return {
          select: () => ({
            lean: async () => ({ _id: id, status: state, branchId: 'branch-1' }),
          }),
        };
      },
      async updateOne(filter, update) {
        this._ops.push({ filter, update });
        return { acknowledged: true, modifiedCount: 1 };
      },
    };
  }

  function makeService(opts = {}) {
    return createBeneficiaryLifecycleService({
      transitionLog: buildMockLog(),
      beneficiaryModel: buildMockBeneficiary(opts.currentState || 'active'),
      sideEffectHandlers: opts.sideEffectHandlers || {},
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
      ...opts,
    });
  }

  const actor = { userId: 'user-1', role: 'branch_manager' };
  const otherActor = { userId: 'user-2', role: 'branch_manager' };
  const beneficiaryId = 'b-1';
  const branchId = 'branch-1';

  test('requestTransition creates a pending record', async () => {
    const svc = makeService();
    const r = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reason: 'family request',
      reasonCode: 'family',
    });
    expect(r.ok).toBe(true);
    expect(r.transitionRecord.status).toBe('pending');
    expect(r.transitionRecord.fromState).toBe('active');
    expect(r.transitionRecord.toState).toBe('suspended');
  });

  test('requestTransition rejects unknown transitionId', async () => {
    const svc = makeService();
    const r = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'not_a_thing',
      actor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.TRANSITION_NOT_FOUND);
  });

  test('requestTransition rejects bad fromState', async () => {
    const svc = makeService({ currentState: 'archived' });
    const r = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.INVALID_FROM_STATE);
  });

  test('requestTransition rejects missing reason when required', async () => {
    const svc = makeService();
    const r = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.REASON_REQUIRED);
  });

  test('requestTransition rejects bad reasonCode', async () => {
    const svc = makeService();
    const r = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'attacker-code',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.INVALID_REASON_CODE);
  });

  test('approveTransition rejects self-approval', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    const r = await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor,
      approverRole: 'branch_manager',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.SELF_APPROVAL);
  });

  test('approveTransition: single approver → status=approved', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    const r = await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
    });
    expect(r.ok).toBe(true);
    expect(r.statusChanged).toBe(true);
    expect(r.transitionRecord.status).toBe('approved');
  });

  test('approveTransition: multi-approver transitions stay pending until all sign', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'admit',
      actor: { userId: 'admin-1', role: 'admissions_officer' },
      metadata: { currentState: 'draft' },
    });
    // First approver
    const r1 = await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: { userId: 'user-2', role: 'admissions_officer' },
      approverRole: 'admissions_officer',
    });
    expect(r1.ok).toBe(true);
    expect(r1.transitionRecord.status).toBe('pending');
    // Second approver
    const r2 = await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: { userId: 'user-3', role: 'clinical_lead' },
      approverRole: 'clinical_lead',
    });
    expect(r2.transitionRecord.status).toBe('approved');
  });

  test('approveTransition: rejection short-circuits to rejected', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    const r = await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
      decision: 'reject',
      comment: 'family request not properly documented',
    });
    expect(r.ok).toBe(true);
    expect(r.transitionRecord.status).toBe('rejected');
  });

  test('approveTransition: Nafath-required transition rejects approval without Nafath ID', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'initiate_transfer',
      actor: { userId: 'init-1', role: 'hr_or_admissions' },
      reasonCode: 'family-relocation',
    });
    const r = await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: { userId: 'dpo-1', role: 'dpo' },
      approverRole: 'dpo',
      // no nafathSignatureId
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.NAFATH_REQUIRED);
  });

  test('approveTransition: duplicate approval rejected', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
    });
    const r2 = await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
    });
    expect(r2.ok).toBe(false);
    expect(r2.reason).toBe(REASON.DUPLICATE_APPROVAL);
  });

  test('executeTransition runs side-effects + flips status to executed', async () => {
    const handlerCalls = [];
    const handlers = {
      'pause-schedule': async ctx => {
        handlerCalls.push({ op: 'pause-schedule', beneficiaryId: ctx.beneficiaryId });
        return { paused: true };
      },
      'notify-family-suspension': async ctx => {
        handlerCalls.push({ op: 'notify-family-suspension', beneficiaryId: ctx.beneficiaryId });
      },
    };
    const svc = makeService({ sideEffectHandlers: handlers });
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
    });
    const r = await svc.executeTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
    });
    expect(r.ok).toBe(true);
    expect(r.transitionRecord.status).toBe('executed');
    expect(r.transitionRecord.executedAt).toBeInstanceOf(Date);
    expect(handlerCalls.length).toBeGreaterThanOrEqual(2);
    expect(handlerCalls.map(c => c.op)).toEqual(
      expect.arrayContaining(['pause-schedule', 'notify-family-suspension'])
    );
  });

  test('executeTransition is idempotent — second call returns success without re-running', async () => {
    const handlerCalls = [];
    const handlers = {
      'pause-schedule': async () => {
        handlerCalls.push('pause-schedule');
      },
      'notify-family-suspension': async () => {
        handlerCalls.push('notify-family-suspension');
      },
      'notify-team': async () => {
        handlerCalls.push('notify-team');
      },
    };
    const svc = makeService({ sideEffectHandlers: handlers });
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
    });
    await svc.executeTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
    });
    const callsAfterFirst = handlerCalls.length;
    const r = await svc.executeTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
    });
    expect(r.ok).toBe(true);
    expect(r.idempotent).toBe(true);
    expect(handlerCalls.length).toBe(callsAfterFirst);
  });

  test('executeTransition refuses non-approved record', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    const r = await svc.executeTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.NOT_APPROVED);
  });

  test('cancelTransition marks pending record cancelled', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    const r = await svc.cancelTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor,
      reason: 'changed mind',
    });
    expect(r.ok).toBe(true);
    expect(r.transitionRecord.status).toBe('cancelled');
  });

  test('reverseTransition refuses non-reversible transition', async () => {
    const svc = makeService();
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
    });
    await svc.executeTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
    });
    const r = await svc.reverseTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(REASON.NOT_REVERSIBLE);
  });

  test('anchorLedger.commit invoked for HIGH-sensitivity executed transitions', async () => {
    const anchorLedger = { commit: jest.fn(async () => ({ txId: 'ledger-tx-123' })) };
    const svc = makeService({
      currentState: 'active',
      sideEffectHandlers: {
        'freeze-record': async () => ({}),
        'notify-destination-branch': async () => ({}),
        'open-cross-branch-temp-elevated': async () => ({}),
      },
      anchorLedger,
    });
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'initiate_transfer',
      actor: { userId: 'init-1', role: 'hr_or_admissions' },
      reasonCode: 'family-relocation',
    });
    await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: { userId: 'hr-2', role: 'hr_or_admissions' },
      approverRole: 'hr_or_admissions',
      nafathSignatureId: 'nafath-hr',
    });
    await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: { userId: 'dpo-1', role: 'dpo' },
      approverRole: 'dpo',
      nafathSignatureId: 'nafath-dpo',
    });
    const r = await svc.executeTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: { userId: 'dpo-1', role: 'dpo' },
    });
    expect(r.ok).toBe(true);
    expect(anchorLedger.commit).toHaveBeenCalledTimes(1);
    expect(r.transitionRecord.anchorTxId).toBe('ledger-tx-123');
  });

  test('audit logger receives request/approve/execute events', async () => {
    const audit = { log: jest.fn(async () => {}) };
    const svc = makeService({
      auditLogger: audit,
      sideEffectHandlers: {
        'pause-schedule': async () => ({}),
        'notify-family-suspension': async () => ({}),
        'notify-team': async () => ({}),
      },
    });
    const reqRes = await svc.requestTransition({
      beneficiaryId,
      branchId,
      transitionId: 'suspend',
      actor,
      reasonCode: 'family',
    });
    await svc.approveTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
      approverRole: 'branch_manager',
    });
    await svc.executeTransition({
      transitionRecordId: reqRes.transitionRecord._id,
      actor: otherActor,
    });
    const actions = audit.log.mock.calls.map(c => c[0].action);
    expect(actions).toContain('beneficiary.lifecycle.transition.requested');
    expect(actions).toContain('beneficiary.lifecycle.transition.approved');
    expect(actions).toContain('beneficiary.lifecycle.transition.executed');
  });
});

// ─── 4. Read helpers ───────────────────────────────────────────────

describe('beneficiary-lifecycle.service — getAllowedTransitionsFor', () => {
  function makeService() {
    return createBeneficiaryLifecycleService({
      transitionLog: { find: () => ({ sort: () => ({ lean: async () => [] }) }) },
      logger: { warn: () => {}, info: () => {} },
    });
  }

  test('returns the registry-matched transitions for active state', () => {
    const svc = makeService();
    const allowed = svc.getAllowedTransitionsFor({ currentState: 'active' });
    expect(allowed.map(t => t.id)).toEqual(
      expect.arrayContaining(['suspend', 'discharge', 'initiate_transfer', 'archive'])
    );
  });
});
