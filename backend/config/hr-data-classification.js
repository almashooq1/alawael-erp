/**
 * hr-data-classification.js — Phase 11 Commit 5 (4.0.22).
 *
 * Canonical PDPL-aligned classification for every field on every HR
 * record we expose through the API. Classification → role access
 * matrix drives the masking service. Single source of truth — route
 * handlers, reporting, exports, and the dashboard all consult this
 * file before shipping a field to the wire.
 *
 * Four classifications (PDPL Art. 7 + internal taxonomy):
 *
 *   PUBLIC        — safe for anyone authenticated into the org
 *                   (name_ar, job_title, branch, department).
 *
 *   INTERNAL      — within-org, within-HR-context only
 *                   (work email, work phone, hire date, specialization).
 *
 *   CONFIDENTIAL  — requires an explicit HR/Finance role
 *                   (basic_salary, housing_allowance, GOSI status,
 *                    bank IBAN, contract_type).
 *
 *   RESTRICTED    — identity-sensitive PII, tightest access
 *                   (national_id, iqama, passport, personal_email,
 *                    home address, emergency contact).
 *
 * Role access matrix (each role sees ITS level AND everything below):
 *
 *   SUPER_ADMIN / HEAD_OFFICE_ADMIN / COMPLIANCE_OFFICER /
 *   INTERNAL_AUDITOR / GROUP_CHRO / HR_MANAGER / HR_SUPERVISOR
 *                                             → RESTRICTED (sees all)
 *
 *   HR_OFFICER / HR / FINANCE_SUPERVISOR      → CONFIDENTIAL
 *
 *   CEO / GROUP_GM / GROUP_CFO / BRANCH_MANAGER / MANAGER /
 *   REGIONAL_DIRECTOR / CLINICAL_DIRECTOR / THERAPY_SUPERVISOR /
 *   SUPERVISOR                                → INTERNAL
 *
 *   Everyone else authenticated                → PUBLIC
 *
 * Plus "self access": every employee sees RESTRICTED on their OWN
 * record (including their own salary, national_id, etc.). This is the
 * common PDPL Art. 18 (right-to-access-own-data) compliance path.
 *
 * Design decisions:
 *
 *   1. The config is FROZEN. Any change is an explicit edit to this
 *      file — no runtime mutation. Tests assert the shape.
 *
 *   2. Field paths are dot-notation: `bank_account_number`,
 *      `emergency_contact.phone`. Nested objects classify at the leaf.
 *      Unknown fields default to RESTRICTED — fail-closed.
 *
 *   3. Three entity maps: employee, employment_contract, leave. Other
 *      HR collections (Certification, LeaveBalance, Shift, etc.) are
 *      structurally benign — their fields are operational, not PII.
 *      We fall back to INTERNAL for unclassified entity types.
 *
 *   4. PDPL classification is orthogonal to CBAHI/SCFHS — this file
 *      is ABOUT Saudi PDPL, not other frameworks.
 */

'use strict';

const { ROLES } = require('./rbac.config');

const CLASSIFICATIONS = Object.freeze({
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED',
});

const CLASSIFICATION_RANK = Object.freeze({
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
});

const DEFAULT_CLASSIFICATION = CLASSIFICATIONS.RESTRICTED; // fail-closed

// ─── Field classifications per entity ───────────────────────────
// Leaf fields only; nested paths use dot-notation.

