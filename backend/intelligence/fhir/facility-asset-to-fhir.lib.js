'use strict';
/**
 * W1337 — FacilityAsset → FHIR R4 Device mapper (pure, additive).
 *
 * Projects a canonical FacilityAsset (building infrastructure with PPM +
 * inspection + regulatory-certificate lifecycle, W369) onto a base FHIR R4
 * `Device` resource. A facility asset is a physical piece of equipment /
 * infrastructure, so `Device` is the semantically correct resourceType.
 *
 * Pure function: no DB, no IO, no mongoose. Never mutates input. Returns a
 * plain object. Throws TypeError on missing required inputs.
 *
 * Saudi/org profile is intentionally NOT asserted (no `meta.profile`); that is
 * a downstream product decision. All non-FHIR-core data is carried as
 * namespaced extensions under the org StructureDefinition base.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

const FA_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/facility-asset-category`;
const FA_ASSET_TAG_SYSTEM = `${ORG_FHIR_BASE}/asset-tag`;
const FA_SERIAL_SYSTEM = `${ORG_FHIR_BASE}/serial-number`;

const FA_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-status`;
const FA_CRITICALITY_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-criticality`;
const FA_LOCATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-location`;
const FA_INSTALLATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-installation`;
const FA_OUT_OF_SERVICE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-out-of-service`;
const FA_MAINTENANCE_SCHEDULE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-maintenance-schedule`;
const FA_INSPECTION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-inspection`;
const FA_CERTIFICATE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-certificate`;
const FA_LINKED_INCIDENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-linked-incident`;
const FA_RETIREMENT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/facility-asset-retirement`;

/**
 * Canonical FacilityStatus → FHIR Device.status value-set
 * (active | inactive | entered-in-error | unknown). Only an in-service asset
 * is `active`; every flagged/withdrawn state is `inactive`. The original
 * lifecycle state is always preserved in the status extension.
 */
const STATUS_MAP = Object.freeze({
  in_service: 'active',
  inspection_failed: 'inactive',
  maintenance: 'inactive',
  out_of_service: 'inactive',
  retired: 'inactive',
});

