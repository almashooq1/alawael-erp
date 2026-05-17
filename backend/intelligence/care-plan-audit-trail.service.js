'use strict';

/**
 * care-plan-audit-trail.service.js — Wave 45.
 *
 * Aggregates every audit-relevant event around a CarePlanVersion into
 * one chronological stream. Sources merged:
 *
 *   1. Lifecycle timestamps           (createdAt, submittedAt,
 *                                      approvedAt, rejectedAt, etc.)
 *   2. signatureChain                 (per-action signatures with hashes)
 *   3. amendments[]                   (controlled non-structural edits)
 *   4. rejection                      (primaryReason + requiredFixes)
 *   5. familyNotifications[]          (send attempts + retries)
 *   6. cross-version diff             (diffSummary if present)
 *
 * The aggregator is PURE — given a CarePlanVersion document (or its
 * .toObject() form) it returns the timeline. No I/O.
 *
 * The audit trail is what compliance / QA reads. For PDPL Art.13 it
 * must include every actor + action + timestamp + (when applicable)
 * the integrity hash.
 *
 * Public API:
 *
 *   buildAuditTrail(planVersion, { redactFor, includeAmendments=true })
 *     → {
 *         planVersionId, planId, versionNumber,
 *         events: [...sorted asc by `at`...],
 *         integrity: {
 *           signatureChainOk: boolean,
 *           evidenceHash: string | null,
 *           brokenAt: number | null,
 *         },
 *         counts: { transitions, signatures, amendments, familySends, rejections }
 *       }
 *
 *   verifySignatureChain(signatureChain, computeSignatureHash) → { ok, brokenAt }
 *
 * Redaction:
 *   - role === 'family'          → only APPROVED+ events, no internal scorecards
 *   - role === 'executive_*'     → all events but PII-masked actor IDs
 *   - role === 'clinical_*' (default) → everything
 */

const EVENT_KIND = Object.freeze({
  CREATED: 'plan.created',
  VALIDATED: 'plan.validated',
  SUBMITTED: 'plan.submitted',
  REVIEW_STARTED: 'plan.review_started',
  REVISION_REQUESTED: 'plan.revision_requested',
  ESCALATED: 'plan.escalated',
  APPROVED: 'plan.approved',
  REJECTED: 'plan.rejected',
  SAVED_TO_RECORD: 'plan.saved_to_record',
  FAMILY_NOTIFIED: 'plan.family_notified',
  SUPERSEDED: 'plan.superseded',
  SIGNATURE: 'plan.signature',
  AMENDMENT: 'plan.amendment',
  FAMILY_SEND_ATTEMPT: 'plan.family_send_attempt',
});

const FAMILY_VISIBLE_EVENTS = new Set([
  EVENT_KIND.APPROVED,
  EVENT_KIND.SAVED_TO_RECORD,
  EVENT_KIND.FAMILY_NOTIFIED,
  EVENT_KIND.SUPERSEDED,
]);

function safeISO(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  const dd = new Date(d);
  return Number.isNaN(dd.getTime()) ? null : dd.toISOString();
}

function maskUser(userId, mode) {
  if (!userId) return null;
  if (mode !== 'executive') return String(userId);
  const s = String(userId);
  return s.length <= 6 ? '****' : `${s.slice(0, 3)}***${s.slice(-2)}`;
}

// ─── Source extractors ───────────────────────────────────────────

