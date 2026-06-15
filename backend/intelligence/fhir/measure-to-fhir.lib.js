'use strict';
/**
 * Measure → FHIR R4 Questionnaire mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): the Assessment→Observation mapper
 * (W1311) already emits a `Questionnaire/<measureId>` reference for the
 * instrument a score was produced from. That reference dangled — nothing
 * projected the canonical Measure (the *definition* of a clinical instrument:
 * M-CHAT-R/F, CARS-2, Vineland …) onto an actual FHIR Questionnaire. This pure
 * library closes that loop so a conformance test can resolve the reference.
 *
 * SCOPE (deliberately minimal — additive, non-breaking):
 *   - Base FHIR R4 Questionnaire only. No KSA NPHIES profile binding is forced
 *     here (a product decision); callers may post-process `meta.profile`.
 *   - Pure function: no DB, no I/O, no mongoose. Safe to unit-test and to call
 *     from a route, a cron, or a CLI.
 *
 * STANDARDS:
 *   - status maps to the FHIR Questionnaire publication-status value-set:
 *       isActive===true → active, isActive===false → retired,
 *       isActive absent → draft (definition exists but not yet published).
 *   - the stable canonical `code` becomes BOTH the Questionnaire.identifier
 *     (under the org instrument-code system) AND the top-level `code` coding
 *     (so the W1311 Observation.code can be cross-walked).
 *   - bilingual name → title (English) + a namespaced Arabic-title extension.
 *   - category, scoringMethod, score range, applicable-age window, and the
 *     interpretation cut-off bands are carried as namespaced extensions so the
 *     projection is lossless (no FHIR-base home for them on Questionnaire).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const MEASURE_CODE_SYSTEM = `${ORG_FHIR_BASE}/identifier/measure-code`;
const MEASURE_CODE_CODING_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/measure-code`;
const MEASURE_NAME_AR_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/measure-name-ar`;
const MEASURE_CATEGORY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/measure-category`;
const MEASURE_SCORING_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/measure-scoring-method`;
const MEASURE_SCORE_RANGE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/measure-score-range`;
const MEASURE_AGE_RANGE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/measure-applicable-age-months`;
const MEASURE_CUTOFF_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/measure-cutoff`;

/**
 * Canonical activity flag → FHIR Questionnaire publication status.
 * A missing flag means the instrument is defined but not yet published.
 * @param {boolean|undefined} isActive
 * @returns {string}
 */
function toFhirStatus(isActive) {
  if (isActive === true) return 'active';
  if (isActive === false) return 'retired';
  return 'draft';
}

/**
 * Build the Questionnaire.identifier[] from the stable canonical code.
 * @param {object} measure
 * @returns {Array<object>}
 */
function buildIdentifiers(measure) {
  if (!measure.code) return [];
  return [{ system: MEASURE_CODE_SYSTEM, value: String(measure.code) }];
}

/**
 * Build the top-level Questionnaire.code coding from the stable canonical code.
 * Mirrors the system the W1311 Observation.code uses so they cross-walk.
 * @param {object} measure
 * @returns {Array<object>|undefined}
 */
function buildCode(measure) {
  if (!measure.code) return undefined;
  /** @type {{system:string,code:string,display?:string}} */
  const coding = { system: MEASURE_CODE_CODING_SYSTEM, code: String(measure.code) };
  if (measure.name) coding.display = String(measure.name);
  return [coding];
}

/**
 * Build the non-base extension[] array. Each non-FHIR-base canonical field is
 * carried as a namespaced extension so the projection is lossless.
 * @param {object} measure
 * @returns {Array<object>}
 */
function buildExtensions(measure) {
  const ext = [];

  if (measure.name_ar) {
    ext.push({ url: MEASURE_NAME_AR_EXTENSION_URL, valueString: String(measure.name_ar) });
  }
  if (measure.category) {
    ext.push({ url: MEASURE_CATEGORY_EXTENSION_URL, valueCode: String(measure.category) });
  }
  if (measure.scoringMethod) {
    ext.push({ url: MEASURE_SCORING_EXTENSION_URL, valueCode: String(measure.scoringMethod) });
  }

  // Score range as a nested extension (only emit the bounds that exist).
  const rangeParts = [];
  if (typeof measure.minScore === 'number') {
    rangeParts.push({ url: 'min', valueDecimal: measure.minScore });
  }
  if (typeof measure.maxScore === 'number') {
    rangeParts.push({ url: 'max', valueDecimal: measure.maxScore });
  }
  if (rangeParts.length) {
    ext.push({ url: MEASURE_SCORE_RANGE_EXTENSION_URL, extension: rangeParts });
  }

  // Applicable-age window (months) as a nested extension.
  const ageParts = [];
  if (typeof measure.applicableAgeMinMonths === 'number') {
    ageParts.push({ url: 'min', valueInteger: measure.applicableAgeMinMonths });
  }
  if (typeof measure.applicableAgeMaxMonths === 'number') {
    ageParts.push({ url: 'max', valueInteger: measure.applicableAgeMaxMonths });
  }
  if (ageParts.length) {
    ext.push({ url: MEASURE_AGE_RANGE_EXTENSION_URL, extension: ageParts });
  }

  // Interpretation cut-off bands — one extension per band, lossless.
  if (Array.isArray(measure.cutoffs)) {
    measure.cutoffs.forEach(band => {
      if (!band || typeof band !== 'object') return;
      const parts = [];
      if (band.label) parts.push({ url: 'label', valueString: String(band.label) });
      if (band.label_ar) parts.push({ url: 'label_ar', valueString: String(band.label_ar) });
      if (typeof band.minScore === 'number') {
        parts.push({ url: 'min', valueDecimal: band.minScore });
      }
      if (typeof band.maxScore === 'number') {
        parts.push({ url: 'max', valueDecimal: band.maxScore });
      }
      if (parts.length) ext.push({ url: MEASURE_CUTOFF_EXTENSION_URL, extension: parts });
    });
  }

  return ext;
}

/**
 * Project a canonical Measure onto a base FHIR R4 Questionnaire resource.
 *
 * @param {object} measure canonical Measure (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Questionnaire
 * @throws {TypeError} when measure is missing or has no stable code
 */
function measureToFhirQuestionnaire(measure, opts = {}) {
  const { includeId = true } = opts;
  if (!measure || typeof measure !== 'object') {
    throw new TypeError('measureToFhirQuestionnaire: measure object is required');
  }
  if (!measure.code) {
    throw new TypeError(
      'measureToFhirQuestionnaire: measure.code is required (stable instrument identifier)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Questionnaire',
    status: toFhirStatus(measure.isActive),
  };

  if (includeId && measure._id) {
    resource.id = String(measure._id);
  }

  const identifiers = buildIdentifiers(measure);
  if (identifiers.length) resource.identifier = identifiers;

  if (measure.name) resource.title = String(measure.name);

  const code = buildCode(measure);
  if (code) resource.code = code;

  const ext = buildExtensions(measure);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  measureToFhirQuestionnaire,
  // exported for unit testing
  toFhirStatus,
  buildIdentifiers,
  buildCode,
  buildExtensions,
  ORG_FHIR_BASE,
  MEASURE_CODE_SYSTEM,
  MEASURE_CODE_CODING_SYSTEM,
  MEASURE_NAME_AR_EXTENSION_URL,
  MEASURE_CATEGORY_EXTENSION_URL,
  MEASURE_SCORING_EXTENSION_URL,
  MEASURE_SCORE_RANGE_EXTENSION_URL,
  MEASURE_AGE_RANGE_EXTENSION_URL,
  MEASURE_CUTOFF_EXTENSION_URL,
};
