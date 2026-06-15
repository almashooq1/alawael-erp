'use strict';
/**
 * SensoryDietProgram → FHIR R4 CarePlan mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): thirteenth FHIR resource mapper. A
 * sensory-diet program is the canonical "scheduled sensory-regulation plan +
 * Snoezelen session log" (intelligence/canonical/schemas/sensory-diet-program.
 * canonical.js, Therapy Programs module, W691). FHIR models a structured
 * therapeutic plan as a CarePlan — the same base resourceType the W1313
 * PlanOfCare mapper produces. To keep the two unambiguous on the wire this
 * mapper stamps a FIXED CarePlan.category discriminator (`sensory-diet`) so a
 * consumer can tell a sensory-diet CarePlan apart from a plan-of-care CarePlan.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 CarePlan only. Pure function: no
 * DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers may
 * post-process `meta.profile`).
 *
 * STANDARDS:
 *   - status maps the 4-state program lifecycle onto the FHIR CarePlan.status
 *     value-set (draft | active | on-hold | revoked | completed |
 *     entered-in-error | unknown): active → active, on_hold → on-hold,
 *     completed → completed, discontinued → revoked. The original status is
 *     also preserved losslessly in an extension.
 *   - intent = 'plan' (FIXED) — a sensory diet is a plan, not a single order.
 *   - category = a FIXED discriminator CodeableConcept (`sensory-diet`).
 *   - subject = the beneficiary (mandatory; CarePlan.subject is 1..1).
 *   - period.start = startDate; the review date is carried in an extension (it
 *     is a review checkpoint, not a plan end).
 *   - author = the owning therapist.
 *   - description = the goals joined; each goal is also carried verbatim in a
 *     namespaced extension.
 *   - activity[] = one CarePlan.activity per sensory-diet activity, with the
 *     sensory system as the activity code, the frequency as scheduledString and
 *     the purpose + duration carried in a nested extension.
 *   - the Snoezelen session log, branch, linked care-plan version and the
 *     discontinuation reason are all carried as namespaced extensions so
 *     nothing in the canonical record is lost.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const SENSORY_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/careplan-category`;
const SENSORY_CATEGORY_CODE = 'sensory-diet';
const SENSORY_SYSTEM_CODESYSTEM = `${ORG_FHIR_BASE}/CodeSystem/sensory-system`;
const SENSORY_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-status`;
const SENSORY_REVIEW_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-review-date`;
const SENSORY_GOAL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-goal`;
const SENSORY_ACTIVITY_DETAIL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-activity-detail`;
const SENSORY_SNOEZELEN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-snoezelen-session`;
const SENSORY_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-branch`;
const SENSORY_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-linked-care-plan`;
const SENSORY_DISCONTINUE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/sensory-diet-discontinue-reason`;

/**
 * Canonical 4-state program lifecycle → FHIR CarePlan.status value-set. The
 * original status is preserved losslessly in an extension.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  active: 'active',
  on_hold: 'on-hold',
  completed: 'completed',
  discontinued: 'revoked',
});

/**
 * Program status → CarePlan.activity[].detail.status value-set
 * (not-started | scheduled | in-progress | on-hold | completed | cancelled |
 * stopped | unknown | entered-in-error). The activities inherit the program's
 * overall lifecycle.
 * @type {Record<string,string>}
 */
const ACTIVITY_STATUS = Object.freeze({
  active: 'in-progress',
  on_hold: 'on-hold',
  completed: 'completed',
  discontinued: 'cancelled',
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
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO) so the
 * exact instant is preserved.
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
 * Map the canonical program status onto the FHIR CarePlan.status value-set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'unknown';
  return STATUS_MAP[status] || 'unknown';
}

/**
 * Map the canonical program status onto the CarePlan.activity[].detail.status
 * value-set (activities inherit the program lifecycle).
 * @param {string|undefined} status
 * @returns {string}
 */
function toActivityStatus(status) {
  return ACTIVITY_STATUS[status] || 'unknown';
}

/**
 * Build the FIXED CarePlan.category[] discriminator that tags this as a
 * sensory-diet CarePlan (distinct from a W1313 plan-of-care CarePlan).
 * @returns {Array<object>}
 */
function buildCategory() {
  return [
    {
      coding: [{ system: SENSORY_CATEGORY_SYSTEM, code: SENSORY_CATEGORY_CODE }],
      text: 'Sensory Diet Program',
    },
  ];
}

/**
 * Build the FHIR `period` from the program start date. The review date is a
 * checkpoint (not an end), so it is carried separately in an extension.
 * @param {object} p program
 * @returns {object|undefined}
 */
function buildPeriod(p) {
  const start = toFhirDate(p.startDate);
  if (!start) return undefined;
  return { start };
}

/**
 * Build one CarePlan.activity per sensory-diet activity. The sensory system is
 * the activity code, the frequency is scheduledString and the purpose +
 * duration are carried in a nested namespaced extension.
 * @param {object} p program
 * @returns {Array<object>|undefined}
 */
