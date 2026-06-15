'use strict';
/**
 * CommunicationAidProfile → FHIR R4 Observation mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): 14th FHIR resource mapper. The AAC
 * profile (intelligence/canonical/schemas/communication-aid-profile.canonical.js,
 * Augmentative & Alternative Communication module, one per beneficiary) is the
 * canonical clinical summary of a beneficiary's communication ability + the
 * aided tools they use. FHIR models a measured clinical characteristic of a
 * patient as an Observation — the same resource Assessment (W1311), SeizureEvent
 * (W1317) and BehaviorIncident (W1318) project onto. A FIXED code discriminator
 * (`communication-aid-profile`) keeps it queryable + distinguishable from the
 * other Observation producers.
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Observation only. Pure function:
 * no DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers
 * may post-process `meta.profile`).
 *
 * STANDARDS:
 *   - status maps the profile lifecycle onto the Observation status value-set
 *     (draft→registered, active→final, paused→preliminary, retired→cancelled;
 *     absent/unknown→unknown).
 *   - subject is the mandatory Patient reference.
 *   - code is the FIXED "communication aid profile" CodeableConcept (text carries
 *     the primary modality when present, coding stays stable for querying).
 *   - valueCodeableConcept = the canonical vocabularyLevel (the headline summary
 *     of the profile — the beneficiary's expressive language level).
 *   - effectiveDateTime = assessedAt; performer = assessedBy.
 *   - primaryModality + estimatedActiveVocabularyCount are carried as FHIR
 *     component[] (discrete, queryable sub-observations).
 *   - active modalities, the aided tool inventory, trained partners, the
 *     reassessment due date, discipline, home-use flag, branch and care-plan
 *     link are carried as namespaced extensions (lossless).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const AAC_CODE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/observation-type`;
const AAC_CODE = 'communication-aid-profile';
const AAC_COMPONENT_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/communication-aid-component`;
const AAC_VOCAB_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/communication-vocabulary-level`;
const AAC_MODALITY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/communication-modality`;

const AAC_LIFECYCLE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-lifecycle`;
const AAC_MODALITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-active-modality`;
const AAC_TOOL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-tool`;
const AAC_TRAINED_PARTNER_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-trained-partner`;
const AAC_HOME_USE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-used-at-home`;
const AAC_DISCIPLINE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-assessor-discipline`;
const AAC_REASSESSMENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-next-reassessment`;
const AAC_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-branch`;
const AAC_CARE_PLAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/communication-aid-linked-care-plan`;

/**
 * Canonical profile lifecycle → FHIR Observation status. The profile lifecycle
 * (draft/active/paused/retired) is projected onto the closest Observation
 * status; the raw lifecycle value is also kept losslessly in an extension.
 * @type {Record<string,string>}
 */
