'use strict';
/**
 * W1338 — StaffHealthRecord → FHIR R4 Observation mapper (pure, additive).
 *
 * Projects a canonical StaffHealthRecord (staff occupational-health
 * surveillance: immunization / TB / fitness-for-work / exposure incident /
 * periodic checkup / respirator fit-test, W1125) onto a base FHIR R4
 * `Observation`. Occupational-health surveillance results are observations
 * about a staff member, so `Observation` is the correct resourceType.
 *
 * The staff member is referenced as the Observation.subject (a person under
 * health surveillance is the subject of that observation). `assessedBy` becomes
 * the performer. All non-core data is carried as namespaced extensions.
 *
 * Pure function: no DB, no IO, no mongoose. Never mutates input. Returns a
 * plain object. Throws TypeError on missing required inputs. The Saudi/org
 * profile is intentionally NOT asserted (no `meta.profile`).
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

const SHR_CATEGORY_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/occupational-health-category`;
const SHR_CATEGORY_CODE = 'occupational-health';
const SHR_RECORD_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/staff-health-record-type`;
const SHR_RESULT_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/staff-health-result`;
const SHR_FITNESS_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/staff-health-fitness-level`;

const SHR_STATUS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-status`;
const SHR_RECORD_NUMBER_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-record-number`;
const SHR_NEXT_DUE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-next-due`;
const SHR_FINDINGS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-findings`;
const SHR_RESTRICTIONS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-restrictions`;
const SHR_IMMUNIZATION_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-immunization`;
const SHR_EXPOSURE_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-exposure`;
const SHR_FITNESS_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-fitness`;
const SHR_RESULT_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-result`;
const SHR_CONFIDENTIAL_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-confidential`;
const SHR_ASSESSED_BY_NAME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-assessed-by-name`;
const SHR_EMPLOYEE_NAME_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-employee-name`;
const SHR_NOTES_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-notes`;
const SHR_BRANCH_EXTENSION_URL = `${ORG_FHIR_BASE}/StructureDefinition/staff-health-branch`;

/**
 * Canonical RecordStatus → FHIR Observation.status value-set
 * (registered | preliminary | final | amended | corrected | cancelled |
 * entered-in-error | unknown). The original lifecycle state is always
 * preserved in the status extension.
 */
const STATUS_MAP = Object.freeze({
  open: 'registered',
  in_progress: 'preliminary',
  completed: 'final',
  cleared: 'final',
  restricted: 'final',
  follow_up_required: 'preliminary',
  closed: 'final',
});

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

