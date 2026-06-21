'use strict';

/**
 * beneficiary-lifecycle-reverse-compensation-wave656.test.js — Wave 656.
 *
 * Phase 3 completion: prove that `reverseTransition` does not only flip the
 * beneficiary status back, but also runs compensating side-effects that undo
 * the forward mutations for reversible transitions.
 *
 * Covered:
 *   - discharge / record_deceased run their registry `compensatingOps`.
 *   - Each compensation handler targets ONLY records tagged by the original
 *     transition (transitionId + correlationId).
 *   - Appointments are restored to their original status.
 *   - Episodes are reopened and their closure fields cleared.
 *   - Care-team members are reactivated.
 *   - The transition record carries `compensationEffectsAudit` + summary.
 *   - Non-reversible transitions return `NOT_REVERSIBLE` and run nothing.
 */

const reg = require('../intelligence/beneficiary-lifecycle.registry');
const {
  createBeneficiaryLifecycleService,
  REASON,
} = require('../intelligence/beneficiary-lifecycle.service');
const {
  createBeneficiaryLifecycleSideEffectHandlers,
  OP,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');
const ACTOR = { userId: 'dpo-1', role: 'dpo' };

function makeExecutedRecord(transitionId) {
  const t = reg.findTransition(transitionId);
  return {
    _id: `rec-${transitionId}`,
    beneficiaryId: 'ben-656',
    sourceBranchId: 'branch-a',
    destinationBranchId: null,
    transitionId,
    status: reg.TRANSITION_STATUS.EXECUTED,
    fromState: t.from[0],
    toState: t.to,
    correlationId: 'corr-656',
    metadata: {},
    sideEffectsAudit: [],
    compensationEffectsAudit: null,
    executedAt: FIXED_NOW,
    saveCount: 0,
    async save() {
      this.saveCount += 1;
      return this;
    },
  };
}

function buildHarness({ transferModel = null } = {}) {
  const apptCalls = [];
  const epiCalls = [];
  const beneficiaryUpdateOne = jest.fn().mockResolvedValue({});

  const appointmentModel = {
    updateMany: jest.fn(async (filter, update, options) => {
      apptCalls.push({ filter, update, options });
      return { modifiedCount: 2 };
    }),
  };
  const episodeModel = {
    updateMany: jest.fn(async (filter, update, options) => {
      epiCalls.push({ filter, update, options });
      return { modifiedCount: 1 };
    }),
  };

  const handlers = createBeneficiaryLifecycleSideEffectHandlers({
    appointmentModel,
    episodeModel,
    beneficiaryModel: { updateOne: beneficiaryUpdateOne },
    transferModel,
    now: () => FIXED_NOW,
    logger: { warn: () => {} },
  });

  let stored = null;
  const transitionLog = {
    async findById(id) {
      return stored && stored._id === id ? stored : null;
    },
  };

  const svc = createBeneficiaryLifecycleService({
    transitionLog,
    beneficiaryModel: { updateOne: beneficiaryUpdateOne },
    sideEffectHandlers: handlers,
    logger: { warn: () => {} },
    now: () => FIXED_NOW,
  });

  return {
    svc,
    appointmentModel,
    episodeModel,
    beneficiaryUpdateOne,
    apptCalls,
    epiCalls,
    setRecord(record) {
      stored = record;
    },
  };
}

function byOp(audit) {
  return Object.fromEntries((audit || []).map(row => [row.operation, row]));
}

describe('W656 — reverseTransition runs compensating side-effects', () => {
  it('discharge reversal restores appointments and reactivates care team', async () => {
    const h = buildHarness();
    const record = makeExecutedRecord('discharge');
    h.setRecord(record);

    const res = await h.svc.reverseTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
      reason: 'data-entry correction',
    });

    expect(res.ok).toBe(true);
    expect(record.status).toBe(reg.TRANSITION_STATUS.REVERSED);
    expect(Array.isArray(res.compensationEffectsAudit)).toBe(true);
    expect(res.compensationEffectsAudit).toHaveLength(reg.getCompensatingOps('discharge').length);

    const idx = byOp(res.compensationEffectsAudit);
    expect(idx['restore-cancelled-appointments'].status).toBe('ok');
    expect(idx['restore-cancelled-appointments'].metadata.restoredAppointments).toBe(2);
    expect(idx['reactivate-care-team'].status).toBe('ok');
    expect(idx['reactivate-care-team'].metadata.reactivatedFromEpisodes).toBe(1);

    // Appointment restoration targets only this transition's tag.
    const apptCall = h.apptCalls.find(
      c => c.filter && c.filter['lifecycleCancellationTag.transitionId'] === 'discharge'
    );
    expect(apptCall).toBeDefined();
    expect(apptCall.filter.beneficiary).toBe('ben-656');
    expect(apptCall.filter['lifecycleCancellationTag.correlationId']).toBe('corr-656');
    expect(apptCall.update[0].$set.status).toEqual({
      $ifNull: ['$lifecycleCancellationTag.originalStatus', 'CONFIRMED'],
    });
    expect(apptCall.update[0].$set.lifecycleCancellationTag).toBe(null);

    // Care-team reactivation targets only this transition's tag.
    const epiCall = h.epiCalls.find(
      c => c.filter && c.filter['careTeam.lifecycleReleaseTag.transitionId'] === 'discharge'
    );
    expect(epiCall).toBeDefined();
    expect(epiCall.filter.beneficiaryId).toBe('ben-656');
    expect(epiCall.update.$set['careTeam.$[m].isActive']).toBe(true);
    expect(epiCall.update.$set['careTeam.$[m].removedAt']).toBe(null);

    expect(res.compensationEffectsSummary.health.ok).toBe(true);
    expect(res.compensationEffectsSummary.dataMutations.total).toBe(3);
    expect(record.compensationEffectsAudit).toBe(res.compensationEffectsAudit);
  });

  it('record_deceased reversal restores appointments, reopens episodes, and reactivates care team', async () => {
    const h = buildHarness();
    const record = makeExecutedRecord('record_deceased');
    h.setRecord(record);

    const res = await h.svc.reverseTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
      reason: 'data-entry correction',
    });

    expect(res.ok).toBe(true);
    expect(res.compensationEffectsAudit).toHaveLength(
      reg.getCompensatingOps('record_deceased').length
    );

    const idx = byOp(res.compensationEffectsAudit);
    expect(idx['restore-cancelled-appointments'].status).toBe('ok');
    expect(idx['reopen-closed-episodes'].status).toBe('ok');
    expect(idx['reactivate-care-team'].status).toBe('ok');

    const epiCall = h.epiCalls.find(
      c => c.filter && c.filter['lifecycleClosureTag.transitionId'] === 'record_deceased'
    );
    expect(epiCall).toBeDefined();
    expect(epiCall.update[0].$set.status).toEqual({
      $ifNull: ['$lifecycleClosureTag.originalStatus', 'active'],
    });
    expect(epiCall.update[0].$set.actualEndDate).toBe(null);
    expect(epiCall.update[0].$set.dischargeReason).toBe(null);

    expect(res.compensationEffectsSummary.dataMutations.total).toBe(4); // 2 appt + 1 episode + 1 team
  });

  it('initiate_transfer reversal runs its compensating ops', async () => {
    const h = buildHarness();
    const record = makeExecutedRecord('initiate_transfer');
    h.setRecord(record);

    const res = await h.svc.reverseTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
      reason: 'family changed mind',
    });

    expect(res.ok).toBe(true);
    expect(res.compensationEffectsAudit).toHaveLength(
      reg.getCompensatingOps('initiate_transfer').length
    );
    const idx = byOp(res.compensationEffectsAudit);
    expect(idx['unfreeze-record'].status).toBe('ok');
    expect(idx['close-cross-branch-temp-elevated'].status).toBe('ok');
  });

  it('non-reversible transitions return NOT_REVERSIBLE and run no compensation', async () => {
    const h = buildHarness();
    const record = makeExecutedRecord('admit');
    h.setRecord(record);

    const res = await h.svc.reverseTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toBe(REASON.NOT_REVERSIBLE);
    expect(h.apptCalls).toHaveLength(0);
    expect(h.epiCalls).toHaveLength(0);
  });

  it('complete_transfer reversal rolls back the destination branch and file number', async () => {
    const record = makeExecutedRecord('complete_transfer');
    record.destinationBranchId = 'branch-b';

    const transferDoc = {
      _id: 'tr-656',
      beneficiary: 'ben-656',
      fromBranch: 'branch-a',
      toBranch: 'branch-b',
      status: 'completed',
      completedAt: FIXED_NOW,
      transferNotes: {
        rollbackSnapshot: {
          originalBranchId: 'branch-a',
          originalFileNumber: 'FN-OLD-001',
          originalStatus: 'active',
        },
      },
      saveCount: 0,
      async save() {
        this.saveCount += 1;
        return this;
      },
    };

    const transferModel = {
      findOne: jest.fn(() => ({
        sort: jest.fn(() => transferDoc),
      })),
    };

    const h = buildHarness({ transferModel });
    h.setRecord(record);

    const res = await h.svc.reverseTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
      reason: 'transfer data error',
    });

    expect(res.ok).toBe(true);
    expect(res.compensationEffectsAudit).toHaveLength(
      reg.getCompensatingOps('complete_transfer').length
    );
    const idx = byOp(res.compensationEffectsAudit);
    expect(idx['rollback-transfer-destination'].status).toBe('ok');
    expect(idx['rollback-transfer-destination'].metadata.deferred).toBeUndefined();
    expect(idx['rollback-transfer-destination'].metadata.rolledBackTransfers).toBe(1);

    // The rollback handler restores branch, file number, and status, so the
    // generic status flip must be skipped.
    expect(transferModel.findOne).toHaveBeenCalledWith({
      beneficiary: 'ben-656',
      toBranch: 'branch-b',
      status: 'completed',
    });
    // The rollback handler itself mutates the beneficiary; the generic status
    // flip in reverseTransition must be skipped for transfers.
    expect(h.beneficiaryUpdateOne).toHaveBeenCalledTimes(1);
    expect(h.beneficiaryUpdateOne).toHaveBeenCalledWith(
      { _id: 'ben-656' },
      {
        $set: {
          branchId: 'branch-a',
          status: 'active',
          fileNumber: 'FN-OLD-001',
          lastLifecycleAt: FIXED_NOW,
        },
      }
    );
    expect(transferDoc.status).toBe('reversed');
    expect(transferDoc.transferNotes.rollbackSnapshot.rolledBackAt).toEqual(FIXED_NOW);
  });

  it('reversal outside the window returns REVERSAL_WINDOW_EXPIRED', async () => {
    const h = buildHarness();
    const record = makeExecutedRecord('discharge');
    record.executedAt = new Date('2026-01-01T00:00:00.000Z');
    h.setRecord(record);

    const res = await h.svc.reverseTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
    });

    expect(res.ok).toBe(false);
    expect(res.reason).toBe(REASON.REVERSAL_WINDOW_EXPIRED);
  });
});
