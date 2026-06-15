'use strict';
/**
 * InstrumentalSwallowStudy → FHIR R4 DiagnosticReport mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 16th FHIR resource mapper. An
 * instrumental swallow study (VFSS / FEES / MBSS) records the diagnostic
 * findings a bedside DysphagiaAssessment can only refer for
 * (intelligence/canonical/schemas/instrumental-swallow-study.canonical.js,
 * Clinical Assessments module). FHIR models the result of a diagnostic
 * investigation as a DiagnosticReport — the study type is the report code, the
 * penetration-aspiration findings + per-consistency results + recommended diet
 * levels are carried losslessly.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 DiagnosticReport only. Pure
 * function: no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced
 * (callers may post-process `meta.profile`). The discrete per-consistency
 * findings are NOT emitted as standalone Observation resources here (that is a
 * larger, contained-resource change); they are carried as nested extensions.
 *
 * STANDARDS:
 *   - status maps the study lifecycle onto the DiagnosticReport status set
 *     (ordered/scheduled→registered, completed→final, cancelled→cancelled;
 *     else unknown).
 *   - code = the canonical studyType (vfss/fees/mbss).
 *   - category = a fixed swallow-study CodeableConcept.
 *   - subject = the mandatory Patient reference.
 *   - effectiveDateTime = performedDate; performer = performedBy.
 *   - impaired phases, penetration-aspiration scale, aspiration/silent
 *     aspiration flags, per-consistency results, recommended diet levels,
 *     NPO recommendation, the referring dysphagia assessment, the linked diet
 *     prescription, branch and cancel reason are carried as namespaced
 *     extensions (lossless).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const ISS_STUDY_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/instrumental-swallow-study-type`;
const ISS_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/diagnostic-report-category`;
const ISS_IDDSI_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/iddsi-level`;
const ISS_PHASE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/swallow-phase`;

const ISS_IMPAIRED_PHASE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-impaired-phase`;
const ISS_PAS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-penetration-aspiration-scale`;
const ISS_ASPIRATION_DETECTED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-aspiration-detected`;
const ISS_SILENT_ASPIRATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-silent-aspiration`;
const ISS_CONSISTENCY_RESULT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-consistency-result`;
const ISS_RECOMMENDED_DIET_LEVEL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-recommended-diet-level`;
const ISS_NPO_RECOMMENDED_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-npo-recommended`;
const ISS_DYSPHAGIA_ASSESSMENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-dysphagia-assessment`;
const ISS_DIET_PRESCRIPTION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-diet-prescription`;
const ISS_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-branch`;
const ISS_CANCEL_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/swallow-study-cancel-reason`;

/**
 * Canonical study lifecycle status → FHIR DiagnosticReport status. The raw
 * status is also kept losslessly via the chosen mapping (registered covers both
 * pre-completion states).
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  ordered: 'registered',
  scheduled: 'registered',
  completed: 'final',
  cancelled: 'cancelled',
});

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
 * Coerce a Date or loose date string into a FHIR `date` (YYYY-MM-DD).
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDate(value) {
  const iso = toFhirDateTime(value);
  return iso ? iso.slice(0, 10) : undefined;
}

/**
 * Map the canonical study status onto the FHIR DiagnosticReport status set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  return STATUS_MAP[status] || 'unknown';
}

/**
 * Build the FHIR `code` from the canonical studyType (what was performed).
 * `text` carries the raw study type for human readability.
 * @param {object} s study
 * @returns {object}
 */
function buildCode(s) {
  return {
    coding: [{ system: ISS_STUDY_TYPE_SYSTEM, code: s.studyType }],
    text: s.studyType,
  };
}

/**
 * Build the fixed `category[]` marking this report as a swallow study.
 * @returns {Array<object>}
 */
function buildCategory() {
  return [
    {
      coding: [{ system: ISS_CATEGORY_SYSTEM, code: 'swallow-study' }],
      text: 'Instrumental Swallow Study',
    },
  ];
}

/**
 * Build a single nested consistency-result extension. The IDDSI level is always
 * present (required in the canonical schema); penetration / aspiration / safe
 * flags are added only when set.
 * @param {object} r consistency result
 * @returns {object}
 */
function buildConsistencyResultExtension(r) {
  const sub = [
    {
      url: 'iddsi-level',
      valueCoding: { system: ISS_IDDSI_SYSTEM, code: String(r.iddsiLevel) },
    },
  ];
  if (typeof r.penetration === 'boolean') {
    sub.push({ url: 'penetration', valueBoolean: r.penetration });
  }
  if (typeof r.aspiration === 'boolean') {
    sub.push({ url: 'aspiration', valueBoolean: r.aspiration });
  }
  if (typeof r.safe === 'boolean') {
    sub.push({ url: 'safe', valueBoolean: r.safe });
  }
  return { url: ISS_CONSISTENCY_RESULT_EXTENSION_URL, extension: sub };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} s study
 * @returns {Array<object>}
 */
