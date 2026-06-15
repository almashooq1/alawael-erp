'use strict';
/**
 * TeleRehabSession → FHIR R4 Encounter mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 19th FHIR resource mapper. A
 * tele-rehabilitation session is a remote clinical contact over video
 * (intelligence/canonical/schemas/tele-rehab-session.canonical.js). FHIR models
 * a contact as an Encounter; the virtual class plus connectivity / consent /
 * recording specifics are carried losslessly as namespaced extensions.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Encounter only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps to the FHIR Encounter status value-set:
 *       scheduled→planned, in_progress→in-progress, completed→finished,
 *       cancelled/no_show/rescheduled→cancelled, unknown→entered-in-error.
 *   - class uses HL7 v3-ActCode VR (virtual).
 *   - subject is the mandatory Patient reference.
 *   - episodeOfCare links the session to its unifying journey (native field).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ACT_ENCOUNTER_CLASS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const TRS_PLATFORM_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/tele-rehab-platform`;
const TRS_SESSION_URL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/tele-rehab-session-url`;
const TRS_CONSENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/tele-rehab-consent-state`;
const TRS_CONNECTION_QUALITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/tele-rehab-connection-quality`;
const TRS_RECORDING_ALLOWED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/tele-rehab-recording-allowed`;
const TRS_RECORDING_URL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/tele-rehab-recording-url`;

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
 * Build the FHIR `period` — actual times preferred over scheduled.
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
 * Build the namespaced extension[] (lossless carry of tele-care nuance).
 * @param {object} s session
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (s.platform) ext.push({ url: TRS_PLATFORM_EXTENSION_URL, valueCode: s.platform });
  if (s.sessionUrl) ext.push({ url: TRS_SESSION_URL_EXTENSION_URL, valueUrl: s.sessionUrl });
  if (s.consentState) ext.push({ url: TRS_CONSENT_EXTENSION_URL, valueCode: s.consentState });
  if (s.connectionQuality) {
    ext.push({ url: TRS_CONNECTION_QUALITY_EXTENSION_URL, valueCode: s.connectionQuality });
  }
  if (typeof s.recordingAllowed === 'boolean') {
    ext.push({ url: TRS_RECORDING_ALLOWED_EXTENSION_URL, valueBoolean: s.recordingAllowed });
  }
  if (s.recordingUrl) ext.push({ url: TRS_RECORDING_URL_EXTENSION_URL, valueUrl: s.recordingUrl });
  return ext;
}

/**
 * Project a canonical TeleRehabSession onto a base FHIR R4 Encounter resource.
 *
 * @param {object} session canonical TeleRehabSession
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Encounter
 * @throws {TypeError} when session is missing or has no beneficiary link
 */
function teleRehabSessionToFhir(session, opts = {}) {
  const { includeId = true } = opts;
  if (!session || typeof session !== 'object') {
    throw new TypeError('teleRehabSessionToFhir: session object is required');
  }
  if (!session.beneficiaryId) {
    throw new TypeError(
      'teleRehabSessionToFhir: session.beneficiaryId is required (FHIR subject reference)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Encounter',
    status: toFhirStatus(session.status),
    class: { system: ACT_ENCOUNTER_CLASS_SYSTEM, code: 'VR', display: 'virtual' },
    subject: { reference: `Patient/${String(session.beneficiaryId)}` },
  };

  if (includeId && session._id) {
    resource.id = String(session._id);
  }

  if (session.therapistId) {
    resource.participant = [
      { individual: { reference: `Practitioner/${String(session.therapistId)}` } },
    ];
  }

  const period = buildPeriod(session);
  if (period) resource.period = period;

  if (session.episodeId) {
    resource.episodeOfCare = [{ reference: `EpisodeOfCare/${String(session.episodeId)}` }];
  }

  const ext = buildExtensions(session);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  teleRehabSessionToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  TRS_PLATFORM_EXTENSION_URL,
  TRS_SESSION_URL_EXTENSION_URL,
  TRS_CONSENT_EXTENSION_URL,
  TRS_CONNECTION_QUALITY_EXTENSION_URL,
  TRS_RECORDING_ALLOWED_EXTENSION_URL,
  TRS_RECORDING_URL_EXTENSION_URL,
};