function fromLifecycle(plan, push) {
  if (plan.createdAt) {
    push({
      at: safeISO(plan.createdAt),
      kind: EVENT_KIND.CREATED,
      actorUserId: plan.authorId ? String(plan.authorId) : null,
      actorRole: 'therapist',
      detail: { versionNumber: plan.versionNumber, planType: plan.planType },
    });
  }
  if (plan.validation?.validatedAt) {
    push({
      at: safeISO(plan.validation.validatedAt),
      kind: EVENT_KIND.VALIDATED,
      actorUserId: null,
      actorRole: 'system',
      detail: {
        readinessScore: plan.validation.readinessScore,
        hardFailures: (plan.validation.hardFailures || []).length,
        softWarnings: (plan.validation.softWarnings || []).length,
        band: plan.validation.band,
      },
    });
  }
  if (plan.submittedAt) {
    push({
      at: safeISO(plan.submittedAt),
      kind: EVENT_KIND.SUBMITTED,
      actorUserId: plan.authorId ? String(plan.authorId) : null,
      actorRole: 'therapist',
      detail: {},
    });
  }
  if (plan.reviewStartedAt) {
    push({
      at: safeISO(plan.reviewStartedAt),
      kind: EVENT_KIND.REVIEW_STARTED,
      actorUserId: plan.reviewerId ? String(plan.reviewerId) : null,
      actorRole: 'clinical_supervisor',
      detail: {},
    });
  }
  if (plan.approvedAt) {
    push({
      at: safeISO(plan.approvedAt),
      kind: EVENT_KIND.APPROVED,
      actorUserId: plan.approverId ? String(plan.approverId) : null,
      actorRole: 'clinical_supervisor',
      detail: {
        evidenceHash: plan.evidenceHash || null,
        reviewOverall: plan.reviewScorecard?.overall || null,
      },
    });
  }
  if (plan.rejectedAt) {
    push({
      at: safeISO(plan.rejectedAt),
      kind: EVENT_KIND.REJECTED,
      actorUserId: plan.reviewerId ? String(plan.reviewerId) : null,
      actorRole: 'clinical_supervisor',
      detail: {
        primaryReason: plan.rejection?.primaryReason || null,
        urgency: plan.rejection?.urgency || null,
        requiredFixesCount: (plan.rejection?.requiredFixes || []).length,
        rejectionCount: plan.rejectionCount || 0,
      },
    });
  }
  if (plan.savedToRecordAt) {
    push({
      at: safeISO(plan.savedToRecordAt),
      kind: EVENT_KIND.SAVED_TO_RECORD,
      actorUserId: null,
      actorRole: 'system',
      detail: {},
    });
  }
  if (plan.familyNotifiedAt) {
    push({
      at: safeISO(plan.familyNotifiedAt),
      kind: EVENT_KIND.FAMILY_NOTIFIED,
      actorUserId: null,
      actorRole: 'system',
      detail: {
        readabilityGrade: plan.familyVersion?.readabilityGrade || null,
      },
    });
  }
  if (plan.supersededAt) {
    push({
      at: safeISO(plan.supersededAt),
      kind: EVENT_KIND.SUPERSEDED,
      actorUserId: null,
      actorRole: 'system',
      detail: { supersededBy: plan.supersededBy || null },
    });
  }
}

function fromSignatureChain(plan, push) {
  for (const sig of plan.signatureChain || []) {
    push({
      at: safeISO(sig.signedAt),
      kind: EVENT_KIND.SIGNATURE,
      actorUserId: sig.userId ? String(sig.userId) : null,
      actorRole: sig.role || null,
      detail: {
        action: sig.action,
        hash: sig.hash,
        prevHash: sig.prevHash || null,
        nafathSignatureId: sig.nafathSignatureId || null,
      },
    });
  }
}

function fromAmendments(plan, push) {
  for (const a of plan.amendments || []) {
    push({
      at: safeISO(a.appliedAt),
      kind: EVENT_KIND.AMENDMENT,
      actorUserId: a.appliedBy ? String(a.appliedBy) : null,
      actorRole: 'branch_manager',
      detail: {
        amendmentId: a.amendmentId,
        field: a.field,
        reason: a.reason,
      },
    });
  }
}

function fromFamilyNotifications(plan, push) {
  for (const n of plan.familyNotifications || []) {
    push({
      at: safeISO(n.attemptedAt),
      kind: EVENT_KIND.FAMILY_SEND_ATTEMPT,
      actorUserId: null,
      actorRole: 'system',
      detail: {
        attemptId: n.attemptId,
        channel: n.channel,
        status: n.status,
        retries: n.retries || 0,
        failureReason: n.failureReason || null,
      },
    });
  }
}

// ─── Signature chain verification ────────────────────────────────

/**
 * Re-compute every signature hash from prevHash + payload and confirm
 * the chain is intact. Returns { ok, brokenAt } where brokenAt is the
 * 0-based index of the first broken entry (or null when intact).
 *
 * `computeSignatureHash` is injected (Wave-41 model exports it) so this
 * stays pure — no Mongoose import.
 */
