'use strict';
/**
 * Beneficiary → FHIR R4 Patient mapper (foundation).
 *
 * WHY (Item 10, GAPS_ASSESSMENT_2026-06-15): the platform integrates with
 * NPHIES at the CLAIMS layer only (webhook receiver + reconciliation
 * scheduler). There was no FHIR *resource* mapper, so a FHIR-conformance
 * test had nothing to assert against. This pure library is that foundation:
 * it projects the canonical Beneficiary contract
 * (intelligence/canonical/schemas/beneficiary.canonical.js) onto a base
 * FHIR R4 Patient resource.
 *
 * SCOPE (deliberately minimal — additive, non-breaking):
 *   - Base FHIR R4 Patient only. No KSA NPHIES profile binding is forced
 *     here (that is a product decision); callers may post-process to add
 *     `meta.profile` once a profile is chosen.
 *   - Pure function: no DB, no I/O, no mongoose. Safe to unit-test and to
 *     call from a route, a cron, or a CLI.
 *
 * STANDARDS:
 *   - administrative-gender: FHIR `male` / `female` map 1:1 from canonical.
 *   - Saudi identifier systems follow the NPHIES convention:
 *       nationalId starting 1 → citizen  → http://nphies.sa/identifier/nationalid
 *       nationalId starting 2 → resident → http://nphies.sa/identifier/iqama
 *   - MRN carried as a secondary identifier with `type` MR (HL7 v2-0203).
 *   - Disability (non-base data) carried as a namespaced FHIR extension.
 */

const NATIONAL_ID_SYSTEM = 'http://nphies.sa/identifier/nationalid';
const IQAMA_SYSTEM = 'http://nphies.sa/identifier/iqama';
const MRN_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v2-0203';
const DISABILITY_EXTENSION_URL =
  'https://alawael.sa/fhir/StructureDefinition/disability-classification';

/**
 * Coerce a Date or loose date string into a FHIR `date` (YYYY-MM-DD).
 * @param {Date|string|undefined} value
 * @returns {string|undefined}
 */
function toFhirDate(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/**
 * FHIR `Patient.active` is false once the beneficiary leaves the live roster.
 * @param {string|undefined} status canonical lifecycle status
 * @returns {boolean}
 */
function isActiveStatus(status) {
  if (!status) return true; // absence of status → assume active record
  return ['draft', 'waitlisted', 'active', 'on_hold'].includes(status);
}

/**
 * Build the identifier[] array from canonical government identifiers.
 * @param {object} b beneficiary
 * @returns {Array<object>}
 */
function buildIdentifiers(b) {
  const identifiers = [];
  if (b.nationalId) {
    const isResident = String(b.nationalId).startsWith('2');
    identifiers.push({
      use: 'official',
      system: isResident ? IQAMA_SYSTEM : NATIONAL_ID_SYSTEM,
      value: String(b.nationalId),
    });
  }
  if (b.mrn) {
    identifiers.push({
      use: 'usual',
      type: {
        coding: [{ system: MRN_TYPE_SYSTEM, code: 'MR', display: 'Medical record number' }],
      },
      value: String(b.mrn),
    });
  }
  return identifiers;
}

/**
 * Build HumanName[]. Emits a bilingual pair when *_ar / *_en variants exist,
 * always including the canonical firstName/lastName as the default usual name.
 * @param {object} b beneficiary
 * @returns {Array<object>}
 */
function buildNames(b) {
  const names = [];
  const pushName = (use, given, family, language) => {
    if (!given && !family) return;
    const name = { use };
    if (family) name.family = family;
    if (given) name.given = [given];
    const text = [given, family].filter(Boolean).join(' ');
    if (text) name.text = text;
    if (language) {
      name._family = name._family || {};
      // BCP-47 language tag carried via the standard `language` extension.
      name.extension = [
        {
          url: 'http://hl7.org/fhir/StructureDefinition/language',
          valueCode: language,
        },
      ];
    }
    names.push(name);
  };

  // Default usual name (canonical required fields).
  pushName('usual', b.firstName, b.lastName);

  // Optional explicit localisations.
  if (b.firstName_ar || b.lastName_ar) {
    pushName('official', b.firstName_ar, b.lastName_ar, 'ar');
  }
  if (b.firstName_en || b.lastName_en) {
    pushName('official', b.firstName_en, b.lastName_en, 'en');
  }
  return names;
}

/**
 * Disability classification → namespaced FHIR extension (base Patient has
 * no disability element). Only emitted when canonical disability exists.
 * @param {object} b beneficiary
 * @returns {Array<object>|undefined}
 */
function buildDisabilityExtension(b) {
  if (!b.disability || !b.disability.type) return undefined;
  const sub = [{ url: 'type', valueCode: b.disability.type }];
  if (b.disability.severity) {
    sub.push({ url: 'severity', valueCode: b.disability.severity });
  }
  if (b.disability.diagnosisDate) {
    const dd = toFhirDate(b.disability.diagnosisDate);
    if (dd) sub.push({ url: 'diagnosisDate', valueDate: dd });
  }
  return [{ url: DISABILITY_EXTENSION_URL, extension: sub }];
}

/**
 * Project a canonical Beneficiary onto a base FHIR R4 Patient resource.
 *
 * @param {object} beneficiary canonical-shaped beneficiary (plain object or
 *   a lean mongoose doc). Must carry at least nationalId OR mrn and a name.
 * @param {object} [opts]
 * @param {boolean} [opts.includeId=true] copy `_id` into Patient.id
 * @returns {object} FHIR R4 Patient resource
 * @throws {TypeError} when beneficiary is missing or has no identifier
 */
function beneficiaryToFhirPatient(beneficiary, opts = {}) {
  const { includeId = true } = opts;
  if (!beneficiary || typeof beneficiary !== 'object') {
    throw new TypeError('beneficiaryToFhirPatient: beneficiary object is required');
  }
  if (!beneficiary.nationalId && !beneficiary.mrn) {
    throw new TypeError('beneficiaryToFhirPatient: beneficiary requires either nationalId or mrn');
  }

  /** @type {Record<string, any>} */
  const patient = { resourceType: 'Patient' };

  if (includeId && beneficiary._id) {
    patient.id = String(beneficiary._id);
  }

  const identifiers = buildIdentifiers(beneficiary);
  if (identifiers.length) patient.identifier = identifiers;

  const names = buildNames(beneficiary);
  if (names.length) patient.name = names;

  if (beneficiary.gender) patient.gender = beneficiary.gender; // 1:1 with FHIR

  const birthDate = toFhirDate(beneficiary.dateOfBirth);
  if (birthDate) patient.birthDate = birthDate;

  patient.active = isActiveStatus(beneficiary.status);

  if (beneficiary.status === 'deceased') {
    patient.deceasedBoolean = true;
  }

  const disabilityExt = buildDisabilityExtension(beneficiary);
  if (disabilityExt) patient.extension = disabilityExt;

  return patient;
}

module.exports = {
  beneficiaryToFhirPatient,
  // exported for targeted unit tests + downstream reuse
  toFhirDate,
  isActiveStatus,
  buildIdentifiers,
  buildNames,
  buildDisabilityExtension,
  NATIONAL_ID_SYSTEM,
  IQAMA_SYSTEM,
  MRN_TYPE_SYSTEM,
  DISABILITY_EXTENSION_URL,
};
