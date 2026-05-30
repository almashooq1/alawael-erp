'use strict';

/**
 * beneficiary-lifecycle-side-effects.service.js — Wave 583.
 *
 * The Wave-39/40 beneficiary lifecycle service (`beneficiary-lifecycle.service.js`)
 * dispatches the side-effects declared on each transition generically: it
 * iterates `transition.sideEffects` and calls `sideEffectHandlers[op]`. Any op
 * WITHOUT a wired handler produces an audit row of `status: 'skipped',
 * metadata: { reason: 'no handler wired' }`.
 *
 * Until this wave the production bootstrap (`startup/beneficiaryLifecycleBootstrap.js`)
 * injected `sideEffectHandlers: {}` — so EVERY declared side-effect (≈40 ops
 * across 15 transitions, including the clinically-critical `record_deceased`
 * effects added in Wave 581) was a silent no-op.
 *
 * This factory closes that gap. It guarantees **registry-complete coverage**:
 * the handler map is derived from `reg.TRANSITIONS`, so every op declared in the
 * registry gets at least a categorized handler — nothing falls through to the
 * 'no handler wired' branch.
 *
 * Two effects mutate real records (verified against live model shapes):
 *
 *   end-active-schedules → cancel the beneficiary's FUTURE appointments
 *                          (Appointment.status PENDING/CONFIRMED/CHECKED_IN/
 *                           RESCHEDULED with date ≥ now → CANCELLED). Fires on
 *                          `discharge` and `record_deceased`. Idempotent: a
 *                          re-run finds nothing to cancel.
 *   close-open-episodes  → close the beneficiary's OPEN episodes of care
 *                          (EpisodeOfCare.status planned/active/on_hold/
 *                           suspended → completed, actualEndDate = now). Fires on
 *                          `record_deceased`. Idempotent.
 *   release-care-team    → deactivate the active care-team members embedded in
 *                          the beneficiary's episodes (EpisodeOfCare.careTeam[]
 *                          isActive true → false, removedAt = now). Fires on
 *                          `discharge` and `record_deceased`. Idempotent.
 *
 * NOTE on ordering: `close-open-episodes` and `release-care-team` both touch
 * EpisodeOfCare. They target DISJOINT fields (`status`/`actualEndDate` vs the
 * embedded `careTeam[]` flags), use independent `updateMany` filters, and are
 * each individually idempotent, so dispatch order does not matter.
 *
 * Every other op is routed through a categorized **deferred** handler: it
 * records a structured `{ name, category, deferred: true }` result (so the
 * side-effects audit shows intent instead of a silent skip) and, when an
 * `eventSink` is injected, emits a `beneficiary.lifecycle.side_effect` event so
 * the existing notification / compliance / workflow infrastructure can pick it
 * up. This keeps the data layer honest and the wiring incremental — real
 * handlers for the deferred ops can be promoted one at a time without touching
 * the service or the registry.
 *
 * Everything is dependency-injected; the factory imports no production wiring
 * directly. Handlers NEVER bubble — the transition has already committed when
 * side-effects fire, so the service catches throws and records `status:'failed'`.
 */

const reg = require('./beneficiary-lifecycle.registry');

/** Canonical op-name constants for the real data handlers. */
const OP = Object.freeze({
  END_ACTIVE_SCHEDULES: 'end-active-schedules',
  CLOSE_OPEN_EPISODES: 'close-open-episodes',
  RELEASE_CARE_TEAM: 'release-care-team',
});

/** Appointment statuses that represent a still-actionable future booking. */
const CANCELLABLE_APPOINTMENT_STATUSES = Object.freeze([
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'RESCHEDULED',
]);

/** EpisodeOfCare statuses that represent an open (not-yet-closed) episode. */
const OPEN_EPISODE_STATUSES = Object.freeze(['planned', 'active', 'on_hold', 'suspended']);

