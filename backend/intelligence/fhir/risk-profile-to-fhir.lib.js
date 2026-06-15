'use strict';
/**
 * RiskProfile → FHIR R4 RiskAssessment mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): the unified per-beneficiary risk
 * profile (intelligence/risk/orchestrator.getBeneficiaryRiskProfile()) is a
 * derived, explainable score — exactly what FHIR's RiskAssessment resource
 * exists to carry. Projecting it gives a FHIR-conformance test a target and
 * lets downstream/EMR consumers read risk in a standard shape.
 *
 * SCOPE (deliberately minimal — additive, non-breaking):
 *   - Base FHIR R4 RiskAssessment only. No KSA NPHIES profile binding forced
 *     here (a product decision); callers may post-process `meta.profile`.
 *   - Pure function: no DB, no I/O, no mongoose.
 *
 * STANDARDS:
 *   - status maps to the FHIR observation-status value-set bound by
 *     RiskAssessment:  RISK_SCORE_COMPUTED → final,
 *     RISK_NO_SOURCES_AVAILABLE → registered (record exists, no data yet),
 *     absent → registered, unrecognised → entered-in-error.
 *   - subject is the mandatory Patient/<beneficiaryId> reference.
 *   - occurrenceDateTime carries computedAt.
 *   - prediction[] carries ONE entry (the unified overall risk):
 *       qualitativeRisk = the tier as a CodeableConcept,
 *       probabilityDecimal = overallScore / 100 (lossless, reversible ×100).
 *     No prediction is emitted when overallScore is null (no-sources case).
 *   - note carries the human explanation (the project rule: every smart score
 *     must be explainable).
 *   - episode link, composite weighting, and the explainable topFactors[] are
 *     carried as namespaced extensions so the projection is lossless.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const RISK_TIER_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/risk-tier`;
const RISK_EPISODE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/risk-episode`;
const RISK_COMPOSITE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/risk-composite`;
const RISK_FACTOR_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/risk-factor`;
const RISK_SCORE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/risk-overall-score`;

/**
 * Canonical RiskProfile.reason → FHIR RiskAssessment.status.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  RISK_SCORE_COMPUTED: 'final',
  RISK_NO_SOURCES_AVAILABLE: 'registered',
});

/**
 * Map a canonical risk reason to a FHIR status, defaulting absent → registered
 * and an unrecognised value → entered-in-error rather than guessing.
 * @param {string|undefined} reason
 * @returns {string}
 */
function toFhirStatus(reason) {
  if (!reason) return 'registered';
  return STATUS_MAP[reason] || 'entered-in-error';
}

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full instant).
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
 * Build the prediction[] for the unified overall risk. Returns undefined when
 * no score is present (the RISK_NO_SOURCES_AVAILABLE case), so the resource
 * doesn't assert a risk it couldn't compute.
 * @param {object} profile
 * @returns {Array<object>|undefined}
 */
function buildPrediction(profile) {
  if (typeof profile.overallScore !== 'number' || profile.overallTier == null) {
    return undefined;
  }
  /** @type {Record<string, any>} */
  const prediction = {
    outcome: { text: 'Overall rehabilitation risk' },
    qualitativeRisk: {
      coding: [{ system: RISK_TIER_SYSTEM, code: String(profile.overallTier) }],
    },
    probabilityDecimal: profile.overallScore / 100,
  };
  if (profile.overallTierAr) {
    prediction.qualitativeRisk.text = String(profile.overallTierAr);
  }
  return [prediction];
}

/**
 * Build one namespaced extension per explainable risk factor. Lossless: keeps
 * code, label, source, weight, and contribution so the "every score must be
 * explainable" rule survives the projection.
 * @param {Array<object>|undefined} factors
 * @returns {Array<object>}
 */