function toFhirDateTime(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toFhirStatus(status) {
  if (status === undefined || status === null) return 'unknown';
  return STATUS_MAP[status] || 'unknown';
}

function buildIdentifiers(asset) {
  const identifiers = [{ system: FA_ASSET_TAG_SYSTEM, value: asset.assetTag }];
  if (asset.serialNumber) {
    identifiers.push({ system: FA_SERIAL_SYSTEM, value: asset.serialNumber });
  }
  return identifiers;
}

function buildType(asset) {
  return {
    coding: [{ system: FA_CATEGORY_SYSTEM, code: asset.category }],
    text: asset.name,
  };
}

function buildDeviceName(asset) {
  const names = [{ name: asset.name, type: 'user-friendly-name' }];
  if (asset.manufacturer) {
    names.push({ name: asset.manufacturer, type: 'manufacturer-name' });
  }
  if (asset.modelNumber) {
    names.push({ name: asset.modelNumber, type: 'model-name' });
  }
  return names;
}

function buildLocationExtension(asset) {
  const sub = [];
  if (asset.building) sub.push({ url: 'building', valueString: asset.building });
  if (asset.floor) sub.push({ url: 'floor', valueString: asset.floor });
  if (asset.room) sub.push({ url: 'room', valueString: asset.room });
  if (sub.length === 0) return undefined;
  return { url: FA_LOCATION_EXTENSION_URL, extension: sub };
}

function buildInstallationExtension(asset) {
  const sub = [];
  const installedAt = toFhirDateTime(asset.installedAt);
  if (installedAt) sub.push({ url: 'installedAt', valueDateTime: installedAt });
  if (typeof asset.installationCost === 'number') {
    sub.push({ url: 'installationCost', valueDecimal: asset.installationCost });
  }
  const warranty = toFhirDateTime(asset.warrantyExpiresAt);
  if (warranty) sub.push({ url: 'warrantyExpiresAt', valueDateTime: warranty });
  if (sub.length === 0) return undefined;
  return { url: FA_INSTALLATION_EXTENSION_URL, extension: sub };
}

function buildOutOfServiceExtension(asset) {
  const sub = [];
  if (asset.outOfServiceReason) {
    sub.push({ url: 'reason', valueString: asset.outOfServiceReason });
  }
  const since = toFhirDateTime(asset.outOfServiceSince);
  if (since) sub.push({ url: 'since', valueDateTime: since });
  if (sub.length === 0) return undefined;
  return { url: FA_OUT_OF_SERVICE_EXTENSION_URL, extension: sub };
}

function buildMaintenanceScheduleExtension(asset) {
  const sub = [];
  if (typeof asset.inspectionIntervalDays === 'number') {
    sub.push({ url: 'inspectionIntervalDays', valueInteger: asset.inspectionIntervalDays });
  }
  if (typeof asset.maintenanceIntervalDays === 'number') {
    sub.push({ url: 'maintenanceIntervalDays', valueInteger: asset.maintenanceIntervalDays });
  }
  const nextInspection = toFhirDateTime(asset.nextInspectionDue);
  if (nextInspection) sub.push({ url: 'nextInspectionDue', valueDateTime: nextInspection });
  const nextMaintenance = toFhirDateTime(asset.nextMaintenanceDue);
  if (nextMaintenance) sub.push({ url: 'nextMaintenanceDue', valueDateTime: nextMaintenance });
  if (sub.length === 0) return undefined;
  return { url: FA_MAINTENANCE_SCHEDULE_EXTENSION_URL, extension: sub };
}

function buildInspectionExtension(inspection) {
  const sub = [{ url: 'kind', valueCode: inspection.kind }];
  const performedAt = toFhirDateTime(inspection.performedAt);
  if (performedAt) sub.push({ url: 'performedAt', valueDateTime: performedAt });
  sub.push({ url: 'outcome', valueCode: inspection.outcome });
  if (inspection.vendorName) sub.push({ url: 'vendorName', valueString: inspection.vendorName });
  if (Array.isArray(inspection.defectsFound)) {
    inspection.defectsFound.forEach(d => sub.push({ url: 'defect', valueString: d }));
  }
  if (Array.isArray(inspection.correctiveActionsRequired)) {
    inspection.correctiveActionsRequired.forEach(a =>
      sub.push({ url: 'correctiveAction', valueString: a })
    );
  }
  if (typeof inspection.cost === 'number') {
    sub.push({ url: 'cost', valueDecimal: inspection.cost });
  }
  const nextDueAt = toFhirDateTime(inspection.nextDueAt);
  if (nextDueAt) sub.push({ url: 'nextDueAt', valueDateTime: nextDueAt });
  return { url: FA_INSPECTION_EXTENSION_URL, extension: sub };
}

function buildCertificateExtension(cert) {
  const sub = [];
  if (cert.name) sub.push({ url: 'name', valueString: cert.name });
  sub.push({ url: 'number', valueString: cert.number });
  sub.push({ url: 'issuingAuthority', valueString: cert.issuingAuthority });
  const issuedAt = toFhirDateTime(cert.issuedAt);
  if (issuedAt) sub.push({ url: 'issuedAt', valueDateTime: issuedAt });
  const expiresAt = toFhirDateTime(cert.expiresAt);
  if (expiresAt) sub.push({ url: 'expiresAt', valueDateTime: expiresAt });
  if (cert.fileUrl) sub.push({ url: 'fileUrl', valueUrl: cert.fileUrl });
  return { url: FA_CERTIFICATE_EXTENSION_URL, extension: sub };
}

function buildRetirementExtension(asset) {
  const sub = [];
  const retiredAt = toFhirDateTime(asset.retiredAt);
  if (retiredAt) sub.push({ url: 'retiredAt', valueDateTime: retiredAt });
  if (asset.retirementReason) sub.push({ url: 'reason', valueString: asset.retirementReason });
  if (sub.length === 0) return undefined;
  return { url: FA_RETIREMENT_EXTENSION_URL, extension: sub };
}

function buildExtensions(asset) {
  const ext = [
    { url: FA_STATUS_EXTENSION_URL, valueCode: asset.status },
    { url: FA_CRITICALITY_EXTENSION_URL, valueCode: asset.criticality },
  ];

  const location = buildLocationExtension(asset);
  if (location) ext.push(location);

  const installation = buildInstallationExtension(asset);
  if (installation) ext.push(installation);

  const outOfService = buildOutOfServiceExtension(asset);
  if (outOfService) ext.push(outOfService);

  const schedule = buildMaintenanceScheduleExtension(asset);
  if (schedule) ext.push(schedule);

  if (Array.isArray(asset.inspections)) {
    asset.inspections.forEach(i => ext.push(buildInspectionExtension(i)));
  }

  if (Array.isArray(asset.certificates)) {
    asset.certificates.forEach(c => ext.push(buildCertificateExtension(c)));
  }

  if (asset.linkedIncidentId) {
    ext.push({
      url: FA_LINKED_INCIDENT_EXTENSION_URL,
      valueString: String(asset.linkedIncidentId),
    });
  }

  const retirement = buildRetirementExtension(asset);
  if (retirement) ext.push(retirement);

  return ext;
}

/**
 * Map a canonical FacilityAsset to a FHIR R4 Device.
 *
 * @param {object} asset canonical FacilityAsset
 * @param {object} [opts]
 * @param {boolean} [opts.includeId=true] set Device.id from asset._id
 * @returns {object} FHIR R4 Device
 */
function facilityAssetToFhir(asset, opts = {}) {
  if (!asset || typeof asset !== 'object') {
    throw new TypeError('facilityAssetToFhir: asset object is required');
  }
  if (!asset.assetTag) {
    throw new TypeError('facilityAssetToFhir: assetTag is required');
  }
  if (!asset.branchId) {
    throw new TypeError('facilityAssetToFhir: branchId is required');
  }

  const { includeId = true } = opts;

  const resource = {
    resourceType: 'Device',
    status: toFhirStatus(asset.status),
    identifier: buildIdentifiers(asset),
    type: buildType(asset),
    deviceName: buildDeviceName(asset),
    owner: { reference: `Organization/${asset.branchId}` },
    extension: buildExtensions(asset),
  };

  if (includeId && asset._id) {
    resource.id = String(asset._id);
  }

  if (asset.manufacturer) resource.manufacturer = asset.manufacturer;
  if (asset.modelNumber) resource.modelNumber = asset.modelNumber;
  if (asset.serialNumber) resource.serialNumber = asset.serialNumber;

  return resource;
}

module.exports = {
  facilityAssetToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildIdentifiers,
  buildType,
  buildDeviceName,
  buildLocationExtension,
  buildInstallationExtension,
  buildOutOfServiceExtension,
  buildMaintenanceScheduleExtension,
  buildInspectionExtension,
  buildCertificateExtension,
  buildRetirementExtension,
  buildExtensions,
  STATUS_MAP,
  ORG_FHIR_BASE,
  FA_CATEGORY_SYSTEM,
  FA_ASSET_TAG_SYSTEM,
  FA_SERIAL_SYSTEM,
  FA_STATUS_EXTENSION_URL,
  FA_CRITICALITY_EXTENSION_URL,
  FA_LOCATION_EXTENSION_URL,
  FA_INSTALLATION_EXTENSION_URL,
  FA_OUT_OF_SERVICE_EXTENSION_URL,
  FA_MAINTENANCE_SCHEDULE_EXTENSION_URL,
  FA_INSPECTION_EXTENSION_URL,
  FA_CERTIFICATE_EXTENSION_URL,
  FA_LINKED_INCIDENT_EXTENSION_URL,
  FA_RETIREMENT_EXTENSION_URL,
};
