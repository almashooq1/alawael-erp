'use strict';
/**
 * W1339 — BiomedicalWasteRecord → FHIR R4 SupplyDelivery mapper.
 *
 * Projects a canonical BiomedicalWasteRecord (clinical-waste cradle-to-grave:
 * generate → store → collect → dispose) onto a base FHIR R4 SupplyDelivery —
 * the resource that models the delivery/movement of a quantity of an item.
 * The waste category + quantity become `suppliedItem`; the chain-of-custody
 * stages (generation / storage / collection / disposal) are carried as
 * namespaced extensions. The original lifecycle status is always preserved in
 * an extension while `status` is projected onto the SupplyDelivery value-set.
 *
 * PURE: no DB, no IO, no mongoose. Deterministic. Never mutates input.
 * Additive + non-breaking: standalone module, nothing else imports nothing.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

const BWR_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/biomedical-waste-category`;
const BWR_CONTAINER_COLOR_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/biomedical-waste-container-color`;
const BWR_DISPOSAL_METHOD_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/biomedical-waste-disposal-method`;
const BWR_RECORD_SYSTEM = `${ORG_FHIR_BASE}/identifier/biomedical-waste-record-number`;
const BWR_MANIFEST_SYSTEM = `${ORG_FHIR_BASE}/identifier/biomedical-waste-manifest-number`;

const SD = `${ORG_FHIR_BASE}/StructureDefinition`;
const BWR_STATUS_EXTENSION_URL = `${SD}/biomedical-waste-status`;
const BWR_CONTAINER_COLOR_EXTENSION_URL = `${SD}/biomedical-waste-container-color`;
const BWR_PUNCTURE_PROOF_EXTENSION_URL = `${SD}/biomedical-waste-puncture-proof`;
const BWR_CONTAINER_COUNT_EXTENSION_URL = `${SD}/biomedical-waste-container-count`;
const BWR_GENERATION_EXTENSION_URL = `${SD}/biomedical-waste-generation`;
const BWR_STORAGE_EXTENSION_URL = `${SD}/biomedical-waste-storage`;
const BWR_COLLECTION_EXTENSION_URL = `${SD}/biomedical-waste-collection`;
const BWR_DISPOSAL_EXTENSION_URL = `${SD}/biomedical-waste-disposal`;
const BWR_REJECTED_EXTENSION_URL = `${SD}/biomedical-waste-rejected-reason`;
const BWR_HANDLED_BY_EXTENSION_URL = `${SD}/biomedical-waste-handled-by`;
const BWR_NOTES_EXTENSION_URL = `${SD}/biomedical-waste-notes`;
const BWR_BRANCH_EXTENSION_URL = `${SD}/biomedical-waste-branch`;

// WasteStatus → FHIR SupplyDelivery.status (in-progress|completed|abandoned|entered-in-error)
const STATUS_MAP = Object.freeze({
  generated: 'in-progress',
  stored: 'in-progress',
  collected: 'in-progress',
  disposed: 'completed',
  rejected: 'abandoned',
});

/** Treat undefined/null/'' as absent (canonical uses z.literal('') unions). */
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

/** Project lifecycle status onto SupplyDelivery.status (default in-progress). */
function toFhirStatus(status) {
  if (!isPresent(status)) return 'in-progress';
  return STATUS_MAP[status] || 'in-progress';
}

/** suppliedItem: quantity in kg + the waste category as itemCodeableConcept. */
function buildSuppliedItem(record) {
  const item = {
    quantity: {
      value: record.quantityKg,
      unit: 'kg',
      system: 'http://unitsofmeasure.org',
      code: 'kg',
    },
    itemCodeableConcept: {
      coding: [{ system: BWR_CATEGORY_SYSTEM, code: record.wasteCategory }],
      text: record.wasteCategory,
    },
  };
  return item;
}

function pushExt(arr, ext) {
  if (ext.extension && ext.extension.length === 0) return;
  arr.push(ext);
}

function nested(url, children) {
  const extension = children.filter(Boolean);
  if (extension.length === 0) return null;
  return { url, extension };
}

