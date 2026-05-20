'use strict';

/**
 * reassessmentReminderCascade.service.js — Wave 225
 * ════════════════════════════════════════════════════════════════════
 * Reminder Cascade Dispatcher
 *
 * Reads the W222 `phase` field on each W214 task and fires one
 * Notification per (task, phase) pair into the existing Notification
 * collection. Idempotent — the `remindersSent[]` array on the task
 * records which phase reminders have already fired.
 *
 * Phase → notification policy:
 *
 *   DUE_SOON   priority=medium  → assignee
 *   DUE_NOW    priority=high    → assignee
 *   OVERDUE    priority=high    → assignee + supervisor (when set)
 *   ESCALATED  priority=urgent  → assignee + team lead (escalatedToUserId)
 *   BREACHED   priority=critical→ assignee + branch QA + audit
 *
 * SCHEDULED has no reminder — it's too early; phase exists only as a
 * lifecycle anchor.
 *
 * Notification fan-out is via the unified Notification collection.
 * Email/SMS/parent-portal channels are NOT wired here — the unified
 * notification surface (services/unifiedNotificationManager.js)
 * fans out from in-app rows to the configured channels.
 *
 * Designed for cron consumption:
 *   reassessmentReminderCascade.dispatch({now?, branchId?, beneficiaryId?})
 *     → { scanned, dispatched, byPhase, errors }
 *
 * Off-switch: process.env.MEASURE_REASSESS_REMINDERS='off'.
 *
 * Single source of truth for which phases fire: PHASES_TO_FIRE.
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Phases that produce a reminder. SCHEDULED skipped (too early).
const PHASES_TO_FIRE = ['DUE_SOON', 'DUE_NOW', 'OVERDUE', 'ESCALATED', 'BREACHED'];

const PHASE_POLICY = Object.freeze({
  DUE_SOON: {
    priority: 'medium',
    type: 'reminder',
    category: 'measure_reassessment',
    titleAr: 'تذكير: إعادة قياس مستحقة قريباً',
    titleEn: 'Reminder: reassessment due soon',
    includeSupervisor: false,
    includeQa: false,
  },
  DUE_NOW: {
    priority: 'high',
    type: 'reminder',
    category: 'measure_reassessment',
    titleAr: 'إعادة قياس مستحقة اليوم',
    titleEn: 'Reassessment due today',
    includeSupervisor: false,
    includeQa: false,
  },
  OVERDUE: {
    priority: 'high',
    type: 'alert',
    category: 'measure_reassessment_overdue',
    titleAr: 'إعادة قياس متأخرة',
    titleEn: 'Reassessment overdue',
    includeSupervisor: true,
    includeQa: false,
  },
  ESCALATED: {
    priority: 'urgent',
    type: 'alert',
    category: 'measure_reassessment_escalated',
    titleAr: 'تصعيد: إعادة قياس متأخرة جداً',
    titleEn: 'Escalation: reassessment severely overdue',
    includeSupervisor: true,
    includeQa: false,
  },
  BREACHED: {
    priority: 'critical',
    type: 'alert',
    category: 'measure_reassessment_breached',
    titleAr: 'خرق: إعادة قياس متأخرة لأكثر من 14 يوماً',
    titleEn: 'Breach: reassessment overdue >14 days',
    includeSupervisor: true,
    includeQa: true,
  },
});

const M = {
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
  Notification: () => {
    try {
      return mongoose.model('Notification');
    } catch {
      try {
        return require('../models/Notification');
      } catch {
        return null;
      }
    }
  },
};

function _isEnabled() {
  const flag = (process.env.MEASURE_REASSESS_REMINDERS || '').toLowerCase();
  return flag !== 'off' && flag !== '0' && flag !== 'false';
}

class ReassessmentReminderCascadeSvc {
  /**
   * Run one cascade pass.
   *
   * @param {Object} [opts]
   * @param {Date}    [opts.now]
   * @param {string|ObjectId} [opts.branchId]
   * @param {string|ObjectId} [opts.beneficiaryId]
   * @param {Object}  [opts.recipientHints] — optional override for
   *                  who supervisor/qa is in tests. Shape:
   *                  { supervisorByBranchId: Map<branchIdStr, userId>,
   *                    qaByBranchId:        Map<branchIdStr, userId> }
   */
  async dispatch(opts = {}) {
    if (!_isEnabled()) {
      return { scanned: 0, dispatched: 0, byPhase: {}, disabled: true, errors: [] };
    }
    const now = opts.now || new Date();
    const Task = M.MeasureReassessmentTask();
    const Notification = M.Notification();
    if (!Task || !Notification) {
      throw new Error('[reassessmentReminderCascade] required models unavailable');
    }

    const filter = {
      status: { $in: ['pending', 'acknowledged'] },
      phase: { $in: PHASES_TO_FIRE },
    };
    if (opts.branchId) filter.branchId = opts.branchId;
    if (opts.beneficiaryId) filter.beneficiaryId = opts.beneficiaryId;

    const byPhase = Object.fromEntries(PHASES_TO_FIRE.map(p => [p, 0]));
    const errors = [];
    let scanned = 0;
    let dispatched = 0;

    const cursor = Task.find(filter).cursor();
    for await (const task of cursor) {
      scanned += 1;
      try {
        const firedPhases = new Set((task.remindersSent || []).map(r => r.phase));
        if (firedPhases.has(task.phase)) continue; // already fired this phase

        const policy = PHASE_POLICY[task.phase];
        if (!policy) continue;

        const recipients = this._resolveRecipients(task, policy, opts.recipientHints);
        if (!recipients.length) {
          // No assignee, no supervisor — nothing to do. Still mark as
          // fired so we don't busy-loop.
          task.remindersSent = task.remindersSent || [];
          task.remindersSent.push({
            phase: task.phase,
            sentAt: now,
            recipientCount: 0,
          });
          await task.save();
          continue;
        }

        const docs = recipients.map(uid => this._buildNotification(task, policy, uid, now));
        await Notification.insertMany(docs);

        task.remindersSent = task.remindersSent || [];
        task.remindersSent.push({
          phase: task.phase,
          sentAt: now,
          recipientCount: recipients.length,
        });
        await task.save();

        byPhase[task.phase] += 1;
        dispatched += 1;
      } catch (err) {
        errors.push({ taskId: String(task._id), message: err.message });
        logger.warn('[reassessmentReminderCascade] task %s failed: %s', task._id, err.message);
      }
    }

    return { scanned, dispatched, byPhase, errors };
  }

  /**
   * Read-side: list reminders fired for a given beneficiary (for the
   * /care-plans/[id] reminder timeline UI).
   */
  async listForBeneficiary(beneficiaryId) {
    if (!beneficiaryId) throw new Error('[reassessmentReminderCascade] beneficiaryId required');
    const Notification = M.Notification();
    if (!Notification) return [];
    return Notification.find({
      'metadata.beneficiaryId': String(beneficiaryId),
      category: { $regex: /^measure_reassessment/ },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  // ── Internals ──────────────────────────────────────────────────────

  _resolveRecipients(task, policy, hints = {}) {
    const out = new Set();
    if (task.assigneeId) out.add(String(task.assigneeId));

    const branchKey = task.branchId ? String(task.branchId) : null;

    if (policy.includeSupervisor && task.escalatedToUserId) {
      out.add(String(task.escalatedToUserId));
    }
    if (policy.includeSupervisor && hints?.supervisorByBranchId && branchKey) {
      const sup = hints.supervisorByBranchId.get(branchKey);
      if (sup) out.add(String(sup));
    }
    if (policy.includeQa && hints?.qaByBranchId && branchKey) {
      const qa = hints.qaByBranchId.get(branchKey);
      if (qa) out.add(String(qa));
    }
    return [...out];
  }

  _buildNotification(task, policy, recipientId, now) {
    const titleAr = policy.titleAr;
    const titleEn = policy.titleEn;
    return {
      recipientId,
      recipient: recipientId,
      title: `${titleAr} — ${task.measureCode}`,
      message: `${titleEn} — measure ${task.measureCode}, beneficiary ${task.beneficiaryId}`,
      type: policy.type,
      category: policy.category,
      priority: policy.priority,
      channel: 'in-app',
      status: 'pending',
      createdAt: now,
      metadata: {
        wave: 'W225',
        beneficiaryId: String(task.beneficiaryId),
        measureId: String(task.measureId),
        measureCode: task.measureCode,
        taskId: String(task._id),
        phase: task.phase,
        dueAt: task.dueAt,
        overdueDays: task.overdueDays || 0,
        branchId: task.branchId ? String(task.branchId) : null,
      },
      link: `/care-plans?beneficiary=${String(task.beneficiaryId)}&task=${String(task._id)}`,
    };
  }
}

const singleton = new ReassessmentReminderCascadeSvc();
module.exports = singleton;
module.exports.PHASE_POLICY = PHASE_POLICY;
module.exports.PHASES_TO_FIRE = PHASES_TO_FIRE;
