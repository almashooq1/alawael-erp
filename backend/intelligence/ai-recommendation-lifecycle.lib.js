'use strict';

/**
 * W334 Pass 1 — AiRecommendationBundle lifecycle state machine.
 *
 * Pure-function lib (no mongoose dependency) so it can be unit-tested under
 * jest.mock('mongoose'). Mirrors the W325 P2 measure-lifecycle.lib.js pattern.
 *
 * The bundle is produced by AI recommendation pipelines (assessmentBundleAnalytics
 * plateau detection → assessmentRecommendationLlm narrative drafting). It carries
 * a confidence score + explainability signals + a draftAction. Bundles below
 * threshold are DISCARDED; the rest enter PENDING_REVIEW for clinical supervisor
 * review. Approval triggers a downstream plan_review transition (W41 + W332).
 *
 * States (6):
 *   DRAFT          — just produced by sweeper, confidence not yet thresholded
 *   DISCARDED      — confidence below threshold, auto-archived (terminal)
 *   PENDING_REVIEW — in supervisor queue
 *   APPROVED       — supervisor approved (MFA tier 2), terminal for this bundle
 *                    (downstream plan_review fires)
 *   REJECTED       — supervisor rejected with reasonCode (terminal)
 *   EXPIRED        — 7 days without action, sweeper expires (terminal)
 *
 * Transitions:
 *   DRAFT          → DISCARDED      (system, confidence < threshold)
 *   DRAFT          → PENDING_REVIEW (system, confidence ≥ threshold)
 *   PENDING_REVIEW → APPROVED       (clinical_supervisor, MFA 2)
 *   PENDING_REVIEW → REJECTED       (clinical_supervisor, reasonCode required)
 *   PENDING_REVIEW → EXPIRED        (system, 7d sweeper)
 *
 * Forbidden (drift guard catches if accidentally allowed):
 *   APPROVED/REJECTED/DISCARDED/EXPIRED → ANY  (all terminal)
 *   DRAFT → APPROVED                          (must go through PENDING_REVIEW)
 *   DRAFT → REJECTED                          (no human review = no rejection)
 */

const LIFECYCLE_STATES = Object.freeze([
  'DRAFT',
  'DISCARDED',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
]);

const VALID_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(['DISCARDED', 'PENDING_REVIEW']),
  DISCARDED: Object.freeze([]),
  PENDING_REVIEW: Object.freeze(['APPROVED', 'REJECTED', 'EXPIRED']),
  APPROVED: Object.freeze([]),
  REJECTED: Object.freeze([]),
  EXPIRED: Object.freeze([]),
});

const TERMINAL_STATES = Object.freeze(new Set(['DISCARDED', 'APPROVED', 'REJECTED', 'EXPIRED']));

const REQUIRED_REASON_TRANSITIONS = Object.freeze([['PENDING_REVIEW', 'REJECTED']]);

const REQUIRED_MFA_TIER_TRANSITIONS = Object.freeze({
  'PENDING_REVIEW->APPROVED': 2, // human approval is a significant action
  'PENDING_REVIEW->REJECTED': 1, // rejection is reversible (caller can re-trigger sweep)
});

// Confidence thresholds (rule-based, ADR-011 heuristic-first compliant)
const CONFIDENCE_THRESHOLDS = Object.freeze({
  DISCARD_BELOW: 0.5, // < 0.5 → DISCARDED automatically
  REVIEW_AT_OR_ABOVE: 0.7, // ≥ 0.7 → PENDING_REVIEW
  // 0.5 ≤ confidence < 0.7 → stays in DRAFT (debug/tuning bucket, not surfaced)
});

const DEFAULT_EXPIRY_DAYS = 7;

function isLifecycleState(s) {
  return LIFECYCLE_STATES.includes(s);
}

function isTerminal(s) {
  return TERMINAL_STATES.has(s);
}

function isValidLifecycleTransition(from, to) {
  if (!isLifecycleState(from) || !isLifecycleState(to)) return false;
  return VALID_TRANSITIONS[from].includes(to);
}

function reasonCodeRequired(from, to) {
  return REQUIRED_REASON_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

function requiredMfaTier(from, to) {
  return REQUIRED_MFA_TIER_TRANSITIONS[`${from}->${to}`] ?? null;
}

/**
 * Decide the auto-transition for a freshly-drafted bundle based on confidence.
 * @returns {'DISCARDED' | 'PENDING_REVIEW' | 'DRAFT'} — the target state
 */
function classifyByConfidence(confidence) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return 'DRAFT';
  if (confidence < CONFIDENCE_THRESHOLDS.DISCARD_BELOW) return 'DISCARDED';
  if (confidence >= CONFIDENCE_THRESHOLDS.REVIEW_AT_OR_ABOVE) return 'PENDING_REVIEW';
  return 'DRAFT';
}

/**
 * Build the audit-trail entry. Frozen, pure.
 */
function buildTransitionEntry({ from, to, actor, reasonCode, notes, at }) {
  return Object.freeze({
    fromStatus: from,
    toStatus: to,
    actor: actor || null,
    reasonCode: reasonCode || null,
    notes: notes || null,
    at: at || new Date(),
  });
}

/**
 * Validate a transition request end-to-end.
 * @returns {{ok: true, entry}} or {{ok: false, code, message}}
 *   Codes: INVALID_TRANSITION | REASON_CODE_REQUIRED | MFA_TIER_INSUFFICIENT
 */
function validateTransition({ from, to, actor, reasonCode, notes, mfaTier }) {
  if (!isValidLifecycleTransition(from, to)) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: `AiRecommendationBundle transition ${from} → ${to} is not permitted`,
    };
  }
  if (reasonCodeRequired(from, to) && !reasonCode) {
    return {
      ok: false,
      code: 'REASON_CODE_REQUIRED',
      message: `Transition ${from} → ${to} requires a reasonCode`,
    };
  }
  const requiredTier = requiredMfaTier(from, to);
  if (requiredTier != null && (mfaTier == null || mfaTier < requiredTier)) {
    return {
      ok: false,
      code: 'MFA_TIER_INSUFFICIENT',
      message: `Transition ${from} → ${to} requires MFA tier ${requiredTier}`,
    };
  }
  return {
    ok: true,
    entry: buildTransitionEntry({ from, to, actor, reasonCode, notes }),
  };
}

/**
 * Compute the expiry timestamp for a bundle entering PENDING_REVIEW.
 * @param {Date} from — typically the bundle's createdAt; default now
 * @param {number} days — override window; default 7
 */
function computeExpiry(from = new Date(), days = DEFAULT_EXPIRY_DAYS) {
  const out = new Date(from);
  out.setDate(out.getDate() + days);
  return out;
}

module.exports = {
  LIFECYCLE_STATES,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  REQUIRED_REASON_TRANSITIONS,
  REQUIRED_MFA_TIER_TRANSITIONS,
  CONFIDENCE_THRESHOLDS,
  DEFAULT_EXPIRY_DAYS,
  isLifecycleState,
  isTerminal,
  isValidLifecycleTransition,
  reasonCodeRequired,
  requiredMfaTier,
  classifyByConfidence,
  buildTransitionEntry,
  validateTransition,
  computeExpiry,
};
