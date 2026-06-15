'use strict';
/**
 * ARVRSession → FHIR R4 Encounter mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 20th FHIR resource mapper. An
 * immersive AR/VR rehabilitation session is a clinical contact delivered through
 * head-mounted hardware (intelligence/canonical/schemas/arvr-session.canonical.js).
 * FHIR models a contact as an Encounter; the immersive class plus device /
 * scenario / cybersickness specifics are carried losslessly as namespaced
 * extensions.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Encounter only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps to the FHIR Encounter status value-set:
 *       scheduled→planned, in_progress→in-progress, completed→finished,
 *       cancelled/no_show/rescheduled→cancelled, unknown→entered-in-error.
 *   - class uses HL7 v3-ActCode VR (virtual) — immersive contact.
 *   - subject is the mandatory Patient reference.
 *   - episodeOfCare links the session to its unifying journey (native field).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ACT_ENCOUNTER_CLASS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const AVR_DEVICE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/arvr-device`;
const AVR_SCENARIO_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/arvr-scenario`;
const AVR_SCENARIO_VERSION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/arvr-scenario-version`;
const AVR_IMMERSION_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/arvr-immersion-type`;
const AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/arvr-cybersickness-reported`;
const AVR_CYBERSICKNESS_SEVERITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/arvr-cybersickness-severity`;
const AVR_COMPLETION_PERCENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/arvr-completion-percent`;

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
 * Build the namespaced extension[] (lossless carry of immersive nuance).
 * @param {object} s session
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (s.device) ext.push({ url: AVR_DEVICE_EXTENSION_URL, valueCode: s.device });
  if (s.scenarioId)
    ext.push({ url: AVR_SCENARIO_EXTENSION_URL, valueString: String(s.scenarioId) });
  if (s.scenarioVersion) {
    ext.push({ url: AVR_SCENARIO_VERSION_EXTENSION_URL, valueString: String(s.scenarioVersion) });
  }
  if (s.immersionType) {
    ext.push({ url: AVR_IMMERSION_TYPE_EXTENSION_URL, valueCode: s.immersionType });
  }
  if (typeof s.cybersicknessReported === 'boolean') {
    ext.push({
      url: AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL,
      valueBoolean: s.cybersicknessReported,
    });
  }
  if (s.cybersicknessSeverity) {
    ext.push({
      url: AVR_CYBERSICKNESS_SEVERITY_EXTENSION_URL,
      valueCode: s.cybersicknessSeverity,
    });
  }
  if (typeof s.completionPercent === 'number') {
    ext.push({
      url: AVR_COMPLETION_PERCENT_EXTENSION_URL,
      valueDecimal: s.completionPercent,
    });
  }
  return ext;
}

/**
 * Project a canonical ARVRSession onto a base FHIR R4 Encounter resource.
 *
 * @param {object} session canonical ARVRSession
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Encounter
 * @throws {TypeError} when session is missing or has no beneficiary link
 */
function arvrSessionToFhir(session, opts = {}) {
  const { includeId = true } = opts;
  if (!session || typeof session !== 'object') {
    throw new TypeError('arvrSessionToFhir: session object is required');
  }
  if (!session.beneficiaryId) {
    throw new TypeError(
      'arvrSessionToFhir: session.beneficiaryId is required (FHIR subject reference)'
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
  arvrSessionToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  AVR_DEVICE_EXTENSION_URL,
  AVR_SCENARIO_EXTENSION_URL,
  AVR_SCENARIO_VERSION_EXTENSION_URL,
  AVR_IMMERSION_TYPE_EXTENSION_URL,
  AVR_CYBERSICKNESS_REPORTED_EXTENSION_URL,
  AVR_CYBERSICKNESS_SEVERITY_EXTENSION_URL,
  AVR_COMPLETION_PERCENT_EXTENSION_URL,
};