/**
 * Classify a side-effect op into the downstream subsystem that should
 * eventually own it. Used only to tag the deferred event so consumers can
 * route it. Heuristic + explicit overrides; the two real data handlers are
 * registered separately and never reach this function.
 *
 * @param {string} op
 * @returns {'notification'|'compliance'|'workflow'}
 */
function classifyOp(op) {
  if (
    op.startsWith('notify-') ||
    op.includes('condolence') ||
    op.includes('family-receipt') ||
    op.includes('family-welcome')
  ) {
    return 'notification';
  }
  if (
    op.includes('anchor') ||
    op.includes('tombstone') ||
    op.includes('retention') ||
    op.includes('dpo') ||
    op.includes('nphies') ||
    op.includes('zatca') ||
    op.includes('soft-delete') ||
    op.includes('impact-analysis') ||
    op.includes('closure-report') ||
    op.includes('certificate') ||
    op.includes('regulator')
  ) {
    return 'compliance';
  }
  return 'workflow';
}

/**
 * Collect every distinct side-effect op declared across the registry.
 * Derived at construction so coverage can never drift from the registry.
 *
 * @returns {string[]}
 */
function allRegistryOps() {
  const set = new Set();
  for (const t of reg.TRANSITIONS) {
    for (const op of t.sideEffects || []) set.add(op);
  }
  return [...set];
}

/**
 * Normalize a Mongoose write result across driver versions.
 * @param {any} res
 * @returns {number}
 */
function modifiedCount(res) {
  if (!res) return 0;
  if (typeof res.modifiedCount === 'number') return res.modifiedCount;
  if (typeof res.nModified === 'number') return res.nModified;
  return 0;
}

/**
 * @param {object} deps
 *   - appointmentModel  Mongoose model (Appointment) — optional
 *   - episodeModel      Mongoose model (EpisodeOfCare) — optional
 *   - eventSink         { emit(event, payload) } OR (event, payload) => void — optional
 *   - now               () => Date
 *   - logger            console-compatible
 * @returns {Record<string, Function>} op-name → async handler map (registry-complete)
 */