function buildActivities(p) {
  if (!Array.isArray(p.activities) || !p.activities.length) return undefined;
  const activityStatus = toActivityStatus(p.status);
  const out = [];
  for (const a of p.activities) {
    if (!a || typeof a !== 'object') continue;
    /** @type {Record<string, any>} */
    const detail = {
      status: activityStatus,
      code: {
        coding: [{ system: SENSORY_SYSTEM_CODESYSTEM, code: String(a.sensorySystem) }],
        text: a.name,
      },
    };
    if (a.frequency) detail.scheduledString = String(a.frequency);
    if (a.name) detail.description = String(a.name);

    const parts = [];
    if (a.purpose) parts.push({ url: 'purpose', valueCode: a.purpose });
    if (typeof a.durationMinutes === 'number') {
      parts.push({ url: 'durationMinutes', valueInteger: a.durationMinutes });
    }
    if (parts.length) {
      detail.extension = [{ url: SENSORY_ACTIVITY_DETAIL_EXTENSION_URL, extension: parts }];
    }
    out.push({ detail });
  }
  return out.length ? out : undefined;
}

/**
 * Build one nested extension per Snoezelen session (lossless carry of the
 * regulation-outcome session log).
 * @param {object} session snoezelen session
 * @returns {object|undefined}
 */
function buildSnoezelenExtension(session) {
  if (!session || typeof session !== 'object') return undefined;
  const parts = [];
  const date = toFhirDateTime(session.date);
  if (date) parts.push({ url: 'date', valueDateTime: date });
  if (session.regulationOutcome) {
    parts.push({ url: 'regulationOutcome', valueCode: session.regulationOutcome });
  }
  if (Array.isArray(session.stimuliUsed)) {
    for (const s of session.stimuliUsed) {
      parts.push({ url: 'stimulus', valueString: String(s) });
    }
  }
  if (!parts.length) return undefined;
  return { url: SENSORY_SNOEZELEN_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} p program
 * @returns {Array<object>}
 */
function buildExtensions(p) {
  const ext = [];

  if (p.status) {
    ext.push({ url: SENSORY_STATUS_EXTENSION_URL, valueCode: p.status });
  }

  const reviewDate = toFhirDate(p.reviewDate);
  if (reviewDate) {
    ext.push({ url: SENSORY_REVIEW_DATE_EXTENSION_URL, valueDate: reviewDate });
  }

  if (Array.isArray(p.goals)) {
    for (const g of p.goals) {
      ext.push({ url: SENSORY_GOAL_EXTENSION_URL, valueString: String(g) });
    }
  }

  if (Array.isArray(p.snoezelenSessions)) {
    for (const session of p.snoezelenSessions) {
      const sExt = buildSnoezelenExtension(session);
      if (sExt) ext.push(sExt);
    }
  }

  if (p.branchId) {
    ext.push({
      url: SENSORY_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(p.branchId)}` },
    });
  }

  if (p.carePlanVersionId) {
    ext.push({
      url: SENSORY_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(p.carePlanVersionId)}` },
    });
  }

  if (p.discontinueReason) {
    ext.push({
      url: SENSORY_DISCONTINUE_EXTENSION_URL,
      valueString: String(p.discontinueReason),
    });
  }

  return ext;
}

/**
 * Project a canonical SensoryDietProgram onto a base FHIR R4 CarePlan resource.
 *
 * @param {object} program canonical SensoryDietProgram (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 CarePlan
 * @throws {TypeError} when program is missing or has no beneficiaryId (the
 *   mandatory CarePlan.subject reference)
 */
function sensoryDietProgramToFhir(program, opts = {}) {
  const { includeId = true } = opts;
  if (!program || typeof program !== 'object') {
    throw new TypeError('sensoryDietProgramToFhir: program object is required');
  }
  if (!program.beneficiaryId) {
    throw new TypeError(
      'sensoryDietProgramToFhir: program.beneficiaryId is required (CarePlan.subject)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'CarePlan',
    status: toFhirStatus(program.status),
    intent: 'plan',
    category: buildCategory(),
    subject: { reference: `Patient/${String(program.beneficiaryId)}` },
  };

  if (includeId && program._id) {
    resource.id = String(program._id);
  }

  const period = buildPeriod(program);
  if (period) resource.period = period;

  if (program.therapistId) {
    resource.author = { reference: `Practitioner/${String(program.therapistId)}` };
  }

  if (Array.isArray(program.goals) && program.goals.length) {
    resource.description = program.goals.map(g => String(g)).join('; ');
  }

  const activities = buildActivities(program);
  if (activities) resource.activity = activities;

  const ext = buildExtensions(program);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  sensoryDietProgramToFhir,
  // exported for unit testing
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toActivityStatus,
  buildCategory,
  buildPeriod,
  buildActivities,
  buildSnoezelenExtension,
  buildExtensions,
  STATUS_MAP,
  ACTIVITY_STATUS,
  ORG_FHIR_BASE,
  SENSORY_CATEGORY_SYSTEM,
  SENSORY_CATEGORY_CODE,
  SENSORY_SYSTEM_CODESYSTEM,
  SENSORY_STATUS_EXTENSION_URL,
  SENSORY_REVIEW_DATE_EXTENSION_URL,
  SENSORY_GOAL_EXTENSION_URL,
  SENSORY_ACTIVITY_DETAIL_EXTENSION_URL,
  SENSORY_SNOEZELEN_EXTENSION_URL,
  SENSORY_BRANCH_EXTENSION_URL,
  SENSORY_CARE_PLAN_EXTENSION_URL,
  SENSORY_DISCONTINUE_EXTENSION_URL,
};
