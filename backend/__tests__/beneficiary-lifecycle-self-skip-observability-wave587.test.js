'use strict';

/**
 * beneficiary-lifecycle-self-skip-observability-wave587.test.js — Wave 587.
 *
 * A real-data side-effect handler (`end-active-schedules`, `close-open-episodes`,
 * `release-care-team`) returns `{ skipped:true, reason:'<x>-model-unavailable' }`
 * when its backing Mongoose model is NOT injected in the running process.
 *
 * Before this wave `executeTransition` recorded that result as a plain
 * `status:'ok'` row, so an operator scanning the audit saw `sideEffectsFailed:0`
 * and assumed every effect ran — while a clinically-critical effect (e.g.
 * cancelling a deceased beneficiary's future appointments) had silently done
 * nothing because of an OPS misconfiguration.
 *
 * Wave 587 makes the self-skip observable WITHOUT changing the transition
 * outcome:
 *   • the audit row gains `selfSkipped:true` (status stays 'ok'),
 *   • a `logger.warn` fires naming the op + reason,
 *   • the executed-audit summary gains a `sideEffectsSelfSkipped` count.
 *
 * These tests prove a partially-wired service (episode model present, others
 * absent) surfaces the gap instead of hiding it, and that a fully-wired
 * service reports zero self-skips.
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
    beneficiaryId: 'ben-587',
    sourceBranchId: 'branch-a',
    destinationBranchId: null,
    transitionId,
    status: reg.TRANSITION_STATUS.APPROVED,
    fromState: t.from[0],
    toState,
    correlationId: 'corr-587',
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
 * @param {object} opts
 *   - wireAppointment  inject a working appointmentModel
 *   - wireEpisode      inject a working episodeModel
 */
function buildService({ wireAppointment, wireEpisode }) {
  const auditCalls = [];
  const warnings = [];
  const stored = makeApprovedRecord('record_deceased', reg.LIFECYCLE_STATES.DECEASED);

  const appointmentModel = wireAppointment
    ? { updateMany: async () => ({ modifiedCount: 1 }) }
    : null;
  const episodeModel = wireEpisode ? { updateMany: async () => ({ modifiedCount: 1 }) } : null;

  // Fully wired notification path so notification ops do not self-skip in these
  // observability tests (which are focused on data-handler self-skips).
  const beneficiaryModel = {
    findById: () => ({
      select: () => ({
        lean: async () => ({
          _id: 'ben-587',
          firstName: 'Test',
          contactInfo: { primaryPhone: '966500000000' },
        }),
      }),
    }),
  };
  const notifier = async () => ({ success: true });

  const handlers = createBeneficiaryLifecycleSideEffectHandlers({
    appointmentModel,
    episodeModel,
    beneficiaryModel,
    notifier,
    now: () => FIXED_NOW,
  });

  const svc = createBeneficiaryLifecycleService({
    transitionLog: { findById: async id => (stored && stored._id === id ? stored : null) },
    beneficiaryModel: { updateOne: async () => ({}) },
    sideEffectHandlers: handlers,
    auditLogger: {
      log: async ({ action, metadata }) => {
        auditCalls.push({ action, meta: metadata });
      },
    },
    logger: { warn: msg => warnings.push(msg), info: () => {} },
    now: () => FIXED_NOW,
  });

  return { svc, stored, auditCalls, warnings };
}

function byOp(audit) {
  return Object.fromEntries(audit.map(row => [row.operation, row]));
}

describe('W587 self-skip observability — partially wired service', () => {
  let result;
  let warnings;
  let auditCalls;

  beforeAll(async () => {
    // Episode model wired (close + release work); appointment model ABSENT, so
    // `end-active-schedules` self-skips.
    const ctx = buildService({ wireAppointment: false, wireEpisode: true });
    warnings = ctx.warnings;
    auditCalls = ctx.auditCalls;
    result = await ctx.svc.executeTransition({
      transitionRecordId: ctx.stored._id,
      actor: ACTOR,
    });
  });

  test('transition still succeeds despite a self-skip', () => {
    expect(result.ok).toBe(true);
  });

  test('end-active-schedules row is status:ok BUT selfSkipped:true', () => {
    const row = byOp(result.sideEffectsAudit)['end-active-schedules'];
    expect(row.status).toBe('ok');
    expect(row.selfSkipped).toBe(true);
    expect(row.metadata).toMatchObject({ skipped: true, reason: 'appointment-model-unavailable' });
  });

  test('the wired effects are NOT flagged self-skipped', () => {
    const close = byOp(result.sideEffectsAudit)['close-open-episodes'];
    const release = byOp(result.sideEffectsAudit)['release-care-team'];
    expect(close.selfSkipped).toBe(false);
    expect(release.selfSkipped).toBe(false);
  });

  test('deferred ops are not flagged self-skipped', () => {
    const deferred = byOp(result.sideEffectsAudit)['notify-family-condolence'];
    expect(deferred.selfSkipped).toBe(false);
  });

  test('a warning is emitted naming the self-skipped op + reason', () => {
    const hit = warnings.find(
      w => w.includes('end-active-schedules') && w.includes('appointment-model-unavailable')
    );
    expect(hit).toBeTruthy();
  });

  test('executed-audit summary carries sideEffectsSelfSkipped:1', () => {
    const exec = auditCalls.find(c => c.action === 'beneficiary.lifecycle.transition.executed');
    expect(exec).toBeTruthy();
    expect(exec.meta.sideEffectsSelfSkipped).toBe(1);
    expect(exec.meta.sideEffectsFailed).toBe(0);
  });
});

describe('W587 fully-wired service reports zero self-skips', () => {
  test('every real handler runs; sideEffectsSelfSkipped is 0', async () => {
    const ctx = buildService({ wireAppointment: true, wireEpisode: true });
    const res = await ctx.svc.executeTransition({
      transitionRecordId: ctx.stored._id,
      actor: ACTOR,
    });
    expect(res.ok).toBe(true);
    const anySelfSkip = res.sideEffectsAudit.some(r => r.selfSkipped);
    expect(anySelfSkip).toBe(false);
    const exec = ctx.auditCalls.find(c => c.action === 'beneficiary.lifecycle.transition.executed');
    expect(exec.meta.sideEffectsSelfSkipped).toBe(0);
  });
});