function buildFactorExtensions(factors) {
  if (!Array.isArray(factors)) return [];
  const out = [];
  factors.forEach(f => {
    if (!f || typeof f !== 'object' || !f.code) return;
    const parts = [{ url: 'code', valueString: String(f.code) }];
    if (f.label) parts.push({ url: 'label', valueString: String(f.label) });
    if (f.source) parts.push({ url: 'source', valueCode: String(f.source) });
    if (typeof f.weight === 'number') {
      parts.push({ url: 'weight', valueDecimal: f.weight });
    }
    if (typeof f.contribution === 'number') {
      parts.push({ url: 'contribution', valueDecimal: f.contribution });
    }
    out.push({ url: RISK_FACTOR_EXTENSION_URL, extension: parts });
  });
  return out;
}

/**
 * Build the non-base extension[] array (episode link, composite weighting, raw
 * 0-100 score, and the explainable factors).
 * @param {object} profile
 * @returns {Array<object>}
 */
function buildExtensions(profile) {
  const ext = [];

  if (profile.episodeId) {
    ext.push({
      url: RISK_EPISODE_EXTENSION_URL,
      valueReference: { reference: `EpisodeOfCare/${String(profile.episodeId)}` },
    });
  }

  // Raw 0-100 score alongside the prediction's 0-1 probabilityDecimal, so a
  // consumer that wants the native scale doesn't have to multiply.
  if (typeof profile.overallScore === 'number') {
    ext.push({ url: RISK_SCORE_EXTENSION_URL, valueDecimal: profile.overallScore });
  }

  const c = profile.composite;
  if (c && typeof c === 'object') {
    const parts = [];
    if (typeof c.weightUsed === 'number') {
      parts.push({ url: 'weightUsed', valueDecimal: c.weightUsed });
    }
    if (typeof c.sourceCount === 'number') {
      parts.push({ url: 'sourceCount', valueInteger: c.sourceCount });
    }
    if (Array.isArray(c.sourcesContributing)) {
      c.sourcesContributing.forEach(s =>
        parts.push({ url: 'sourceContributing', valueCode: String(s) })
      );
    }
    if (parts.length) {
      ext.push({ url: RISK_COMPOSITE_EXTENSION_URL, extension: parts });
    }
  }

  return ext.concat(buildFactorExtensions(profile.topFactors));
}

/**
 * Project a canonical RiskProfile onto a base FHIR R4 RiskAssessment resource.
 *
 * @param {object} profile canonical RiskProfile (derived view — see schema)
 * @param {{includeId?:boolean}} [opts]  RiskProfile is not persisted, so id is
 *   only emitted when the caller supplies a profile._id (rare).
 * @returns {object} FHIR R4 RiskAssessment
 * @throws {TypeError} when profile is missing or has no beneficiary link
 */
function riskProfileToFhir(profile, opts = {}) {
  const { includeId = true } = opts;
  if (!profile || typeof profile !== 'object') {
    throw new TypeError('riskProfileToFhir: profile object is required');
  }
  if (!profile.beneficiaryId) {
    throw new TypeError(
      'riskProfileToFhir: profile.beneficiaryId is required (FHIR patient reference)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'RiskAssessment',
    status: toFhirStatus(profile.reason),
    subject: { reference: `Patient/${String(profile.beneficiaryId)}` },
  };

  if (includeId && profile._id) {
    resource.id = String(profile._id);
  }

  const occurrence = toFhirDateTime(profile.computedAt);
  if (occurrence) resource.occurrenceDateTime = occurrence;

  const prediction = buildPrediction(profile);
  if (prediction) resource.prediction = prediction;

  if (profile.explanation) {
    resource.note = [{ text: String(profile.explanation) }];
  }

  const ext = buildExtensions(profile);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  riskProfileToFhir,
  // exported for unit testing
  toFhirStatus,
  toFhirDateTime,
  buildPrediction,
  buildFactorExtensions,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  RISK_TIER_SYSTEM,
  RISK_EPISODE_EXTENSION_URL,
  RISK_COMPOSITE_EXTENSION_URL,
  RISK_FACTOR_EXTENSION_URL,
  RISK_SCORE_EXTENSION_URL,
};
