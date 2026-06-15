'use strict';
/**
 * AssistiveDevice → FHIR R4 Device mapper.
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): tenth FHIR resource mapper. An
 * assistive device is the canonical "one physical assistive-tech asset unit"
 * (intelligence/canonical/schemas/assistive-device.canonical.js, Assistive
 * Devices module — per-unit inventory with a loan + maintenance lifecycle).
 * FHIR models a physical device instance as a Device resource (NOT
 * DeviceUseStatement, which describes a *patient's use* — here the canonical
 * entity is the asset itself, so Device is the correct projection; the current
 * loanee is carried via Device.patient).
 *
 * SCOPE (additive, non-breaking): base FHIR R4 Device only. Pure function: no
 * DB, no I/O, no mongoose. No KSA NPHIES profile binding is forced (callers may
 * post-process `meta.profile`).
 *
 * STANDARDS:
 *   - identifier[0] = assetTag (mandatory business identifier); serialNumber is
 *     carried both as the native Device.serialNumber element AND a secondary
 *     identifier when present.
 *   - status maps the 4-state availability onto the FHIR Device.status value-set
 *     (active | inactive | entered-in-error | unknown): available/loaned/
 *     maintenance → active (the asset still physically exists & is valid),
 *     retired → inactive, anything else → unknown. The full 4-state availability
 *     is preserved losslessly in an extension.
 *   - type = a CodeableConcept from the canonical category.
 *   - deviceName = the human asset name.
 *   - patient = the current loanee (Device.patient is the R4 association slot).
 *   - owner = the owning Organization (branch).
 *   - warranty, acquisition cost, current condition, maintenance schedule, loan
 *     history and maintenance history are carried as namespaced extensions so
 *     nothing in the canonical record is lost.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';
const DEVICE_ASSET_TAG_SYSTEM = `${ORG_FHIR_BASE}/identifier/device-asset-tag`;
const DEVICE_SERIAL_SYSTEM = `${ORG_FHIR_BASE}/identifier/device-serial`;
const DEVICE_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/device-category`;
const DEVICE_AVAILABILITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-availability`;
const DEVICE_CONDITION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-condition`;
const DEVICE_WARRANTY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-warranty-expires`;
const DEVICE_ACQUISITION_COST_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-acquisition-cost`;
const DEVICE_NEXT_MAINTENANCE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-next-maintenance-due`;
const DEVICE_CURRENT_LOAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-current-loan`;
const DEVICE_RETIRED_AT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-retired-at`;
const DEVICE_LOAN_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-loan`;
const DEVICE_MAINTENANCE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/device-maintenance`;

/**
 * Canonical 4-state availability → FHIR Device.status (active | inactive |
 * entered-in-error | unknown). The richer availability is preserved in an
 * extension; this collapses only to the coarse FHIR lifecycle slot.
 * @type {Record<string,string>}
 */
const AVAILABILITY_STATUS = Object.freeze({
  available: 'active',
  loaned: 'active',
  maintenance: 'active',
  retired: 'inactive',
});

/**
 * Coerce a Date or loose date string into a FHIR `dateTime` (full ISO) so the
 * exact instant is preserved.
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
 * Map canonical availability onto the FHIR Device.status value-set.
 * @param {string|undefined} availability
 * @returns {string}
 */
function toFhirStatus(availability) {
  return AVAILABILITY_STATUS[availability] || 'unknown';
}

/**
 * Build the Device.identifier[] — assetTag is mandatory; serialNumber is a
 * secondary identifier when present.
 * @param {object} d assistive device
 * @returns {Array<object>}
 */
function buildIdentifiers(d) {
  const identifiers = [{ system: DEVICE_ASSET_TAG_SYSTEM, value: d.assetTag }];
  if (d.serialNumber) {
    identifiers.push({ system: DEVICE_SERIAL_SYSTEM, value: d.serialNumber });
  }
  return identifiers;
}

/**
 * Build the Device.type CodeableConcept from the canonical category.
 * @param {object} d assistive device
 * @returns {object}
 */
function buildType(d) {
  return {
    coding: [{ system: DEVICE_CATEGORY_SYSTEM, code: d.category }],
    text: d.name,
  };
}