const STATUS_MAP = Object.freeze({
  draft: 'registered',
  active: 'final',
  paused: 'preliminary',
  retired: 'cancelled',
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
 * Map the canonical profile lifecycle onto the FHIR Observation status value-set.
 * @param {string|undefined} lifecycleStatus
 * @returns {string}
 */
function toFhirStatus(lifecycleStatus) {
  return STATUS_MAP[lifecycleStatus] || 'unknown';
}

/**
 * Build the FIXED FHIR `code` CodeableConcept. `text` carries the canonical
 * primary modality when present (human context) while `coding` stays stable.
 * @param {object} p profile
 * @returns {object}
 */
function buildCode(p) {
  const cc = {
    coding: [{ system: AAC_CODE_SYSTEM, code: AAC_CODE }],
  };
  if (p.primaryModality) cc.text = p.primaryModality;
  return cc;
}

/**
 * Build the headline `valueCodeableConcept` from the canonical vocabularyLevel
 * (the beneficiary's expressive language level — the profile's summary value).
 * @param {object} p profile
 * @returns {object|undefined}
 */
function buildValue(p) {
  if (!p.vocabularyLevel) return undefined;
  return {
    coding: [{ system: AAC_VOCAB_SYSTEM, code: p.vocabularyLevel }],
    text: p.vocabularyLevel,
  };
}

/**
 * Build the FHIR `component[]` (discrete queryable sub-observations).
 * @param {object} p profile
 * @returns {Array<object>|undefined}
 */
function buildComponents(p) {
  const components = [];
  if (p.primaryModality) {
    components.push({
      code: {
        coding: [{ system: AAC_COMPONENT_SYSTEM, code: 'primary-modality' }],
      },
      valueCodeableConcept: {
        coding: [{ system: AAC_MODALITY_SYSTEM, code: p.primaryModality }],
        text: p.primaryModality,
      },
    });
  }
  if (Number.isInteger(p.estimatedActiveVocabularyCount)) {
    components.push({
      code: {
        coding: [{ system: AAC_COMPONENT_SYSTEM, code: 'active-vocabulary-count' }],
      },
      valueQuantity: {
        value: p.estimatedActiveVocabularyCount,
        unit: 'words',
        system: 'http://unitsofmeasure.org',
        code: '{words}',
      },
    });
  }
  return components.length ? components : undefined;
}

/**
 * Build the nested extension carrying one aided AAC tool (name / tier /
 * modalityKey / symbolSet / independenceLevel / introducedAt / isActive).
 * @param {object} tool AacTool
 * @returns {object|undefined}
 */
function buildToolExtension(tool) {
  if (!tool || typeof tool !== 'object' || !tool.name) return undefined;
  const parts = [{ url: 'name', valueString: tool.name }];
  if (tool.tier) parts.push({ url: 'tier', valueCode: tool.tier });
  if (tool.modalityKey) parts.push({ url: 'modalityKey', valueString: tool.modalityKey });
  if (tool.symbolSet) parts.push({ url: 'symbolSet', valueString: tool.symbolSet });
  if (tool.independenceLevel) {
    parts.push({ url: 'independenceLevel', valueCode: tool.independenceLevel });
  }
  const introduced = toFhirDate(tool.introducedAt);
  if (introduced) parts.push({ url: 'introducedAt', valueDate: introduced });
  if (typeof tool.isActive === 'boolean') {
    parts.push({ url: 'isActive', valueBoolean: tool.isActive });
  }
  return { url: AAC_TOOL_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} p profile
 * @returns {Array<object>}
 */
function buildExtensions(p) {
  const ext = [];
  if (p.lifecycleStatus) {
    ext.push({ url: AAC_LIFECYCLE_EXTENSION_URL, valueCode: p.lifecycleStatus });
  }
  if (Array.isArray(p.activeModalities)) {
    for (const m of p.activeModalities) {
      if (m) ext.push({ url: AAC_MODALITY_EXTENSION_URL, valueCode: m });
    }
  }
  if (Array.isArray(p.activeTools)) {
    for (const tool of p.activeTools) {
      const te = buildToolExtension(tool);
      if (te) ext.push(te);
    }
  }
  if (Array.isArray(p.trainedPartners)) {
    for (const partner of p.trainedPartners) {
      if (partner) {
        ext.push({ url: AAC_TRAINED_PARTNER_EXTENSION_URL, valueString: partner });
      }
    }
  }
  if (typeof p.usedAtHome === 'boolean') {
    ext.push({ url: AAC_HOME_USE_EXTENSION_URL, valueBoolean: p.usedAtHome });
  }
  if (p.assessedByDiscipline) {
    ext.push({ url: AAC_DISCIPLINE_EXTENSION_URL, valueCode: p.assessedByDiscipline });
  }
  const reassessment = toFhirDate(p.nextReassessmentDue);
  if (reassessment) {
    ext.push({ url: AAC_REASSESSMENT_EXTENSION_URL, valueDate: reassessment });
  }
  if (p.branchId) {
    ext.push({
      url: AAC_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${String(p.branchId)}` },
    });
  }
  if (p.carePlanVersionId) {
    ext.push({
      url: AAC_CARE_PLAN_EXTENSION_URL,
      valueReference: { reference: `CarePlan/${String(p.carePlanVersionId)}` },
    });
  }
  return ext;
}

/**
 * Project a canonical CommunicationAidProfile onto a base FHIR R4 Observation.
 *
 * @param {object} profile canonical CommunicationAidProfile (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Observation
 * @throws {TypeError} when profile is missing, has no beneficiary link, or has
 *   no vocabularyLevel (the headline Observation value)
 */
function communicationAidProfileToFhir(profile, opts = {}) {
  const { includeId = true } = opts;
  if (!profile || typeof profile !== 'object') {
    throw new TypeError('communicationAidProfileToFhir: profile object is required');
  }
  if (!profile.beneficiaryId) {
    throw new TypeError(
      'communicationAidProfileToFhir: profile.beneficiaryId is required (FHIR subject reference)'
    );
  }
  if (!profile.vocabularyLevel) {
    throw new TypeError(
      'communicationAidProfileToFhir: profile.vocabularyLevel is required (FHIR Observation value)'
    );
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Observation',
    status: toFhirStatus(profile.lifecycleStatus),
    code: buildCode(profile),
    subject: { reference: `Patient/${String(profile.beneficiaryId)}` },
    valueCodeableConcept: buildValue(profile),
  };

  if (includeId && profile._id) {
    resource.id = String(profile._id);
  }

  const effective = toFhirDateTime(profile.assessedAt);
  if (effective) resource.effectiveDateTime = effective;

  if (profile.assessedBy) {
    resource.performer = [{ reference: `Practitioner/${String(profile.assessedBy)}` }];
  }

  const components = buildComponents(profile);
  if (components) resource.component = components;

  const ext = buildExtensions(profile);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  communicationAidProfileToFhir,
  toFhirDate,
  toFhirDateTime,
  toFhirStatus,
  buildCode,
  buildValue,
  buildComponents,
  buildToolExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  AAC_CODE_SYSTEM,
  AAC_CODE,
  AAC_COMPONENT_SYSTEM,
  AAC_VOCAB_SYSTEM,
  AAC_MODALITY_SYSTEM,
  AAC_LIFECYCLE_EXTENSION_URL,
  AAC_MODALITY_EXTENSION_URL,
  AAC_TOOL_EXTENSION_URL,
  AAC_TRAINED_PARTNER_EXTENSION_URL,
  AAC_HOME_USE_EXTENSION_URL,
  AAC_DISCIPLINE_EXTENSION_URL,
  AAC_REASSESSMENT_EXTENSION_URL,
  AAC_BRANCH_EXTENSION_URL,
  AAC_CARE_PLAN_EXTENSION_URL,
};
