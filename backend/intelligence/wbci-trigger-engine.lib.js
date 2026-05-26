'use strict';

/**
 * wbci-trigger-engine.lib.js — W471.
 *
 * Pure trigger-orchestration library that translates WBCI snapshot
 * triggers (computed by W467 family-wbci.lib) into concrete operational
 * actions:
 *   • respite_booking_offered      → schedule W363 RespiteBooking
 *   • family_counsellor_consult    → schedule W470 FamilyCounsellingSession
 *   • family_counsellor_urgent     → schedule W470 + flag priority='critical'
 *   • financial_navigation_review  → refresh W469 FinancialNavigationPlan
 *   • sibling_support_referral     → recommend W462 self-advocacy track
 *                                    for sibling + schedule sibling check-in
 *
 * Per Phase C Innovation 4. Trigger engine is the operational "feedback
 * loop" that closes the gap between WBCI signal and action.
 *
 * Pure functions only. No DB. The caller (a service or scheduler) is
 * responsible for actually creating the linked entities — this lib
 * produces the ACTION PROPOSALS only.
 *
 * SAFETY: never creates duplicate proposals if an active intervention
 * already exists. The caller passes in the existing-intervention state
 * via the activeInterventions parameter.
 */

const PROPOSAL_KINDS = Object.freeze([
  'respite_booking',
  'counselling_session_consult',
  'counselling_session_urgent',
  'financial_review',
  'sibling_referral',
  'peer_mentor_match',
  'extended_family_meeting',
]);

const PRIORITIES = Object.freeze(['critical', 'high', 'medium', 'low']);

/**
 * Translate a WBCI snapshot's triggeredActions[] into concrete proposals.
 *
 * @param {Object} snapshot — { wbci, band, triggeredActions[] }
 * @param {Object} [opts]
 * @param {Array<{kind, status}>} [opts.activeInterventions] — existing open
 *                                                              interventions to dedupe
 * @returns {{ proposals: Array, dedupedKinds: Array }}
 */
function proposeActions(snapshot, opts = {}) {
  if (!snapshot || !Array.isArray(snapshot.triggeredActions)) {
    return { proposals: [], dedupedKinds: [] };
  }

  const active = opts.activeInterventions || [];
  const activeKinds = new Set(active.map(a => a.kind));
  const proposals = [];
  const deduped = [];

  for (const t of snapshot.triggeredActions) {
    const kind = _actionToProposalKind(t.action);
    if (!kind) continue;

    if (activeKinds.has(kind)) {
      deduped.push(kind);
      continue;
    }

    proposals.push({
      kind,
      priority: t.priority || 'medium',
      reason: t.reason || '',
      sourceAction: t.action,
      proposedAt: new Date().toISOString(),
      // The caller maps this to the real entity creation
      entityHint: _entityHintFor(kind),
    });
  }

  return { proposals, dedupedKinds: deduped };
}

function _actionToProposalKind(action) {
  switch (action) {
    case 'respite_booking_offered':
      return 'respite_booking';
    case 'family_counsellor_consult':
      return 'counselling_session_consult';
    case 'family_counsellor_urgent':
      return 'counselling_session_urgent';
    case 'financial_navigation_review':
      return 'financial_review';
    case 'sibling_support_referral':
      return 'sibling_referral';
    default:
      return null;
  }
}

function _entityHintFor(kind) {
  switch (kind) {
    case 'respite_booking':
      return { model: 'RespiteBooking', service: 'respite.service' };
    case 'counselling_session_consult':
    case 'counselling_session_urgent':
      return { model: 'FamilyCounsellingSession', service: 'familyCounselling.service' };
    case 'financial_review':
      return { model: 'FinancialNavigationPlan', service: 'financialNavigation.service' };
    case 'sibling_referral':
      return { model: 'SelfAdvocacyTrainingPlan', service: 'selfAdvocacy.service' };
    default:
      return null;
  }
}

/**
 * Add cooldown — don't propose the same kind more than once within N days
 * of the last proposal even if WBCI still triggers it. Caller passes in
 * the proposal-history for the family.
 *
 * @param {Array} proposals — new proposals from proposeActions
 * @param {Array<{kind, proposedAt}>} history — prior proposals
 * @param {number} cooldownDays — default 7
 * @returns {Array} — proposals with cooledDown entries flagged
 */
function applyCooldown(proposals, history = [], cooldownDays = 7) {
  if (!Array.isArray(proposals)) return [];
  const cutoff = Date.now() - cooldownDays * 86400000;
  const recentKinds = new Set(
    (history || []).filter(h => new Date(h.proposedAt).getTime() >= cutoff).map(h => h.kind)
  );
  return proposals.map(p => ({
    ...p,
    cooledDown: recentKinds.has(p.kind),
  }));
}

/**
 * Determine if the engine should ESCALATE to a manual case-manager review
 * (in addition to the auto-proposed actions). Escalation is triggered when:
 *   • WBCI in 'crisis' band, OR
 *   • ≥2 high-priority proposals stack, OR
 *   • Sustained-decline pattern detected
 */
function shouldEscalate(snapshot, proposals = [], hasSustainedDecline = false) {
  if (!snapshot) return false;
  if (snapshot.band === 'crisis') return true;
  if (hasSustainedDecline) return true;
  const highCount = proposals.filter(
    p => (p.priority === 'critical' || p.priority === 'high') && !p.cooledDown
  ).length;
  if (highCount >= 2) return true;
  return false;
}

/**
 * Full pipeline: snapshot + history + active interventions → final action plan.
 *
 * @param {Object} input — { snapshot, activeInterventions, proposalHistory,
 *                            hasSustainedDecline, cooldownDays }
 * @returns {{ proposals, escalate, dedupedKinds }}
 */
function plan(input = {}) {
  const {
    snapshot,
    activeInterventions = [],
    proposalHistory = [],
    hasSustainedDecline = false,
    cooldownDays = 7,
  } = input;

  const { proposals, dedupedKinds } = proposeActions(snapshot, { activeInterventions });
  const cooled = applyCooldown(proposals, proposalHistory, cooldownDays);
  const escalate = shouldEscalate(snapshot, cooled, hasSustainedDecline);
  return { proposals: cooled, escalate, dedupedKinds };
}

module.exports = Object.freeze({
  proposeActions,
  applyCooldown,
  shouldEscalate,
  plan,
  // Constants
  PROPOSAL_KINDS,
  PRIORITIES,
});
