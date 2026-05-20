'use strict';

/**
 * reassessmentTriggerService.service.js — Wave 220
 * ════════════════════════════════════════════════════════════════════
 * Event-Triggered Reassessment Service
 *
 * 8 clinical events can force re-administration of a measure outside
 * the regular W214 cadence:
 *
 *   POST_BOTOX, POST_SURGERY, POST_HOSPITALIZATION, FALL_EVENT,
 *   MEDICATION_CHANGE_MAJOR, PARENT_RAISED_CONCERN, THERAPIST_REQUEST,
 *   BRANCH_TRANSFER
 *
 * For each event, the service:
 *   1. Resolves which active measures opt-in via
 *      Measure.reassessment.triggerOverrides.
 *   2. Enforces the W210 cooldown (minIntervalDays) — unless the
 *      caller supplies bypassCooldown=true with a justification and
 *      approver (different actor than the firer = caller-side SoD).
 *   3. Idempotently lands a W214 MeasureReassessmentTask:
 *      - new pending task if none exists for (beneficiary, measure)
 *      - bumps an existing pending task (dueAt → now + new trigger
 *        metadata appended) — the partial unique index forbids two
 *        pending rows per pair.
 *   4. Returns a structured outcome per measure (created | updated |
 *      skipped), so callers (UI, audit) can show exactly what fired.
 *
 * Layers it does NOT touch:
 *   - W215 administer() — the task just nudges the clinician; the
 *     actual scoring still goes through the normal admin path.
 *   - W216 goal updater — fires on admin save, not on task creation.
 *   - W211b correction flow — corrections are about edits to LOCKED
 *     records, not new triggers.
 *
 * Idempotency window: re-firing the same (eventCode, beneficiaryId,
 * eventDate-day) within 24h is treated as the same event. We use the
 * existing pending-task uniqueness as the natural guard — a duplicate
 * fire updates the existing task instead of creating a sibling.
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ─── Reason codes (local — domain-specific, like W218) ────────────────
const REASON_CODES = Object.freeze({
  COOLDOWN_NOT_ELAPSED: 'COOLDOWN_NOT_ELAPSED',
  COOLDOWN_BYPASS_NEEDS_JUSTIFICATION: 'COOLDOWN_BYPASS_NEEDS_JUSTIFICATION',
  COOLDOWN_BYPASS_NEEDS_APPROVER: 'COOLDOWN_BYPASS_NEEDS_APPROVER',
  SOD_SELF_REQUEST_FORBIDDEN: 'SOD_SELF_REQUEST_FORBIDDEN',
  MEASURE_INACTIVE: 'MEASURE_INACTIVE',
  NO_MATCHING_MEASURES: 'NO_MATCHING_MEASURES',
  INVALID_EVENT_CODE: 'INVALID_EVENT_CODE',
  BENEFICIARY_REQUIRED: 'BENEFICIARY_REQUIRED',
});

// ─── Lazy model loaders (matches W214 scheduler pattern) ──────────────
const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
  MeasureReassessmentTask: () => {
    try {
      return mongoose.model('MeasureReassessmentTask');
    } catch {
      try {
        require('../domains/goals/models/MeasureReassessmentTask');
        return mongoose.model('MeasureReassessmentTask');
      } catch {
        return null;
      }
    }
  },
};

// Imported lazily so the model file is the single source of valid codes.
function _loadEventCodes() {
  return require('../domains/goals/models/MeasureReassessmentTask').EVENT_TRIGGER_CODES;
}

class ReassessmentTriggerSvc {
  /**
   * Fire a clinical event. Resolves opted-in measures and lands tasks
   * for any that pass cooldown.
   *
   * @param {Object} args
   * @param {string} args.type                 — one of EVENT_TRIGGER_CODES
   * @param {string|ObjectId} args.beneficiaryId
   * @param {Object} [args.payload]            — event-specific context
   *        (medicationCode, fallSeverity, fromBranchId, requestReason, ...)
   * @param {Object} [args.actor]              — { userId, role } — the
   *        clinician/parent who triggered. THERAPIST_REQUEST uses this
   *        for SoD: actor cannot be the future assignee.
   * @param {boolean} [args.bypassCooldown]
   * @param {string}  [args.cooldownJustification]
   * @param {string|ObjectId} [args.cooldownApprovedBy]
   * @param {Date}    [args.eventDate]         — defaults to now
   * @param {string|ObjectId} [args.branchId]  — propagated to task
   * @param {string|ObjectId} [args.episodeId] — propagated to task
   * @param {Date}    [args.now]               — clock injection for tests
   * @returns {Promise<{
   *   eventCode: string, beneficiaryId, firedAt: string,
   *   cycles: Array<{
   *     measureId, measureCode, action: 'created'|'updated'|'skipped',
   *     taskId?, dueAt?, reasonCodes?: string[]
   *   }>,
   *   summary: { created: number, updated: number, skipped: number },
   *   reasonCodes: string[]
   * }>}
   */
  async fire(args = {}) {
    const now = args.now || new Date();
    const eventDate = args.eventDate ? new Date(args.eventDate) : now;
    const EVENT_TRIGGER_CODES = _loadEventCodes();

    // ── 1. Argument validation ───────────────────────────────────────
    if (!args.type || !EVENT_TRIGGER_CODES[args.type]) {
      throw new Error(
        `[reassessmentTrigger] invalid event type='${args.type}' (allowed: ${Object.keys(EVENT_TRIGGER_CODES).join(', ')})`
      );
    }
    if (!args.beneficiaryId) {
      throw new Error('[reassessmentTrigger] beneficiaryId required');
    }

    // Cooldown bypass needs both fields when requested.
    if (args.bypassCooldown) {
      if (!args.cooldownJustification || !String(args.cooldownJustification).trim()) {
        throw new Error('[reassessmentTrigger] bypassCooldown requires cooldownJustification');
      }
      if (!args.cooldownApprovedBy) {
        throw new Error('[reassessmentTrigger] bypassCooldown requires cooldownApprovedBy');
      }
      // Caller-side SoD: approver must be different actor than firer.
      if (
        args.actor &&
        args.actor.userId &&
        String(args.actor.userId) === String(args.cooldownApprovedBy)
      ) {
        throw new Error(
          '[reassessmentTrigger] cooldownApprovedBy cannot be the firing actor (SoD)'
        );
      }
    }

    const Measure = M.Measure();
    const MeasureApplication = M.MeasureApplication();
    const Task = M.MeasureReassessmentTask();
    if (!Measure || !MeasureApplication || !Task) {
      throw new Error('[reassessmentTrigger] required models unavailable');
    }

    // ── 2. Resolve opted-in measures ─────────────────────────────────
    const measures = await Measure.find({
      status: 'active',
      isDeleted: { $ne: true },
      'reassessment.triggerOverrides': args.type,
    }).lean();

    if (measures.length === 0) {
      return {
        eventCode: args.type,
        beneficiaryId: String(args.beneficiaryId),
        firedAt: now.toISOString(),
        cycles: [],
        summary: { created: 0, updated: 0, skipped: 0 },
        reasonCodes: [REASON_CODES.NO_MATCHING_MEASURES],
      };
    }

    // ── 3. Per-measure resolution ────────────────────────────────────
    const cycles = [];
    const summary = { created: 0, updated: 0, skipped: 0 };

    for (const m of measures) {
      const outcome = await this._resolveOne({
        measure: m,
        beneficiaryId: args.beneficiaryId,
        actor: args.actor,
        eventCode: args.type,
        eventDate,
        payload: args.payload,
        bypassCooldown: !!args.bypassCooldown,
        cooldownJustification: args.cooldownJustification,
        cooldownApprovedBy: args.cooldownApprovedBy,
        branchId: args.branchId,
        episodeId: args.episodeId,
        now,
        MeasureApplication,
        Task,
      });
      cycles.push(outcome);
      summary[outcome.action] = (summary[outcome.action] || 0) + 1;
    }

    return {
      eventCode: args.type,
      beneficiaryId: String(args.beneficiaryId),
      firedAt: now.toISOString(),
      cycles,
      summary,
      reasonCodes: [],
    };
  }

  /**
   * List event-triggered tasks for a beneficiary (or all, with filter).
   * Thin wrapper for UI consumption — does NOT mutate.
   */
  async listEventTriggered({ beneficiaryId, eventCode, branchId, statusIn } = {}) {
    const Task = M.MeasureReassessmentTask();
    if (!Task) return [];
    const q = { eventTriggerCode: { $exists: true, $ne: null } };
    if (eventCode) q.eventTriggerCode = eventCode;
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (branchId) q.branchId = branchId;
    if (Array.isArray(statusIn) && statusIn.length) q.status = { $in: statusIn };
    return Task.find(q).sort({ eventTriggeredAt: -1 }).lean();
  }

  /**
   * Returns the list of measures that would fire for a given event
   * code. Useful for UI previews ("if you fire POST_BOTOX, these will
   * be scheduled").
   */
  async previewMeasuresFor(eventCode) {
    const EVENT_TRIGGER_CODES = _loadEventCodes();
    if (!EVENT_TRIGGER_CODES[eventCode]) {
      throw new Error(`[reassessmentTrigger] invalid event code='${eventCode}'`);
    }
    const Measure = M.Measure();
    if (!Measure) return [];
    return Measure.find(
      {
        status: 'active',
        isDeleted: { $ne: true },
        'reassessment.triggerOverrides': eventCode,
      },
      { code: 1, name: 1, name_ar: 1, category: 1, administeredBy: 1, administrationTime: 1 }
    ).lean();
  }

  // ── Internals ──────────────────────────────────────────────────────

  async _resolveOne(args) {
    const {
      measure,
      beneficiaryId,
      actor,
      eventCode,
      eventDate,
      payload,
      bypassCooldown,
      cooldownJustification,
      cooldownApprovedBy,
      branchId,
      episodeId,
      now,
      MeasureApplication,
      Task,
    } = args;

    // ── Latest admin → cooldown check ────────────────────────────────
    const minInterval = measure.reassessment?.minIntervalDays;
    const standardInterval = measure.reassessment?.standardIntervalDays || 0;
    const latestAdmin = await MeasureApplication.findOne({
      beneficiaryId,
      measureId: measure._id,
      status: { $in: ['completed', 'locked'] },
    })
      .sort({ applicationDate: -1 })
      .lean();

    let coolDownViolated = false;
    if (minInterval && latestAdmin?.applicationDate) {
      const ageDays = (now.getTime() - new Date(latestAdmin.applicationDate).getTime()) / 86400000;
      if (ageDays < minInterval) coolDownViolated = true;
    }

    if (coolDownViolated && !bypassCooldown) {
      return {
        measureId: String(measure._id),
        measureCode: measure.code,
        action: 'skipped',
        reasonCodes: [REASON_CODES.COOLDOWN_NOT_ELAPSED],
      };
    }

    // ── Idempotency: existing pending task? ──────────────────────────
    const existing = await Task.findOne({
      beneficiaryId,
      measureId: measure._id,
      status: 'pending',
    });

    const triggerFields = {
      eventTriggerCode: eventCode,
      eventTriggerPayload: payload || null,
      eventTriggeredAt: eventDate,
      eventFiredBy: actor?.userId || null,
      ...(coolDownViolated
        ? {
            cooldownBypassedJustification: cooldownJustification,
            cooldownBypassedApprovedBy: cooldownApprovedBy,
          }
        : {}),
    };

    if (existing) {
      // Update — bump dueAt forward (most-pressing wins), attach trigger
      // metadata. Existing scheduler-created task stays the same row.
      existing.dueAt = now;
      existing.overdueDays = 0;
      Object.assign(existing, triggerFields);
      // We intentionally don't change assigneeId here — preserving the
      // original assignment unless the caller passes a new one.
      await existing.save();
      return {
        measureId: String(measure._id),
        measureCode: measure.code,
        action: 'updated',
        taskId: String(existing._id),
        dueAt: existing.dueAt.toISOString(),
      };
    }

    // ── Create — fresh task ──────────────────────────────────────────
    try {
      const created = await Task.create({
        beneficiaryId,
        measureId: measure._id,
        measureCode: measure.code,
        branchId: branchId || null,
        episodeId: episodeId || null,
        // The "trigger" snapshot is the EVENT, not the previous admin.
        // We still record the previous admin so UI can show context.
        lastApplicationId: latestAdmin?._id || null,
        lastApplicationDate: latestAdmin?.applicationDate || null,
        standardIntervalDays: standardInterval,
        // dueAt = now because the event makes it immediately due.
        dueAt: now,
        overdueDays: 0,
        status: 'pending',
        createdBy: actor?.userId || null,
        ...triggerFields,
      });
      return {
        measureId: String(measure._id),
        measureCode: measure.code,
        action: 'created',
        taskId: String(created._id),
        dueAt: created.dueAt.toISOString(),
      };
    } catch (err) {
      if (err && err.code === 11000) {
        // Race against a concurrent fire — partial unique index caught
        // it. Re-read the now-existing row + update via the existing
        // path so the trigger metadata still lands.
        const raced = await Task.findOne({
          beneficiaryId,
          measureId: measure._id,
          status: 'pending',
        });
        if (raced) {
          raced.dueAt = now;
          Object.assign(raced, triggerFields);
          await raced.save();
          return {
            measureId: String(measure._id),
            measureCode: measure.code,
            action: 'updated',
            taskId: String(raced._id),
            dueAt: raced.dueAt.toISOString(),
            reasonCodes: ['RACE_RESOLVED_BY_UPDATE'],
          };
        }
      }
      logger.warn('[reassessmentTrigger] create failed: %s', err.message);
      return {
        measureId: String(measure._id),
        measureCode: measure.code,
        action: 'skipped',
        reasonCodes: ['CREATE_FAILED'],
      };
    }
  }
}

const singleton = new ReassessmentTriggerSvc();
module.exports = singleton;
module.exports.REASON_CODES = REASON_CODES;
