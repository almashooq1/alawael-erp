'use strict';
/**
 * TransitionPlan → FHIR R4 CarePlan mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 25th FHIR resource mapper. A
 * transition plan is a multi-cycle bridge plan between life stages
 * (early-intervention → school → vocational → independent) with a readiness
 * assessment + milestone log
 * (intelligence/canonical/schemas/transition-plan.canonical.js, W361). FHIR
 * models a structured longitudinal plan as a CarePlan — the same base
 * resourceType the W1313 PlanOfCare / W1322 SensoryDietProgram / W1333
 * AdaptiveSportsProgram mappers produce. To keep them unambiguous on the wire
 * this mapper stamps a FIXED CarePlan.category discriminator
 * (`life-stage-transition`).
 *
 * SCOPE (additive, non-breaking): base FHIR R4 CarePlan only. Pure function: no
 * DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps the 6-state lifecycle onto the FHIR CarePlan.status value-set:
 *       draft → draft, readiness_assessed → active, in_progress → active,
 *       completed → completed, paused → on-hold, cancelled → revoked. The
 *       original status is also preserved losslessly in an extension.
 *   - intent = 'plan' (FIXED).
 *   - category = a FIXED discriminator CodeableConcept (`life-stage-transition`).
 *   - subject = the beneficiary (mandatory; CarePlan.subject is 1..1).
 *   - author = the transition lead (Practitioner).
 *   - activity[] = one CarePlan.activity per milestone, with the milestone
 *     domain as the activity code, the due date as scheduledTiming and the
 *     achievement instant carried in a nested extension.
 *   - the readiness assessment (composite + per-domain scores), placement
 *     transitions, planned/actual dates, branch, linked care-plan + IEP are all
 *     carried as namespaced extensions so nothing in the canonical record is
 *     lost.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const TP_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/careplan-category`;
const TP_CATEGORY_CODE = 'life-stage-transition';
const TP_DOMAIN_CODESYSTEM = `${ORG_FHIR_BASE}/CodeSystem/transition-domain`;
const TP_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-status`;
const TP_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-type`;
const TP_CURRENT_AGE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-current-age-months`;
const TP_CURRENT_PLACEMENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-current-placement`;
const TP_TARGET_PLACEMENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-target-placement`;
const TP_PLANNED_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-planned-date`;
const TP_ACTUAL_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-actual-date`;
const TP_DOMAIN_SCORE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-domain-score`;
const TP_COMPOSITE_READINESS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-composite-readiness`;
const TP_READINESS_ASSESSED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-readiness-assessed-at`;
const TP_MILESTONE_DETAIL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-milestone-detail`;
const TP_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-branch`;
const TP_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-linked-care-plan`;
const TP_IEP_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/transition-plan-linked-iep`;

/**
 * Canonical 6-state lifecycle → FHIR CarePlan.status value-set. The original
 * status is preserved losslessly in an extension.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  draft: 'draft',
  readiness_assessed: 'active',
  in_progress: 'active',
  completed: 'completed',
  paused: 'on-hold',
  cancelled: 'revoked',
});

/**
 * Milestone status → CarePlan.activity[].detail.status value-set.
 * @type {Record<string,string>}
 */
const MILESTONE_STATUS = Object.freeze({
  pending: 'not-started',
  in_progress: 'in-progress',
  achieved: 'completed',
  missed: 'stopped',
  cancelled: 'cancelled',
});

/**
 * Coerce a Date or loose date string into a FHIR `date` (YYYY-MM-DD).
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDate(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO).
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDateTime(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Map the canonical plan status onto the FHIR CarePlan.status value-set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'unknown';
  return STATUS_MAP[status] || 'unknown';
}

/**
 * Map a milestone status onto CarePlan.activity[].detail.status.
 * @param {string|undefined} status
 * @returns {string}
 */
function toMilestoneStatus(status) {
  return MILESTONE_STATUS[status] || 'unknown';
}

/**
 * Build the FIXED CarePlan.category[] discriminator (`life-stage-transition`).
 * @returns {Array<object>}
 */
function buildCategory() {
  return [
    {
      coding: [{ system: TP_CATEGORY_SYSTEM, code: TP_CATEGORY_CODE }],
      text: 'Life-Stage Transition Plan',
    },
  ];
}

/**
 * Build one CarePlan.activity per milestone. The milestone domain is the
 * activity code, the due date is scheduledTiming and the achievement instant
 * is carried in a nested namespaced extension.
 * @param {object} p plan
 * @returns {Array<object>|undefined}
 */
function buildActivities(p) {
  if (!Array.isArray(p.milestones) || !p.milestones.length) return undefined;
  const out = [];
  for (const m of p.milestones) {
    if (!m || typeof m !== 'object') continue;
    /** @type {Record<string, any>} */
    const detail = {
      status: toMilestoneStatus(m.status),
      description: m.title ? String(m.title) : undefined,
    };
    if (m.domain) {
      detail.code = {
        coding: [{ system: TP_DOMAIN_CODESYSTEM, code: String(m.domain) }],
        text: m.title ? String(m.title) : undefined,
      };
    }
    const due = toFhirDate(m.dueDate);
    if (due) detail.scheduledPeriod = { end: due };

    const parts = [];
    const achievedAt = toFhirDateTime(m.achievedAt);
    if (achievedAt) parts.push({ url: 'achievedAt', valueDateTime: achievedAt });
    if (m.status) parts.push({ url: 'milestoneStatus', valueCode: m.status });
    if (parts.length) {
      detail.extension = [{ url: TP_MILESTONE_DETAIL_EXTENSION_URL, extension: parts }];
    }
    out.push({ detail });
  }
  return out.length ? out : undefined;
}

