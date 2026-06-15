'use strict';
/**
 * Session → FHIR R4 Encounter mapper (foundation).
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): fourth FHIR resource mapper after
 * Patient (W1309), EpisodeOfCare (W1310) and Observation (W1311). A therapy
 * session occurrence is the canonical cardinal anchor for attendance and
 * documentation (intelligence/canonical/schemas/session.canonical.js); FHIR
 * models a contact between a patient and a provider as an Encounter.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Encounter only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps to the FHIR Encounter status value-set:
 *       scheduled→planned, in_progress→in-progress, completed→finished,
 *       cancelled/no_show/rescheduled→cancelled (no_show/rescheduled nuance is
 *       preserved in a namespaced status-detail extension), unknown→
 *       entered-in-error.
 *   - class uses HL7 v3-ActEncounterCode mapped from canonical modality.
 *   - subject is the mandatory Patient reference.
 *   - episodeOfCare links the session to its unifying journey (native FHIR
 *     field — the platform's core anchor surfaces natively).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ACT_ENCOUNTER_CLASS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const DISCIPLINE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/therapy-discipline`;
const STATUS_DETAIL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/encounter-status-detail`;
const PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/encounter-care-plan`;

/**
 * Canonical session status → FHIR Encounter status value-set.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  scheduled: 'planned',
  in_progress: 'in-progress',
  completed: 'finished',
  cancelled: 'cancelled',
  no_show: 'cancelled',
  rescheduled: 'cancelled',
});

/**
 * Canonical modality → FHIR Encounter class Coding (HL7 v3-ActEncounterCode).
 * @type {Record<string,{code:string,display:string}>}
 */
const CLASS_MAP = Object.freeze({
  individual: { code: 'AMB', display: 'ambulatory' },
  group: { code: 'AMB', display: 'ambulatory' },
  tele: { code: 'VR', display: 'virtual' },
  home: { code: 'HH', display: 'home health' },
  community: { code: 'FLD', display: 'field' },
  arvr: { code: 'VR', display: 'virtual' },
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
 * Build the FHIR Encounter class Coding from the canonical modality.
 * Defaults to ambulatory when modality is absent.
 * @param {string|undefined} modality
 * @returns {object}
 */
function buildClass(modality) {
  const mapped = (modality && CLASS_MAP[modality]) || CLASS_MAP.individual;
  return { system: ACT_ENCOUNTER_CLASS_SYSTEM, ...mapped };
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
 * Build the FHIR `period` — actual times preferred over scheduled so a
 * completed session reflects what really happened.
 * @param {object} s session
 * @returns {object|undefined}
 */
function buildPeriod(s) {
  const start = toFhirDateTime(s.actualStart) || toFhirDateTime(s.scheduledStart);
  const end = toFhirDateTime(s.actualEnd) || toFhirDateTime(s.scheduledEnd);
  if (!start && !end) return undefined;
  /** @type {{start?:string,end?:string}} */
  const period = {};
  if (start) period.start = start;
  if (end) period.end = end;
  return period;
}

/**
 * Build the namespaced extension[] (lossless carry of non-base nuance).
 * @param {object} s session
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  // Preserve the no_show / rescheduled nuance lost when mapped → cancelled.
  if (s.status === 'no_show' || s.status === 'rescheduled') {
    ext.push({ url: STATUS_DETAIL_EXTENSION_URL, valueCode: s.status });
  }
  if (s.planId) {
    ext.push({
      url: PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(s.planId)}` },
    });
  }
  return ext;
}

/**
 * Project a canonical Session onto a base FHIR R4 Encounter resource.
 *
 * @param {object} session canonical Session (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Encounter
 * @throws {TypeError} when session is missing or has no beneficiary link
 */
function sessionToFhirEncounter(session, opts = {}) {
  const { includeId = true } = opts;
  if (!session || typeof session !== 'object') {
    throw new TypeError('sessionToFhirEncounter: session object is required');
  }
  if (!session.beneficiaryId) {
    throw new TypeError(
      'sessionToFhirEncounter: session.beneficiaryId is required (FHIR subject reference)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Encounter',
    status: toFhirStatus(session.status),
    class: buildClass(session.modality),
    subject: { reference: `Patient/${String(session.beneficiaryId)}` },
  };

  if (includeId && session._id) {
    resource.id = String(session._id);
  }

  if (session.therapistId) {
    resource.participant = [
      {
        individual: {
          reference: `Practitioner/${String(session.therapistId)}`,
        },
      },
    ];
  }

  const period = buildPeriod(session);
  if (period) resource.period = period;

  if (session.episodeId) {
    resource.episodeOfCare = [{ reference: `EpisodeOfCare/${String(session.episodeId)}` }];
  }

  if (session.discipline) {
    resource.serviceType = {
      coding: [{ system: DISCIPLINE_SYSTEM, code: session.discipline }],
      text: session.discipline,
    };
  }

  if (session.cancellationReason) {
    resource.reasonCode = [{ text: session.cancellationReason }];
  }

  const ext = buildExtensions(session);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  sessionToFhirEncounter,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildClass,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  CLASS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  DISCIPLINE_SYSTEM,
  STATUS_DETAIL_EXTENSION_URL,
  PLAN_EXTENSION_URL,
};
