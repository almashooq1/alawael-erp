'use strict';
/**
 * CreativeArtsTherapySession → FHIR R4 Encounter mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 22nd FHIR resource mapper. A
 * creative-arts therapy session (music/art/drama/dance/play) is a single
 * clinical contact with engagement + mood-shift outcomes
 * (intelligence/canonical/schemas/creative-arts-therapy-session.canonical.js).
 * FHIR models a contact as an Encounter; the modality is carried as
 * Encounter.type and the materials / interventions / mood-shift / artifact
 * specifics are carried losslessly as namespaced extensions.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Encounter only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps to the FHIR Encounter status value-set:
 *       scheduled→planned, completed→finished, cancelled/no_show→cancelled,
 *       unknown→entered-in-error.
 *   - class uses HL7 v3-ActCode AMB (ambulatory).
 *   - subject is the mandatory Patient reference.
 *   - serviceProvider references the delivering branch Organization (native).
 *   - period is derived from sessionDate + durationMinutes.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ACT_ENCOUNTER_CLASS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const CATS_MODALITY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/creative-arts-modality`;
const CATS_DURATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-duration-minutes`;
const CATS_FORMAT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-format`;
const CATS_GROUP_SIZE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-group-size`;
const CATS_MATERIAL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-material`;
const CATS_INTERVENTION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-intervention`;
const CATS_GOAL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-goal`;
const CATS_ENGAGEMENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-engagement`;
const CATS_MOOD_BEFORE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-mood-before`;
const CATS_MOOD_AFTER_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-mood-after`;
const CATS_ARTIFACT_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-artifact-type`;
const CATS_ARTIFACT_REF_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-artifact-ref`;
const CATS_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-care-plan-version`;
const CATS_CANCEL_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/creative-arts-cancel-reason`;

/**
 * Canonical session status → FHIR Encounter status value-set.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  scheduled: 'planned',
  completed: 'finished',
  cancelled: 'cancelled',
  no_show: 'cancelled',
});

/**
 * Map a canonical session status to a FHIR Encounter status.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'unknown';
  return STATUS_MAP[status] || 'entered-in-error';
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
 * Build the modality Encounter type CodeableConcept.
 * @param {object} s session
 * @returns {Array<object>|undefined}
 */
function buildType(s) {
  if (!s.modality) return undefined;
  return [
    {
      coding: [{ system: CATS_MODALITY_SYSTEM, code: s.modality }],
      text: `Creative Arts Therapy — ${String(s.modality)}`,
    },
  ];
}

/**
 * Build the FHIR `period` from sessionDate + optional durationMinutes.
 * @param {object} s session
 * @returns {object|undefined}
 */
function buildPeriod(s) {
  const start = toFhirDateTime(s.sessionDate);
  if (!start) return undefined;
  /** @type {{start:string,end?:string}} */
  const period = { start };
  if (typeof s.durationMinutes === 'number' && s.durationMinutes > 0) {
    const end = new Date(new Date(start).getTime() + s.durationMinutes * 60000);
    period.end = end.toISOString();
  }
  return period;
}

/**
 * Build the namespaced extension[] (lossless carry of arts-therapy nuance).
 * @param {object} s session
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (typeof s.durationMinutes === 'number') {
    ext.push({ url: CATS_DURATION_EXTENSION_URL, valueInteger: s.durationMinutes });
  }
  if (s.format) ext.push({ url: CATS_FORMAT_EXTENSION_URL, valueCode: s.format });
  if (typeof s.groupSize === 'number') {
    ext.push({ url: CATS_GROUP_SIZE_EXTENSION_URL, valueInteger: s.groupSize });
  }
  if (Array.isArray(s.materialsUsed)) {
    for (const m of s.materialsUsed) {
      if (m) ext.push({ url: CATS_MATERIAL_EXTENSION_URL, valueString: String(m) });
    }
  }
  if (Array.isArray(s.interventions)) {
    for (const i of s.interventions) {
      if (i) ext.push({ url: CATS_INTERVENTION_EXTENSION_URL, valueString: String(i) });
    }
  }
  if (Array.isArray(s.goalsAddressed)) {
    for (const g of s.goalsAddressed) {
      if (g) ext.push({ url: CATS_GOAL_EXTENSION_URL, valueString: String(g) });
    }
  }
  if (s.engagementLevel) {
    ext.push({ url: CATS_ENGAGEMENT_EXTENSION_URL, valueCode: s.engagementLevel });
  }
  if (s.moodBefore) ext.push({ url: CATS_MOOD_BEFORE_EXTENSION_URL, valueCode: s.moodBefore });
  if (s.moodAfter) ext.push({ url: CATS_MOOD_AFTER_EXTENSION_URL, valueCode: s.moodAfter });
  if (s.artifactType) {
    ext.push({ url: CATS_ARTIFACT_TYPE_EXTENSION_URL, valueCode: s.artifactType });
  }
  if (s.artifactRef) {
    ext.push({ url: CATS_ARTIFACT_REF_EXTENSION_URL, valueString: String(s.artifactRef) });
  }
  if (s.carePlanVersionId) {
    ext.push({
      url: CATS_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(s.carePlanVersionId)}` },
    });
  }
  if (s.cancelReason) {
    ext.push({ url: CATS_CANCEL_REASON_EXTENSION_URL, valueString: s.cancelReason });
  }
  return ext;
}

/**
 * Project a canonical CreativeArtsTherapySession onto a base FHIR R4 Encounter.
 *
 * @param {object} session canonical CreativeArtsTherapySession
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Encounter
 * @throws {TypeError} when session is missing or has no beneficiary link
 */
function creativeArtsTherapySessionToFhir(session, opts = {}) {
  const { includeId = true } = opts;
  if (!session || typeof session !== 'object') {
    throw new TypeError('creativeArtsTherapySessionToFhir: session object is required');
  }
  if (!session.beneficiaryId) {
    throw new TypeError(
      'creativeArtsTherapySessionToFhir: session.beneficiaryId is required (FHIR subject reference)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Encounter',
    status: toFhirStatus(session.status),
    class: { system: ACT_ENCOUNTER_CLASS_SYSTEM, code: 'AMB', display: 'ambulatory' },
    subject: { reference: `Patient/${String(session.beneficiaryId)}` },
  };

  if (includeId && session._id) {
    resource.id = String(session._id);
  }

  const type = buildType(session);
  if (type) resource.type = type;

  if (session.therapistId) {
    resource.participant = [
      { individual: { reference: `Practitioner/${String(session.therapistId)}` } },
    ];
  }

  const period = buildPeriod(session);
  if (period) resource.period = period;

  if (session.branchId) {
    resource.serviceProvider = { reference: `Organization/${String(session.branchId)}` };
  }

  const ext = buildExtensions(session);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  creativeArtsTherapySessionToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  CATS_MODALITY_SYSTEM,
  CATS_DURATION_EXTENSION_URL,
  CATS_FORMAT_EXTENSION_URL,
  CATS_GROUP_SIZE_EXTENSION_URL,
  CATS_MATERIAL_EXTENSION_URL,
  CATS_INTERVENTION_EXTENSION_URL,
  CATS_GOAL_EXTENSION_URL,
  CATS_ENGAGEMENT_EXTENSION_URL,
  CATS_MOOD_BEFORE_EXTENSION_URL,
  CATS_MOOD_AFTER_EXTENSION_URL,
  CATS_ARTIFACT_TYPE_EXTENSION_URL,
  CATS_ARTIFACT_REF_EXTENSION_URL,
  CATS_CARE_PLAN_EXTENSION_URL,
  CATS_CANCEL_REASON_EXTENSION_URL,
};
