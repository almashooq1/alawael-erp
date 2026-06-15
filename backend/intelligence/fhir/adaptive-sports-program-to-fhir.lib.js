'use strict';
/**
 * AdaptiveSportsProgram → FHIR R4 CarePlan mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 24th FHIR resource mapper. An
 * adaptive-sports program is a per-(beneficiary, sport, period) participation
 * plan with a session + achievement log
 * (intelligence/canonical/schemas/adaptive-sports-program.canonical.js, W362).
 * FHIR models a structured therapeutic/participation plan as a CarePlan — the
 * same base resourceType the W1313 PlanOfCare and W1322 SensoryDietProgram
 * mappers produce. To keep them unambiguous on the wire this mapper stamps a
 * FIXED CarePlan.category discriminator (`adaptive-sports`).
 *
 * SCOPE (additive, non-breaking): base FHIR R4 CarePlan only. Pure function: no
 * DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps the 5-state program lifecycle onto the FHIR CarePlan.status
 *     value-set: draft → draft, active → active, paused → on-hold,
 *     completed → completed, discontinued → revoked. The original status is
 *     also preserved losslessly in an extension.
 *   - intent = 'plan' (FIXED).
 *   - category = a FIXED discriminator CodeableConcept (`adaptive-sports`).
 *   - subject = the beneficiary (mandatory; CarePlan.subject is 1..1).
 *   - period = startDate..endDate.
 *   - author = the primary coach (Practitioner).
 *   - activity[] = one CarePlan.activity for the sport, with the sport as the
 *     activity code and the weekly frequency as scheduledString.
 *   - the session log, achievement log, clearance flags, branch, linked
 *     care-plan version and discontinuation reason are all carried as
 *     namespaced extensions so nothing in the canonical record is lost.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ASP_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/careplan-category`;
const ASP_CATEGORY_CODE = 'adaptive-sports';
const ASP_SPORT_CODESYSTEM = `${ORG_FHIR_BASE}/CodeSystem/adaptive-sport`;
const ASP_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-status`;
const ASP_SPORT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-sport`;
const ASP_SPORT_CATEGORY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-category`;
const ASP_PHYSICAL_DEMAND_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-physical-demand`;
const ASP_FREQUENCY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-frequency-per-week`;
const ASP_FAMILY_CONSENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-family-consent`;
const ASP_MEDICAL_CLEARANCE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-medical-clearance`;
const ASP_SESSION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-session`;
const ASP_ACHIEVEMENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-achievement`;
const ASP_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-branch`;
const ASP_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-linked-care-plan`;
const ASP_DISCONTINUE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adaptive-sports-discontinue-reason`;

/**
 * Canonical 5-state program lifecycle → FHIR CarePlan.status value-set. The
 * original status is preserved losslessly in an extension.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  draft: 'draft',
  active: 'active',
  paused: 'on-hold',
  completed: 'completed',
  discontinued: 'revoked',
});

/**
 * Program status → CarePlan.activity[].detail.status value-set.
 * @type {Record<string,string>}
 */
