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
  PAUSE_SCHEDULE: 'pause-schedule',
  RESUME_SCHEDULE: 'resume-schedule',
  RESTORE_CANCELLED_APPOINTMENTS: 'restore-cancelled-appointments',
  REOPEN_CLOSED_EPISODES: 'reopen-closed-episodes',
  REACTIVATE_CARE_TEAM: 'reactivate-care-team',
  ROLLBACK_TRANSFER_DESTINATION: 'rollback-transfer-destination',
});

/** Appointment statuses that represent a still-actionable future booking. */
const CANCELLABLE_APPOINTMENT_STATUSES = Object.freeze([
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'RESCHEDULED',
]);

/** Appointment statuses that can be paused and later resumed. */
const PAUSABLE_APPOINTMENT_STATUSES = Object.freeze([
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
    for (const op of t.compensatingOps || []) set.add(op);
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
 *   - beneficiaryModel  Mongoose model (Beneficiary) — optional (for notifications + rollback)
 *   - transferModel     Mongoose model (BeneficiaryTransfer) — optional
 *   - notifier          async fn({ to, body, subject, priority, beneficiaryId }) — optional
 *   - eventSink         { emit(event, payload) } OR (event, payload) => void — optional
 *   - now               () => Date
 *   - logger            console-compatible
 * @returns {Record<string, Function>} op-name → async handler map (registry-complete)
 */
function createBeneficiaryLifecycleSideEffectHandlers({
  appointmentModel = null,
  episodeModel = null,
  beneficiaryModel = null,
  transferModel = null,
  guardianModel = null,
  notifier = null,
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

  function lifecycleTag(ctx, extra = {}) {
    return {
      transitionId: ctx.transitionId || null,
      correlationId: ctx.correlationId || null,
      ...extra,
    };
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
    // Wave 656 — tag each cancellation with the transition that caused it so
    // `reverseTransition` can restore only the appointments it cancelled.
    const tag = lifecycleTag(ctx, { cancelledAt: now(), originalStatus: '$status' });
    const res = await appointmentModel.updateMany(
      {
        beneficiary: ctx.beneficiaryId,
        status: { $in: CANCELLABLE_APPOINTMENT_STATUSES },
        date: { $gte: now() },
      },
      [{ $set: { status: 'CANCELLED', lifecycleCancellationTag: tag } }]
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
    const tag = lifecycleTag(ctx, { closedAt: now(), originalStatus: '$status' });
    const res = await episodeModel.updateMany(
      {
        beneficiaryId: ctx.beneficiaryId,
        status: { $in: OPEN_EPISODE_STATUSES },
      },
      [
        {
          $set: {
            status: 'completed',
            actualEndDate: now(),
            dischargeReason,
            lifecycleClosureTag: tag,
          },
        },
      ]
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
    const tag = lifecycleTag(ctx, { releasedAt: now() });
    const res = await episodeModel.updateMany(
      { beneficiaryId: ctx.beneficiaryId, 'careTeam.isActive': true },
      {
        $set: {
          'careTeam.$[m].isActive': false,
          'careTeam.$[m].removedAt': now(),
          'careTeam.$[m].lifecycleReleaseTag': tag,
        },
      },
      { arrayFilters: [{ 'm.isActive': true }] }
    );
    return {
      name: OP.RELEASE_CARE_TEAM,
      category: 'data',
      releasedFromEpisodes: modifiedCount(res),
    };
  }

  // ── Compensation handler: restore appointments cancelled by a transition ─
  async function restoreCancelledAppointments(ctx) {
    if (!appointmentModel || typeof appointmentModel.updateMany !== 'function') {
      return {
        name: OP.RESTORE_CANCELLED_APPOINTMENTS,
        category: 'data',
        skipped: true,
        reason: 'appointment-model-unavailable',
      };
    }
    const res = await appointmentModel.updateMany(
      {
        beneficiary: ctx.beneficiaryId,
        'lifecycleCancellationTag.transitionId': ctx.transitionId,
        'lifecycleCancellationTag.correlationId': ctx.correlationId,
      },
      [
        {
          $set: {
            status: { $ifNull: ['$lifecycleCancellationTag.originalStatus', 'CONFIRMED'] },
            lifecycleCancellationTag: null,
          },
        },
      ]
    );
    return {
      name: OP.RESTORE_CANCELLED_APPOINTMENTS,
      category: 'data',
      restoredAppointments: modifiedCount(res),
    };
  }

  // ── Compensation handler: reopen episodes closed by a transition ─────────
  async function reopenClosedEpisodes(ctx) {
    if (!episodeModel || typeof episodeModel.updateMany !== 'function') {
      return {
        name: OP.REOPEN_CLOSED_EPISODES,
        category: 'data',
        skipped: true,
        reason: 'episode-model-unavailable',
      };
    }
    const res = await episodeModel.updateMany(
      {
        beneficiaryId: ctx.beneficiaryId,
        'lifecycleClosureTag.transitionId': ctx.transitionId,
        'lifecycleClosureTag.correlationId': ctx.correlationId,
      },
      [
        {
          $set: {
            status: { $ifNull: ['$lifecycleClosureTag.originalStatus', 'active'] },
            actualEndDate: null,
            dischargeReason: null,
            lifecycleClosureTag: null,
          },
        },
      ]
    );
    return {
      name: OP.REOPEN_CLOSED_EPISODES,
      category: 'data',
      reopenedEpisodes: modifiedCount(res),
    };
  }

  // ── Compensation handler: reactivate care-team members released by a transition
  async function reactivateCareTeam(ctx) {
    if (!episodeModel || typeof episodeModel.updateMany !== 'function') {
      return {
        name: OP.REACTIVATE_CARE_TEAM,
        category: 'data',
        skipped: true,
        reason: 'episode-model-unavailable',
      };
    }
    const res = await episodeModel.updateMany(
      {
        beneficiaryId: ctx.beneficiaryId,
        'careTeam.lifecycleReleaseTag.transitionId': ctx.transitionId,
        'careTeam.lifecycleReleaseTag.correlationId': ctx.correlationId,
      },
      {
        $set: {
          'careTeam.$[m].isActive': true,
          'careTeam.$[m].removedAt': null,
          'careTeam.$[m].lifecycleReleaseTag': null,
        },
      },
      {
        arrayFilters: [
          {
            'm.lifecycleReleaseTag.transitionId': ctx.transitionId,
            'm.lifecycleReleaseTag.correlationId': ctx.correlationId,
          },
        ],
      }
    );
    return {
      name: OP.REACTIVATE_CARE_TEAM,
      category: 'data',
      reactivatedFromEpisodes: modifiedCount(res),
    };
  }

  // ── Compensation handler: rollback a completed transfer ──────────────────
  async function rollbackTransferDestination(ctx) {
    if (
      !beneficiaryModel ||
      typeof beneficiaryModel.updateOne !== 'function' ||
      !transferModel ||
      typeof transferModel.findOne !== 'function'
    ) {
      return {
        name: OP.ROLLBACK_TRANSFER_DESTINATION,
        category: 'data',
        skipped: true,
        reason: 'models-unavailable',
      };
    }

    const transfer = await transferModel
      .findOne({
        beneficiary: ctx.beneficiaryId,
        toBranch: ctx.destinationBranchId,
        status: 'completed',
      })
      .sort({ completedAt: -1 });

    if (!transfer) {
      return {
        name: OP.ROLLBACK_TRANSFER_DESTINATION,
        category: 'data',
        skipped: true,
        reason: 'completed-transfer-not-found',
      };
    }

    const snapshot =
      transfer.transferNotes && typeof transfer.transferNotes === 'object'
        ? transfer.transferNotes.rollbackSnapshot || {}
        : {};
    const originalBranchId = snapshot.originalBranchId || ctx.sourceBranchId;
    const originalFileNumber = snapshot.originalFileNumber || null;
    const originalStatus = snapshot.originalStatus || ctx.fromState;

    if (!originalBranchId) {
      return {
        name: OP.ROLLBACK_TRANSFER_DESTINATION,
        category: 'data',
        skipped: true,
        reason: 'snapshot-missing-original-branch',
      };
    }

    const beneficiaryUpdate = {
      branchId: originalBranchId,
      status: originalStatus,
      lastLifecycleAt: now(),
    };
    if (originalFileNumber) {
      beneficiaryUpdate.fileNumber = originalFileNumber;
    }

    await beneficiaryModel.updateOne({ _id: ctx.beneficiaryId }, { $set: beneficiaryUpdate });

    transfer.status = 'reversed';
    const nextNotes =
      transfer.transferNotes && typeof transfer.transferNotes === 'object'
        ? { ...transfer.transferNotes }
        : {};
    nextNotes.rollbackSnapshot = {
      ...snapshot,
      rolledBackAt: now(),
    };
    transfer.transferNotes = nextNotes;
    await transfer.save();

    return {
      name: OP.ROLLBACK_TRANSFER_DESTINATION,
      category: 'data',
      rolledBackTransfers: 1,
      handledStatus: true,
    };
  }

  // ── Real data handler: pause future schedules on suspend ─────────────────
  async function pauseSchedule(ctx) {
    if (!appointmentModel || typeof appointmentModel.updateMany !== 'function') {
      return {
        name: OP.PAUSE_SCHEDULE,
        category: 'data',
        skipped: true,
        reason: 'appointment-model-unavailable',
      };
    }
    const res = await appointmentModel.updateMany(
      {
        beneficiary: ctx.beneficiaryId,
        status: { $in: PAUSABLE_APPOINTMENT_STATUSES },
        date: { $gte: now() },
      },
      { $set: { status: 'PAUSED', pausedAt: now(), pausedReason: 'beneficiary-suspended' } }
    );
    return {
      name: OP.PAUSE_SCHEDULE,
      category: 'data',
      pausedAppointments: modifiedCount(res),
    };
  }

  // ── Real data handler: resume paused schedules on reactivate ─────────────
  async function resumeSchedule(ctx) {
    if (!appointmentModel || typeof appointmentModel.updateMany !== 'function') {
      return {
        name: OP.RESUME_SCHEDULE,
        category: 'data',
        skipped: true,
        reason: 'appointment-model-unavailable',
      };
    }
    const res = await appointmentModel.updateMany(
      {
        beneficiary: ctx.beneficiaryId,
        status: 'PAUSED',
      },
      { $set: { status: 'CONFIRMED', resumedAt: now() } }
    );
    return {
      name: OP.RESUME_SCHEDULE,
      category: 'data',
      resumedAppointments: modifiedCount(res),
    };
  }

  // ── Real notification handlers ───────────────────────────────────────────
  async function fetchBeneficiaryContact(id) {
    if (!beneficiaryModel || typeof beneficiaryModel.findById !== 'function') return null;
    try {
      return await beneficiaryModel
        .findById(id)
        .select(
          'firstName fullNameArabic contactInfo.primaryPhone contactInfo.email notificationPreference'
        )
        .lean();
    } catch (err) {
      logger.warn && logger.warn(`[lifecycle.side_effect] contact lookup failed: ${err.message}`);
      return null;
    }
  }

  function beneficiaryFirstName(b) {
    return b?.firstName || b?.fullNameArabic || 'المستفيد';
  }

  async function notifyFamilyInApp(ctx, { subject, body, templateKey }) {
    if (!guardianModel || typeof guardianModel.find !== 'function') return null;
    try {
      const guardians = await guardianModel
        .find({
          beneficiaries: ctx.beneficiaryId,
          accountStatus: 'verified',
          deletedAt: null,
        })
        .select('userId')
        .lean();
      const recipients = (guardians || []).map(g => g.userId).filter(Boolean);
      if (recipients.length === 0) return { sent: false, reason: 'no-verified-guardian-users' };
      const results = [];
      for (const userId of recipients) {
        const r = await notifier({
          channels: ['in-app'],
          recipientId: String(userId),
          subject,
          body,
          priority: 'high',
          templateKey,
          beneficiaryId: ctx.beneficiaryId,
        });
        results.push(r);
      }
      return { sent: results.some(r => r.success), recipients: recipients.map(String), results };
    } catch (err) {
      logger.warn &&
        logger.warn(`[lifecycle.side_effect] in-app family notification failed: ${err.message}`);
      return { sent: false, error: err.message };
    }
  }

  async function sendFamilyNotification(ctx, { op, templateKey, subject, bodyBuilder }) {
    if (typeof notifier !== 'function') {
      return { name: op, category: 'notification', skipped: true, reason: 'notifier-unavailable' };
    }
    const b = await fetchBeneficiaryContact(ctx.beneficiaryId);
    if (!b) {
      return { name: op, category: 'notification', skipped: true, reason: 'beneficiary-not-found' };
    }
    const phone = b.contactInfo?.primaryPhone;
    const email = b.contactInfo?.email;
    const to = phone || email;
    if (!to) {
      return { name: op, category: 'notification', skipped: true, reason: 'no-contact' };
    }
    const firstName = beneficiaryFirstName(b);
    const body = bodyBuilder(firstName);
    let externalResult;
    try {
      externalResult = await notifier({
        to,
        subject,
        body,
        priority: 'high',
        templateKey,
        beneficiaryId: ctx.beneficiaryId,
      });
    } catch (err) {
      logger.warn && logger.warn(`[lifecycle.side_effect] notification failed: ${err.message}`);
      externalResult = { success: false, error: err.message };
    }
    const externalSuccess =
      externalResult && typeof externalResult === 'object'
        ? externalResult.success !== false && !externalResult.error
        : !externalResult?.error;
    const inApp = await notifyFamilyInApp(ctx, { subject, body, templateKey });
    return {
      name: op,
      category: 'notification',
      sent: externalSuccess || !!inApp?.sent,
      channel: phone && externalSuccess ? 'sms' : email && externalSuccess ? 'email' : undefined,
      external: { success: externalSuccess },
      inApp,
    };
  }

  const notificationHandlers = {
    'notify-family-welcome': ctx =>
      sendFamilyNotification(ctx, {
        op: 'notify-family-welcome',
        templateKey: 'beneficiary.lifecycle.welcome',
        subject: 'تم قبول المستفيد',
        bodyBuilder: name => `مرحباً، تم قبول ${name} في البرنامج. نتمنى لكم رحلة علاجية موفقة.`,
      }),
    'notify-family-waitlisted': ctx =>
      sendFamilyNotification(ctx, {
        op: 'notify-family-waitlisted',
        templateKey: 'beneficiary.lifecycle.waitlisted',
        subject: 'إدراج في قائمة الانتظار',
        bodyBuilder: name =>
          `تم إدراج ${name} في قائمة الانتظار. سنتواصل معكم فور توفر مقعد مناسب.`,
      }),
    'notify-family-waitlist-cancelled': ctx =>
      sendFamilyNotification(ctx, {
        op: 'notify-family-waitlist-cancelled',
        templateKey: 'beneficiary.lifecycle.waitlist-cancelled',
        subject: 'إلغاء قائمة الانتظار',
        bodyBuilder: name => `تم إلغاء إدراج ${name} من قائمة الانتظار.`,
      }),
    'notify-family-suspension': ctx =>
      sendFamilyNotification(ctx, {
        op: 'notify-family-suspension',
        templateKey: 'beneficiary.lifecycle.suspension',
        subject: 'تعليق ملف المستفيد',
        bodyBuilder: name =>
          `نود إبلاغكم بتعليق ملف ${name} مؤقتاً. سيتم التواصل لتحديد موعد الاستئناف.`,
      }),
    'notify-family-resumption': ctx =>
      sendFamilyNotification(ctx, {
        op: 'notify-family-resumption',
        templateKey: 'beneficiary.lifecycle.resumption',
        subject: 'إعادة تفعيل ملف المستفيد',
        bodyBuilder: name => `تم إعادة تفعيل ملف ${name}. نرحب بعودتكم.`,
      }),
    'notify-family-discharge': ctx =>
      sendFamilyNotification(ctx, {
        op: 'notify-family-discharge',
        templateKey: 'beneficiary.lifecycle.discharge',
        subject: 'تخرج المستفيد',
        bodyBuilder: name =>
          `نهنئكم بتخرج ${name} من البرنامج. نتمنى لكم التوفيق والاستمرار في التقدم.`,
      }),
    'notify-family-condolence': ctx =>
      sendFamilyNotification(ctx, {
        op: 'notify-family-condolence',
        templateKey: 'beneficiary.lifecycle.condolence',
        subject: 'تعزية',
        bodyBuilder: name =>
          `نتقدم بأحر التعازي والمواساة لوفاة ${name}. نسأل الله أن يلهمكم الصبر والسلوان.`,
      }),
    'notify-team': ctx => {
      const op = 'notify-team';
      // Team notification is intentionally a deferred event until a team-routing
      // registry exists. We still emit the event for downstream consumers.
      const emitted = emit({
        op,
        category: 'notification',
        beneficiaryId: ctx.beneficiaryId ? String(ctx.beneficiaryId) : null,
        sourceBranchId: ctx.sourceBranchId ? String(ctx.sourceBranchId) : null,
        transitionId: ctx.transitionId,
        fromState: ctx.fromState,
        toState: ctx.toState,
        at: now().toISOString(),
      });
      return { name: op, category: 'notification', deferred: true, emitted };
    },
  };

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
    [OP.PAUSE_SCHEDULE]: pauseSchedule,
    [OP.RESUME_SCHEDULE]: resumeSchedule,
    [OP.RESTORE_CANCELLED_APPOINTMENTS]: restoreCancelledAppointments,
    [OP.REOPEN_CLOSED_EPISODES]: reopenClosedEpisodes,
    [OP.REACTIVATE_CARE_TEAM]: reactivateCareTeam,
    [OP.ROLLBACK_TRANSFER_DESTINATION]: rollbackTransferDestination,
    ...notificationHandlers,
  };

  for (const op of allRegistryOps()) {
    if (handlers[op]) continue; // real handler already registered
    handlers[op] = deferredHandler(op, classifyOp(op));
  }

  return handlers;
}

/**
 * Wave 595 — operational summary of a side-effects dispatch run.
 *
 * The lifecycle service runs every declared handler and collects an array of
 * per-op result objects (the shapes returned by the handlers above + the
 * `status:'failed'` rows the service stamps when a handler throws). This pure
 * reducer turns that raw array into an actionable summary the audit / dashboard
 * / decision-support layer can render directly — honouring the project rule
 * that every indicator must be actionable, not just a number for display.
 *
 * It is total and side-effect-free: unknown / malformed entries are counted
 * under `unknown` rather than throwing, so a future handler shape can never
 * crash the reporting path.
 *
 * @param {Array<object>} results  per-op handler results (any shape)
 * @returns {{
 *   total: number,
 *   byCategory: { data: number, notification: number, compliance: number, workflow: number, unknown: number },
 *   dataMutations: { cancelledAppointments: number, closedEpisodes: number, releasedFromEpisodes: number, total: number },
 *   deferred: number,
 *   emitted: number,
 *   skipped: number,
 *   failed: number,
 *   real: number,
 *   health: {
 *     ok: boolean, clean: boolean, mutated: boolean,
 *     failedRatio: number, skippedRatio: number,
 *   },
 * }}
 *
 * Wave 651 adds a read-only `health` signal so the audit / dashboard layer can
 * flag a degraded side-effects run at a glance instead of re-deriving it:
 * `ok` is true only when nothing failed, and `failedRatio` is the share of
 * results stamped `failed` (0 when there are no results).
 *
 * Wave 652 closes the silent-skip blind spot: a `skipped` data handler (e.g.
 * `appointment-model-unavailable`) means a real cleanup never ran, which is a
 * degradation `ok` alone hides. `clean` is true only when nothing failed AND
 * nothing was skipped, and `skippedRatio` is the share of skipped results.
 *
 * Wave 653 adds `mutated` so the dashboard can tell a healthy-but-empty run
 * apart from one that actually changed beneficiary data: `mutated` is true only
 * when at least one real data handler produced a non-zero mutation
 * (`dataMutations.total > 0`). A `clean && !mutated` run is a benign no-op (or a
 * silent logic gap worth a glance); `clean && mutated` did real work.
 * Purely additive — the existing keys are unchanged.
 */
function summarizeSideEffectResults(results) {
  const list = Array.isArray(results) ? results : [];
  const byCategory = { data: 0, notification: 0, compliance: 0, workflow: 0, unknown: 0 };
  const dataMutations = {
    cancelledAppointments: 0,
    closedEpisodes: 0,
    releasedFromEpisodes: 0,
    pausedAppointments: 0,
    resumedAppointments: 0,
    restoredAppointments: 0,
    reopenedEpisodes: 0,
    reactivatedFromEpisodes: 0,
    rolledBackTransfers: 0,
    total: 0,
  };
  let deferred = 0;
  let emitted = 0;
  let skipped = 0;
  let failed = 0;
  let real = 0;

  const addNum = v => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);

  for (const r of list) {
    if (!r || typeof r !== 'object') {
      byCategory.unknown += 1;
      continue;
    }
    const cat = r.category;
    if (cat === 'data' || cat === 'notification' || cat === 'compliance' || cat === 'workflow') {
      byCategory[cat] += 1;
    } else {
      byCategory.unknown += 1;
    }

    if (r.deferred === true) deferred += 1;
    if (r.emitted === true) emitted += 1;
    if (r.skipped === true) skipped += 1;
    if (r.status === 'failed' || r.failed === true) failed += 1;

    if (cat === 'data' && r.deferred !== true) {
      real += 1;
      const c = addNum(r.cancelledAppointments);
      const e = addNum(r.closedEpisodes);
      const t = addNum(r.releasedFromEpisodes);
      const p = addNum(r.pausedAppointments);
      const u = addNum(r.resumedAppointments);
      const ra = addNum(r.restoredAppointments);
      const ro = addNum(r.reopenedEpisodes);
      const rc = addNum(r.reactivatedFromEpisodes);
      const rb = addNum(r.rolledBackTransfers);
      dataMutations.cancelledAppointments += c;
      dataMutations.closedEpisodes += e;
      dataMutations.releasedFromEpisodes += t;
      dataMutations.pausedAppointments += p;
      dataMutations.resumedAppointments += u;
      dataMutations.restoredAppointments += ra;
      dataMutations.reopenedEpisodes += ro;
      dataMutations.reactivatedFromEpisodes += rc;
      dataMutations.rolledBackTransfers += rb;
      dataMutations.total += c + e + t + p + u + ra + ro + rc + rb;
    }
  }

  const total = list.length;
  const health = {
    ok: failed === 0,
    clean: failed === 0 && skipped === 0,
    mutated: dataMutations.total > 0,
    failedRatio: total ? Number((failed / total).toFixed(4)) : 0,
    skippedRatio: total ? Number((skipped / total).toFixed(4)) : 0,
  };

  return {
    total,
    byCategory,
    dataMutations,
    deferred,
    emitted,
    skipped,
    failed,
    real,
    health,
  };
}

module.exports = {
  createBeneficiaryLifecycleSideEffectHandlers,
  classifyOp,
  allRegistryOps,
  summarizeSideEffectResults,
  OP,
  CANCELLABLE_APPOINTMENT_STATUSES,
  OPEN_EPISODE_STATUSES,
};
