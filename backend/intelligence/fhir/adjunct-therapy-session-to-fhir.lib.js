'use strict';
/**
 * AdjunctTherapySession → FHIR R4 Encounter mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 23rd FHIR resource mapper. An
 * adjunct therapy session (hydrotherapy/hippotherapy/animal-assisted) is a
 * single clinical contact with a medical-clearance gate and modality-specific
 * outcomes
 * (intelligence/canonical/schemas/adjunct-therapy-session.canonical.js).
 * FHIR models a contact as an Encounter; the modality is carried as
 * Encounter.type and the clearance / activities / response / animal-type /
 * water-temperature specifics are carried losslessly as namespaced extensions.
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
const ADJ_MODALITY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/adjunct-therapy-modality`;
const ADJ_DURATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-duration-minutes`;
const ADJ_MEDICAL_CLEARED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-medical-cleared`;
const ADJ_CLEARED_DATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-cleared-date`;
const ADJ_CONTRAINDICATIONS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-contraindications`;
const ADJ_READINESS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-readiness`;
const ADJ_ACTIVITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-activity`;
const ADJ_SKILL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-skill`;
const ADJ_RESPONSE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-beneficiary-response`;
const ADJ_ANIMAL_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-animal-type`;
const ADJ_WATER_TEMP_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-water-temperature-c`;
const ADJ_INCIDENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-incident-during-session`;
const ADJ_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-care-plan-version`;
const ADJ_CANCEL_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/adjunct-therapy-cancel-reason`;

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
      coding: [{ system: ADJ_MODALITY_SYSTEM, code: s.modality }],
      text: `Adjunct Therapy — ${String(s.modality)}`,
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
 * Build the namespaced extension[] (lossless carry of adjunct-therapy nuance).
 * @param {object} s session
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (typeof s.durationMinutes === 'number') {
    ext.push({ url: ADJ_DURATION_EXTENSION_URL, valueInteger: s.durationMinutes });
  }
  if (typeof s.medicalCleared === 'boolean') {
    ext.push({ url: ADJ_MEDICAL_CLEARED_EXTENSION_URL, valueBoolean: s.medicalCleared });
  }
  const clearedDate = toFhirDateTime(s.clearedDate);
  if (clearedDate) ext.push({ url: ADJ_CLEARED_DATE_EXTENSION_URL, valueDateTime: clearedDate });
  if (s.contraindications) {
    ext.push({
      url: ADJ_CONTRAINDICATIONS_EXTENSION_URL,
      valueString: String(s.contraindications),
    });
  }
  if (s.readinessLevel) {
    ext.push({ url: ADJ_READINESS_EXTENSION_URL, valueCode: s.readinessLevel });
  }
  if (Array.isArray(s.activities)) {
    for (const a of s.activities) {
      if (a) ext.push({ url: ADJ_ACTIVITY_EXTENSION_URL, valueString: String(a) });
    }
  }
  if (Array.isArray(s.skillsTargeted)) {
    for (const k of s.skillsTargeted) {
      if (k) ext.push({ url: ADJ_SKILL_EXTENSION_URL, valueString: String(k) });
    }
  }
  if (s.beneficiaryResponse) {
    ext.push({ url: ADJ_RESPONSE_EXTENSION_URL, valueCode: s.beneficiaryResponse });
  }
  if (s.animalType) ext.push({ url: ADJ_ANIMAL_TYPE_EXTENSION_URL, valueCode: s.animalType });
  if (typeof s.waterTemperatureC === 'number') {
    ext.push({ url: ADJ_WATER_TEMP_EXTENSION_URL, valueDecimal: s.waterTemperatureC });
  }
  if (typeof s.incidentDuringSession === 'boolean') {
    ext.push({ url: ADJ_INCIDENT_EXTENSION_URL, valueBoolean: s.incidentDuringSession });
  }
  if (s.carePlanVersionId) {
    ext.push({
      url: ADJ_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(s.carePlanVersionId)}` },
    });
  }
  if (s.cancelReason) {
    ext.push({ url: ADJ_CANCEL_REASON_EXTENSION_URL, valueString: s.cancelReason });
  }
  return ext;
}

/**
 * Project a canonical AdjunctTherapySession onto a base FHIR R4 Encounter.
 *
 * @param {object} session canonical AdjunctTherapySession
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Encounter
 * @throws {TypeError} when session is missing or has no beneficiary link
 */
function adjunctTherapySessionToFhir(session, opts = {}) {
  const { includeId = true } = opts;
  if (!session || typeof session !== 'object') {
    throw new TypeError('adjunctTherapySessionToFhir: session object is required');
  }
  if (!session.beneficiaryId) {
    throw new TypeError(
      'adjunctTherapySessionToFhir: session.beneficiaryId is required (FHIR subject reference)'
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
  adjunctTherapySessionToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  ADJ_MODALITY_SYSTEM,
  ADJ_DURATION_EXTENSION_URL,
  ADJ_MEDICAL_CLEARED_EXTENSION_URL,
  ADJ_CLEARED_DATE_EXTENSION_URL,
  ADJ_CONTRAINDICATIONS_EXTENSION_URL,
  ADJ_READINESS_EXTENSION_URL,
  ADJ_ACTIVITY_EXTENSION_URL,
  ADJ_SKILL_EXTENSION_URL,
  ADJ_RESPONSE_EXTENSION_URL,
  ADJ_ANIMAL_TYPE_EXTENSION_URL,
  ADJ_WATER_TEMP_EXTENSION_URL,
  ADJ_INCIDENT_EXTENSION_URL,
  ADJ_CARE_PLAN_EXTENSION_URL,
  ADJ_CANCEL_REASON_EXTENSION_URL,
};
