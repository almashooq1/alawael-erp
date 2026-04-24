/**
 * hr-admin-editable-fields.js — Phase 11 Commit 10 (4.0.27).
 *
 * Per-field WRITE authorization map for admin updates against an
 * Employee record. Where `hr-data-classification.js` answers
 * "who can READ field X?", this file answers "who can WRITE field X?".
 *
 * Read-vs-write tier is asymmetric on purpose:
 *
 *   • An HR_OFFICER can READ basic_salary (CONFIDENTIAL tier) but
 *     should NOT be able to change it unilaterally — salary changes
 *     carry payroll + compliance consequences. Writes go to HR_MANAGER.
 *
 *   • An HR_OFFICER CAN read AND write contact fields (phone, address)
 *     — corrections are daily HR work, not policy decisions.
 *
 *   • national_id / iqama / passport are RESTRICTED to read, but the
 *     WRITE authority is HR_MANAGER (not HR_OFFICER). Identity-
 *     document corrections require management signoff in our policy.
 *
 * Two write tiers:
 *
 *   'officer' — HR_OFFICER, HR, FINANCE_SUPERVISOR (assignment +
 *               contact + licensing)
 *
 *   'manager' — HR_MANAGER, HR_SUPERVISOR, GROUP_CHRO,
 *               COMPLIANCE_OFFICER (all of officer + compensation +
 *               status + identity + employment + system)
 *
 * Unknown fields → REJECTED. Unlisted roles → 'none' → forbidden.
 *
 * Validators: each field may specify a value-check returning null on
 * pass or a reason on fail. Complex domain validation (enum, format)
 * defers to Mongoose schema on save; this layer is the first gate
 * so unit tests don't need a live DB.
 */

'use strict';

const { ROLES } = require('./rbac.config');

const WRITE_TIERS = Object.freeze({
  OFFICER: 'officer',
  MANAGER: 'manager',
});

const WRITE_TIER_RANK = Object.freeze({ officer: 1, manager: 2, none: 0 });

// Role → max write tier. Reading this file alone tells you who can
// do what — don't scatter role checks across the service.
const ROLE_WRITE_TIER = Object.freeze({
  [ROLES.SUPER_ADMIN]: WRITE_TIERS.MANAGER,
  [ROLES.HEAD_OFFICE_ADMIN]: WRITE_TIERS.MANAGER,
  [ROLES.HR_MANAGER]: WRITE_TIERS.MANAGER,
  [ROLES.HR_SUPERVISOR]: WRITE_TIERS.MANAGER,
  [ROLES.GROUP_CHRO]: WRITE_TIERS.MANAGER,
  [ROLES.COMPLIANCE_OFFICER]: WRITE_TIERS.MANAGER,

  [ROLES.HR_OFFICER]: WRITE_TIERS.OFFICER,
  [ROLES.HR]: WRITE_TIERS.OFFICER,
  [ROLES.FINANCE_SUPERVISOR]: WRITE_TIERS.OFFICER,
});

function writeTierForRole(role) {
  if (role == null) return 'none';
  return ROLE_WRITE_TIER[role] || 'none';
}

function canWrite(role, requiredTier) {
  return WRITE_TIER_RANK[writeTierForRole(role)] >= WRITE_TIER_RANK[requiredTier];
}

// ─── Validators (minimal — schema still runs on save) ───────────

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
const noopValid = () => null;

function validateSaudiPhone(v) {
  if (v == null || v === '') return null;
  if (!isNonEmptyString(v)) return 'must be a string';
  if (!/^(?:\+9665|009665|05|5)\d{8}$/.test(v.trim())) {
    return 'must be a valid Saudi mobile number';
  }
  return null;
}
function validateEmail(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return 'must be a string';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'must be a valid email';
  return null;
}
function validateNationalId(v) {
  if (v == null || v === '') return null;
  if (!/^\d{10}$/.test(String(v).trim())) return 'must be 10 digits';
  return null;
}
function validateIqama(v) {
  if (v == null || v === '') return null;
  if (!/^\d{10}$/.test(String(v).trim())) return 'must be 10 digits';
  return null;
}
function validateIban(v) {
  if (v == null || v === '') return null;
  if (!/^SA\d{22}$/.test(String(v).trim())) return 'must be a Saudi IBAN (SA + 22 digits)';
  return null;
}
function validateNonNegativeNumber(v) {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 'must be a non-negative number';
  return null;
}
function validateDateLike(v) {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return 'must be a valid date';
  return null;
}
function validateEnum(allowed) {
  return function (v) {
    if (v == null || v === '') return null;
    if (!allowed.includes(v)) return `must be one of: ${allowed.join(', ')}`;
    return null;
  };
}

// ─── Field → tier + validator ───────────────────────────────────

