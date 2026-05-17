'use strict';

/**
 * care-plan-role-views.service.js — Wave 48.
 *
 * Spec §21: emit 4 different views of the SAME plan body, each scoped
 * to a role. PURE: no I/O, no LLM.
 *
 *   role 'clinician_working'    → full body + evidenceRefs + confidence
 *                                  + measures detail (no redaction)
 *   role 'supervisor_review'    → scorecard + diff-vs-prev + risks +
 *                                  compliance flags; omits day-to-day
 *                                  scheduling detail
 *   role 'branch_escalation'    → financial + resource + impact +
 *                                  risk profile + alternatives;
 *                                  omits per-goal clinical detail
 *   role 'family_friendly'      → forwards to Wave-43 family generator
 *                                  for the actual Markdown (this module
 *                                  just exposes the metadata for it)
 *
 * Every view carries: derivedFrom (planVersionId), viewProfile (role),
 * redactionHash (sha-256 of the view JSON), so the audit trail can
 * prove which version was shown to whom.
 */

const crypto = require('crypto');
const reg = require('./care-planning.registry');
const familyGen = require('./family-version-generator.service');

const VIEW_PROFILES = Object.freeze({
  CLINICIAN_WORKING: 'clinician_working',
  SUPERVISOR_REVIEW: 'supervisor_review',
  BRANCH_ESCALATION: 'branch_escalation',
  FAMILY_FRIENDLY: 'family_friendly',
});