/**
 * Build one nested extension per readiness domain score.
 * @param {object} ds domain score
 * @returns {object|undefined}
 */
function buildDomainScoreExtension(ds) {
  if (!ds || typeof ds !== 'object' || !ds.domain) return undefined;
  const parts = [{ url: 'domain', valueCode: String(ds.domain) }];
  if (typeof ds.score === 'number') parts.push({ url: 'score', valueInteger: ds.score });
  return { url: TP_DOMAIN_SCORE_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} p plan
 * @returns {Array<object>}
 */
function buildExtensions(p) {
  const ext = [];

  if (p.status) ext.push({ url: TP_STATUS_EXTENSION_URL, valueCode: p.status });
  if (p.transitionType) ext.push({ url: TP_TYPE_EXTENSION_URL, valueCode: p.transitionType });
  if (typeof p.currentAgeMonths === 'number') {
    ext.push({ url: TP_CURRENT_AGE_EXTENSION_URL, valueInteger: p.currentAgeMonths });
  }
  if (p.currentPlacement) {
    ext.push({ url: TP_CURRENT_PLACEMENT_EXTENSION_URL, valueString: String(p.currentPlacement) });
  }
  if (p.targetPlacement) {
    ext.push({ url: TP_TARGET_PLACEMENT_EXTENSION_URL, valueString: String(p.targetPlacement) });
  }
  const plannedDate = toFhirDate(p.plannedTransitionDate);
  if (plannedDate) ext.push({ url: TP_PLANNED_DATE_EXTENSION_URL, valueDate: plannedDate });
  const actualDate = toFhirDate(p.actualTransitionDate);
  if (actualDate) ext.push({ url: TP_ACTUAL_DATE_EXTENSION_URL, valueDate: actualDate });
  if (Array.isArray(p.domainScores)) {
    for (const ds of p.domainScores) {
      const dExt = buildDomainScoreExtension(ds);
      if (dExt) ext.push(dExt);
    }
  }
  if (typeof p.compositeReadinessScore === 'number') {
    ext.push({
      url: TP_COMPOSITE_READINESS_EXTENSION_URL,
      valueDecimal: p.compositeReadinessScore,
    });
  }
  const readinessAssessedAt = toFhirDateTime(p.readinessAssessedAt);
  if (readinessAssessedAt) {
    ext.push({ url: TP_READINESS_ASSESSED_EXTENSION_URL, valueDateTime: readinessAssessedAt });
  }
  if (p.branchId) {
    ext.push({
      url: TP_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(p.branchId)}` },
    });
  }
  if (p.linkedCarePlanVersionId) {
    ext.push({
      url: TP_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(p.linkedCarePlanVersionId)}` },
    });
  }
  if (p.linkedIepId) {
    ext.push({ url: TP_IEP_EXTENSION_URL, valueString: String(p.linkedIepId) });
  }
  return ext;
}

/**
 * Project a canonical TransitionPlan onto a base FHIR R4 CarePlan resource.
 *
 * @param {object} plan canonical TransitionPlan
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 CarePlan
 * @throws {TypeError} when plan is missing or has no beneficiaryId
 */
function transitionPlanToFhir(plan, opts = {}) {
  const { includeId = true } = opts;
  if (!plan || typeof plan !== 'object') {
    throw new TypeError('transitionPlanToFhir: plan object is required');
  }
  if (!plan.beneficiaryId) {
    throw new TypeError('transitionPlanToFhir: plan.beneficiaryId is required (CarePlan.subject)');
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'CarePlan',
    status: toFhirStatus(plan.status),
    intent: 'plan',
    category: buildCategory(),
    subject: { reference: `Patient/${String(plan.beneficiaryId)}` },
  };

  if (includeId && plan._id) {
    resource.id = String(plan._id);
  }

  if (plan.transitionLeadId) {
    resource.author = { reference: `Practitioner/${String(plan.transitionLeadId)}` };
  }

  const activities = buildActivities(plan);
  if (activities) resource.activity = activities;

  const ext = buildExtensions(plan);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  transitionPlanToFhir,
  // exported for unit testing
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toMilestoneStatus,
  buildCategory,
  buildActivities,
  buildDomainScoreExtension,
  buildExtensions,
  STATUS_MAP,
  MILESTONE_STATUS,
  ORG_FHIR_BASE,
  TP_CATEGORY_SYSTEM,
  TP_CATEGORY_CODE,
  TP_DOMAIN_CODESYSTEM,
  TP_STATUS_EXTENSION_URL,
  TP_TYPE_EXTENSION_URL,
  TP_CURRENT_AGE_EXTENSION_URL,
  TP_CURRENT_PLACEMENT_EXTENSION_URL,
  TP_TARGET_PLACEMENT_EXTENSION_URL,
  TP_PLANNED_DATE_EXTENSION_URL,
  TP_ACTUAL_DATE_EXTENSION_URL,
  TP_DOMAIN_SCORE_EXTENSION_URL,
  TP_COMPOSITE_READINESS_EXTENSION_URL,
  TP_READINESS_ASSESSED_EXTENSION_URL,
  TP_MILESTONE_DETAIL_EXTENSION_URL,
  TP_BRANCH_EXTENSION_URL,
  TP_CARE_PLAN_EXTENSION_URL,
  TP_IEP_EXTENSION_URL,
};