const EMPLOYEE_FIELDS = Object.freeze({
  // Public — identity in org context
  employee_number: CLASSIFICATIONS.PUBLIC,
  name_ar: CLASSIFICATIONS.PUBLIC,
  name_en: CLASSIFICATIONS.PUBLIC,
  job_title_ar: CLASSIFICATIONS.PUBLIC,
  job_title_en: CLASSIFICATIONS.PUBLIC,
  department: CLASSIFICATIONS.PUBLIC,
  specialization: CLASSIFICATIONS.PUBLIC,
  branch_id: CLASSIFICATIONS.PUBLIC,
  status: CLASSIFICATIONS.PUBLIC,

  // Internal — work-contact + timeline
  email: CLASSIFICATIONS.INTERNAL,
  phone: CLASSIFICATIONS.INTERNAL,
  phone2: CLASSIFICATIONS.INTERNAL,
  hire_date: CLASSIFICATIONS.INTERNAL,
  probation_end_date: CLASSIFICATIONS.INTERNAL,
  scfhs_number: CLASSIFICATIONS.INTERNAL,
  scfhs_classification: CLASSIFICATIONS.INTERNAL,
  scfhs_expiry: CLASSIFICATIONS.INTERNAL,
  nationality: CLASSIFICATIONS.INTERNAL,
  gender: CLASSIFICATIONS.INTERNAL,

  // Confidential — compensation + banking + compliance flags
  contract_type: CLASSIFICATIONS.CONFIDENTIAL,
  basic_salary: CLASSIFICATIONS.CONFIDENTIAL,
  housing_allowance: CLASSIFICATIONS.CONFIDENTIAL,
  transport_allowance: CLASSIFICATIONS.CONFIDENTIAL,
  other_allowances: CLASSIFICATIONS.CONFIDENTIAL,
  bank_name: CLASSIFICATIONS.CONFIDENTIAL,
  iban: CLASSIFICATIONS.CONFIDENTIAL,
  bank_account_number: CLASSIFICATIONS.CONFIDENTIAL,
  gosi_number: CLASSIFICATIONS.CONFIDENTIAL,
  gosi_registered: CLASSIFICATIONS.CONFIDENTIAL,
  gosi_registration_date: CLASSIFICATIONS.CONFIDENTIAL,
  marital_status: CLASSIFICATIONS.CONFIDENTIAL,
  date_of_birth: CLASSIFICATIONS.CONFIDENTIAL,

  // Restricted — identity documents + home contact
  national_id: CLASSIFICATIONS.RESTRICTED,
  national_id_expiry: CLASSIFICATIONS.RESTRICTED,
  iqama_number: CLASSIFICATIONS.RESTRICTED,
  iqama_expiry: CLASSIFICATIONS.RESTRICTED,
  passport_number: CLASSIFICATIONS.RESTRICTED,
  passport_expiry: CLASSIFICATIONS.RESTRICTED,
  visa_type: CLASSIFICATIONS.RESTRICTED,
  visa_expiry: CLASSIFICATIONS.RESTRICTED,
  personal_email: CLASSIFICATIONS.RESTRICTED,
  address: CLASSIFICATIONS.RESTRICTED,
  city: CLASSIFICATIONS.RESTRICTED,
  postal_code: CLASSIFICATIONS.RESTRICTED,
  'emergency_contact.name': CLASSIFICATIONS.RESTRICTED,
  'emergency_contact.phone': CLASSIFICATIONS.RESTRICTED,
  'emergency_contact.relation': CLASSIFICATIONS.RESTRICTED,

  // System fields — PUBLIC so audit trails survive masking
  _id: CLASSIFICATIONS.PUBLIC,
  user_id: CLASSIFICATIONS.PUBLIC,
  createdAt: CLASSIFICATIONS.PUBLIC,
  updatedAt: CLASSIFICATIONS.PUBLIC,
  deleted_at: CLASSIFICATIONS.PUBLIC,
});

const EMPLOYMENT_CONTRACT_FIELDS = Object.freeze({
  _id: CLASSIFICATIONS.PUBLIC,
  contract_number: CLASSIFICATIONS.PUBLIC,
  employee_id: CLASSIFICATIONS.PUBLIC,
  branch_id: CLASSIFICATIONS.PUBLIC,
  department: CLASSIFICATIONS.PUBLIC,
  position: CLASSIFICATIONS.PUBLIC,
  status: CLASSIFICATIONS.PUBLIC,

  contract_type: CLASSIFICATIONS.INTERNAL,
  start_date: CLASSIFICATIONS.INTERNAL,
  end_date: CLASSIFICATIONS.INTERNAL,
  probation_end_date: CLASSIFICATIONS.INTERNAL,
  working_hours_per_week: CLASSIFICATIONS.INTERNAL,
  working_days: CLASSIFICATIONS.INTERNAL,
  annual_leave_days: CLASSIFICATIONS.INTERNAL,
  signed_by_employee: CLASSIFICATIONS.INTERNAL,
  signed_by_employer: CLASSIFICATIONS.INTERNAL,
  signed_at: CLASSIFICATIONS.INTERNAL,

  basic_salary: CLASSIFICATIONS.CONFIDENTIAL,
  housing_allowance: CLASSIFICATIONS.CONFIDENTIAL,
  transport_allowance: CLASSIFICATIONS.CONFIDENTIAL,
  other_allowances: CLASSIFICATIONS.CONFIDENTIAL,

  contract_file_path: CLASSIFICATIONS.RESTRICTED,
  notes: CLASSIFICATIONS.RESTRICTED,

  created_by: CLASSIFICATIONS.PUBLIC,
  createdAt: CLASSIFICATIONS.PUBLIC,
  updatedAt: CLASSIFICATIONS.PUBLIC,
  deleted_at: CLASSIFICATIONS.PUBLIC,
});

const LEAVE_FIELDS = Object.freeze({
  _id: CLASSIFICATIONS.PUBLIC,
  leave_number: CLASSIFICATIONS.PUBLIC,
  employee_id: CLASSIFICATIONS.PUBLIC,
  branch_id: CLASSIFICATIONS.PUBLIC,
  leave_type: CLASSIFICATIONS.PUBLIC,
  status: CLASSIFICATIONS.PUBLIC,

  start_date: CLASSIFICATIONS.INTERNAL,
  end_date: CLASSIFICATIONS.INTERNAL,
  days_requested: CLASSIFICATIONS.INTERNAL,
  days_approved: CLASSIFICATIONS.INTERNAL,
  reviewed_by: CLASSIFICATIONS.INTERNAL,
  reviewed_at: CLASSIFICATIONS.INTERNAL,
  applied_by: CLASSIFICATIONS.INTERNAL,
  is_paid: CLASSIFICATIONS.INTERNAL,
  deducted_from_balance: CLASSIFICATIONS.INTERNAL,

  reason: CLASSIFICATIONS.CONFIDENTIAL,
  rejection_reason: CLASSIFICATIONS.CONFIDENTIAL,
  notes: CLASSIFICATIONS.CONFIDENTIAL,
  attachment_path: CLASSIFICATIONS.CONFIDENTIAL,

  createdAt: CLASSIFICATIONS.PUBLIC,
  updatedAt: CLASSIFICATIONS.PUBLIC,
  deleted_at: CLASSIFICATIONS.PUBLIC,
});

