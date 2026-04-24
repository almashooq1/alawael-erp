'use strict';

/**
 * hrAnomalyReviewService.js — Phase 11 Commit 21 (4.0.38).
 *
 * Review workflow for `security.suspicious_activity` events raised
 * by the HR anomaly detector (C19). Ops/security close the loop:
 * read the event, investigate, mark reviewed with an outcome, and
 * the event stops counting in the dashboard's `pending_review_count`.
 *
 * Outcomes (fixed vocabulary — add new values here, not per-call):
 *
 *   confirmed_breach      actual policy violation; downstream
 *                         policy consumer (ticket, HR disciplinary,
 *                         termination workflow) triggered separately.
 *
 *   false_positive        the volume was legitimate (e.g. an HR_OFFICER
 *                         processing monthly payroll hit the reads
 *                         threshold). Reviewer notes explain WHY for
 *                         future threshold tuning.
 *
 *   needs_investigation   inconclusive; parked with notes for later.
 *                         Still counts as reviewed (removes from
 *                         `pending_review_count`) but surfaces in
 *                         a separate query bucket.
 *
 *   policy_exception      sanctioned one-off (e.g. CEO asked for
 *                         a one-time data dump for audit); not a
 *                         breach, not a policy issue.
 *
 * State machine:
 *
 *   pending (requiresReview:true) ── review ──→ reviewed (requiresReview:false)
 *                                                │
 *                                                │  terminal — cannot un-review
 *                                                ▼
 *                                               immutable decision + audit
 *
 * The review itself writes a second AuditLog event:
 * `data.updated` with `metadata.custom.action: 'anomaly_reviewed'`
 * + `reviewId` + outcome. Chain-of-custody: the subject of the
 * original anomaly sees BOTH events in their /me/access-log.
 *
 * Design decisions:
 *
 *   1. Idempotent: reviewing an already-reviewed anomaly returns
 *      `{ result: 'already_reviewed', currentOutcome }` so retries
 *      don't produce confusing state.
 *
 *   2. Self-review forbidden. If the anomaly targets `userId: X`
 *      and `X` tries to mark it reviewed, service returns
 *      `{ result: 'denied', reason: 'self_review_forbidden' }`.
 *      Security 101 — you can't close your own breach flag.
 *
 *   3. Reviewer must be MANAGER tier. Gate is route-layer; service
 *      just records the caller's declared role in the audit.
 *
 *   4. Notes are REQUIRED for certain outcomes (`false_positive`,
 *      `needs_investigation`, `policy_exception`). `confirmed_breach`
 *      allows empty notes since the followup workflow owns the
 *      narrative.
 *
 *   5. Audit service optional; when missing, reviews still apply
 *      but the chain-of-custody event is silently skipped.
 */

const VALID_OUTCOMES = Object.freeze([
  'confirmed_breach',
  'false_positive',
  'needs_investigation',
  'policy_exception',
]);

const OUTCOMES_REQUIRING_NOTES = new Set([
  'false_positive',
  'needs_investigation',
  'policy_exception',
]);

