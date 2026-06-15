'use strict';
/**
 * W1339 — BiomedicalWasteRecord → FHIR R4 SupplyDelivery mapper tests.
 *
 * Pure unit tests (no DB). Validates the projection of a canonical
 * BiomedicalWasteRecord onto a base FHIR R4 SupplyDelivery plus a canonical
 * round-trip.
 */

const {
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
} = require('../intelligence/fhir/biomedical-waste-record-to-fhir.lib');
const { canonical } = require('../intelligence/canonical');

const DISPOSED = Object.freeze({
  _id: '64b0000000000000000000ff',
  branchId: '64a2222222222222222222bb',
  recordNumber: 'BWR-2026-001',
  wasteCategory: 'sharps',
  containerColor: 'yellow',
  punctureProofContainer: true,
  quantityKg: 3.2,
  containerCount: 4,
  generationDate: '2026-02-01T08:00:00.000Z',
  generationDepartment: 'Phlebotomy',
  generationLocationNote: 'Room 12',
  segregatedByName: 'Nurse Huda',
  segregatedBy: '64a4444444444444444444dd',
  status: 'disposed',
  storageLocation: 'Cold store A',
  storedAt: '2026-02-01T10:00:00.000Z',
  maxStorageHours: 48,
  collectionVendor: 'GreenMed Co',
  collectedByName: 'Driver Ali',
  collectionDate: '2026-02-02T09:00:00.000Z',
  manifestNumber: 'MAN-77',
  disposalMethod: 'incineration',
  disposalFacility: 'Riyadh Incineration Plant',
  disposalDate: '2026-02-03T14:00:00.000Z',
  treatmentCertificateRef: 'CERT-99',
  handledBy: '64a5555555555555555555ee',
  notes: 'Routine sharps disposal',
});

const MINIMAL = Object.freeze({
  branchId: '64a2222222222222222222bb',
  wasteCategory: 'infectious',
  quantityKg: 0.5,
  generationDate: '2026-03-01T08:00:00.000Z',
  status: 'generated',
});

const REJECTED = Object.freeze({
  _id: '64b0000000000000000000ee',
  branchId: '64a2222222222222222222bb',
  wasteCategory: 'pharmaceutical',
  quantityKg: 1.1,
  generationDate: '2026-02-10T08:00:00.000Z',
  status: 'rejected',
  disposalMethod: '',
  rejectedReason: 'Improper segregation',
});

describe('W1339 biomedicalWasteRecordToFhir — canonical round-trip', () => {
  it('DISPOSED fixture satisfies the canonical schema', () => {
    expect(canonical.BiomedicalWasteRecord.safeParse(DISPOSED).success).toBe(true);
  });

  it('MINIMAL fixture satisfies the canonical schema', () => {
    expect(canonical.BiomedicalWasteRecord.safeParse(MINIMAL).success).toBe(true);
  });

  it('REJECTED fixture satisfies the canonical schema', () => {
    expect(canonical.BiomedicalWasteRecord.safeParse(REJECTED).success).toBe(true);
  });
});

describe('W1339 biomedicalWasteRecordToFhir — resource shape', () => {
  it('emits a FHIR R4 SupplyDelivery', () => {
    expect(biomedicalWasteRecordToFhir(DISPOSED).resourceType).toBe('SupplyDelivery');
  });

  it('sets id from _id when includeId (default)', () => {
    expect(biomedicalWasteRecordToFhir(DISPOSED).id).toBe('64b0000000000000000000ff');
  });

  it('omits id when includeId is false', () => {
    expect(biomedicalWasteRecordToFhir(DISPOSED, { includeId: false }).id).toBeUndefined();
  });

  it('omits id when _id is absent', () => {
    expect(biomedicalWasteRecordToFhir(MINIMAL).id).toBeUndefined();
  });

  it('suppliedItem carries the quantity in kg', () => {
    expect(biomedicalWasteRecordToFhir(DISPOSED).suppliedItem.quantity).toEqual({
      value: 3.2,
      unit: 'kg',
      system: 'http://unitsofmeasure.org',
      code: 'kg',
    });
  });

  it('suppliedItem carries the waste category as itemCodeableConcept', () => {
    expect(biomedicalWasteRecordToFhir(DISPOSED).suppliedItem.itemCodeableConcept).toEqual({
      coding: [{ system: BWR_CATEGORY_SYSTEM, code: 'sharps' }],
      text: 'sharps',
    });
  });

  it('occurrenceDateTime maps from generationDate', () => {
    expect(biomedicalWasteRecordToFhir(DISPOSED).occurrenceDateTime).toBe(
      '2026-02-01T08:00:00.000Z'
    );
  });

  it('identifier carries record + manifest numbers', () => {
    expect(biomedicalWasteRecordToFhir(DISPOSED).identifier).toEqual([
      { system: BWR_RECORD_SYSTEM, value: 'BWR-2026-001' },
      { system: BWR_MANIFEST_SYSTEM, value: 'MAN-77' },
    ]);
  });

  it('omits identifier when none present', () => {
    expect(biomedicalWasteRecordToFhir(MINIMAL).identifier).toBeUndefined();
  });

  it('output is a plain object', () => {
    expect(Object.getPrototypeOf(biomedicalWasteRecordToFhir(DISPOSED))).toBe(Object.prototype);
  });

  it('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(DISPOSED));
    biomedicalWasteRecordToFhir(input);
    expect(input).toEqual(DISPOSED);
  });
});

