'use strict';
/**
 * EpisodeOfCare → FHIR R4 EpisodeOfCare mapper (foundation).
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): companion to
 * beneficiary-to-fhir.lib.js (W1309). The Episode of Care is the platform's
 * unifying clinical journey — every assessment, plan, session, goal, measure,
 * report, and family interaction anchors to ONE episode (see the canonical
 * contract intelligence/canonical/schemas/episode-of-care.canonical.js). A
 * FHIR-conformance test for that journey needs a resource projection to assert
 * against; this pure library is that projection.
 *
 * SCOPE (deliberately minimal — additive, non-breaking):
 *   - Base FHIR R4 EpisodeOfCare only. No KSA NPHIES profile binding is forced
 *     here (a product decision); callers may post-process `meta.profile`.
 *   - Pure function: no DB, no I/O, no mongoose. Safe to unit-test and to call
 *     from a route, a cron, or a CLI.
 *
 * STANDARDS:
 *   - status maps to the FHIR EpisodeOfCare status value-set:
 *       planned→planned, active→active, on_hold/suspended→onhold,
 *       completed/transferred→finished, cancelled→cancelled.
 *     (`transferred` → finished because the episode concluded at this center;
 *      the transfer itself is carried in the namespaced status extension.)
 *   - patient is the mandatory subject reference (Patient/<beneficiaryId>).
 *   - careManager references the lead therapist as a Practitioner.
 *   - Non-base data (type, priority, current phase, transfer nuance) is carried
 *     as namespaced FHIR extensions so no information is silently dropped.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const EPISODE_NUMBER_SYSTEM = `${ORG_FHIR_BASE}/identifier/episode-number`;
const EPISODE_TYPE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/episode-type`;
const EPISODE_PRIORITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/episode-priority`;
const EPISODE_PHASE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/episode-phase`;
const EPISODE_STATUS_DETAIL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/episode-status-detail`;

/**
 * Canonical lifecycle status → FHIR EpisodeOfCare status value-set.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  planned: 'planned',
  active: 'active',
  on_hold: 'onhold',
  suspended: 'onhold',
  completed: 'finished',
  transferred: 'finished',
  cancelled: 'cancelled',
});

/**
 * Map a canonical episode status to a FHIR status, defaulting to
 * `entered-in-error` for an unrecognised value rather than guessing.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'active'; // absence → assume a live episode record
  return STATUS_MAP[status] || 'entered-in-error';
}

/**
 * Coerce a Date or loose date string into a FHIR `dateTime`/`date`.
 * Mirrors beneficiary-to-fhir.lib.toFhirDate but kept local so each mapper is
 * independently importable (no cross-lib coupling for one trivial helper).
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
 * Build the FHIR `period` from the episode timeline. `end` prefers the actual
 * end date, falling back to the expected end date when the episode is still
 * open (so a planned closure is still surfaced).
 * @param {object} ep episode
 * @returns {object|undefined}
 */
function buildPeriod(ep) {
  const start = toFhirDate(ep.startDate);
  const end = toFhirDate(ep.actualEndDate) || toFhirDate(ep.expectedEndDate);
  if (!start && !end) return undefined;
  /** @type {{start?:string,end?:string}} */
  const period = {};
  if (start) period.start = start;
  if (end) period.end = end;
  return period;
}

/**
 * Build the non-base extension[] array. Each non-FHIR-base canonical field is
 * carried as a namespaced extension so the projection is lossless.
 * @param {object} ep episode
 * @returns {Array<object>}
 */
function buildExtensions(ep) {
  const ext = [];
  if (ep.type) {
    ext.push({ url: EPISODE_TYPE_EXTENSION_URL, valueCode: ep.type });
  }
  if (ep.priority) {
    ext.push({ url: EPISODE_PRIORITY_EXTENSION_URL, valueCode: ep.priority });
  }
  if (ep.currentPhase) {
    ext.push({ url: EPISODE_PHASE_EXTENSION_URL, valueCode: ep.currentPhase });
  }
  // Preserve the transfer nuance lost when transferred→finished.
  if (ep.status === 'transferred') {
    ext.push({
      url: EPISODE_STATUS_DETAIL_EXTENSION_URL,
      valueCode: 'transferred',
    });
  }
  return ext;
}

/**
 * Project a canonical EpisodeOfCare onto a base FHIR R4 EpisodeOfCare resource.
 *
 * @param {object} episode canonical EpisodeOfCare (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 EpisodeOfCare
 * @throws {TypeError} when episode is missing or has no beneficiary link
 */
function episodeOfCareToFhir(episode, opts = {}) {
  const { includeId = true } = opts;
  if (!episode || typeof episode !== 'object') {
    throw new TypeError('episodeOfCareToFhir: episode object is required');
  }
  if (!episode.beneficiaryId) {
    throw new TypeError(
      'episodeOfCareToFhir: episode.beneficiaryId is required (FHIR patient reference)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'EpisodeOfCare',
    status: toFhirStatus(episode.status),
    patient: { reference: `Patient/${String(episode.beneficiaryId)}` },
  };

  if (includeId && episode._id) {
    resource.id = String(episode._id);
  }

  if (episode.episodeNumber) {
    resource.identifier = [{ system: EPISODE_NUMBER_SYSTEM, value: String(episode.episodeNumber) }];
  }

  const period = buildPeriod(episode);
  if (period) resource.period = period;

  if (episode.leadTherapistId) {
    resource.careManager = {
      reference: `Practitioner/${String(episode.leadTherapistId)}`,
    };
  }

  const ext = buildExtensions(episode);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  episodeOfCareToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDate,
  buildPeriod,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  EPISODE_NUMBER_SYSTEM,
  EPISODE_TYPE_EXTENSION_URL,
  EPISODE_PRIORITY_EXTENSION_URL,
  EPISODE_PHASE_EXTENSION_URL,
  EPISODE_STATUS_DETAIL_EXTENSION_URL,
};
