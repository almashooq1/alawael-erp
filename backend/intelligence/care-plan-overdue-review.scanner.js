'use strict';

/**
 * care-plan-overdue-review.scanner.js — Wave 50.
 *
 * Scans approved plans for `reviewSchedule.nextReviewAt` past due and
 * emits escalating notifications per Wave-41 NOTIFICATION_SLA:
 *
 *   day 0–1 overdue     → therapist + supervisor inbox       (level 'info')
 *   day 2–13 overdue    → supervisor inbox + push            (level 'warning')
 *   day 14+ overdue     → branch_manager + SMS               (level 'critical')
 *
 * Pure scanner: caller (cron / job-queue) invokes `runOnce({ now })`.
 * The scanner does NOT decide WHEN to run — only WHAT is overdue.
 *
 * Idempotency:
 *   The scanner tags each notification with a `dedupeKey` that is
 *   stable per (planVersionId, severityLevel). The notifier is
 *   expected to drop duplicates — so we can run hourly without
 *   spamming.
 *
 * Returns:
 *   {
 *     scanned, overdue,
 *     bySeverity: { info, warning, critical },
 *     notifications: [{ planVersionId, daysOverdue, level, recipients }],
 *     errors: []
 *   }
 */

const reg = require('./care-planning.registry');

const DEFAULTS = Object.freeze({
  limitPerRun: 200,
  // Active statuses that are eligible for review-due tracking
  eligibleStatuses: ['approved', 'saved_to_record', 'family_notification_sent'],
});

const SEVERITY = Object.freeze({
  INFO: 'info', // 0–1 day overdue
  WARNING: 'warning', // 2–13 days
  CRITICAL: 'critical', // 14+ days
});

function _classifySeverity(daysOverdue) {
  if (daysOverdue < 0) return null;
  if (daysOverdue < reg.NOTIFICATION_SLA.OVERDUE_REVIEW_DAYS) return SEVERITY.INFO;
  if (daysOverdue < reg.NOTIFICATION_SLA.OVERDUE_REVIEW_CRITICAL_DAYS) return SEVERITY.WARNING;
  return SEVERITY.CRITICAL;
}

function _dedupeKey(planVersionId, severity) {
  return `care-plan.overdue-review.${planVersionId}.${severity}`;
}

/**
 * Recipients per severity:
 *   info     → therapist (author) + supervisor (reviewer)
 *   warning  → supervisor + (push channel)
 *   critical → branch_manager + SMS
 */
async function _resolveRecipients(pv, severity, resolveAudienceForRole) {
  const list = [];
  if (severity === SEVERITY.INFO) {
    if (pv.authorId)
      list.push({ userId: String(pv.authorId), channel: 'inbox', role: 'therapist' });
    if (pv.reviewerId)
      list.push({ userId: String(pv.reviewerId), channel: 'inbox', role: 'clinical_supervisor' });
  } else if (severity === SEVERITY.WARNING) {
    if (pv.reviewerId)
      list.push({
        userId: String(pv.reviewerId),
        channel: 'inbox+push',
        role: 'clinical_supervisor',
      });
  } else if (severity === SEVERITY.CRITICAL) {
    if (typeof resolveAudienceForRole === 'function') {
      try {
        const branch = await resolveAudienceForRole('branch_manager', String(pv.branchId || ''));
        for (const b of branch || []) {
          list.push({ ...b, channel: 'inbox+sms', role: 'branch_manager' });
        }
      } catch (_) {
        /* best effort */
      }
    }
  }
  return list;
}

/**
 * @param {object} deps
 *   - planVersionModel       Mongoose model
 *   - notifier               { send: async({event, audience, payload, dedupeKey}) }
 *   - resolveAudienceForRole optional fn for branch_manager lookups
 *   - logger                 console-compatible
 *   - now                    () → Date
 *   - metrics                optional { incOverdue(severity), observeDaysOverdue(d) }
 */