function buildExtensions(s) {
  const ext = [];
  if (Array.isArray(s.impairedPhases)) {
    for (const phase of s.impairedPhases) {
      ext.push({
        url: ISS_IMPAIRED_PHASE_EXTENSION_URL,
        valueCoding: { system: ISS_PHASE_SYSTEM, code: phase },
      });
    }
  }
  if (typeof s.penetrationAspirationScale === 'number') {
    ext.push({ url: ISS_PAS_EXTENSION_URL, valueInteger: s.penetrationAspirationScale });
  }
  if (typeof s.aspirationDetected === 'boolean') {
    ext.push({ url: ISS_ASPIRATION_DETECTED_EXTENSION_URL, valueBoolean: s.aspirationDetected });
  }
  if (typeof s.silentAspiration === 'boolean') {
    ext.push({ url: ISS_SILENT_ASPIRATION_EXTENSION_URL, valueBoolean: s.silentAspiration });
  }
  if (Array.isArray(s.consistencyResults)) {
    for (const r of s.consistencyResults) {
      if (r && r.iddsiLevel !== undefined && r.iddsiLevel !== null) {
        ext.push(buildConsistencyResultExtension(r));
      }
    }
  }
  if (Array.isArray(s.recommendedDietLevels)) {
    for (const level of s.recommendedDietLevels) {
      ext.push({
        url: ISS_RECOMMENDED_DIET_LEVEL_EXTENSION_URL,
        valueCoding: { system: ISS_IDDSI_SYSTEM, code: String(level) },
      });
    }
  }
  if (typeof s.npoRecommended === 'boolean') {
    ext.push({ url: ISS_NPO_RECOMMENDED_EXTENSION_URL, valueBoolean: s.npoRecommended });
  }
  if (s.dysphagiaAssessmentId) {
    ext.push({
      url: ISS_DYSPHAGIA_ASSESSMENT_EXTENSION_URL,
      valueString: String(s.dysphagiaAssessmentId),
    });
  }
  if (s.dietPrescriptionId) {
    ext.push({
      url: ISS_DIET_PRESCRIPTION_EXTENSION_URL,
      valueReference: { reference: `NutritionOrder/${String(s.dietPrescriptionId)}` },
    });
  }
  if (s.branchId) {
    ext.push({
      url: ISS_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(s.branchId)}` },
    });
  }
  if (s.cancelReason) {
    ext.push({ url: ISS_CANCEL_REASON_EXTENSION_URL, valueString: s.cancelReason });
  }
  return ext;
}

/**
 * Project a canonical InstrumentalSwallowStudy onto a base FHIR R4
 * DiagnosticReport.
 *
 * @param {object} study canonical InstrumentalSwallowStudy (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 DiagnosticReport
 * @throws {TypeError} when study is missing, has no beneficiary link, or has no
 *   studyType (DiagnosticReport needs the report code)
 */
function instrumentalSwallowStudyToFhir(study, opts = {}) {
  const { includeId = true } = opts;
  if (!study || typeof study !== 'object') {
    throw new TypeError('instrumentalSwallowStudyToFhir: study object is required');
  }
  if (!study.beneficiaryId) {
    throw new TypeError(
      'instrumentalSwallowStudyToFhir: study.beneficiaryId is required (FHIR subject reference)'
    );
  }
  if (!study.studyType) {
    throw new TypeError(
      'instrumentalSwallowStudyToFhir: study.studyType is required (DiagnosticReport code)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'DiagnosticReport',
    status: toFhirStatus(study.status),
    category: buildCategory(),
    code: buildCode(study),
    subject: { reference: `Patient/${String(study.beneficiaryId)}` },
  };

  if (includeId && study._id) {
    resource.id = String(study._id);
  }

  const effective = toFhirDateTime(study.performedDate);
  if (effective) resource.effectiveDateTime = effective;

  if (study.performedBy) {
    resource.performer = [{ reference: `Practitioner/${String(study.performedBy)}` }];
  }

  const ext = buildExtensions(study);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  instrumentalSwallowStudyToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  buildCode,
  buildCategory,
  buildConsistencyResultExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  ISS_STUDY_TYPE_SYSTEM,
  ISS_CATEGORY_SYSTEM,
  ISS_IDDSI_SYSTEM,
  ISS_PHASE_SYSTEM,
  ISS_IMPAIRED_PHASE_EXTENSION_URL,
  ISS_PAS_EXTENSION_URL,
  ISS_ASPIRATION_DETECTED_EXTENSION_URL,
  ISS_SILENT_ASPIRATION_EXTENSION_URL,
  ISS_CONSISTENCY_RESULT_EXTENSION_URL,
  ISS_RECOMMENDED_DIET_LEVEL_EXTENSION_URL,
  ISS_NPO_RECOMMENDED_EXTENSION_URL,
  ISS_DYSPHAGIA_ASSESSMENT_EXTENSION_URL,
  ISS_DIET_PRESCRIPTION_EXTENSION_URL,
  ISS_BRANCH_EXTENSION_URL,
  ISS_CANCEL_REASON_EXTENSION_URL,
};