describe('W1339 status mapping', () => {
  it('STATUS_MAP is frozen', () => {
    expect(Object.isFrozen(STATUS_MAP)).toBe(true);
  });

  it('maps lifecycle states onto the SupplyDelivery.status value-set', () => {
    expect(toFhirStatus('generated')).toBe('in-progress');
    expect(toFhirStatus('stored')).toBe('in-progress');
    expect(toFhirStatus('collected')).toBe('in-progress');
    expect(toFhirStatus('disposed')).toBe('completed');
    expect(toFhirStatus('rejected')).toBe('abandoned');
  });

  it('absent → in-progress; unmapped → in-progress', () => {
    expect(toFhirStatus(undefined)).toBe('in-progress');
    expect(toFhirStatus('weird')).toBe('in-progress');
  });
});

describe('W1339 extensions', () => {
  it('always carries the original status + branch', () => {
    const ext = buildExtensions(DISPOSED);
    expect(ext.find(e => e.url === BWR_STATUS_EXTENSION_URL).valueCode).toBe('disposed');
    expect(ext.find(e => e.url === BWR_BRANCH_EXTENSION_URL)).toEqual({
      url: BWR_BRANCH_EXTENSION_URL,
      valueReference: { reference: 'Organization/64a2222222222222222222bb' },
    });
  });

  it('carries container color + puncture-proof + count', () => {
    const ext = buildExtensions(DISPOSED);
    expect(ext.find(e => e.url === BWR_CONTAINER_COLOR_EXTENSION_URL).valueCode).toBe('yellow');
    expect(ext.find(e => e.url === BWR_PUNCTURE_PROOF_EXTENSION_URL).valueBoolean).toBe(true);
    expect(ext.find(e => e.url === BWR_CONTAINER_COUNT_EXTENSION_URL).valueInteger).toBe(4);
  });

  it('carries the nested generation stage', () => {
    const gen = buildExtensions(DISPOSED).find(e => e.url === BWR_GENERATION_EXTENSION_URL);
    expect(gen.extension).toContainEqual({ url: 'department', valueString: 'Phlebotomy' });
    expect(gen.extension).toContainEqual({
      url: 'segregatedBy',
      valueReference: { reference: 'Practitioner/64a4444444444444444444dd' },
    });
  });

  it('carries the nested storage + collection + disposal stages', () => {
    const ext = buildExtensions(DISPOSED);
    const storage = ext.find(e => e.url === BWR_STORAGE_EXTENSION_URL);
    expect(storage.extension).toContainEqual({ url: 'maxStorageHours', valueDecimal: 48 });
    const collection = ext.find(e => e.url === BWR_COLLECTION_EXTENSION_URL);
    expect(collection.extension).toContainEqual({ url: 'vendor', valueString: 'GreenMed Co' });
    expect(collection.extension).toContainEqual({ url: 'manifestNumber', valueString: 'MAN-77' });
    const disposal = ext.find(e => e.url === BWR_DISPOSAL_EXTENSION_URL);
    expect(disposal.extension).toContainEqual({ url: 'method', valueCode: 'incineration' });
    expect(disposal.extension).toContainEqual({
      url: 'disposalDate',
      valueDateTime: '2026-02-03T14:00:00.000Z',
    });
  });

  it('carries handledBy + notes', () => {
    const ext = buildExtensions(DISPOSED);
    expect(ext.find(e => e.url === BWR_HANDLED_BY_EXTENSION_URL).valueReference).toEqual({
      reference: 'Practitioner/64a5555555555555555555ee',
    });
    expect(ext.find(e => e.url === BWR_NOTES_EXTENSION_URL).valueString).toBe(
      'Routine sharps disposal'
    );
  });

  it('carries rejectedReason + omits empty disposal stage on the REJECTED fixture', () => {
    const ext = buildExtensions(REJECTED);
    expect(ext.find(e => e.url === BWR_REJECTED_EXTENSION_URL).valueString).toBe(
      'Improper segregation'
    );
    expect(ext.find(e => e.url === BWR_DISPOSAL_EXTENSION_URL)).toBeUndefined();
  });

  it('MINIMAL carries only the status + branch extensions', () => {
    const ext = biomedicalWasteRecordToFhir(MINIMAL).extension;
    expect(ext.map(e => e.url)).toEqual([BWR_STATUS_EXTENSION_URL, BWR_BRANCH_EXTENSION_URL]);
  });
});

describe('W1339 helpers + guards', () => {
  it('ORG_FHIR_BASE is the org base URL', () => {
    expect(ORG_FHIR_BASE).toBe('https://alawael.sa/fhir');
  });

  it('isPresent treats empty string as absent', () => {
    expect(isPresent('')).toBe(false);
    expect(isPresent(undefined)).toBe(false);
    expect(isPresent('x')).toBe(true);
  });

  it('buildSuppliedItem uses the kg quantity', () => {
    expect(buildSuppliedItem({ quantityKg: 9, wasteCategory: 'general' }).quantity.value).toBe(9);
  });

  it('buildIdentifiers returns empty array when no numbers', () => {
    expect(buildIdentifiers({})).toEqual([]);
  });

  it('toFhirDateTime returns full ISO; rejects bad input', () => {
    expect(toFhirDateTime('2026-02-01T08:00:00.000Z')).toBe('2026-02-01T08:00:00.000Z');
    expect(toFhirDateTime(undefined)).toBeUndefined();
    expect(toFhirDateTime('not-a-date')).toBeUndefined();
  });

  it('throws when record is missing', () => {
    expect(() => biomedicalWasteRecordToFhir()).toThrow(TypeError);
    expect(() => biomedicalWasteRecordToFhir(null)).toThrow(/record object is required/);
  });

  it('throws when branchId is missing', () => {
    expect(() => biomedicalWasteRecordToFhir({ wasteCategory: 'sharps' })).toThrow(
      /branchId is required/
    );
  });
});
