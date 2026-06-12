'use strict';

/**
 * portal-plan-mapper.lib.js — W1272.
 *
 * PURE mapper: UnifiedCarePlan → the parent-portal care-plan payload.
 *
 * Why: the portal's GET /beneficiaries/:id/care-plan read ONLY the legacy
 * `CarePlan` model — so a parent of a beneficiary whose plan was authored
 * through the UI (UnifiedCarePlan, the canonical model per ADR-041) saw
 * "no active care plan", and the W1259 family version never reached the
 * family's own portal. This mapper feeds the same public payload shape the
 * portal UI already renders, plus the family-version markdown.
 *
 * Public-vocabulary guarantees (what families may see):
 *   • goal titles + coarse status only — no clinician notes, no `why`,
 *     no provenance, no evidence internals.
 *   • familyVersion.body is the W43-generator output that already passed
 *     the deterministic safety floor (readability + forbidden-term checks).
 */

const GOAL_STATUS_PUBLIC = Object.freeze({
  pending: 'NOT_STARTED',
  in_progress: 'IN_PROGRESS',
  achieved: 'ACHIEVED',
  discontinued: 'ON_HOLD',
  modified: 'IN_PROGRESS',
});

// Section paths mirror the legacy portal flattening + the lifeSkills group
// UnifiedCarePlan added; globalGoals are appended with MEDIUM priority.
const UNIFIED_GOAL_PATHS = Object.freeze([
  ['educational.domains.academic.goals', 'MEDIUM'],
  ['educational.domains.classroom.goals', 'MEDIUM'],
  ['educational.domains.communication.goals', 'HIGH'],
  ['therapeutic.domains.speech.goals', 'HIGH'],
  ['therapeutic.domains.occupational.goals', 'HIGH'],
  ['therapeutic.domains.physical.goals', 'MEDIUM'],
  ['therapeutic.domains.behavioral.goals', 'HIGH'],
  ['therapeutic.domains.psychological.goals', 'HIGH'],
  ['lifeSkills.domains.selfCare.goals', 'HIGH'],
  ['lifeSkills.domains.homeSkills.goals', 'MEDIUM'],
  ['lifeSkills.domains.social.goals', 'MEDIUM'],
  ['lifeSkills.domains.transport.goals', 'LOW'],
  ['lifeSkills.domains.financial.goals', 'LOW'],
  ['lifeSkills.domains.vocational.goals', 'MEDIUM'],
]);

function _dig(obj, dotted) {
  let cursor = obj;
  for (const k of dotted.split('.')) {
    cursor = cursor == null ? undefined : cursor[k];
    if (cursor == null) return undefined;
  }
  return cursor;
}

function _publicGoal(g, priority) {
  return {
    id: String(g._id || ''),
    nameAr: g.title || '—',
    status: GOAL_STATUS_PUBLIC[g.status] || 'NOT_STARTED',
    priority,
  };
}

/**
 * @param {Object} plan — a UnifiedCarePlan doc/lean object
 * @returns the portal payload (same shape the legacy branch returns,
 *          + familyVersion + source)
 */
function mapUnifiedPlanToPortalPayload(plan) {
  if (!plan || typeof plan !== 'object') return null;
  const src = typeof plan.toObject === 'function' ? plan.toObject() : plan;

  const goals = [];
  for (const [path, priority] of UNIFIED_GOAL_PATHS) {
    const arr = _dig(src, path);
    if (Array.isArray(arr)) for (const g of arr) goals.push(_publicGoal(g, priority));
  }
  for (const g of src.globalGoals || []) goals.push(_publicGoal(g, 'MEDIUM'));

  return {
    id: String(src._id || ''),
    summary: src.title_ar || (src.planNumber ? `خطة رقم ${src.planNumber}` : null),
    status: String(src.status || 'draft').toUpperCase(),
    startDate: src.startDate ? new Date(src.startDate).toISOString().slice(0, 10) : '',
    endDate: src.nextReviewDate ? new Date(src.nextReviewDate).toISOString().slice(0, 10) : null,
    goals,
    // W1259 family version — already safety-floor-gated at generation time.
    familyVersion: (src.familyVersion && src.familyVersion.body) || null,
    source: 'unified',
  };
}

module.exports = {
  mapUnifiedPlanToPortalPayload,
  GOAL_STATUS_PUBLIC,
  UNIFIED_GOAL_PATHS,
};
