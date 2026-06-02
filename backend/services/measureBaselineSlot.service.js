'use strict';

/**
 * measureBaselineSlot.service.js — Wave 227
 * ════════════════════════════════════════════════════════════════════
 * State-machine service for MeasureBaselineSlot.
 *
 * Surface:
 *   openSlot({beneficiaryId, episodeId, measureId, ...})
 *     → BASELINE_REQUIRED
 *   schedule({slotId, dueDate, assigneeId, actor})
 *     → BASELINE_SCHEDULED
 *   markInProgress({slotId, actor})
 *     → BASELINE_IN_PROGRESS
 *   complete({slotId, baselineApplicationId, actor})
 *     → BASELINE_COMPLETED
 *   lockBaseline({slotId, actor})
 *     → BASELINE_LOCKED (SoD: actor MUST differ from completedBy)
 *   waive({slotId, waiverType, waiverReason, waiverApprovedBy, waiverExpiresAt?, actor})
 *     → WAIVED (SoD: waiverApprovedBy MUST differ from createdBy)
 *   cancel({slotId, reason, actor})
 *     → CANCELLED
 *
 *   listForBeneficiary(beneficiaryId)            — all slots
 *   listOpenForBeneficiary(beneficiaryId)        — open only
 *   findBlockers({beneficiaryId})                — open slots that
 *                                                  block care-plan activation
 *
 * State transitions (refused → throws):
 *
 *   REQUIRED   → SCHEDULED | WAIVED | CANCELLED
 *   SCHEDULED  → IN_PROGRESS | REQUIRED | WAIVED | CANCELLED
 *   IN_PROGRESS→ COMPLETED | SCHEDULED | WAIVED | CANCELLED
 *   COMPLETED  → LOCKED  (no other; only forward)
 *   LOCKED     → (terminal — corrections via W211b correction record path)
 *   WAIVED     → REQUIRED (re-open if waiver expires) | (terminal)
 *   CANCELLED  → (terminal)
 *
 * SoD enforcement (caller-side):
 *   lockBaseline.actor ≠ slot.completedBy
 *   waive.waiverApprovedBy ≠ slot.createdBy
 *
 * Every transition appends to stateHistory (audit trail).
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const _logger = require('../utils/logger');

const REASON_CODES = Object.freeze({
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  SOD_SELF_LOCK_FORBIDDEN: 'SOD_SELF_LOCK_FORBIDDEN',
  SOD_SELF_WAIVE_FORBIDDEN: 'SOD_SELF_WAIVE_FORBIDDEN',
  SLOT_NOT_FOUND: 'SLOT_NOT_FOUND',
  ACTOR_REQUIRED: 'ACTOR_REQUIRED',
  ALREADY_OPEN: 'ALREADY_OPEN',
});

const M = {
  MeasureBaselineSlot: () => {
    try {
      return mongoose.model('MeasureBaselineSlot');
    } catch {
      try {
        require('../domains/goals/models/MeasureBaselineSlot');
        return mongoose.model('MeasureBaselineSlot');
      } catch {
        return null;
      }
    }
  },
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
};

function _loadConsts() {
  return require('../domains/goals/models/MeasureBaselineSlot');
}

const TRANSITIONS = {
  BASELINE_REQUIRED: new Set(['BASELINE_SCHEDULED', 'WAIVED', 'CANCELLED']),
  BASELINE_SCHEDULED: new Set(['BASELINE_IN_PROGRESS', 'BASELINE_REQUIRED', 'WAIVED', 'CANCELLED']),
  BASELINE_IN_PROGRESS: new Set([
    'BASELINE_COMPLETED',
    'BASELINE_SCHEDULED',
    'WAIVED',
    'CANCELLED',
  ]),
  BASELINE_COMPLETED: new Set(['BASELINE_LOCKED']),
  BASELINE_LOCKED: new Set(), // terminal
  WAIVED: new Set(['BASELINE_REQUIRED']), // re-open on waiver expiry
  CANCELLED: new Set(), // terminal
};

function _assertTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) {
    const err = new Error(
      `[measureBaselineSlot] invalid transition ${from} → ${to} (INVALID_TRANSITION)`
    );
    err.code = REASON_CODES.INVALID_TRANSITION;
    throw err;
  }
}

class MeasureBaselineSlotSvc {
  /**
   * Open a fresh BASELINE_REQUIRED slot. Idempotent — if an open slot
   * exists for (ben, episode, measure), returns it unchanged.
   */
  async openSlot({ beneficiaryId, episodeId, measureId, discipline, branchId, actor }) {
    if (!beneficiaryId || !episodeId || !measureId) {
      throw new Error('[measureBaselineSlot] beneficiaryId+episodeId+measureId required');
    }
    const Slot = M.MeasureBaselineSlot();
    const Measure = M.Measure();
    if (!Slot) throw new Error('[measureBaselineSlot] model unavailable');

    // Idempotent — return existing open slot if one exists.
    const existing = await Slot.findOne({
      beneficiaryId,
      episodeId,
      measureId,
      state: { $in: ['BASELINE_REQUIRED', 'BASELINE_SCHEDULED', 'BASELINE_IN_PROGRESS'] },
    });
    if (existing) return existing;

    // Look up measure code for snapshot
    let measureCode = 'UNKNOWN';
    if (Measure) {
      const m = await Measure.findById(measureId, { code: 1 }).lean();
      if (m?.code) measureCode = m.code;
    }

    const now = new Date();
    try {
      return await Slot.create({
        beneficiaryId,
        episodeId,
        measureId,
        measureCode,
        discipline,
        branchId,
        state: 'BASELINE_REQUIRED',
        createdBy: actor?.userId || null,
        stateHistory: [
          {
            state: 'BASELINE_REQUIRED',
            enteredAt: now,
            transitionedBy: actor?.userId ? String(actor.userId) : 'system',
          },
        ],
      });
    } catch (err) {
      if (err && err.code === 11000) {
        // Race — return whoever won
        const raced = await Slot.findOne({
          beneficiaryId,
          episodeId,
          measureId,
          state: { $in: ['BASELINE_REQUIRED', 'BASELINE_SCHEDULED', 'BASELINE_IN_PROGRESS'] },
        });
        if (raced) return raced;
      }
      throw err;
    }
  }

  /**
   * Move REQUIRED → SCHEDULED. Stamps dueDate + assignee.
   */
  async schedule({ slotId, dueDate, assigneeId, actor }) {
    return this._transition({
      slotId,
      to: 'BASELINE_SCHEDULED',
      actor,
      apply: slot => {
        slot.scheduledDueDate = dueDate || slot.scheduledDueDate || new Date();
        if (assigneeId) slot.assigneeId = assigneeId;
      },
    });
  }

  /**
   * Move SCHEDULED → IN_PROGRESS. Marks the clinician has opened the
   * admin form (W215).
   */
  async markInProgress({ slotId, actor }) {
    return this._transition({
      slotId,
      to: 'BASELINE_IN_PROGRESS',
      actor,
    });
  }

  /**
   * Move IN_PROGRESS → COMPLETED. Requires the resulting
   * MeasureApplication.id so the slot links to the actual admin.
   */
  async complete({ slotId, baselineApplicationId, actor }) {
    if (!baselineApplicationId) {
      throw new Error('[measureBaselineSlot] complete requires baselineApplicationId');
    }
    if (!actor?.userId) {
      throw new Error('[measureBaselineSlot] complete requires actor.userId');
    }
    return this._transition({
      slotId,
      to: 'BASELINE_COMPLETED',
      actor,
      apply: slot => {
        slot.baselineApplicationId = baselineApplicationId;
        slot.completedAt = new Date();
        slot.completedBy = actor.userId;
      },
    });
  }

  /**
   * Move COMPLETED → LOCKED. SoD: actor MUST differ from completedBy
   * — the clinician who entered the data cannot lock it themselves;
   * a second clinician (team lead) reviews and locks.
   */
  async lockBaseline({ slotId, actor }) {
    if (!actor?.userId) {
      throw new Error('[measureBaselineSlot] lock requires actor.userId');
    }
    const Slot = M.MeasureBaselineSlot();
    const slot = await Slot.findById(slotId);
    if (!slot) {
      const err = new Error(`[measureBaselineSlot] slot not found: ${slotId}`);
      err.code = REASON_CODES.SLOT_NOT_FOUND;
      throw err;
    }
    if (slot.completedBy && String(slot.completedBy) === String(actor.userId)) {
      const err = new Error(
        '[measureBaselineSlot] lock actor cannot be the same as completedBy (SoD)'
      );
      err.code = REASON_CODES.SOD_SELF_LOCK_FORBIDDEN;
      throw err;
    }
    return this._transition({
      slotId,
      to: 'BASELINE_LOCKED',
      actor,
      apply: s => {
        s.lockedAt = new Date();
        s.lockedBy = actor.userId;
      },
      preloaded: slot,
    });
  }

  /**
   * Move any open state → WAIVED. SoD: waiverApprovedBy MUST differ
   * from slot.createdBy (the person who opened the slot can't
   * unilaterally waive it).
   */
  async waive({ slotId, waiverType, waiverReason, waiverApprovedBy, waiverExpiresAt, actor }) {
    if (!waiverType) {
      throw new Error('[measureBaselineSlot] waiverType required');
    }
    if (!waiverReason || !String(waiverReason).trim()) {
      throw new Error('[measureBaselineSlot] waiverReason required');
    }
    if (!waiverApprovedBy) {
      throw new Error('[measureBaselineSlot] waiverApprovedBy required');
    }
    const Slot = M.MeasureBaselineSlot();
    const slot = await Slot.findById(slotId);
    if (!slot) {
      const err = new Error(`[measureBaselineSlot] slot not found: ${slotId}`);
      err.code = REASON_CODES.SLOT_NOT_FOUND;
      throw err;
    }
    if (slot.createdBy && String(slot.createdBy) === String(waiverApprovedBy)) {
      const err = new Error(
        '[measureBaselineSlot] waiverApprovedBy cannot be the slot creator (SoD)'
      );
      err.code = REASON_CODES.SOD_SELF_WAIVE_FORBIDDEN;
      throw err;
    }
    return this._transition({
      slotId,
      to: 'WAIVED',
      actor,
      apply: s => {
        s.waiverType = waiverType;
        s.waiverReason = waiverReason;
        s.waiverApprovedBy = waiverApprovedBy;
        s.waiverApprovedAt = new Date();
        if (waiverExpiresAt) s.waiverExpiresAt = new Date(waiverExpiresAt);
      },
      preloaded: slot,
    });
  }

  /**
   * Move any open state → CANCELLED. Used when episode closes or the
   * baseline is no longer relevant.
   */
  async cancel({ slotId, reason, actor }) {
    if (!reason || !String(reason).trim()) {
      throw new Error('[measureBaselineSlot] cancellation reason required');
    }
    return this._transition({
      slotId,
      to: 'CANCELLED',
      actor,
      apply: s => {
        s.cancelledAt = new Date();
        s.cancelledBy = actor?.userId || null;
        s.cancellationReason = reason;
      },
    });
  }

  /**
   * Auto-advance the open slot for an admin's (ben, episode, measure)
   * tuple to BASELINE_COMPLETED. Used by W215 administer() as a
   * best-effort post-save hook (W228 integration).
   *
   * Skip-forwards through whatever open state the slot is in:
   *   REQUIRED   → SCHEDULED → IN_PROGRESS → COMPLETED
   *   SCHEDULED  → IN_PROGRESS → COMPLETED
   *   IN_PROGRESS→ COMPLETED
   *   COMPLETED/LOCKED/WAIVED/CANCELLED → no-op (idempotent)
   *
   * Only fires for purpose='baseline' admins — caller is responsible
   * for filtering.
   *
   * Returns { advanced: bool, slot, fromState } or null when no slot
   * exists. Never throws on missing slot (best-effort path).
   */
  async completeFromAdmin({ admin }) {
    if (!admin || !admin.beneficiaryId || !admin.measureId) {
      throw new Error(
        '[measureBaselineSlot.completeFromAdmin] admin with beneficiaryId+measureId required'
      );
    }
    const Slot = M.MeasureBaselineSlot();
    if (!Slot) return null;

    const slot = await Slot.findOne({
      beneficiaryId: admin.beneficiaryId,
      ...(admin.episodeId ? { episodeId: admin.episodeId } : {}),
      measureId: admin.measureId,
      state: { $in: ['BASELINE_REQUIRED', 'BASELINE_SCHEDULED', 'BASELINE_IN_PROGRESS'] },
    });
    if (!slot) return null;

    const fromState = slot.state;
    const actor = { userId: admin.assessorId || admin.completedBy || null };

    // Skip-forward through intermediate states. Each transition appends
    // its own phaseHistory entry — preserves the audit trail.
    if (fromState === 'BASELINE_REQUIRED') {
      await this.schedule({ slotId: slot._id, actor });
      const inProg = await this.markInProgress({ slotId: slot._id, actor });
      const completed = await this.complete({
        slotId: inProg._id,
        baselineApplicationId: admin._id,
        actor,
      });
      return { advanced: true, slot: completed, fromState };
    }
    if (fromState === 'BASELINE_SCHEDULED') {
      const inProg = await this.markInProgress({ slotId: slot._id, actor });
      const completed = await this.complete({
        slotId: inProg._id,
        baselineApplicationId: admin._id,
        actor,
      });
      return { advanced: true, slot: completed, fromState };
    }
    if (fromState === 'BASELINE_IN_PROGRESS') {
      const completed = await this.complete({
        slotId: slot._id,
        baselineApplicationId: admin._id,
        actor,
      });
      return { advanced: true, slot: completed, fromState };
    }
    return { advanced: false, slot, fromState };
  }

  // ── Read-side ──────────────────────────────────────────────────

  async listForBeneficiary(beneficiaryId) {
    if (!beneficiaryId) throw new Error('[measureBaselineSlot] beneficiaryId required');
    const Slot = M.MeasureBaselineSlot();
    if (!Slot) return [];
    return Slot.find({ beneficiaryId, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();
  }

  async listOpenForBeneficiary(beneficiaryId) {
    if (!beneficiaryId) throw new Error('[measureBaselineSlot] beneficiaryId required');
    const Slot = M.MeasureBaselineSlot();
    if (!Slot) return [];
    return Slot.listOpenForBeneficiary(beneficiaryId);
  }

  /**
   * Slots that should block care-plan activation: open slots that are
   * not WAIVED/CANCELLED/COMPLETED/LOCKED. Used as a gate alongside
   * W223 measureReadinessGate.
   */
  async findBlockers({ beneficiaryId, episodeId }) {
    if (!beneficiaryId) throw new Error('[measureBaselineSlot] beneficiaryId required');
    const Slot = M.MeasureBaselineSlot();
    if (!Slot) return [];
    const q = {
      beneficiaryId,
      state: { $in: ['BASELINE_REQUIRED', 'BASELINE_SCHEDULED', 'BASELINE_IN_PROGRESS'] },
      isDeleted: { $ne: true },
    };
    if (episodeId) q.episodeId = episodeId;
    return Slot.find(q, {
      measureId: 1,
      measureCode: 1,
      state: 1,
      scheduledDueDate: 1,
      discipline: 1,
    }).lean();
  }

  // ── Internals ──────────────────────────────────────────────────

  async _transition({ slotId, to, actor, apply, preloaded }) {
    const Slot = M.MeasureBaselineSlot();
    if (!Slot) throw new Error('[measureBaselineSlot] model unavailable');
    if (!slotId) throw new Error('[measureBaselineSlot] slotId required');
    const slot = preloaded || (await Slot.findById(slotId));
    if (!slot) {
      const err = new Error(`[measureBaselineSlot] slot not found: ${slotId}`);
      err.code = REASON_CODES.SLOT_NOT_FOUND;
      throw err;
    }
    _assertTransition(slot.state, to);

    if (typeof apply === 'function') apply(slot);
    slot.state = to;
    const now = new Date();
    slot.stateHistory = slot.stateHistory || [];
    slot.stateHistory.push({
      state: to,
      enteredAt: now,
      transitionedBy: actor?.userId ? String(actor.userId) : 'system',
    });
    await slot.save();
    return slot;
  }
}

const singleton = new MeasureBaselineSlotSvc();
module.exports = singleton;
module.exports.REASON_CODES = REASON_CODES;
module.exports.TRANSITIONS = TRANSITIONS;
