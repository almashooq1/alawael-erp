'use strict';
/**
 * SpasticityInjection → FHIR R4 Procedure mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 17th FHIR resource mapper. A
 * spasticity tone-management injection (botulinum / phenol / intrathecal
 * baclofen) is a clinical PROCEDURE performed on the beneficiary
 * (intelligence/canonical/schemas/spasticity-injection.canonical.js, Clinical
 * Procedures module). FHIR models a performed/planned intervention as a
 * Procedure — the agent is the procedure code, the targeted muscles project
 * onto bodySite, the goals onto reasonCode, and the dose / MAS / consent /
 * follow-up clock are carried losslessly.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Procedure only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers
 * may post-process `meta.profile`). The injected agent is NOT emitted as a
 * separate MedicationAdministration here (that is a larger, paired-resource
 * change); the dose is carried as an extension.
 *
 * STANDARDS:
 *   - status maps the procedure lifecycle onto the Procedure status set
 *     (planned→preparation, completed→completed, cancelled→not-done; else
 *     unknown).
 *   - code = the canonical agent (botulinum / phenol / ITB).
 *   - subject = the mandatory Patient reference.
 *   - performedDateTime = procedureDate; performer = physicianId.
 *   - reasonCode carries the goals (CodeableConcept text).
 *   - bodySite carries one CodeableConcept per targeted muscle (with side).
 *   - brand, total dose, per-muscle doses + Ashworth, consent, follow-up due,
 *     branch, care-plan link and cancel reason are carried as namespaced
 *     extensions (lossless).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const SI_AGENT_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/spasticity-injection-agent`;
const SI_REASON_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/spasticity-injection-goal`;
const SI_MUSCLE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/spasticity-target-muscle`;
const SI_SIDE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/body-side`;

const SI_BRAND_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-brand`;
const SI_TOTAL_DOSE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-total-dose-units`;
const SI_MUSCLE_DETAIL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-muscle-detail`;
const SI_CONSENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-consent-obtained`;
const SI_FOLLOW_UP_DUE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-follow-up-due`;
const SI_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-branch`;
const SI_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-linked-care-plan`;
const SI_CANCEL_REASON_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/spasticity-injection-cancel-reason`;

/**
 * Canonical procedure lifecycle status → FHIR Procedure status.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  planned: 'preparation',
  completed: 'completed',
  cancelled: 'not-done',
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
 * Map the canonical procedure status onto the FHIR Procedure status set.
 * @param {string|undefined} status
 * @returns {string}
 */
function toFhirStatus(status) {
  return STATUS_MAP[status] || 'unknown';
}

/**
 * Build the FHIR `code` from the canonical agent (what was injected).
 * `text` carries the raw agent for human readability.
 * @param {object} si injection
 * @returns {object}
 */
function buildCode(si) {
  return {
    coding: [{ system: SI_AGENT_SYSTEM, code: si.agent }],
    text: si.agent,
  };
}

/**
 * Build the `reasonCode[]` from the goals (each a discrete CodeableConcept
 * carrying its free text). Undefined when there are no goals.
 * @param {object} si injection
 * @returns {Array<object>|undefined}
 */
function buildReason(si) {
  if (!Array.isArray(si.goals) || si.goals.length === 0) return undefined;
  return si.goals.map(goal => ({
    coding: [{ system: SI_REASON_SYSTEM, code: 'goal' }],
    text: goal,
  }));
}

/**
 * Build the `bodySite[]` — one CodeableConcept per targeted muscle, coded with
 * the muscle and qualified by the laterality in `text`. Undefined when no
 * muscle map is present.
 * @param {object} si injection
 * @returns {Array<object>|undefined}
 */
function buildBodySite(si) {
  if (!Array.isArray(si.targetedMuscles) || si.targetedMuscles.length === 0) {
    return undefined;
  }
  const sites = si.targetedMuscles
    .filter(m => m && m.muscle)
    .map(m => {
      const coding = [{ system: SI_MUSCLE_SYSTEM, code: m.muscle }];
      if (m.side) coding.push({ system: SI_SIDE_SYSTEM, code: m.side });
      return { coding, text: m.side ? `${m.muscle} (${m.side})` : m.muscle };
    });
  return sites.length ? sites : undefined;
}

/**
 * Build a single nested per-muscle detail extension carrying the dose and the
 * pre-injection Ashworth (MAS) score, which the base bodySite cannot express.
 * @param {object} m targeted muscle
 * @returns {object}
 */