function createBeneficiaryLifecycleSideEffectHandlers({
  appointmentModel = null,
  episodeModel = null,
  eventSink = null,
  now = () => new Date(),
  logger = console,
} = {}) {
  function emit(payload) {
    if (!eventSink) return false;
    try {
      if (typeof eventSink === 'function') {
        eventSink('beneficiary.lifecycle.side_effect', payload);
      } else if (typeof eventSink.emit === 'function') {
        eventSink.emit('beneficiary.lifecycle.side_effect', payload);
      } else {
        return false;
      }
      return true;
    } catch (err) {
      logger.warn && logger.warn(`[lifecycle.side_effect] emit failed: ${err.message}`);
      return false;
    }
  }

  // ── Real data handler: cancel future appointments ──────────────────────
  async function endActiveSchedules(ctx) {
    if (!appointmentModel || typeof appointmentModel.updateMany !== 'function') {
      return {
        name: OP.END_ACTIVE_SCHEDULES,
        category: 'data',
        skipped: true,
        reason: 'appointment-model-unavailable',
      };
    }
    const res = await appointmentModel.updateMany(
      {
        beneficiary: ctx.beneficiaryId,
        status: { $in: CANCELLABLE_APPOINTMENT_STATUSES },
        date: { $gte: now() },
      },
      { $set: { status: 'CANCELLED' } }
    );
    return {
      name: OP.END_ACTIVE_SCHEDULES,
      category: 'data',
      cancelledAppointments: modifiedCount(res),
    };
  }

  // ── Real data handler: close open episodes of care ─────────────────────
  async function closeOpenEpisodes(ctx) {
    if (!episodeModel || typeof episodeModel.updateMany !== 'function') {
      return {
        name: OP.CLOSE_OPEN_EPISODES,
        category: 'data',
        skipped: true,
        reason: 'episode-model-unavailable',
      };
    }
    // `dischargeReason` is enum-constrained and has no 'deceased' member; map to
    // the closest valid value (updateMany bypasses validators, so we must not
    // write an out-of-enum string). The true reason lives in the lifecycle
    // transition audit + the beneficiary's `deceased` status.
    const dischargeReason =
      ctx.toState === reg.LIFECYCLE_STATES.DECEASED ? 'medical_reason' : 'other';
    const res = await episodeModel.updateMany(
      {
        beneficiaryId: ctx.beneficiaryId,
        status: { $in: OPEN_EPISODE_STATUSES },
      },
      { $set: { status: 'completed', actualEndDate: now(), dischargeReason } }
    );
    return {
      name: OP.CLOSE_OPEN_EPISODES,
      category: 'data',
      closedEpisodes: modifiedCount(res),
    };
  }

  // ── Real data handler: release (deactivate) care-team members ──────────
  async function releaseCareTeam(ctx) {
    if (!episodeModel || typeof episodeModel.updateMany !== 'function') {
      return {
        name: OP.RELEASE_CARE_TEAM,
        category: 'data',
        skipped: true,
        reason: 'episode-model-unavailable',
      };
    }
    // Care team is an embedded `careTeam[]` subdocument on EpisodeOfCare (there
    // is no standalone CareTeam model). Releasing = flipping every still-active
    // member to isActive:false + stamping removedAt, via a positional
    // arrayFilter so only the active members are touched.
    const res = await episodeModel.updateMany(
      { beneficiaryId: ctx.beneficiaryId, 'careTeam.isActive': true },
      { $set: { 'careTeam.$[m].isActive': false, 'careTeam.$[m].removedAt': now() } },
      { arrayFilters: [{ 'm.isActive': true }] }
    );
    return {
      name: OP.RELEASE_CARE_TEAM,
      category: 'data',
      releasedFromEpisodes: modifiedCount(res),
    };
  }

  /** Build a deferred handler that records intent + emits an event. */
  function deferredHandler(op, category) {
    return async function (ctx) {
      const payload = {
        op,
        category,
        beneficiaryId: ctx.beneficiaryId ? String(ctx.beneficiaryId) : null,
        // Wave 586 — branch + actor attribution so downstream notification /
        // compliance consumers can route the event by branch (W269 tenant
        // doctrine) and attribute it without re-querying the transition log.
        // The actor is reduced to userId + role only — never the full object —
        // so no PII / token material leaks onto the event bus.
        sourceBranchId: ctx.sourceBranchId ? String(ctx.sourceBranchId) : null,
        destinationBranchId: ctx.destinationBranchId ? String(ctx.destinationBranchId) : null,
        actor: ctx.actor
          ? { userId: ctx.actor.userId || null, role: ctx.actor.role || null }
          : null,
        transitionId: ctx.transitionId || null,
        fromState: ctx.fromState || null,
        toState: ctx.toState || null,
        correlationId: ctx.correlationId || null,
        at: now().toISOString(),
      };
      const emitted = emit(payload);
      return { name: op, category, deferred: true, emitted };
    };
  }

  // ── Assemble the registry-complete handler map ─────────────────────────
  /** @type {Record<string, Function>} */
  const handlers = {
    [OP.END_ACTIVE_SCHEDULES]: endActiveSchedules,
    [OP.CLOSE_OPEN_EPISODES]: closeOpenEpisodes,
    [OP.RELEASE_CARE_TEAM]: releaseCareTeam,
  };

  for (const op of allRegistryOps()) {
    if (handlers[op]) continue; // real handler already registered
    handlers[op] = deferredHandler(op, classifyOp(op));
  }

  return handlers;
}

module.exports = {
  createBeneficiaryLifecycleSideEffectHandlers,
  classifyOp,
  allRegistryOps,
  OP,
  CANCELLABLE_APPOINTMENT_STATUSES,
  OPEN_EPISODE_STATUSES,
};
