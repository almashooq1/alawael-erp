'use strict';
/**
 * Assessment → FHIR R4 Observation mapper (foundation).
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): third FHIR resource mapper after
 * Patient (W1309) and EpisodeOfCare (W1310). A scored assessment event is the
 * canonical "one scored evaluation" (intelligence/canonical/schemas/
 * assessment.canonical.js); FHIR models a scored evaluation as an Observation.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Observation only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers
 * may post-process `meta.profile`).
 *
 * STANDARDS:
 *   - status maps to the FHIR Observation status value-set:
 *       draft→registered, in_progress/submitted/reviewed→preliminary,
 *       approved→final, cancelled→cancelled, unknown→entered-in-error.
 *   - subject is the mandatory Patient reference.
 *   - code is REQUIRED in FHIR; built from the canonical assessment `type`
 *     under a namespaced CodeSystem (no LOINC binding forced here).
 *   - score → valueQuantity{1}; maxScore + measure link + episode link carried
 *     as namespaced extensions so the projection is lossless.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ASSESSMENT_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/assessment-type`;
const MAX_SCORE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/assessment-max-score`;
const MEASURE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/assessment-measure`;
const EPISODE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/assessment-episode`;

/**
 * Canonical assessment status → FHIR Observation status value-set.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  draft: 'registered',
  in_progress: 'preliminary',
  submitted: 'preliminary',
  reviewed: 'preliminary',
  approved: 'final',
  cancelled: 'cancelled',
});

/**
 * Map a canonical assessment status to a FHIR Observation status, defaulting an
 * unrecognised value to `entered-in-error` rather than guessing.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  if (!status) return 'final'; // absence → assume a completed observation record
  return STATUS_MAP[status] || 'entered-in-error';
}

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO) so the
 * exact evaluation instant is preserved.
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
 * Build the mandatory FHIR `code` CodeableConcept from the assessment type.
 * @param {object} a assessment
 * @returns {object}
 */
function buildCode(a) {
  return {
    coding: [{ system: ASSESSMENT_TYPE_SYSTEM, code: a.type }],
    text: a.type,
  };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} a assessment
 * @returns {Array<object>}
 */
function buildExtensions(a) {
  const ext = [];
  if (typeof a.maxScore === 'number') {
    ext.push({ url: MAX_SCORE_EXTENSION_URL, valueDecimal: a.maxScore });
  }
  if (a.measureId) {
    ext.push({
      url: MEASURE_EXTENSION_URL,
      valueReference: { reference: `Questionnaire/${String(a.measureId)}` },
    });
  }
  if (a.episodeId) {
    ext.push({
      url: EPISODE_EXTENSION_URL,
      valueReference: { reference: `EpisodeOfCare/${String(a.episodeId)}` },
    });
  }
  return ext;
}

/**
 * Project a canonical Assessment onto a base FHIR R4 Observation resource.
 *
 * @param {object} assessment canonical Assessment (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Observation
 * @throws {TypeError} when assessment is missing, has no beneficiary link, or
 *   has no type (FHIR Observation.code is mandatory)
 */
function assessmentToFhirObservation(assessment, opts = {}) {
  const { includeId = true } = opts;
  if (!assessment || typeof assessment !== 'object') {
    throw new TypeError('assessmentToFhirObservation: assessment object is required');
  }
  if (!assessment.beneficiaryId) {
    throw new TypeError(
      'assessmentToFhirObservation: assessment.beneficiaryId is required (FHIR subject reference)'
    );
  }
  if (!assessment.type) {
    throw new TypeError(
      'assessmentToFhirObservation: assessment.type is required (FHIR Observation.code is mandatory)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Observation',
    status: toFhirStatus(assessment.status),
    code: buildCode(assessment),
    subject: { reference: `Patient/${String(assessment.beneficiaryId)}` },
  };

  if (includeId && assessment._id) {
    resource.id = String(assessment._id);
  }

  const effective = toFhirDateTime(assessment.conductedAt);
  if (effective) resource.effectiveDateTime = effective;

  if (assessment.conductedBy) {
    resource.performer = [{ reference: `Practitioner/${String(assessment.conductedBy)}` }];
  }

  if (typeof assessment.score === 'number') {
    resource.valueQuantity = { value: assessment.score };
  }

  if (assessment.scoreInterpretation) {
    resource.interpretation = [{ text: assessment.scoreInterpretation }];
  }

  if (assessment.notes) {
    resource.note = [{ text: assessment.notes }];
  }

  const ext = buildExtensions(assessment);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  assessmentToFhirObservation,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildCode,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ASSESSMENT_TYPE_SYSTEM,
  MAX_SCORE_EXTENSION_URL,
  MEASURE_EXTENSION_URL,
  EPISODE_EXTENSION_URL,
};