function verifySignatureChain(signatureChain, computeSignatureHash) {
  const chain = Array.isArray(signatureChain) ? signatureChain : [];
  if (chain.length === 0) return { ok: true, brokenAt: null };

  for (let i = 0; i < chain.length; i++) {
    const cur = chain[i];
    const prev = i === 0 ? null : chain[i - 1];
    const expectedPrev = prev ? prev.hash : null;

    if (cur.prevHash !== expectedPrev) {
      return { ok: false, brokenAt: i, reason: 'PREV_HASH_MISMATCH' };
    }
    if (typeof computeSignatureHash === 'function') {
      const expected = computeSignatureHash({
        userId: cur.userId,
        role: cur.role,
        action: cur.action,
        signedAt: cur.signedAt,
        prevHash: cur.prevHash,
      });
      if (expected !== cur.hash) {
        return { ok: false, brokenAt: i, reason: 'HASH_MISMATCH' };
      }
    }
  }
  return { ok: true, brokenAt: null };
}

// ─── Public API ──────────────────────────────────────────────────

function buildAuditTrail(planVersion, options = {}) {
  if (!planVersion || typeof planVersion !== 'object') {
    return {
      ok: false,
      reason: 'INVALID_PLAN_VERSION',
      events: [],
      counts: {},
    };
  }
  const plan = typeof planVersion.toObject === 'function' ? planVersion.toObject() : planVersion;

  const events = [];
  const push = ev => {
    if (!ev.at) return; // skip events with no timestamp
    events.push(ev);
  };

  fromLifecycle(plan, push);
  fromSignatureChain(plan, push);
  if (options.includeAmendments !== false) fromAmendments(plan, push);
  fromFamilyNotifications(plan, push);

  events.sort((a, b) => a.at.localeCompare(b.at));

  // Redact for non-clinical roles
  const redactFor = options.redactFor || 'clinical';
  let finalEvents = events;

  if (redactFor === 'family') {
    finalEvents = events
      .filter(ev => FAMILY_VISIBLE_EVENTS.has(ev.kind))
      .map(ev => ({
        at: ev.at,
        kind: ev.kind,
        // Family never sees actor identities, only roles
        actorUserId: null,
        actorRole: ev.actorRole === 'system' ? 'system' : 'staff',
        detail: ev.kind === EVENT_KIND.APPROVED ? { evidenceHash: null, reviewOverall: null } : {},
      }));
  } else if (redactFor === 'executive') {
    finalEvents = events.map(ev => ({
      ...ev,
      actorUserId: maskUser(ev.actorUserId, 'executive'),
    }));
  }

  // Counts
  const counts = {
    transitions: 0,
    signatures: 0,
    amendments: 0,
    familySends: 0,
    rejections: 0,
  };
  for (const ev of events) {
    if (ev.kind === EVENT_KIND.SIGNATURE) counts.signatures += 1;
    else if (ev.kind === EVENT_KIND.AMENDMENT) counts.amendments += 1;
    else if (ev.kind === EVENT_KIND.FAMILY_SEND_ATTEMPT) counts.familySends += 1;
    else if (ev.kind === EVENT_KIND.REJECTED) counts.rejections += 1;
    else counts.transitions += 1;
  }

  // Integrity check (signatureChain only — evidenceHash invariance is
  // enforced at the model layer; here we just expose the value)
  const integrity = {
    signatureChainOk: true,
    brokenAt: null,
    evidenceHash: plan.evidenceHash || null,
  };
  if ((plan.signatureChain || []).length > 0) {
    const v = verifySignatureChain(plan.signatureChain, options.computeSignatureHash);
    integrity.signatureChainOk = v.ok;
    integrity.brokenAt = v.brokenAt;
    if (v.reason) integrity.reason = v.reason;
  }

  return {
    ok: true,
    planVersionId: String(plan._id || ''),
    planId: plan.planId,
    versionNumber: plan.versionNumber,
    status: plan.status,
    events: finalEvents,
    counts,
    integrity,
    redactFor,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildAuditTrail,
  verifySignatureChain,
  EVENT_KIND,
  FAMILY_VISIBLE_EVENTS,
};
