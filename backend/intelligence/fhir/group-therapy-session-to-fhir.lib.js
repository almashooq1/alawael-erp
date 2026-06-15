'use strict';
/**
 * GroupTherapySession → FHIR R4 Encounter mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 18th FHIR resource mapper. A group
 * therapy session is a single contact involving MULTIPLE beneficiaries
 * (intelligence/canonical/schemas/group-therapy-session.canonical.js). FHIR
 * models a clinical contact as an Encounter; for a group, Encounter.subject may
 * reference a Group, and the individual beneficiaries (with their attendance)
 * are carried as namespaced participant extensions because FHIR R4
 * Encounter.participant.individual cannot reference a Patient.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Encounter only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced.
 *
 * STANDARDS:
 *   - status maps to the FHIR Encounter status value-set:
 *       scheduled→planned, in_progress→in-progress, completed→finished,
 *       cancelled/no_show/rescheduled→cancelled, unknown→entered-in-error.
 *   - class uses HL7 v3-ActCode AMB (ambulatory).
 *   - subject references the Group (the canonical anchor for a group session).
 *   - participant[] carries the therapist (and co-therapist) as Practitioner.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ACT_ENCOUNTER_CLASS_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const GTS_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/encounter-type`;
const GTS_PARTICIPANT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/group-session-participant`;
const GTS_TOPIC_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/group-session-topic`;
const GTS_TOPIC_AR_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/group-session-topic-ar`;

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
 * Build the fixed group-therapy Encounter type CodeableConcept.
 * @returns {Array<object>}
 */
function buildType() {
  return [
    {
      coding: [{ system: GTS_TYPE_SYSTEM, code: 'group-therapy' }],
      text: 'Group Therapy Session',
    },
  ];
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
 * Build participant[] from the therapist and optional co-therapist.
 * @param {object} s session
 * @returns {Array<object>|undefined}
 */
function buildParticipants(s) {
  const participants = [];
  if (s.therapistId) {
    participants.push({
      individual: { reference: `Practitioner/${String(s.therapistId)}` },
    });
  }
  if (s.coTherapistId) {
    participants.push({
      individual: { reference: `Practitioner/${String(s.coTherapistId)}` },
    });
  }
  return participants.length ? participants : undefined;
}

/**
 * Build one nested participant extension per beneficiary (beneficiary ref +
 * optional episode ref + optional attendance code).
 * @param {object} p participant entry
 * @returns {object}
 */
function buildParticipantExtension(p) {
  const sub = [
    { url: 'beneficiary', valueReference: { reference: `Patient/${String(p.beneficiaryId)}` } },
  ];
  if (p.episodeId) {
    sub.push({
      url: 'episode',
      valueReference: { reference: `EpisodeOfCare/${String(p.episodeId)}` },
    });
  }
  if (p.attendance) {
    sub.push({ url: 'attendance', valueCode: p.attendance });
  }
  return { url: GTS_PARTICIPANT_EXTENSION_URL, extension: sub };
}

/**
 * Build the namespaced extension[] — one participant ext per beneficiary plus
 * the bilingual session topic.
 * @param {object} s session
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (Array.isArray(s.participants)) {
    for (const p of s.participants) {
      if (p && p.beneficiaryId) ext.push(buildParticipantExtension(p));
    }
  }
  if (s.topic) ext.push({ url: GTS_TOPIC_EXTENSION_URL, valueString: s.topic });
  if (s.topic_ar) ext.push({ url: GTS_TOPIC_AR_EXTENSION_URL, valueString: s.topic_ar });
  return ext;
}

/**
 * Project a canonical GroupTherapySession onto a base FHIR R4 Encounter.
 *
 * @param {object} session canonical GroupTherapySession
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Encounter
 * @throws {TypeError} when session, groupId or participants are missing
 */
function groupTherapySessionToFhir(session, opts = {}) {
  const { includeId = true } = opts;
  if (!session || typeof session !== 'object') {
    throw new TypeError('groupTherapySessionToFhir: session object is required');
  }
  if (!session.groupId) {
    throw new TypeError(
      'groupTherapySessionToFhir: session.groupId is required (FHIR subject reference)'
    );
  }
  if (!Array.isArray(session.participants) || session.participants.length === 0) {
    throw new TypeError('groupTherapySessionToFhir: session.participants must be non-empty');
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Encounter',
    status: toFhirStatus(session.status),
    class: { system: ACT_ENCOUNTER_CLASS_SYSTEM, code: 'AMB', display: 'ambulatory' },
    type: buildType(),
    subject: { reference: `Group/${String(session.groupId)}` },
  };

  if (includeId && session._id) {
    resource.id = String(session._id);
  }

  const participants = buildParticipants(session);
  if (participants) resource.participant = participants;

  const period = buildPeriod(session);
  if (period) resource.period = period;

  const ext = buildExtensions(session);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  groupTherapySessionToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildType,
  buildPeriod,
  buildParticipants,
  buildParticipantExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ACT_ENCOUNTER_CLASS_SYSTEM,
  GTS_TYPE_SYSTEM,
  GTS_PARTICIPANT_EXTENSION_URL,
  GTS_TOPIC_EXTENSION_URL,
  GTS_TOPIC_AR_EXTENSION_URL,
};