const ACTIVITY_STATUS = Object.freeze({
  draft: 'not-started',
  active: 'in-progress',
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
 * Map the canonical program status onto CarePlan.activity[].detail.status.
 * @param {string|undefined} status
 * @returns {string}
 */
function toActivityStatus(status) {
  return ACTIVITY_STATUS[status] || 'unknown';
}

/**
 * Build the FIXED CarePlan.category[] discriminator (`adaptive-sports`).
 * @returns {Array<object>}
 */
function buildCategory() {
  return [
    {
      coding: [{ system: ASP_CATEGORY_SYSTEM, code: ASP_CATEGORY_CODE }],
      text: 'Adaptive Sports Program',
    },
  ];
}

/**
 * Build the FHIR `period` from startDate..endDate.
 * @param {object} p program
 * @returns {object|undefined}
 */
function buildPeriod(p) {
  const start = toFhirDate(p.startDate);
  const end = toFhirDate(p.endDate);
  if (!start && !end) return undefined;
  /** @type {{start?:string,end?:string}} */
  const period = {};
  if (start) period.start = start;
  if (end) period.end = end;
  return period;
}

/**
 * Build the single CarePlan.activity for the sport. The sport is the activity
 * code, the weekly frequency is scheduledString.
 * @param {object} p program
 * @returns {Array<object>|undefined}
 */
function buildActivities(p) {
  if (!p.sport) return undefined;
  /** @type {Record<string, any>} */
  const detail = {
    status: toActivityStatus(p.status),
    code: {
      coding: [{ system: ASP_SPORT_CODESYSTEM, code: String(p.sport) }],
      text: `Adaptive Sport — ${String(p.sport)}`,
    },
  };
  if (typeof p.frequencyPerWeek === 'number') {
    detail.scheduledString = `${p.frequencyPerWeek}x per week`;
  }
  return [{ detail }];
}

/**
 * Build one nested extension for a session-log entry.
 * @param {object} session
 * @returns {object|undefined}
 */
function buildSessionExtension(session) {
  if (!session || typeof session !== 'object') return undefined;
  const parts = [];
  const date = toFhirDateTime(session.date);
  if (date) parts.push({ url: 'date', valueDateTime: date });
  if (session.type) parts.push({ url: 'type', valueCode: session.type });
  if (typeof session.durationMinutes === 'number') {
    parts.push({ url: 'durationMinutes', valueInteger: session.durationMinutes });
  }
  if (session.independenceLevel) {
    parts.push({ url: 'independenceLevel', valueCode: session.independenceLevel });
  }
  if (!parts.length) return undefined;
  return { url: ASP_SESSION_EXTENSION_URL, extension: parts };
}

/**
 * Build one nested extension for an achievement-log entry.
 * @param {object} achievement
 * @returns {object|undefined}
 */
function buildAchievementExtension(achievement) {
  if (!achievement || typeof achievement !== 'object') return undefined;
  const parts = [];
  if (achievement.title) parts.push({ url: 'title', valueString: String(achievement.title) });
  const earnedAt = toFhirDateTime(achievement.earnedAt);
  if (earnedAt) parts.push({ url: 'earnedAt', valueDateTime: earnedAt });
  if (achievement.competitionName) {
    parts.push({ url: 'competitionName', valueString: String(achievement.competitionName) });
  }
  if (achievement.placement) {
    parts.push({ url: 'placement', valueString: String(achievement.placement) });
  }
  if (!parts.length) return undefined;
  return { url: ASP_ACHIEVEMENT_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} p program
 * @returns {Array<object>}
 */
function buildExtensions(p) {
  const ext = [];

  if (p.status) ext.push({ url: ASP_STATUS_EXTENSION_URL, valueCode: p.status });
  if (p.sport) ext.push({ url: ASP_SPORT_EXTENSION_URL, valueCode: p.sport });
  if (p.category) ext.push({ url: ASP_SPORT_CATEGORY_EXTENSION_URL, valueCode: p.category });
  if (p.physicalDemand) {
    ext.push({ url: ASP_PHYSICAL_DEMAND_EXTENSION_URL, valueCode: p.physicalDemand });
  }
  if (typeof p.frequencyPerWeek === 'number') {
    ext.push({ url: ASP_FREQUENCY_EXTENSION_URL, valueInteger: p.frequencyPerWeek });
  }
  if (typeof p.familyConsent === 'boolean') {
    ext.push({ url: ASP_FAMILY_CONSENT_EXTENSION_URL, valueBoolean: p.familyConsent });
  }
  if (typeof p.medicalClearance === 'boolean') {
    ext.push({ url: ASP_MEDICAL_CLEARANCE_EXTENSION_URL, valueBoolean: p.medicalClearance });
  }
  if (Array.isArray(p.sessions)) {
    for (const session of p.sessions) {
      const sExt = buildSessionExtension(session);
      if (sExt) ext.push(sExt);
    }
  }
  if (Array.isArray(p.achievements)) {
    for (const a of p.achievements) {
      const aExt = buildAchievementExtension(a);
      if (aExt) ext.push(aExt);
    }
  }
  if (p.branchId) {
    ext.push({
      url: ASP_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(p.branchId)}` },
    });
  }
  if (p.linkedCarePlanVersionId) {
    ext.push({
      url: ASP_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(p.linkedCarePlanVersionId)}` },
    });
  }
  if (p.discontinuationReason) {
    ext.push({ url: ASP_DISCONTINUE_EXTENSION_URL, valueString: String(p.discontinuationReason) });
  }
  return ext;
}

/**
 * Project a canonical AdaptiveSportsProgram onto a base FHIR R4 CarePlan.
 *
 * @param {object} program canonical AdaptiveSportsProgram
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 CarePlan
 * @throws {TypeError} when program is missing or has no beneficiaryId
 */
function adaptiveSportsProgramToFhir(program, opts = {}) {
  const { includeId = true } = opts;
  if (!program || typeof program !== 'object') {
    throw new TypeError('adaptiveSportsProgramToFhir: program object is required');
  }
  if (!program.beneficiaryId) {
    throw new TypeError(
      'adaptiveSportsProgramToFhir: program.beneficiaryId is required (CarePlan.subject)'
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

  if (program.primaryCoachId) {
    resource.author = { reference: `Practitioner/${String(program.primaryCoachId)}` };
  }

  const activities = buildActivities(program);
  if (activities) resource.activity = activities;

  const ext = buildExtensions(program);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  adaptiveSportsProgramToFhir,
  // exported for unit testing
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  toActivityStatus,
  buildCategory,
  buildPeriod,
  buildActivities,
  buildSessionExtension,
  buildAchievementExtension,
  buildExtensions,
  STATUS_MAP,
  ACTIVITY_STATUS,
  ORG_FHIR_BASE,
  ASP_CATEGORY_SYSTEM,
  ASP_CATEGORY_CODE,
  ASP_SPORT_CODESYSTEM,
  ASP_STATUS_EXTENSION_URL,
  ASP_SPORT_EXTENSION_URL,
  ASP_SPORT_CATEGORY_EXTENSION_URL,
  ASP_PHYSICAL_DEMAND_EXTENSION_URL,
  ASP_FREQUENCY_EXTENSION_URL,
  ASP_FAMILY_CONSENT_EXTENSION_URL,
  ASP_MEDICAL_CLEARANCE_EXTENSION_URL,
  ASP_SESSION_EXTENSION_URL,
  ASP_ACHIEVEMENT_EXTENSION_URL,
  ASP_BRANCH_EXTENSION_URL,
  ASP_CARE_PLAN_EXTENSION_URL,
  ASP_DISCONTINUE_EXTENSION_URL,
};