function _redactionHash(payload) {
  const canonical = JSON.stringify(payload, Object.keys(payload || {}).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// Strip nested fields named in the set, return new object (no mutation).
function _stripFields(input, fieldSet) {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(v => _stripFields(v, fieldSet));
  if (typeof input !== 'object') return input;
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (fieldSet.has(key)) continue;
    out[key] = _stripFields(value, fieldSet);
  }
  return out;
}

// ─── 1. Clinician Working View ───────────────────────────────────

function renderClinicianWorking(plan) {
  const body = plan.toObject ? plan.toObject() : plan;
  // Clinician sees almost everything; only strip raw caregiver PII
  // (e.g. national IDs) that should never live here anyway.
  const STRIP = new Set(['nationalId', 'phone_pii', 'address_full']);
  const safe = _stripFields(body, STRIP);
  return {
    viewProfile: VIEW_PROFILES.CLINICIAN_WORKING,
    derivedFrom: String(body._id || body.planId),
    planType: body.planType,
    versionNumber: body.versionNumber,
    status: body.status,
    body: safe,
    redactionHash: _redactionHash(safe),
    generatedAt: new Date().toISOString(),
  };
}

// ─── 2. Supervisor Review View ───────────────────────────────────

function renderSupervisorReview(plan, { previousPlan = null } = {}) {
  const body = plan.toObject ? plan.toObject() : plan;
  const view = {
    viewProfile: VIEW_PROFILES.SUPERVISOR_REVIEW,
    derivedFrom: String(body._id || body.planId),
    planType: body.planType,
    versionNumber: body.versionNumber,
    status: body.status,
    rejectionCount: body.rejectionCount || 0,
    validation: body.validation || null,
    scorecard: body.reviewScorecard || null,
    rejection: body.rejection || null,
    safetyFlags: body.safetyFlags || [],
    goals: (body.goals || []).map(g => ({
      goalId: g.goalId,
      domain: g.domain,
      statement: g.statement,
      priorityScore: g.priorityScore,
      confidence: g.confidence,
      hasBaseline: !!g.baselineLink,
      hasMeasure: !!g.measureLink,
      hasAssessmentLink: !!g.assessmentLink,
    })),
    diffVsPrevious: previousPlan ? _shallowDiff(previousPlan, body) : null,
    complianceFlags: _complianceFlags(body),
    actionsAvailable: _supervisorActions(body),
  };
  view.redactionHash = _redactionHash(view);
  view.generatedAt = new Date().toISOString();
  return view;
}

function _shallowDiff(prev, cur) {
  const a = prev.toObject ? prev.toObject() : prev;
  const b = cur.toObject ? cur.toObject() : cur;
  const aGoals = new Set((a.goals || []).map(g => g.goalId));
  const bGoals = new Set((b.goals || []).map(g => g.goalId));
  return {
    addedGoals: [...bGoals].filter(g => !aGoals.has(g)),
    removedGoals: [...aGoals].filter(g => !bGoals.has(g)),
    planTypeChanged: a.planType !== b.planType,
    safetyChanged: JSON.stringify(a.safetyFlags || []) !== JSON.stringify(b.safetyFlags || []),
  };
}

function _complianceFlags(body) {
  const flags = [];
  if (!body.reviewSchedule?.nextReviewAt) flags.push('NO_REVIEW_DATE');
  for (const s of body.safetyFlags || []) {
    if (!s.mitigation) flags.push(`SAFETY_NO_MITIGATION:${s.flag}`);
  }
  if ((body.validation?.hardFailures || []).length > 0) flags.push('HARD_FAILURES_PRESENT');
  if (reg.isPlanTypeAlwaysEscalated(body.planType))
    flags.push('REQUIRES_BRANCH_MANAGER_ESCALATION');
  return flags;
}

function _supervisorActions(body) {
  const actions = [];
  switch (body.status) {
    case reg.STATUSES.SUBMITTED_TO_SUPERVISOR:
      actions.push('begin_review');
      break;
    case reg.STATUSES.UNDER_REVIEW:
      actions.push('approve', 'reject', 'request_revision', 'escalate');
      break;
    case reg.STATUSES.ESCALATED_TO_BRANCH_MANAGER:
      actions.push('view_only');
      break;
    default:
      actions.push('view_only');
  }
  return actions;
}

// ─── 3. Branch Manager Escalation View ───────────────────────────

function renderBranchEscalation(plan, { financialContext = {}, resourceContext = {} } = {}) {
  const body = plan.toObject ? plan.toObject() : plan;
  const view = {
    viewProfile: VIEW_PROFILES.BRANCH_ESCALATION,
    derivedFrom: String(body._id || body.planId),
    planType: body.planType,
    versionNumber: body.versionNumber,
    status: body.status,
    summary: {
      goalCount: (body.goals || []).length,
      programCount: (body.programs || []).length,
      safetyFlagCount: (body.safetyFlags || []).length,
      rejectionCount: body.rejectionCount || 0,
      readinessScore: body.validation?.readinessScore || 0,
      reviewOverall: body.reviewScorecard?.overall || null,
    },
    impact: {
      affectedBeneficiaryId: String(body.beneficiaryId || ''),
      affectedBranchId: String(body.branchId || ''),
      sessionsPerWeekRequired: (body.programs || []).reduce(
        (s, p) => s + Number(p.frequencyPerWeek || 0),
        0
      ),
    },
    resourceProfile: {
      capacityCap: body.sessionsPerWeekCap || null,
      currentLoad: resourceContext.currentLoad || null,
      headcountAvailable: resourceContext.headcountAvailable || null,
    },
    financialImpact: {
      budgetTier: financialContext.budgetTier || 'standard',
      approxMonthlyCost: financialContext.approxMonthlyCost || null,
      authorizationStatus: financialContext.authorizationStatus || null,
    },
    riskProfile: {
      complianceFlags: _complianceFlags(body),
      safetyConcerns: (body.safetyFlags || []).map(s => ({
        flag: s.flag,
        severity: s.severity,
        mitigationPresent: !!s.mitigation,
      })),
      escalationReason: _escalationReason(body),
    },
    alternatives: _branchAlternatives(body),
    actionsAvailable: ['approve', 'reject', 'request_revision', 'refer_to_case_conference'],
  };
  view.redactionHash = _redactionHash(view);
  view.generatedAt = new Date().toISOString();
  return view;
}

function _escalationReason(body) {
  if (reg.isPlanTypeAlwaysEscalated(body.planType)) return 'plan_type_requires_escalation';
  if ((body.rejectionCount || 0) >= reg.APPROVAL_RULES.ESCALATE_AFTER_REJECTIONS)
    return 'rejection_count_threshold';
  if ((body.safetyFlags || []).some(s => s.severity === 'critical')) return 'critical_safety_flag';
  return 'manual_escalation';
}

function _branchAlternatives(body) {
  const alternatives = [];
  if (body.planType === 'intensive') {
    alternatives.push({
      option: 'standard individual plan',
      tradeoff: 'lower session intensity; longer total duration',
    });
  }
  if ((body.rejectionCount || 0) >= 2) {
    alternatives.push({
      option: 'case conference with multi-disciplinary team',
      tradeoff: 'delays start; improves consensus',
    });
  }
  if ((body.programs || []).length > 4) {
    alternatives.push({
      option: 'reduce program count',
      tradeoff: 'less load on family; possibly slower progress on minor goals',
    });
  }
  return alternatives;
}

// ─── 4. Family-Friendly View (delegates to Wave-43) ──────────────

function renderFamilyFriendly(plan, ctx = {}) {
  const body = plan.toObject ? plan.toObject() : plan;
  const generated = familyGen.generate(body, ctx);
  return {
    viewProfile: VIEW_PROFILES.FAMILY_FRIENDLY,
    derivedFrom: String(body._id || body.planId),
    requiresRewrite: generated.requiresRewrite,
    markdown: generated.markdown,
    readability: generated.readability,
    redactionHash: _redactionHash({ md: generated.markdown }),
    generatedAt: generated.generatedAt,
    forbiddenTermsFound: generated.forbiddenTermsFound,
    missingSections: generated.missingSections,
  };
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render any of the 4 role views from one plan body. Single chokepoint.
 *
 * @param {string} profile  one of VIEW_PROFILES.*
 * @param {object} plan     plan-version body
 * @param {object} options  view-specific context
 */
function renderView(profile, plan, options = {}) {
  switch (profile) {
    case VIEW_PROFILES.CLINICIAN_WORKING:
      return renderClinicianWorking(plan);
    case VIEW_PROFILES.SUPERVISOR_REVIEW:
      return renderSupervisorReview(plan, options);
    case VIEW_PROFILES.BRANCH_ESCALATION:
      return renderBranchEscalation(plan, options);
    case VIEW_PROFILES.FAMILY_FRIENDLY:
      return renderFamilyFriendly(plan, options);
    default:
      return { ok: false, reason: 'UNKNOWN_VIEW_PROFILE', profile };
  }
}

function listViewProfiles() {
  return Object.values(VIEW_PROFILES);
}

module.exports = {
  renderView,
  renderClinicianWorking,
  renderSupervisorReview,
  renderBranchEscalation,
  renderFamilyFriendly,
  listViewProfiles,
  VIEW_PROFILES,
};
