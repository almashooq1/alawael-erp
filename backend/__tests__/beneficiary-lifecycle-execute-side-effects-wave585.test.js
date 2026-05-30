'use strict';

/**
 * W585 — behavioral integration test: prove the wired side-effect handlers
 * actually RUN through `executeTransition` and produce audit rows with
 * `status:'ok'` (NOT 'skipped' reason 'no handler wired').
 *
 * W583 wired the dispatch loop; W584 promoted `release-care-team` to a real
 * data handler. The existing wave583 suite calls the handlers DIRECTLY. This
 * suite closes the remaining gap: it drives the REAL lifecycle service's
 * `executeTransition` over an APPROVED record with the REAL
 * `createBeneficiaryLifecycleSideEffectHandlers(...)` map injected, and asserts
 * the side-effect audit that the service persists onto the transition record.
 *
 * Models are injected as light mocks (updateMany/updateOne spies) so the test
 * is deterministic and Mongo-free — the contract under test is the dispatch +
 * audit wiring, not the Mongoose write itself (that is covered by the wave583
 * behavioral suite).
 */

const {
  createBeneficiaryLifecycleService,
} = require('../intelligence/beneficiary-lifecycle.service');
const {
  createBeneficiaryLifecycleSideEffectHandlers,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');
const reg = require('../intelligence/beneficiary-lifecycle.registry');

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');
const ACTOR = { userId: 'clinician-1', role: 'clinical_lead' };

/** Build a Mongoose-ish APPROVED transition record with a `save()` spy. */
function makeApprovedRecord(transitionId, toState) {
  const t = reg.findTransition(transitionId);
  return {
    _id: `rec-${transitionId}`,
    beneficiaryId: 'ben-585',
    sourceBranchId: 'branch-a',
    destinationBranchId: null,
    transitionId,
    status: reg.TRANSITION_STATUS.APPROVED,
    fromState: t.from[0],
    toState,
    correlationId: 'corr-585',
    metadata: {},
    sideEffectsAudit: null,
    saveCount: 0,
    async save() {
      this.saveCount += 1;
      return this;
    },
  };
}

/**
 * Assemble the real service + real handler map over injectable model spies.
 * @param {object} [opts]
 * @param {boolean} [opts.wireHandlers] inject real handlers (default true)
 */
function buildHarness({ wireHandlers = true } = {}) {
  const appointmentUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });
  const episodeUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
  const beneficiaryUpdateOne = jest.fn().mockResolvedValue({});
  const events = [];

  const handlers = wireHandlers
    ? createBeneficiaryLifecycleSideEffectHandlers({
        appointmentModel: { updateMany: appointmentUpdateMany },
        episodeModel: { updateMany: episodeUpdateMany },
        eventSink: (event, payload) => events.push({ event, payload }),
        now: () => FIXED_NOW,
      })
    : {};

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
    events,
    appointmentUpdateMany,
    episodeUpdateMany,
    beneficiaryUpdateOne,
    setRecord(record) {
      stored = record;
    },
  };
}

/** Index a sideEffectsAudit array by operation name. */
function byOp(audit) {
  return Object.fromEntries(audit.map(row => [row.operation, row]));
}