function buildExtensions(record) {
  const ext = [];

  // Always carry the original lifecycle status.
  ext.push({ url: BWR_STATUS_EXTENSION_URL, valueCode: record.status });

  if (isPresent(record.containerColor)) {
    ext.push({ url: BWR_CONTAINER_COLOR_EXTENSION_URL, valueCode: record.containerColor });
  }
  if (typeof record.punctureProofContainer === 'boolean') {
    ext.push({
      url: BWR_PUNCTURE_PROOF_EXTENSION_URL,
      valueBoolean: record.punctureProofContainer,
    });
  }
  if (typeof record.containerCount === 'number') {
    ext.push({ url: BWR_CONTAINER_COUNT_EXTENSION_URL, valueInteger: record.containerCount });
  }

  // Generation stage.
  pushExt(
    ext,
    nested(BWR_GENERATION_EXTENSION_URL, [
      isPresent(record.generationDepartment)
        ? { url: 'department', valueString: record.generationDepartment }
        : null,
      isPresent(record.generationLocationNote)
        ? { url: 'locationNote', valueString: record.generationLocationNote }
        : null,
      isPresent(record.segregatedByName)
        ? { url: 'segregatedByName', valueString: record.segregatedByName }
        : null,
      isPresent(record.segregatedBy)
        ? {
            url: 'segregatedBy',
            valueReference: { reference: `Practitioner/${record.segregatedBy}` },
          }
        : null,
    ]) || { extension: [] }
  );

  // Storage stage.
  pushExt(
    ext,
    nested(BWR_STORAGE_EXTENSION_URL, [
      isPresent(record.storageLocation)
        ? { url: 'location', valueString: record.storageLocation }
        : null,
      toFhirDateTime(record.storedAt)
        ? { url: 'storedAt', valueDateTime: toFhirDateTime(record.storedAt) }
        : null,
      typeof record.maxStorageHours === 'number'
        ? { url: 'maxStorageHours', valueDecimal: record.maxStorageHours }
        : null,
    ]) || { extension: [] }
  );

  // Collection stage.
  pushExt(
    ext,
    nested(BWR_COLLECTION_EXTENSION_URL, [
      isPresent(record.collectionVendor)
        ? { url: 'vendor', valueString: record.collectionVendor }
        : null,
      isPresent(record.collectedByName)
        ? { url: 'collectedByName', valueString: record.collectedByName }
        : null,
      toFhirDateTime(record.collectionDate)
        ? { url: 'collectionDate', valueDateTime: toFhirDateTime(record.collectionDate) }
        : null,
      isPresent(record.manifestNumber)
        ? { url: 'manifestNumber', valueString: record.manifestNumber }
        : null,
    ]) || { extension: [] }
  );

  // Disposal stage.
  pushExt(
    ext,
    nested(BWR_DISPOSAL_EXTENSION_URL, [
      isPresent(record.disposalMethod) ? { url: 'method', valueCode: record.disposalMethod } : null,
      isPresent(record.disposalFacility)
        ? { url: 'facility', valueString: record.disposalFacility }
        : null,
      toFhirDateTime(record.disposalDate)
        ? { url: 'disposalDate', valueDateTime: toFhirDateTime(record.disposalDate) }
        : null,
      isPresent(record.treatmentCertificateRef)
        ? { url: 'treatmentCertificateRef', valueString: record.treatmentCertificateRef }
        : null,
    ]) || { extension: [] }
  );

  if (isPresent(record.rejectedReason)) {
    ext.push({ url: BWR_REJECTED_EXTENSION_URL, valueString: record.rejectedReason });
  }
  if (isPresent(record.handledBy)) {
    ext.push({
      url: BWR_HANDLED_BY_EXTENSION_URL,
      valueReference: { reference: `Practitioner/${record.handledBy}` },
    });
  }
  if (isPresent(record.notes)) {
    ext.push({ url: BWR_NOTES_EXTENSION_URL, valueString: record.notes });
  }
  // branchId is required → always present.
  ext.push({
    url: BWR_BRANCH_EXTENSION_URL,
    valueReference: { reference: `Organization/${record.branchId}` },
  });

  return ext;
}

function buildIdentifiers(record) {
  const ids = [];
  if (isPresent(record.recordNumber)) {
    ids.push({ system: BWR_RECORD_SYSTEM, value: record.recordNumber });
  }
  if (isPresent(record.manifestNumber)) {
    ids.push({ system: BWR_MANIFEST_SYSTEM, value: record.manifestNumber });
  }
  return ids;
}

/**
 * Map a canonical BiomedicalWasteRecord to a base FHIR R4 SupplyDelivery.
 * @param {object} record canonical BiomedicalWasteRecord
 * @param {object} [opts]
 * @param {boolean} [opts.includeId=true] set `id` from `_id`
 * @returns {object} plain FHIR SupplyDelivery resource
 */
function biomedicalWasteRecordToFhir(record, opts = {}) {
  if (!record || typeof record !== 'object') {
    throw new TypeError('biomedicalWasteRecordToFhir: record object is required');
  }
  if (!isPresent(record.branchId)) {
    throw new TypeError('biomedicalWasteRecordToFhir: record.branchId is required');
  }

  const { includeId = true } = opts;

  const resource = {
    resourceType: 'SupplyDelivery',
    status: toFhirStatus(record.status),
    suppliedItem: buildSuppliedItem(record),
  };

  if (includeId && isPresent(record._id)) {
    resource.id = String(record._id);
  }

  const identifiers = buildIdentifiers(record);
  if (identifiers.length) resource.identifier = identifiers;

  const occurrence = toFhirDateTime(record.generationDate);
  if (occurrence) resource.occurrenceDateTime = occurrence;

  resource.extension = buildExtensions(record);

  return resource;
}

module.exports = {
  biomedicalWasteRecordToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildSuppliedItem,
  buildIdentifiers,
  buildExtensions,
  isPresent,
  STATUS_MAP,
  ORG_FHIR_BASE,
  BWR_CATEGORY_SYSTEM,
  BWR_CONTAINER_COLOR_SYSTEM,
  BWR_DISPOSAL_METHOD_SYSTEM,
  BWR_RECORD_SYSTEM,
  BWR_MANIFEST_SYSTEM,
  BWR_STATUS_EXTENSION_URL,
  BWR_CONTAINER_COLOR_EXTENSION_URL,
  BWR_PUNCTURE_PROOF_EXTENSION_URL,
  BWR_CONTAINER_COUNT_EXTENSION_URL,
  BWR_GENERATION_EXTENSION_URL,
  BWR_STORAGE_EXTENSION_URL,
  BWR_COLLECTION_EXTENSION_URL,
  BWR_DISPOSAL_EXTENSION_URL,
  BWR_REJECTED_EXTENSION_URL,
  BWR_HANDLED_BY_EXTENSION_URL,
  BWR_NOTES_EXTENSION_URL,
  BWR_BRANCH_EXTENSION_URL,
};