/**
 * Build a nested extension describing the current open loan (when the device is
 * loaned out). Carries the loanee, start and expected-return instants.
 * @param {object} d assistive device
 * @returns {object|undefined}
 */
function buildCurrentLoanExtension(d) {
  const parts = [];
  if (d.currentLoaneeId) {
    parts.push({
      url: 'loanee',
      valueReference: { reference: `Patient/${String(d.currentLoaneeId)}` },
    });
  }
  const startedAt = toFhirDateTime(d.currentLoanStartedAt);
  if (startedAt) parts.push({ url: 'startedAt', valueDateTime: startedAt });
  const expectedReturnAt = toFhirDateTime(d.currentLoanExpectedReturnAt);
  if (expectedReturnAt) {
    parts.push({ url: 'expectedReturnAt', valueDateTime: expectedReturnAt });
  }
  if (!parts.length) return undefined;
  return { url: DEVICE_CURRENT_LOAN_EXTENSION_URL, extension: parts };
}

/**
 * Build one nested extension per historical loan entry (lossless carry of the
 * loan ledger).
 * @param {object} loan loan entry
 * @returns {object|undefined}
 */
function buildLoanExtension(loan) {
  if (!loan || typeof loan !== 'object') return undefined;
  const parts = [];
  if (loan.beneficiaryId) {
    parts.push({
      url: 'beneficiary',
      valueReference: { reference: `Patient/${String(loan.beneficiaryId)}` },
    });
  }
  if (loan.status) parts.push({ url: 'status', valueCode: loan.status });
  const startedAt = toFhirDateTime(loan.startedAt);
  if (startedAt) parts.push({ url: 'startedAt', valueDateTime: startedAt });
  const expectedReturnAt = toFhirDateTime(loan.expectedReturnAt);
  if (expectedReturnAt) {
    parts.push({ url: 'expectedReturnAt', valueDateTime: expectedReturnAt });
  }
  const returnedAt = toFhirDateTime(loan.returnedAt);
  if (returnedAt) parts.push({ url: 'returnedAt', valueDateTime: returnedAt });
  if (loan.conditionOnCheckout) {
    parts.push({ url: 'conditionOnCheckout', valueCode: loan.conditionOnCheckout });
  }
  if (loan.conditionOnReturn) {
    parts.push({ url: 'conditionOnReturn', valueCode: loan.conditionOnReturn });
  }
  if (!parts.length) return undefined;
  return { url: DEVICE_LOAN_EXTENSION_URL, extension: parts };
}

/**
 * Build one nested extension per historical maintenance entry.
 * @param {object} entry maintenance entry
 * @returns {object|undefined}
 */
function buildMaintenanceExtension(entry) {
  if (!entry || typeof entry !== 'object') return undefined;
  const parts = [];
  if (entry.kind) parts.push({ url: 'kind', valueCode: entry.kind });
  const performedAt = toFhirDateTime(entry.performedAt);
  if (performedAt) parts.push({ url: 'performedAt', valueDateTime: performedAt });
  if (typeof entry.cost === 'number') {
    parts.push({ url: 'cost', valueDecimal: entry.cost });
  }
  const nextDueAt = toFhirDateTime(entry.nextDueAt);
  if (nextDueAt) parts.push({ url: 'nextDueAt', valueDateTime: nextDueAt });
  if (!parts.length) return undefined;
  return { url: DEVICE_MAINTENANCE_EXTENSION_URL, extension: parts };
}

/**
 * Build the namespaced extension[] (lossless carry of non-base fields).
 * @param {object} d assistive device
 * @returns {Array<object>}
 */