describe('W585 executeTransition — real side-effect handlers run with status:ok', () => {
  describe('record_deceased (all three real data handlers fire)', () => {
    /** @type {any} */
    let result;
    /** @type {ReturnType<typeof buildHarness>} */
    let h;
    /** @type {any} */
    let record;
    // clearMocks:true wipes spy call-history before each it(); snapshot the
    // counts here in beforeAll (which runs BEFORE clearMocks fires).
    /** @type {{appt:number,epi:number,ben:number}} */
    let counts;

    beforeAll(async () => {
      h = buildHarness();
      record = makeApprovedRecord('record_deceased', reg.LIFECYCLE_STATES.DECEASED);
      h.setRecord(record);
      result = await h.svc.executeTransition({
        transitionRecordId: record._id,
        actor: ACTOR,
      });
      counts = {
        appt: h.appointmentUpdateMany.mock.calls.length,
        epi: h.episodeUpdateMany.mock.calls.length,
        ben: h.beneficiaryUpdateOne.mock.calls.length,
      };
    });

    it('executes successfully and returns the audit array', () => {
      expect(result.ok).toBe(true);
      expect(Array.isArray(result.sideEffectsAudit)).toBe(true);
      // record_deceased declares 6 side-effects in the registry.
      expect(result.sideEffectsAudit).toHaveLength(
        reg.findTransition('record_deceased').sideEffects.length
      );
    });

    it('has NO row skipped with reason "no handler wired"', () => {
      const skipped = result.sideEffectsAudit.filter(
        r => r.status === 'skipped' && r.metadata && r.metadata.reason === 'no handler wired'
      );
      expect(skipped).toEqual([]);
    });

    it('end-active-schedules ran with status ok + cancelledAppointments count', () => {
      const row = byOp(result.sideEffectsAudit)['end-active-schedules'];
      expect(row.status).toBe('ok');
      expect(row.metadata.cancelledAppointments).toBe(3);
      expect(counts.appt).toBe(1);
    });

    it('close-open-episodes ran with status ok + closedEpisodes count', () => {
      const row = byOp(result.sideEffectsAudit)['close-open-episodes'];
      expect(row.status).toBe('ok');
      expect(row.metadata.closedEpisodes).toBe(2);
    });

    it('release-care-team ran with status ok + releasedFromEpisodes count (W584)', () => {
      const row = byOp(result.sideEffectsAudit)['release-care-team'];
      expect(row.status).toBe('ok');
      expect(row.metadata.releasedFromEpisodes).toBe(2);
    });

    it('episodeModel.updateMany invoked twice (close + release)', () => {
      expect(counts.epi).toBe(2);
    });

    it('deferred ops record status ok + metadata.deferred true (no silent skip)', () => {
      const idx = byOp(result.sideEffectsAudit);
      for (const op of [
        'generate-closure-report',
        'notify-family-condolence',
        'notify-regulator-if-required',
      ]) {
        expect(idx[op].status).toBe('ok');
        expect(idx[op].metadata.deferred).toBe(true);
      }
    });

    it('each deferred op emitted an event through the sink', () => {
      // 3 deferred ops above each call emit() once.
      expect(h.events).toHaveLength(3);
      for (const e of h.events) {
        expect(e.event).toBe('beneficiary.lifecycle.side_effect');
      }
    });

    it('persists EXECUTED status + the audit onto the record exactly once', () => {
      expect(record.status).toBe(reg.TRANSITION_STATUS.EXECUTED);
      expect(record.sideEffectsAudit).toBe(result.sideEffectsAudit);
      expect(record.saveCount).toBe(1);
      expect(counts.ben).toBe(1);
    });
  });

  describe('discharge (release-care-team fires without close-open-episodes)', () => {
    it('release-care-team is ok; close-open-episodes is absent from this transition', async () => {
      const h = buildHarness();
      const record = makeApprovedRecord('discharge', reg.LIFECYCLE_STATES.DISCHARGED);
      h.setRecord(record);
      const res = await h.svc.executeTransition({
        transitionRecordId: record._id,
        actor: ACTOR,
      });
      const idx = byOp(res.sideEffectsAudit);
      expect(idx['release-care-team'].status).toBe('ok');
      expect(idx['release-care-team'].metadata.releasedFromEpisodes).toBe(2);
      expect(idx['end-active-schedules'].status).toBe('ok');
      expect(idx['close-open-episodes']).toBeUndefined();
      // discharge: episode write only from release-care-team → exactly once.
      expect(h.episodeUpdateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('negative control — unwired service marks ops skipped (assertion is meaningful)', () => {
    it('with no handlers injected, every op is skipped "no handler wired"', async () => {
      const h = buildHarness({ wireHandlers: false });
      const record = makeApprovedRecord('record_deceased', reg.LIFECYCLE_STATES.DECEASED);
      h.setRecord(record);
      const res = await h.svc.executeTransition({
        transitionRecordId: record._id,
        actor: ACTOR,
      });
      expect(res.ok).toBe(true);
      const allSkipped = res.sideEffectsAudit.every(
        r => r.status === 'skipped' && r.metadata.reason === 'no handler wired'
      );
      expect(allSkipped).toBe(true);
      // No model writes happened because no handler ran.
      expect(h.appointmentUpdateMany).not.toHaveBeenCalled();
      expect(h.episodeUpdateMany).not.toHaveBeenCalled();
    });
  });
});