function buildMuscleDetailExtension(m) {
  const sub = [{ url: 'muscle', valueString: m.muscle }];
  if (m.side) sub.push({ url: 'side', valueCode: m.side });
  if (typeof m.doseUnits === 'number') {
    sub.push({ url: 'dose-units', valueDecimal: m.doseUnits });
  }
  if (m.ashworthBefore !== undefined && m.ashworthBefore !== null) {
    sub.push({ url: 'ashworth-before', valueString: String(m.ashworthBefore) });
  }
  return { url: SI_MUSCLE_DETAIL_EXTENSION_URL, extension: sub };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} si injection
 * @returns {Array<object>}
 */
function buildExtensions(si) {
  const ext = [];
  if (si.brandName) ext.push({ url: SI_BRAND_EXTENSION_URL, valueString: si.brandName });
  if (typeof si.totalDoseUnits === 'number') {
    ext.push({ url: SI_TOTAL_DOSE_EXTENSION_URL, valueDecimal: si.totalDoseUnits });
  }
  if (Array.isArray(si.targetedMuscles)) {
    for (const m of si.targetedMuscles) {
      if (m && m.muscle) ext.push(buildMuscleDetailExtension(m));
    }
  }
  if (typeof si.consentObtained === 'boolean') {
    ext.push({ url: SI_CONSENT_EXTENSION_URL, valueBoolean: si.consentObtained });
  }
  const followUpDue = toFhirDate(si.followUpDueDate);
  if (followUpDue) ext.push({ url: SI_FOLLOW_UP_DUE_EXTENSION_URL, valueDate: followUpDue });
  if (si.branchId) {
    ext.push({
      url: SI_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(si.branchId)}` },
    });
  }
  if (si.carePlanVersionId) {
    ext.push({
      url: SI_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(si.carePlanVersionId)}` },
    });
  }
  if (si.cancelReason) {
    ext.push({ url: SI_CANCEL_REASON_EXTENSION_URL, valueString: si.cancelReason });
  }
  return ext;
}

/**
 * Project a canonical SpasticityInjection onto a base FHIR R4 Procedure.
 *
 * @param {object} injection canonical SpasticityInjection (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Procedure
 * @throws {TypeError} when injection is missing, has no beneficiary link, or has
 *   no agent (Procedure needs the procedure code)
 */
function spasticityInjectionToFhir(injection, opts = {}) {
  const { includeId = true } = opts;
  if (!injection || typeof injection !== 'object') {
    throw new TypeError('spasticityInjectionToFhir: injection object is required');
  }
  if (!injection.beneficiaryId) {
    throw new TypeError(
      'spasticityInjectionToFhir: injection.beneficiaryId is required (FHIR subject reference)'
    );
  }
  if (!injection.agent) {
    throw new TypeError('spasticityInjectionToFhir: injection.agent is required (Procedure code)');
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Procedure',
    status: toFhirStatus(injection.status),
    code: buildCode(injection),
    subject: { reference: `Patient/${String(injection.beneficiaryId)}` },
  };

  if (includeId && injection._id) {
    resource.id = String(injection._id);
  }

  const performed = toFhirDateTime(injection.procedureDate);
  if (performed) resource.performedDateTime = performed;

  if (injection.physicianId) {
    resource.performer = [
      { actor: { reference: `Practitioner/${String(injection.physicianId)}` } },
    ];
  }

  const reason = buildReason(injection);
  if (reason) resource.reasonCode = reason;

  const bodySite = buildBodySite(injection);
  if (bodySite) resource.bodySite = bodySite;

  const ext = buildExtensions(injection);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  spasticityInjectionToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  buildCode,
  buildReason,
  buildBodySite,
  buildMuscleDetailExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  SI_AGENT_SYSTEM,
  SI_REASON_SYSTEM,
  SI_MUSCLE_SYSTEM,
  SI_SIDE_SYSTEM,
  SI_BRAND_EXTENSION_URL,
  SI_TOTAL_DOSE_EXTENSION_URL,
  SI_MUSCLE_DETAIL_EXTENSION_URL,
  SI_CONSENT_EXTENSION_URL,
  SI_FOLLOW_UP_DUE_EXTENSION_URL,
  SI_BRANCH_EXTENSION_URL,
  SI_CARE_PLAN_EXTENSION_URL,
  SI_CANCEL_REASON_EXTENSION_URL,
};