function createOverdueReviewScanner({
  planVersionModel = null,
  unifiedPlanModel = null, // W1253 — ADR-040 (b): also scan UnifiedCarePlan (the model the UI writes)
  notifier = null,
  resolveAudienceForRole = null,
  logger = console,
  now = () => new Date(),
  metrics = null,
} = {}) {
  if (!planVersionModel) {
    throw new Error('overdue-review.scanner: planVersionModel is required');
  }

  // W1253 — UnifiedCarePlan live statuses + field mapping. The UI writes
  // UnifiedCarePlan (status active/under_review, due date at nextReviewDate,
  // author at createdBy, approver at approvedBy); the scanner's internal
  // shape stays CarePlanVersion-like so severity/dedupe/notify logic is
  // shared verbatim across both sources.
  const UNIFIED_ELIGIBLE_STATUSES = ['active', 'under_review'];
  function _normalizeUnified(p) {
    return {
      _id: p._id,
      planId: p.planNumber || String(p._id),
      branchId: p.branchId,
      authorId: p.createdBy,
      reviewerId: p.approvedBy,
      reviewSchedule: { nextReviewAt: p.nextReviewDate },
      source: 'unified',
    };
  }

  async function runOnce({ limit = DEFAULTS.limitPerRun } = {}) {
    const t = now();
    const summary = {
      scanned: 0,
      overdue: 0,
      bySeverity: { info: 0, warning: 0, critical: 0 },
      notifications: [],
      errors: [],
      ranAt: t.toISOString(),
    };

    let candidates = [];
    try {
      const cursor = planVersionModel.find({
        status: { $in: DEFAULTS.eligibleStatuses },
        'reviewSchedule.nextReviewAt': { $lte: t },
      });
      if (cursor && typeof cursor.limit === 'function') {
        candidates = await cursor.limit(limit).lean();
      } else if (cursor && typeof cursor.exec === 'function') {
        candidates = await cursor.exec();
      } else if (Array.isArray(cursor)) {
        candidates = cursor;
      } else if (cursor && typeof cursor.then === 'function') {
        candidates = await cursor;
      }
    } catch (err) {
      summary.errors.push({ phase: 'query', message: err.message });
      return summary;
    }

    candidates = Array.isArray(candidates) ? candidates : [];

    // W1253 — second source: UnifiedCarePlan (UI-authored plans). Optional +
    // fail-soft: a query error here never blocks the legacy scan.
    if (unifiedPlanModel) {
      try {
        const uCursor = unifiedPlanModel.find({
          isDeleted: { $ne: true },
          status: { $in: UNIFIED_ELIGIBLE_STATUSES },
          nextReviewDate: { $lte: t, $ne: null },
        });
        let uRows = [];
        if (uCursor && typeof uCursor.limit === 'function') {
          uRows = await uCursor.limit(limit).lean();
        } else if (uCursor && typeof uCursor.exec === 'function') {
          uRows = await uCursor.exec();
        } else if (Array.isArray(uCursor)) {
          uRows = uCursor;
        } else if (uCursor && typeof uCursor.then === 'function') {
          uRows = await uCursor;
        }
        candidates = candidates.concat((Array.isArray(uRows) ? uRows : []).map(_normalizeUnified));
      } catch (err) {
        summary.errors.push({ phase: 'query-unified', message: err.message });
      }
    }

    summary.scanned = candidates.length;

    for (const pv of candidates) {
      const next = pv.reviewSchedule?.nextReviewAt;
      if (!next) continue;
      const dueDate = new Date(next);
      if (Number.isNaN(dueDate.getTime()) || dueDate > t) continue;

      const daysOverdue = Math.floor((t.getTime() - dueDate.getTime()) / 86400000);
      const severity = _classifySeverity(daysOverdue);
      if (!severity) continue;

      summary.overdue += 1;
      summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;

      const recipients = await _resolveRecipients(pv, severity, resolveAudienceForRole);
      const dedupeKey = _dedupeKey(String(pv._id), severity);

      if (notifier && typeof notifier.send === 'function') {
        try {
          await notifier.send({
            event: 'care-plan.review.overdue',
            audience: recipients,
            payload: {
              planVersionId: String(pv._id),
              planId: pv.planId,
              daysOverdue,
              severity,
              nextReviewAt: dueDate.toISOString(),
              source: pv.source || 'legacy', // W1253 — which care-plan model
            },
            dedupeKey,
          });
        } catch (err) {
          summary.errors.push({
            phase: 'notify',
            planVersionId: String(pv._id),
            message: err.message,
          });
          logger.warn && logger.warn(`[overdue-review] notify failed: ${err.message}`);
        }
      }

      if (metrics && typeof metrics.incOverdue === 'function') metrics.incOverdue(severity);
      if (metrics && typeof metrics.observeDaysOverdue === 'function')
        metrics.observeDaysOverdue(daysOverdue);

      summary.notifications.push({
        planVersionId: String(pv._id),
        daysOverdue,
        level: severity,
        recipientCount: recipients.length,
        dedupeKey,
      });
    }

    return summary;
  }

  return Object.freeze({ runOnce, _classifySeverity, _dedupeKey });
}

module.exports = {
  createOverdueReviewScanner,
  SEVERITY,
  DEFAULTS,
};
