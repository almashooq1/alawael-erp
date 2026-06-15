'use strict';
/**
 * CaregiverSupportProgram → FHIR R4 CarePlan mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 26th FHIR resource mapper. A
 * caregiver-support program is a structured enrollment in a counseling /
 * training / support-group cycle for the family caregiver of a beneficiary
 * (intelligence/canonical/schemas/caregiver-support-program.canonical.js,
 * W384). It is a longitudinal plan with a module/session log + caregiver-burden
 * outcomes — FHIR models that as a CarePlan, the same base resourceType the
 * W1313 PlanOfCare / W1322 SensoryDietProgram / W1333 AdaptiveSportsProgram /
 * W1334 TransitionPlan mappers produce. To keep them unambiguous on the wire
 * this mapper stamps a FIXED CarePlan.category discriminator
 * (`caregiver-support`).
 *
 * SCOPE (additive, non-breaking): base FHIR R4 CarePlan only. Pure function: no
 * DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps the 5-state lifecycle onto the FHIR CarePlan.status value-set:
 *       enrolled → active, in_progress → active, paused → on-hold,
 *       completed → completed, discontinued → revoked. The original status is
 *       also preserved losslessly in an extension.
 *   - intent = 'plan' (FIXED).
 *   - category = a FIXED discriminator CodeableConcept (`caregiver-support`).
 *   - subject = the beneficiary the program is anchored to (mandatory; 1..1).
 *     The actual caregiver is carried as namespaced extensions (the canonical
 *     record anchors the program to the beneficiary).
 *   - author = the assigned counselor (Practitioner).
 *   - period from enrolledAt … (completedAt | targetCompletionDate).
 *   - activity[] = one CarePlan.activity per training module.
 *   - the session log, outcomes (pre/post caregiver-burden), caregiver details,
 *     sibling age range, group metadata, branch are carried as namespaced
 *     extensions so nothing in the canonical record is lost.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const CSP_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/careplan-category`;
const CSP_CATEGORY_CODE = 'caregiver-support';
const CSP_MODULE_CODESYSTEM = `${ORG_FHIR_BASE}/CodeSystem/caregiver-support-module`;
const CSP_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-status`;
const CSP_PROGRAM_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-program-type`;
const CSP_CAREGIVER_GUARDIAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-caregiver`;
const CSP_CAREGIVER_NAME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-caregiver-name`;
const CSP_CAREGIVER_RELATIONSHIP_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-caregiver-relationship`;
const CSP_CAREGIVER_PHONE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-caregiver-phone`;
const CSP_TARGET_COMPLETION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-target-completion`;
const CSP_PAUSED_AT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-paused-at`;
const CSP_DISCONTINUED_AT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-discontinued-at`;
const CSP_DISCONTINUE_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-discontinue-reason`;
const CSP_COUNSELOR_NAME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-counselor-name`;
const CSP_TOTAL_MODULES_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-total-modules`;
const CSP_TOTAL_TARGET_HOURS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-total-target-hours`;
const CSP_SIBLING_AGE_RANGE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-sibling-age-range`;
const CSP_GROUP_NAME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-group-name`;
const CSP_GROUP_FREQUENCY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-group-frequency`;
const CSP_SESSION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-session`;
const CSP_OUTCOME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-outcome`;
const CSP_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-branch`;

/**
 * Canonical 5-state lifecycle → FHIR CarePlan.status value-set. The original
 * status is preserved losslessly in an extension.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  enrolled: 'active',
  in_progress: 'active',
  paused: 'on-hold',
  completed: 'completed',
  discontinued: 'revoked',
});

/**
 * Program lifecycle → CarePlan.activity[].detail.status (the default when a
 * module has no explicit completion instant).
 * @type {Record<string,string>}
 */