function buildExtensions(d) {
  const ext = [];
  if (d.availability) {
    ext.push({ url: DEVICE_AVAILABILITY_EXTENSION_URL, valueCode: d.availability });
  }
  if (d.currentCondition) {
    ext.push({ url: DEVICE_CONDITION_EXTENSION_URL, valueCode: d.currentCondition });
  }
  const warranty = toFhirDateTime(d.warrantyExpiresAt);
  if (warranty) {
    ext.push({ url: DEVICE_WARRANTY_EXTENSION_URL, valueDateTime: warranty });
  }
  if (typeof d.acquisitionCost === 'number') {
    ext.push({
      url: DEVICE_ACQUISITION_COST_EXTENSION_URL,
      valueDecimal: d.acquisitionCost,
    });
  }
  const nextMaintenance = toFhirDateTime(d.nextMaintenanceDue);
  if (nextMaintenance) {
    ext.push({
      url: DEVICE_NEXT_MAINTENANCE_EXTENSION_URL,
      valueDateTime: nextMaintenance,
    });
  }
  const currentLoan = buildCurrentLoanExtension(d);
  if (currentLoan) ext.push(currentLoan);
  const retiredAt = toFhirDateTime(d.retiredAt);
  if (retiredAt) {
    ext.push({ url: DEVICE_RETIRED_AT_EXTENSION_URL, valueDateTime: retiredAt });
  }
  if (Array.isArray(d.loans)) {
    for (const loan of d.loans) {
      const loanExt = buildLoanExtension(loan);
      if (loanExt) ext.push(loanExt);
    }
  }
  if (Array.isArray(d.maintenance)) {
    for (const entry of d.maintenance) {
      const mExt = buildMaintenanceExtension(entry);
      if (mExt) ext.push(mExt);
    }
  }
  return ext;
}

/**
 * Project a canonical AssistiveDevice onto a base FHIR R4 Device resource.
 *
 * @param {object} device canonical AssistiveDevice (see canonical schema)
 * @param {{includeId?:boolean}} [opts]
 * @returns {object} FHIR R4 Device
 * @throws {TypeError} when device is missing, has no assetTag (the mandatory
 *   business identifier), or has no category (FHIR Device needs a type)
 */
function assistiveDeviceToFhir(device, opts = {}) {
  const { includeId = true } = opts;
  if (!device || typeof device !== 'object') {
    throw new TypeError('assistiveDeviceToFhir: device object is required');
  }
  if (!device.assetTag) {
    throw new TypeError(
      'assistiveDeviceToFhir: device.assetTag is required (FHIR Device identifier)'
    );
  }
  if (!device.category) {
    throw new TypeError('assistiveDeviceToFhir: device.category is required (FHIR Device type)');
  }

  /** @type {Record<string, any>} */
  const resource = {
    resourceType: 'Device',
    status: toFhirStatus(device.availability),
    identifier: buildIdentifiers(device),
    type: buildType(device),
    deviceName: [{ name: device.name, type: 'user-friendly-name' }],
  };

  if (includeId && device._id) {
    resource.id = String(device._id);
  }

  if (device.serialNumber) {
    resource.serialNumber = device.serialNumber;
  }

  if (device.currentLoaneeId) {
    resource.patient = { reference: `Patient/${String(device.currentLoaneeId)}` };
  }

  if (device.branchId) {
    resource.owner = { reference: `Organization/${String(device.branchId)}` };
  }

  const ext = buildExtensions(device);
  if (ext.length) resource.extension = ext;

  return resource;
}

module.exports = {
  assistiveDeviceToFhir,
  // exported for unit testing
  toFhirDateTime,
  toFhirStatus,
  buildIdentifiers,
  buildType,
  buildCurrentLoanExtension,
  buildLoanExtension,
  buildMaintenanceExtension,
  buildExtensions,
  AVAILABILITY_STATUS,
  ORG_FHIR_BASE,
  DEVICE_ASSET_TAG_SYSTEM,
  DEVICE_SERIAL_SYSTEM,
  DEVICE_CATEGORY_SYSTEM,
  DEVICE_AVAILABILITY_EXTENSION_URL,
  DEVICE_CONDITION_EXTENSION_URL,
  DEVICE_WARRANTY_EXTENSION_URL,
  DEVICE_ACQUISITION_COST_EXTENSION_URL,
  DEVICE_NEXT_MAINTENANCE_EXTENSION_URL,
  DEVICE_CURRENT_LOAN_EXTENSION_URL,
  DEVICE_RETIRED_AT_EXTENSION_URL,
  DEVICE_LOAN_EXTENSION_URL,
  DEVICE_MAINTENANCE_EXTENSION_URL,
};