function toFhirDateTime(value) {
  if (!isPresent(value)) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toFhirStatus(status) {
  if (status === undefined || status === null) return 'unknown';
  return STATUS_MAP[status] || 'unknown';
}

function buildCategory() {
  return [
    {
      coding: [{ system: SHR_CATEGORY_SYSTEM, code: SHR_CATEGORY_CODE }],
      text: 'Occupational Health',
    },
  ];
}

function buildCode(record) {
  return {
    coding: [{ system: SHR_RECORD_TYPE_SYSTEM, code: record.recordType }],
    text: record.recordType,
  };
}

/**
 * Choose the primary Observation value[x]: a structured result when present,
 * otherwise the free-text outcome. Returns an object to spread (may be empty).
 */
function buildValue(record) {
  if (isPresent(record.result)) {
    return {
      valueCodeableConcept: {
        coding: [{ system: SHR_RESULT_SYSTEM, code: record.result }],
        text: record.result,
      },
    };
  }
  if (isPresent(record.outcome)) {
    return { valueString: record.outcome };
  }
  return {};
}

function buildImmunizationExtension(record) {
  const sub = [];
  if (isPresent(record.vaccineName))
    sub.push({ url: 'vaccineName', valueString: record.vaccineName });
  if (typeof record.doseNumber === 'number') {
    sub.push({ url: 'doseNumber', valueInteger: record.doseNumber });
  }
  const administered = toFhirDateTime(record.administeredDate);
  if (administered) sub.push({ url: 'administeredDate', valueDateTime: administered });
  if (isPresent(record.lotNumber)) sub.push({ url: 'lotNumber', valueString: record.lotNumber });
  if (sub.length === 0) return undefined;
  return { url: SHR_IMMUNIZATION_EXTENSION_URL, extension: sub };
}

function buildExposureExtension(record) {
  const sub = [];
  if (isPresent(record.exposureType)) {
    sub.push({ url: 'exposureType', valueCode: record.exposureType });
  }
  if (typeof record.sourcePatientKnown === 'boolean') {
    sub.push({ url: 'sourcePatientKnown', valueBoolean: record.sourcePatientKnown });
  }
  if (isPresent(record.bodyFluidType)) {
    sub.push({ url: 'bodyFluidType', valueString: record.bodyFluidType });
  }
  if (isPresent(record.postExposureProphylaxis)) {
    sub.push({ url: 'postExposureProphylaxis', valueString: record.postExposureProphylaxis });
  }
  if (typeof record.reportedWithin2h === 'boolean') {
    sub.push({ url: 'reportedWithin2h', valueBoolean: record.reportedWithin2h });
  }
  if (sub.length === 0) return undefined;
  return { url: SHR_EXPOSURE_EXTENSION_URL, extension: sub };
}

function buildExtensions(record) {
  const ext = [{ url: SHR_STATUS_EXTENSION_URL, valueCode: record.status }];

  if (isPresent(record.recordNumber)) {
    ext.push({ url: SHR_RECORD_NUMBER_EXTENSION_URL, valueString: record.recordNumber });
  }

  const nextDue = toFhirDateTime(record.nextDueDate);
  if (nextDue) ext.push({ url: SHR_NEXT_DUE_EXTENSION_URL, valueDateTime: nextDue });

  if (isPresent(record.findings)) {
    ext.push({ url: SHR_FINDINGS_EXTENSION_URL, valueString: record.findings });
  }
  if (isPresent(record.restrictions)) {
    ext.push({ url: SHR_RESTRICTIONS_EXTENSION_URL, valueString: record.restrictions });
  }

  const immunization = buildImmunizationExtension(record);
  if (immunization) ext.push(immunization);

  const exposure = buildExposureExtension(record);
  if (exposure) ext.push(exposure);

  if (isPresent(record.fitnessLevel)) {
    ext.push({ url: SHR_FITNESS_EXTENSION_URL, valueCode: record.fitnessLevel });
  }
  if (isPresent(record.result)) {
    ext.push({ url: SHR_RESULT_EXTENSION_URL, valueCode: record.result });
  }

  if (typeof record.confidential === 'boolean') {
    ext.push({ url: SHR_CONFIDENTIAL_EXTENSION_URL, valueBoolean: record.confidential });
  }
  if (isPresent(record.assessedByName)) {
    ext.push({ url: SHR_ASSESSED_BY_NAME_EXTENSION_URL, valueString: record.assessedByName });
  }
  if (isPresent(record.employeeName)) {
    ext.push({ url: SHR_EMPLOYEE_NAME_EXTENSION_URL, valueString: record.employeeName });
  }
  if (isPresent(record.notes)) {
    ext.push({ url: SHR_NOTES_EXTENSION_URL, valueString: record.notes });
  }
  if (isPresent(record.branchId)) {
    ext.push({
      url: SHR_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${record.branchId}` },
    });
  }

  return ext;
}

/**
 * Map a canonical StaffHealthRecord to a FHIR R4 Observation.
 *
 * @param {object} record canonical StaffHealthRecord
 * @param {object} [opts]
 * @param {boolean} [opts.includeId=true] set Observation.id from record._id
 * @returns {object} FHIR R4 Observation
 */
function staffHealthRecordToFhir(record, opts = {}) {
  if (!record || typeof record !== 'object') {
    throw new TypeError('staffHealthRecordToFhir: record object is required');
  }
  if (!record.employeeId) {
    throw new TypeError('staffHealthRecordToFhir: employeeId is required');
  }

  const { includeId = true } = opts;

  const resource = {
    resourceType: 'Observation',
    status: toFhirStatus(record.status),
    category: buildCategory(),
    code: buildCode(record),
    subject: { reference: `Patient/${record.employeeId}` },
    ...buildValue(record),
    extension: buildExtensions(record),
  };

  const effective = toFhirDateTime(record.eventDate);
  if (effective) resource.effectiveDateTime = effective;

  if (record.assessedBy) {
    resource.performer = [{ reference: `Practitioner/${record.assessedBy}` }];
  }

  if (includeId && record._id) {
    resource.id = String(record._id);
  }

  return resource;
}

module.exports = {
  staffHealthRecordToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildCategory,
  buildCode,
  buildValue,
  buildImmunizationExtension,
  buildExposureExtension,
  buildExtensions,
  isPresent,
  STATUS_MAP,
  ORG_FHIR_BASE,
  SHR_CATEGORY_SYSTEM,
  SHR_CATEGORY_CODE,
  SHR_RECORD_TYPE_SYSTEM,
  SHR_RESULT_SYSTEM,
  SHR_FITNESS_SYSTEM,
  SHR_STATUS_EXTENSION_URL,
  SHR_RECORD_NUMBER_EXTENSION_URL,
  SHR_NEXT_DUE_EXTENSION_URL,
  SHR_FINDINGS_EXTENSION_URL,
  SHR_RESTRICTIONS_EXTENSION_URL,
  SHR_IMMUNIZATION_EXTENSION_URL,
  SHR_EXPOSURE_EXTENSION_URL,
  SHR_FITNESS_EXTENSION_URL,
  SHR_RESULT_EXTENSION_URL,
  SHR_CONFIDENTIAL_EXTENSION_URL,
  SHR_ASSESSED_BY_NAME_EXTENSION_URL,
  SHR_EMPLOYEE_NAME_EXTENSION_URL,
  SHR_NOTES_EXTENSION_URL,
  SHR_BRANCH_EXTENSION_URL,
};