const ENTITY_FIELD_MAPS = Object.freeze({
  employee: EMPLOYEE_FIELDS,
  employment_contract: EMPLOYMENT_CONTRACT_FIELDS,
  leave: LEAVE_FIELDS,
});

// ─── Role → max classification ──────────────────────────────────

const ROLE_MAX_CLASSIFICATION = Object.freeze({
  // RESTRICTED — full access
  [ROLES.SUPER_ADMIN]: CLASSIFICATIONS.RESTRICTED,
  [ROLES.HEAD_OFFICE_ADMIN]: CLASSIFICATIONS.RESTRICTED,
  [ROLES.COMPLIANCE_OFFICER]: CLASSIFICATIONS.RESTRICTED,
  [ROLES.INTERNAL_AUDITOR]: CLASSIFICATIONS.RESTRICTED,
  [ROLES.GROUP_CHRO]: CLASSIFICATIONS.RESTRICTED,
  [ROLES.HR_MANAGER]: CLASSIFICATIONS.RESTRICTED,
  [ROLES.HR_SUPERVISOR]: CLASSIFICATIONS.RESTRICTED,

  // CONFIDENTIAL — HR/finance officer tier
  [ROLES.HR_OFFICER]: CLASSIFICATIONS.CONFIDENTIAL,
  [ROLES.HR]: CLASSIFICATIONS.CONFIDENTIAL,
  [ROLES.FINANCE_SUPERVISOR]: CLASSIFICATIONS.CONFIDENTIAL,
  [ROLES.GROUP_CFO]: CLASSIFICATIONS.CONFIDENTIAL,

  // INTERNAL — management without HR responsibility
  [ROLES.CEO]: CLASSIFICATIONS.INTERNAL,
  [ROLES.GROUP_GM]: CLASSIFICATIONS.INTERNAL,
  [ROLES.REGIONAL_DIRECTOR]: CLASSIFICATIONS.INTERNAL,
  [ROLES.BRANCH_MANAGER]: CLASSIFICATIONS.INTERNAL,
  [ROLES.MANAGER]: CLASSIFICATIONS.INTERNAL,
  [ROLES.CLINICAL_DIRECTOR]: CLASSIFICATIONS.INTERNAL,
  [ROLES.THERAPY_SUPERVISOR]: CLASSIFICATIONS.INTERNAL,
  [ROLES.SPECIAL_ED_SUPERVISOR]: CLASSIFICATIONS.INTERNAL,
  [ROLES.SUPERVISOR]: CLASSIFICATIONS.INTERNAL,
  [ROLES.QUALITY_COORDINATOR]: CLASSIFICATIONS.INTERNAL,
  [ROLES.ADMIN]: CLASSIFICATIONS.INTERNAL,
  [ROLES.IT_ADMIN]: CLASSIFICATIONS.INTERNAL,

  // PUBLIC — baseline for authenticated users not in above tiers
  // (THERAPIST, DOCTOR, RECEPTIONIST, ACCOUNTANT, etc.)
});

// Redaction sentinel — keeps the field present so the client can
// render "—" or "Restricted" consistently instead of checking
// for missing keys. Using a string (not null) avoids accidentally
// treating masked fields as "not set" in downstream logic.
const REDACTED = '[RESTRICTED]';

function classificationOf(entityType, fieldPath) {
  const map = ENTITY_FIELD_MAPS[entityType];
  if (!map) return DEFAULT_CLASSIFICATION;
  if (Object.prototype.hasOwnProperty.call(map, fieldPath)) {
    return map[fieldPath];
  }
  return DEFAULT_CLASSIFICATION;
}

function maxClassificationForRole(role) {
  if (role == null) return CLASSIFICATIONS.PUBLIC;
  return ROLE_MAX_CLASSIFICATION[role] || CLASSIFICATIONS.PUBLIC;
}

function canSeeClassification(role, classification) {
  const max = maxClassificationForRole(role);
  return CLASSIFICATION_RANK[classification] <= CLASSIFICATION_RANK[max];
}

module.exports = {
  CLASSIFICATIONS,
  CLASSIFICATION_RANK,
  DEFAULT_CLASSIFICATION,
  ENTITY_FIELD_MAPS,
  EMPLOYEE_FIELDS,
  EMPLOYMENT_CONTRACT_FIELDS,
  LEAVE_FIELDS,
  ROLE_MAX_CLASSIFICATION,
  REDACTED,
  classificationOf,
  maxClassificationForRole,
  canSeeClassification,
};