function createHrAnomalyReviewService(deps = {}) {
  const AuditLog = deps.auditLogModel;
  const auditService = deps.auditService || null;
  const nowFn = deps.now || (() => new Date());

  if (AuditLog == null) {
    throw new Error('hrAnomalyReviewService: auditLogModel is required');
  }

  async function listAnomalies({
    status = 'pending', // 'pending' | 'reviewed' | 'all'
    limit = 25,
    skip = 0,
  } = {}) {
    const base = {
      eventType: 'security.suspicious_activity',
      tags: { $in: ['hr:anomaly'] },
    };
    if (status === 'pending') {
      base['flags.requiresReview'] = true;
    } else if (status === 'reviewed') {
      base['flags.requiresReview'] = false;
    }

    const capped = Math.max(1, Math.min(Number.parseInt(limit, 10) || 25, 100));
    const skipN = Math.max(0, Number.parseInt(skip, 10) || 0);

    const [items, total] = await Promise.all([
      AuditLog.find(base).sort({ createdAt: -1 }).skip(skipN).limit(capped).lean(),
      AuditLog.countDocuments(base),
    ]);
    return { items, total, limit: capped, skip: skipN, statusFilter: status };
  }

  async function getAnomaly({ id }) {
    if (!id) return null;
    const doc = await AuditLog.findOne({
      _id: id,
      eventType: 'security.suspicious_activity',
      tags: { $in: ['hr:anomaly'] },
    }).lean();
    return doc;
  }

  /**
   * Mark an anomaly reviewed.
   *
   * Returns one of:
   *   { result: 'not_found' }
   *   { result: 'invalid_outcome' }
   *   { result: 'notes_required', outcome }
   *   { result: 'denied', reason: 'self_review_forbidden' }
   *   { result: 'already_reviewed', currentOutcome }
   *   { result: 'reviewed', anomaly }
   */
  async function reviewAnomaly({
    id,
    reviewerUserId,
    reviewerRole,
    outcome,
    notes = null,
    ipAddress = null,
  } = {}) {
    if (!id) return { result: 'not_found' };
    if (!reviewerUserId) return { result: 'denied', reason: 'reviewer_required' };
    if (!VALID_OUTCOMES.includes(outcome)) {
      return { result: 'invalid_outcome', validOutcomes: [...VALID_OUTCOMES] };
    }
    if (OUTCOMES_REQUIRING_NOTES.has(outcome)) {
      if (typeof notes !== 'string' || notes.trim().length === 0) {
        return { result: 'notes_required', outcome };
      }
    }

    const existing = await AuditLog.findOne({
      _id: id,
      eventType: 'security.suspicious_activity',
      tags: { $in: ['hr:anomaly'] },
    });
    if (!existing) return { result: 'not_found' };

    // Already-reviewed guard — decision is immutable. Safe for retries.
    const priorReview =
      existing.metadata && existing.metadata.custom && existing.metadata.custom.review;
    if (priorReview && priorReview.outcome) {
      return {
        result: 'already_reviewed',
        currentOutcome: priorReview.outcome,
        reviewedAt: priorReview.reviewedAt,
        reviewedBy: priorReview.reviewerUserId,
      };
    }

    // Self-review guard — subject of the anomaly cannot close their own flag.
    if (existing.userId && String(existing.userId) === String(reviewerUserId)) {
      return { result: 'denied', reason: 'self_review_forbidden' };
    }

    const now = nowFn();
    const reviewPayload = {
      reviewerUserId: String(reviewerUserId),
      reviewerRole: reviewerRole || null,
      outcome,
      notes: notes ? String(notes).trim() : null,
      reviewedAt: now.toISOString(),
    };

    // Mongoose strict:true rejects unknown paths in nested Mixed
    // objects; overlay via direct $set of the metadata.custom subtree
    // to stay safe with the auditLog.model schema.
    const existingCustom = (existing.metadata && existing.metadata.custom) || {};
    const updatedCustom = { ...existingCustom, review: reviewPayload };

    await AuditLog.updateOne(
      { _id: id },
      {
        $set: {
          'flags.requiresReview': false,
          'metadata.custom': updatedCustom,
        },
      }
    );

    // Chain-of-custody: the review itself is an audit event —
    // subject sees "your anomaly was reviewed" in their access-log.
    if (auditService && typeof auditService.logHrAccess === 'function') {
      auditService
        .logHrAccess({
          actorUserId: reviewerUserId,
          actorRole: reviewerRole,
          entityType: 'anomaly',
          entityId: String(id),
          action: 'anomaly_reviewed',
          isSelfAccess: false,
          ipAddress,
          metadata: {
            subjectUserId: existing.userId ? String(existing.userId) : null,
            reason: (existingCustom && existingCustom.reason) || null,
            outcome,
          },
        })
        .catch(() => {});
    }

    const after = await AuditLog.findById(id).lean();
    return { result: 'reviewed', anomaly: after };
  }

  return Object.freeze({
    listAnomalies,
    getAnomaly,
    reviewAnomaly,
    VALID_OUTCOMES,
  });
}

module.exports = {
  createHrAnomalyReviewService,
  VALID_OUTCOMES,
  OUTCOMES_REQUIRING_NOTES,
};
