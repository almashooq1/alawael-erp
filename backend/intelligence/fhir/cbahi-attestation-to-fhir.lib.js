'use strict';
/**
 * W1341 — CbahiAttestation → FHIR R4 Observation mapper.
 *
 * Projects a canonical CbahiAttestation (per-branch, per-standard CBAHI
 * accreditation meeting-status attestation with evidence + score) onto a base
 * FHIR R4 Observation. The branch is the assessed `subject` (Location); the
 * CBAHI standard is the observation `code`; the met/not-met determination is
 * the observation `value`; the percentage score is an Observation.component;
 * evidence + gap notes + reassessment cadence are carried as namespaced
 * extensions. The original attestation status is always preserved in an
 * extension while `status` is projected onto the Observation value-set.
 *
 * PURE: no DB, no IO, no mongoose. Deterministic. Never mutates input.
 * Additive + non-breaking: standalone module.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

const CBAHI_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/cbahi-category`;
const CBAHI_CATEGORY_CODE = 'cbahi-accreditation';
const CBAHI_STANDARD_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/cbahi-standard`;
const CBAHI_ATTESTATION_STATUS_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/cbahi-attestation-status`;
const CBAHI_SCORE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/cbahi-observation-component`;

const SD = `${ORG_FHIR_BASE}/StructureDefinition`;
const CBAHI_STATUS_EXTENSION_URL = `${SD}/cbahi-status`;
const CBAHI_STANDARD_EXTENSION_URL = `${SD}/cbahi-standard`;
const CBAHI_EVIDENCE_EXTENSION_URL = `${SD}/cbahi-evidence`;
const CBAHI_GAP_NOTES_EXTENSION_URL = `${SD}/cbahi-gap-notes`;
const CBAHI_NA_JUSTIFICATION_EXTENSION_URL = `${SD}/cbahi-na-justification`;
const CBAHI_LINKED_CAPA_EXTENSION_URL = `${SD}/cbahi-linked-capa`;
const CBAHI_ASSESSED_BY_ROLE_EXTENSION_URL = `${SD}/cbahi-assessed-by-role`;
const CBAHI_NEXT_REASSESSMENT_EXTENSION_URL = `${SD}/cbahi-next-reassessment`;
const CBAHI_BRANCH_EXTENSION_URL = `${SD}/cbahi-branch`;

// AttestationStatus → FHIR Observation.status (the attestation's workflow state)
const STATUS_MAP = Object.freeze({
  draft: 'preliminary',
  met: 'final',
  partially_met: 'final',
  not_met: 'final',
  not_applicable: 'final',
});

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

/** Map an ISO-ish input to a full FHIR dateTime; undefined for bad/absent input. */
function toFhirDateTime(value) {
  if (!isPresent(value)) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Project attestation status onto Observation.status (default unknown). */
function toFhirStatus(status) {
  if (!isPresent(status)) return 'unknown';
  return STATUS_MAP[status] || 'unknown';
}

/** Fixed CBAHI accreditation category discriminator. */
function buildCategory() {
  return [
    {
      coding: [{ system: CBAHI_CATEGORY_SYSTEM, code: CBAHI_CATEGORY_CODE }],
      text: 'CBAHI Accreditation',
    },
  ];
}

/** Observation.code from the CBAHI standard. */
function buildCode(record) {
  return {
    coding: [
      {
        system: CBAHI_STANDARD_SYSTEM,
        code: isPresent(record.standardCode) ? record.standardCode : record.standardKey,
      },
    ],
    text: record.standardKey,
  };
}

/** Observation.value = the met/not-met determination. */
function buildValue(record) {
  return {
    coding: [{ system: CBAHI_ATTESTATION_STATUS_SYSTEM, code: record.status }],
    text: record.status,
  };
}

/** Observation.component = the percentage score (when present). */
function buildComponents(record) {
  if (typeof record.score !== 'number') return undefined;
  return [
    {
      code: {
        coding: [{ system: CBAHI_SCORE_SYSTEM, code: 'score' }],
        text: 'score',
      },
      valueQuantity: {
        value: record.score,
        unit: '%',
        system: 'http://unitsofmeasure.org',
        code: '%',
      },
    },
  ];
}

function buildEvidenceExtension(entry) {
  const children = [];
  if (isPresent(entry.type)) children.push({ url: 'type', valueCode: entry.type });
  if (isPresent(entry.summary)) children.push({ url: 'summary', valueString: entry.summary });
  if (isPresent(entry.artifactId)) {
    children.push({ url: 'artifactId', valueString: entry.artifactId });
  }
  if (isPresent(entry.artifactKind)) {
    children.push({ url: 'artifactKind', valueString: entry.artifactKind });
  }
  const capturedAt = toFhirDateTime(entry.capturedAt);
  if (capturedAt) children.push({ url: 'capturedAt', valueDateTime: capturedAt });
  if (isPresent(entry.capturedBy)) {
    children.push({
      url: 'capturedBy',
      valueReference: { reference: `Practitioner/${entry.capturedBy}` },
    });
  }
  if (children.length === 0) return null;
  return { url: CBAHI_EVIDENCE_EXTENSION_URL, extension: children };
}

function buildExtensions(record) {
  const ext = [];

  // Always carry the original attestation status.
  ext.push({ url: CBAHI_STATUS_EXTENSION_URL, valueCode: record.status });

  // Standard identification (nested).
  const standardChildren = [{ url: 'key', valueString: record.standardKey }];
  if (isPresent(record.standardChapter)) {
    standardChildren.push({ url: 'chapter', valueString: record.standardChapter });
  }
  if (isPresent(record.standardCode)) {
    standardChildren.push({ url: 'code', valueString: record.standardCode });
  }
  ext.push({ url: CBAHI_STANDARD_EXTENSION_URL, extension: standardChildren });

  if (Array.isArray(record.evidence)) {
    for (const entry of record.evidence) {
      const evidenceExt = buildEvidenceExtension(entry);
      if (evidenceExt) ext.push(evidenceExt);
    }
  }

  if (isPresent(record.gapNotes)) {
    ext.push({ url: CBAHI_GAP_NOTES_EXTENSION_URL, valueString: record.gapNotes });
  }
  if (isPresent(record.naJustification)) {
    ext.push({ url: CBAHI_NA_JUSTIFICATION_EXTENSION_URL, valueString: record.naJustification });
  }
  if (isPresent(record.linkedCapaItemId)) {
    ext.push({
      url: CBAHI_LINKED_CAPA_EXTENSION_URL,
      valueString: String(record.linkedCapaItemId),
    });
  }
  if (isPresent(record.assessedByRole)) {
    ext.push({ url: CBAHI_ASSESSED_BY_ROLE_EXTENSION_URL, valueString: record.assessedByRole });
  }
  const nextDue = toFhirDateTime(record.nextReassessmentDue);
  if (nextDue) {
    ext.push({ url: CBAHI_NEXT_REASSESSMENT_EXTENSION_URL, valueDateTime: nextDue });
  }

  // branchId is required → always present.
  ext.push({
    url: CBAHI_BRANCH_EXTENSION_URL,
    valueReference: { reference: `Organization/${record.branchId}` },
  });

  return ext;
}

/**
 * Map a canonical CbahiAttestation to a base FHIR R4 Observation.
 * @param {object} record canonical CbahiAttestation
 * @param {object} [opts]
 * @param {boolean} [opts.includeId=true] set `id` from `_id`
 * @returns {object} plain FHIR Observation resource
 */
function cbahiAttestationToFhir(record, opts = {}) {
  if (!record || typeof record !== 'object') {
    throw new TypeError('cbahiAttestationToFhir: record object is required');
  }
  if (!isPresent(record.branchId)) {
    throw new TypeError('cbahiAttestationToFhir: record.branchId is required');
  }
  if (!isPresent(record.standardKey)) {
    throw new TypeError('cbahiAttestationToFhir: record.standardKey is required');
  }

  const { includeId = true } = opts;

  const resource = {
    resourceType: 'Observation',
    status: toFhirStatus(record.status),
    category: buildCategory(),
    code: buildCode(record),
    subject: { reference: `Location/${record.branchId}` },
    valueCodeableConcept: buildValue(record),
  };

  if (includeId && isPresent(record._id)) {
    resource.id = String(record._id);
  }

  const effective = toFhirDateTime(record.assessedAt);
  if (effective) resource.effectiveDateTime = effective;

  if (isPresent(record.assessedBy)) {
    resource.performer = [{ reference: `Practitioner/${record.assessedBy}` }];
  }

  const components = buildComponents(record);
  if (components) resource.component = components;

  resource.extension = buildExtensions(record);

  return resource;
}

module.exports = {
  cbahiAttestationToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildCategory,
  buildCode,
  buildValue,
  buildComponents,
  buildEvidenceExtension,
  buildExtensions,
  isPresent,
  STATUS_MAP,
  ORG_FHIR_BASE,
  CBAHI_CATEGORY_SYSTEM,
  CBAHI_CATEGORY_CODE,
  CBAHI_STANDARD_SYSTEM,
  CBAHI_ATTESTATION_STATUS_SYSTEM,
  CBAHI_SCORE_SYSTEM,
  CBAHI_STATUS_EXTENSION_URL,
  CBAHI_STANDARD_EXTENSION_URL,
  CBAHI_EVIDENCE_EXTENSION_URL,
  CBAHI_GAP_NOTES_EXTENSION_URL,
  CBAHI_NA_JUSTIFICATION_EXTENSION_URL,
  CBAHI_LINKED_CAPA_EXTENSION_URL,
  CBAHI_ASSESSED_BY_ROLE_EXTENSION_URL,
  CBAHI_NEXT_REASSESSMENT_EXTENSION_URL,
  CBAHI_BRANCH_EXTENSION_URL,
};