const ADMIN_FIELDS = Object.freeze({
  // ───── Contact (OFFICER) ─────
  phone: { tier: 'officer', validate: validateSaudiPhone },
  phone2: { tier: 'officer', validate: validateSaudiPhone },
  email: { tier: 'officer', validate: validateEmail },
  personal_email: { tier: 'officer', validate: validateEmail },
  address: { tier: 'officer', validate: noopValid },
  city: { tier: 'officer', validate: noopValid },
  postal_code: { tier: 'officer', validate: noopValid },
  'emergency_contact.name': { tier: 'officer', validate: noopValid },
  'emergency_contact.phone': { tier: 'officer', validate: validateSaudiPhone },
  'emergency_contact.relation': { tier: 'officer', validate: noopValid },

  // ───── Assignment (OFFICER) ─────
  name_ar: { tier: 'officer', validate: noopValid },
  name_en: { tier: 'officer', validate: noopValid },
  nationality: { tier: 'officer', validate: noopValid },
  marital_status: {
    tier: 'officer',
    validate: validateEnum(['single', 'married', 'divorced', 'widowed']),
  },
  department: {
    tier: 'officer',
    validate: validateEnum([
      'administration',
      'clinical',
      'support',
      'finance',
      'hr',
      'transport',
      'it',
    ]),
  },
  specialization: {
    tier: 'officer',
    validate: validateEnum([
      'pt',
      'ot',
      'speech',
      'aba',
      'psychology',
      'special_education',
      'vocational',
      'nursing',
      'medical',
      'admin',
      'accounting',
      'hr',
      'driver',
      'it',
      'other',
    ]),
  },
  job_title_ar: { tier: 'officer', validate: noopValid },
  job_title_en: { tier: 'officer', validate: noopValid },

  // ───── Professional licensing (OFFICER — admin may correct credentials) ─────
  scfhs_number: { tier: 'officer', validate: noopValid },
  scfhs_classification: { tier: 'officer', validate: noopValid },
  scfhs_expiry: { tier: 'officer', validate: validateDateLike },

  // ───── Compensation (MANAGER) ─────
  basic_salary: { tier: 'manager', validate: validateNonNegativeNumber },
  housing_allowance: { tier: 'manager', validate: validateNonNegativeNumber },
  transport_allowance: { tier: 'manager', validate: validateNonNegativeNumber },
  other_allowances: { tier: 'manager', validate: noopValid }, // array shape — schema enforces

  // ───── Banking (MANAGER) ─────
  bank_name: { tier: 'manager', validate: noopValid },
  iban: { tier: 'manager', validate: validateIban },
  bank_account_number: { tier: 'manager', validate: noopValid },

  // ───── GOSI (MANAGER) ─────
  gosi_number: { tier: 'manager', validate: noopValid },
  gosi_registered: { tier: 'manager', validate: noopValid },
  gosi_registration_date: { tier: 'manager', validate: validateDateLike },

  // ───── Identity documents (MANAGER) ─────
  national_id: { tier: 'manager', validate: validateNationalId },
  national_id_expiry: { tier: 'manager', validate: validateDateLike },
  iqama_number: { tier: 'manager', validate: validateIqama },
  iqama_expiry: { tier: 'manager', validate: validateDateLike },
  passport_number: { tier: 'manager', validate: noopValid },
  passport_expiry: { tier: 'manager', validate: validateDateLike },
  visa_type: { tier: 'manager', validate: noopValid },
  visa_expiry: { tier: 'manager', validate: validateDateLike },

  // ───── Employment lifecycle (MANAGER) ─────
  status: {
    tier: 'manager',
    validate: validateEnum(['active', 'suspended', 'terminated', 'on_leave']),
  },
  contract_type: {
    tier: 'manager',
    validate: validateEnum(['fixed', 'indefinite', 'flexible', 'part_time']),
  },
  hire_date: { tier: 'manager', validate: validateDateLike },
  probation_end_date: { tier: 'manager', validate: validateDateLike },
  branch_id: { tier: 'manager', validate: noopValid },
  user_id: { tier: 'manager', validate: noopValid },
});

function fieldSpec(path) {
  return ADMIN_FIELDS[path] || null;
}

/**
 * Validate and authorize a patch against the role's write tier.
 *
 * Returns
 *   { ok: true,  flat: {path: value}, empty: false }
 *   { ok: true,  flat: {},             empty: true }
 *   { ok: false, errors: { <path>: 'reason' } }
 *
 * Every unauthorized field gets an error entry; the whole patch is
 * rejected if any single field fails (atomic). This matches the
 * self-update semantics in C9.
 */
function validatePatch(patch, role) {
  if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, errors: { _root: 'patch must be a plain object' } };
  }

  const flat = {};
  const errors = {};

  for (const [key, value] of Object.entries(patch)) {
    if (
      key === 'emergency_contact' &&
      value != null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      for (const [subKey, subVal] of Object.entries(value)) {
        handleField(`emergency_contact.${subKey}`, subVal);
      }
      continue;
    }
    handleField(key, value);
  }

  function handleField(path, value) {
    const spec = fieldSpec(path);
    if (!spec) {
      errors[path] = 'field is not admin-editable';
      return;
    }
    if (!canWrite(role, spec.tier)) {
      errors[path] = `requires ${spec.tier} tier`;
      return;
    }
    const err = spec.validate(value);
    if (err) {
      errors[path] = err;
      return;
    }
    flat[path] = normalize(value);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, flat, empty: Object.keys(flat).length === 0 };
}

function normalize(v) {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

module.exports = {
  WRITE_TIERS,
  WRITE_TIER_RANK,
  ROLE_WRITE_TIER,
  ADMIN_FIELDS,
  writeTierForRole,
  canWrite,
  fieldSpec,
  validatePatch,
};
