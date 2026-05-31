'use strict';

/**
 * W596 — behavioral integration test: prove the W595 actionable reducer
 * (`summarizeSideEffectResults`) is wired as a LIVE consumer of the dispatch
 * loop inside `executeTransition`.
 *
 * W585 proved the real handlers RUN and produce `status:'ok'` audit rows.
 * W595 added the pure reducer. This wave closes the loop: it drives the REAL
 * lifecycle service over an APPROVED `record_deceased` transition (all three
 * real data handlers + deferred handlers fire) and asserts that the service
 * now surfaces a `sideEffectsSummary` on BOTH the returned object AND the
 * persisted audit-event meta — so an operator / dashboard sees an actionable
 * roll-up (real clinical mutations + category buckets) instead of having to
 * re-aggregate the raw audit rows.
 *
 * Models are injected as light mocks (Mongo-free, deterministic) exactly like
 * the W585 harness — the contract under test is the summary wiring, not the
 * Mongoose write.
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

function makeApprovedRecord(transitionId, toState) {
  const t = reg.findTransition(transitionId);
  return {
    _id: `rec-${transitionId}`,
    beneficiaryId: 'ben-596',
    sourceBranchId: 'branch-a',
    destinationBranchId: null,
    transitionId,
    status: reg.TRANSITION_STATUS.APPROVED,
    fromState: t.from[0],
    toState,
    correlationId: 'corr-596',
    metadata: {},
    sideEffectsAudit: null,
    async save() {
      return this;
    },
  };
}

function buildHarness() {
  // Distinct modifiedCounts so the aggregated mutation totals are checkable.
  const appointmentUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 4 });
  const episodeUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
  const beneficiaryUpdateOne = jest.fn().mockResolvedValue({});
  const auditEvents = [];

  const handlers = createBeneficiaryLifecycleSideEffectHandlers({
    appointmentModel: { updateMany: appointmentUpdateMany },
    episodeModel: { updateMany: episodeUpdateMany },
    eventSink: () => {},
    now: () => FIXED_NOW,
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
    auditLogger: {
      log: async entry => {
        auditEvents.push({ action: entry.action, meta: entry.metadata });
      },
    },
    logger: { warn: () => {} },
    now: () => FIXED_NOW,
  });

  return {
    svc,
    auditEvents,
    setRecord(record) {
      stored = record;
    },
  };
}

describe('W596 executeTransition — actionable sideEffectsSummary wiring', () => {
  /** @type {any} */
  let result;
  /** @type {ReturnType<typeof buildHarness>} */
  let h;

  beforeAll(async () => {
    h = buildHarness();
    const record = makeApprovedRecord('record_deceased', reg.LIFECYCLE_STATES.DECEASED);
    h.setRecord(record);
    result = await h.svc.executeTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
    });
  });

  it('returns a sideEffectsSummary alongside the raw audit', () => {
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.sideEffectsAudit)).toBe(true);
    expect(result.sideEffectsSummary).toBeDefined();
    expect(typeof result.sideEffectsSummary).toBe('object');
  });

  it('summary total matches the number of dispatched side-effects', () => {
    const declared = reg.findTransition('record_deceased').sideEffects.length;
    expect(result.sideEffectsSummary.total).toBe(declared);
  });

  it('aggregates the real clinical data mutations from the handler results', () => {
    const dm = result.sideEffectsSummary.dataMutations;
    // record_deceased fires all three real handlers: end-active-schedules
    // (4 cancelled), close-open-episodes (2 closed), release-care-team
    // (2 released via the episode updateMany) — totals roll up.
    expect(dm.cancelledAppointments).toBe(4);
    expect(dm.closedEpisodes).toBe(2);
    expect(dm.releasedFromEpisodes).toBe(2);
    expect(dm.total).toBe(8);
  });

  it('buckets every dispatched op into a known category (none unknown)', () => {
    const c = result.sideEffectsSummary.byCategory;
    const sum =
      c.data + c.notification + c.compliance + c.workflow + c.unknown;
    expect(sum).toBe(result.sideEffectsSummary.total);
    // Registry-complete dispatch leaves nothing uncategorized.
    expect(c.unknown).toBe(0);
    expect(c.data).toBeGreaterThanOrEqual(3);
  });

  it('records exactly 3 real data effects and zero failures', () => {
    expect(result.sideEffectsSummary.real).toBe(3);
    expect(result.sideEffectsSummary.failed).toBe(0);
  });

  it('persists the same summary into the executed audit-event meta', () => {
    const exec = h.auditEvents.find(
      e => e.action === 'beneficiary.lifecycle.transition.executed'
    );
    expect(exec).toBeDefined();
    expect(exec.meta.sideEffectsSummary).toEqual(result.sideEffectsSummary);
    // Legacy inline counters remain for backward compatibility.
    expect(exec.meta.sideEffectsCount).toBe(result.sideEffectsSummary.total);
    expect(exec.meta.sideEffectsFailed).toBe(0);
  });
});

describe('W654 executeTransition — degraded run is surfaced as an operator warning', () => {
  /** @type {any} */
  let result;
  /** @type {jest.Mock} */
  let warn;
  /** @type {string[]} */
  let warnMessages;

  beforeAll(async () => {
    warn = jest.fn();
    // appointmentModel intentionally omitted → end-active-schedules self-skips
    // ('appointment-model-unavailable'), so the run is !clean even though
    // nothing failed — exactly the silent-skip degradation W652/W654 target.
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      episodeModel: { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }) },
      eventSink: () => {},
      now: () => FIXED_NOW,
    });
    let stored = null;
    const transitionLog = {
      async findById(id) {
        return stored && stored._id === id ? stored : null;
      },
    };
    const svc = createBeneficiaryLifecycleService({
      transitionLog,
      beneficiaryModel: { updateOne: jest.fn().mockResolvedValue({}) },
      sideEffectHandlers: handlers,
      auditLogger: { log: async () => {} },
      logger: { warn },
      now: () => FIXED_NOW,
    });
    const record = makeApprovedRecord('record_deceased', reg.LIFECYCLE_STATES.DECEASED);
    stored = record;
    result = await svc.executeTransition({
      transitionRecordId: record._id,
      actor: ACTOR,
    });
    // Snapshot now — jest.config `clearMocks:true` wipes mock.calls before the
    // first `it()` runs, after this beforeAll has executed.
    warnMessages = warn.mock.calls.map(c => c[0]);
  });

  it('marks the run as not clean when a real cleanup was skipped (no failures)', () => {
    expect(result.ok).toBe(true);
    expect(result.sideEffectsSummary.failed).toBe(0);
    expect(result.sideEffectsSummary.health.clean).toBe(false);
  });

  it('emits an operator warning naming the transition and the actionable ratios', () => {
    const degraded = warnMessages.find(m => /degraded side-effects/.test(m));
    expect(degraded).toBeDefined();
    expect(degraded).toContain('record_deceased');
    expect(degraded).toContain('skippedRatio=');
  });
});