const ACTIVITY_STATUS = Object.freeze({
  enrolled: 'scheduled',
  in_progress: 'in-progress',
  paused: 'on-hold',
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
 * Map the canonical program status onto the FHIR CarePlan.status value-set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'unknown';
  return STATUS_MAP[status] || 'unknown';
}

/**
 * Map the canonical program status onto a CarePlan.activity[].detail.status.
 * @param {string|undefined} status
 * @returns {string}
 */
function toActivityStatus(status) {
  return ACTIVITY_STATUS[status] || 'unknown';
}

/**
 * Build the FIXED CarePlan.category[] discriminator (`caregiver-support`).
 * @returns {Array<object>}
 */
function buildCategory() {
  return [
    {
      coding: [{ system: CSP_CATEGORY_SYSTEM, code: CSP_CATEGORY_CODE }],
      text: 'Caregiver Support Program',
    },
  ];
}

/**
 * Build CarePlan.period from enrolledAt … (completedAt | targetCompletionDate).
 * @param {object} p program
 * @returns {object|undefined}
 */
function buildPeriod(p) {
  const start = toFhirDate(p.enrolledAt);
  const end = toFhirDate(p.completedAt || p.targetCompletionDate);
  if (!start && !end) return undefined;
  /** @type {Record<string, string>} */
  const period = {};
  if (start) period.start = start;
  if (end) period.end = end;
  return period;
}

/**
 * Build one CarePlan.activity per training module. The module title is the
 * activity code; target hours becomes scheduledString; the completion instant
 * (or program lifecycle) drives detail.status; per-module progress is carried
 * in a nested namespaced extension.
 * @param {object} p program
 * @returns {Array<object>|undefined}
 */
function buildActivities(p) {
  if (!Array.isArray(p.modulesProgress) || !p.modulesProgress.length) return undefined;
  const out = [];
  for (const m of p.modulesProgress) {
    if (!m || typeof m !== 'object') continue;
    const completedAt = toFhirDateTime(m.completedAt);
    /** @type {Record<string, any>} */
    const detail = {
      status: completedAt ? 'completed' : toActivityStatus(p.status),
      code: {
        coding: [
          {
            system: CSP_MODULE_CODESYSTEM,
            code: m.moduleNumber != null ? String(m.moduleNumber) : undefined,
          },
        ],
        text: m.title ? String(m.title) : undefined,
      },
      description: m.title ? String(m.title) : undefined,
    };
    if (typeof m.targetHours === 'number') {
      detail.scheduledString = `${m.targetHours}h target`;
    }
    const parts = [];
    if (m.moduleNumber != null) parts.push({ url: 'moduleNumber', valueInteger: m.moduleNumber });
    if (typeof m.targetHours === 'number') {
      parts.push({ url: 'targetHours', valueDecimal: m.targetHours });
    }
    if (typeof m.hoursCompleted === 'number') {
      parts.push({ url: 'hoursCompleted', valueDecimal: m.hoursCompleted });
    }
    if (completedAt) parts.push({ url: 'completedAt', valueDateTime: completedAt });
    if (parts.length) {
      detail.extension = [
        {
          url: `${ORG_FHIR_BASE}/StructureDefinition/caregiver-support-module-detail`,
          extension: parts,
        },
      ];
    }
    out.push({ detail });
  }
  return out.length ? out : undefined;
}

/**
 * Build one nested extension per support session.
 * @param {object} s session
 * @returns {object|undefined}
 */
function buildSessionExtension(s) {
  if (!s || typeof s !== 'object') return undefined;
  const parts = [];
  const date = toFhirDateTime(s.sessionDate);
  if (date) parts.push({ url: 'sessionDate', valueDateTime: date });
  if (s.format) parts.push({ url: 'format', valueCode: String(s.format) });
  if (s.topic) parts.push({ url: 'topic', valueString: String(s.topic) });
  if (typeof s.durationMinutes === 'number') {
    parts.push({ url: 'durationMinutes', valueInteger: s.durationMinutes });
  }
  if (s.facilitatorId) {
    parts.push({
      url: 'facilitator',
      valueReference: { reference: `Practitioner/${String(s.facilitatorId)}` },
    });
  }
  if (s.attendanceStatus)
    parts.push({ url: 'attendanceStatus', valueCode: String(s.attendanceStatus) });
  if (s.progressNotes) parts.push({ url: 'progressNotes', valueString: String(s.progressNotes) });
  if (!parts.length) return undefined;
  return { url: CSP_SESSION_EXTENSION_URL, extension: parts };
}

/**
 * Build the nested outcomes extension (pre/post caregiver-burden + satisfaction).
 * @param {object} o outcomes
 * @returns {object|undefined}
 */
function buildOutcomeExtension(o) {
  if (!o || typeof o !== 'object') return undefined;
  const parts = [];
  if (typeof o.preProgramBurdenScore === 'number') {
    parts.push({ url: 'preProgramBurdenScore', valueDecimal: o.preProgramBurdenScore });
  }
  if (typeof o.postProgramBurdenScore === 'number') {
    parts.push({ url: 'postProgramBurdenScore', valueDecimal: o.postProgramBurdenScore });
  }
  if (typeof o.satisfactionScore === 'number') {
    parts.push({ url: 'satisfactionScore', valueDecimal: o.satisfactionScore });
  }
  if (o.selfReportedImpact)
    parts.push({ url: 'selfReportedImpact', valueString: String(o.selfReportedImpact) });
  if (!parts.length) return undefined;
  return { url: CSP_OUTCOME_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} p program
 * @returns {Array<object>}
 */
function buildExtensions(p) {
  const ext = [];

  if (p.status) ext.push({ url: CSP_STATUS_EXTENSION_URL, valueCode: p.status });
  if (p.programType) ext.push({ url: CSP_PROGRAM_TYPE_EXTENSION_URL, valueCode: p.programType });
  if (p.caregiverGuardianId) {
    ext.push({
      url: CSP_CAREGIVER_GUARDIAN_EXTENSION_URL,
      valueReference: { reference: `RelatedPerson/${String(p.caregiverGuardianId)}` },
    });
  }
  if (p.caregiverName)
    ext.push({ url: CSP_CAREGIVER_NAME_EXTENSION_URL, valueString: String(p.caregiverName) });
  if (p.caregiverRelationship) {
    ext.push({
      url: CSP_CAREGIVER_RELATIONSHIP_EXTENSION_URL,
      valueString: String(p.caregiverRelationship),
    });
  }
  if (p.caregiverPhone)
    ext.push({ url: CSP_CAREGIVER_PHONE_EXTENSION_URL, valueString: String(p.caregiverPhone) });
  const targetCompletion = toFhirDate(p.targetCompletionDate);
  if (targetCompletion)
    ext.push({ url: CSP_TARGET_COMPLETION_EXTENSION_URL, valueDate: targetCompletion });
  const pausedAt = toFhirDateTime(p.pausedAt);
  if (pausedAt) ext.push({ url: CSP_PAUSED_AT_EXTENSION_URL, valueDateTime: pausedAt });
  const discontinuedAt = toFhirDateTime(p.discontinuedAt);
  if (discontinuedAt)
    ext.push({ url: CSP_DISCONTINUED_AT_EXTENSION_URL, valueDateTime: discontinuedAt });
  if (p.discontinuationReason) {
    ext.push({
      url: CSP_DISCONTINUE_REASON_EXTENSION_URL,
      valueString: String(p.discontinuationReason),
    });
  }
  if (p.assignedCounselorName) {
    ext.push({
      url: CSP_COUNSELOR_NAME_EXTENSION_URL,
      valueString: String(p.assignedCounselorName),
    });
  }
  if (typeof p.totalModules === 'number') {
    ext.push({ url: CSP_TOTAL_MODULES_EXTENSION_URL, valueInteger: p.totalModules });
  }
  if (typeof p.totalTargetHours === 'number') {
    ext.push({ url: CSP_TOTAL_TARGET_HOURS_EXTENSION_URL, valueDecimal: p.totalTargetHours });
  }
  if (p.siblingAgeRange && typeof p.siblingAgeRange === 'object') {
    const parts = [];
    if (typeof p.siblingAgeRange.min === 'number')
      parts.push({ url: 'min', valueInteger: p.siblingAgeRange.min });
    if (typeof p.siblingAgeRange.max === 'number')
      parts.push({ url: 'max', valueInteger: p.siblingAgeRange.max });
    if (parts.length) ext.push({ url: CSP_SIBLING_AGE_RANGE_EXTENSION_URL, extension: parts });
  }
  if (p.groupName)
    ext.push({ url: CSP_GROUP_NAME_EXTENSION_URL, valueString: String(p.groupName) });
  if (p.groupFrequency)
    ext.push({ url: CSP_GROUP_FREQUENCY_EXTENSION_URL, valueString: String(p.groupFrequency) });
  if (Array.isArray(p.sessions)) {
    for (const s of p.sessions) {
      const sExt = buildSessionExtension(s);
      if (sExt) ext.push(sExt);
    }
  }
  const outcome = buildOutcomeExtension(p.outcomes);
  if (outcome) ext.push(outcome);
  if (p.branchId) {
    ext.push({
      url: CSP_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(p.branchId)}` },
    });
  }
  return ext;
}

/**
 * Project a canonical CaregiverSupportProgram onto a base FHIR R4 CarePlan.
 *
 * @param {object} program canonical CaregiverSupportProgram
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 CarePlan
 * @throws {TypeError} when program is missing or has no beneficiaryId
 */
function caregiverSupportProgramToFhir(program, opts = {}) {
  const { includeId = true } = opts;
  if (!program || typeof program !== 'object') {
    throw new TypeError('caregiverSupportProgramToFhir: program object is required');
  }
  if (!program.beneficiaryId) {
    throw new TypeError(
      'caregiverSupportProgramToFhir: program.beneficiaryId is required (CarePlan.subject)'
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

  if (program.assignedCounselorId) {
    resource.author = { reference: `Practitioner/${String(program.assignedCounselorId)}` };
  }

  const period = buildPeriod(program);
  if (period) resource.period = period;

  const activities = buildActivities(program);
  if (activities) resource.activity = activities;

  const ext = buildExtensions(program);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  caregiverSupportProgramToFhir,
  // exported for unit testing
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toActivityStatus,
  buildCategory,
  buildPeriod,
  buildActivities,
  buildSessionExtension,
  buildOutcomeExtension,
  buildExtensions,
  STATUS_MAP,
  ACTIVITY_STATUS,
  ORG_FHIR_BASE,
  CSP_CATEGORY_SYSTEM,
  CSP_CATEGORY_CODE,
  CSP_MODULE_CODESYSTEM,
  CSP_STATUS_EXTENSION_URL,
  CSP_PROGRAM_TYPE_EXTENSION_URL,
  CSP_CAREGIVER_GUARDIAN_EXTENSION_URL,
  CSP_CAREGIVER_NAME_EXTENSION_URL,
  CSP_CAREGIVER_RELATIONSHIP_EXTENSION_URL,
  CSP_CAREGIVER_PHONE_EXTENSION_URL,
  CSP_TARGET_COMPLETION_EXTENSION_URL,
  CSP_PAUSED_AT_EXTENSION_URL,
  CSP_DISCONTINUED_AT_EXTENSION_URL,
  CSP_DISCONTINUE_REASON_EXTENSION_URL,
  CSP_COUNSELOR_NAME_EXTENSION_URL,
  CSP_TOTAL_MODULES_EXTENSION_URL,
  CSP_TOTAL_TARGET_HOURS_EXTENSION_URL,
  CSP_SIBLING_AGE_RANGE_EXTENSION_URL,
  CSP_GROUP_NAME_EXTENSION_URL,
  CSP_GROUP_FREQUENCY_EXTENSION_URL,
  CSP_SESSION_EXTENSION_URL,
  CSP_OUTCOME_EXTENSION_URL,
  CSP_BRANCH_EXTENSION_URL,
};
