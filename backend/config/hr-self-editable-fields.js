/**
 * hr-self-editable-fields.js — Phase 11 Commit 9 (4.0.26).
 *
 * Explicit WHITELIST of fields an employee may update on their OWN
 * Employee record via PATCH /hr/me. Everything outside this list is
 * rejected at the service boundary — never quietly dropped, never
 * silently passed through. PDPL Art. 18 requires a self-correction
 * path; Saudi Labor Law implicitly requires that employment-defining
 * fields (salary, job title, contract type, department) NOT be
 * self-editable. This file is where those two constraints meet.
 *
 * Principles:
 *
 *   1. Whitelist, not blacklist. A new field on the Employee schema
 *      is NON-editable by default — adding it to this list is an
 *      explicit, reviewable change.
 *
 *   2. No employment-defining fields. basic_salary, job_title,
 *      department, specialization, contract_type, status, hire_date,
 *      probation_end_date, branch_id, user_id, scfhs_* — NONE of
 *      these are self-editable.
 *
 *   3. No identity documents. national_id, iqama, passport are set
 *      at hire (by HR) and never self-edited; corrections go through
 *      HR with document upload.
 *
 *   4. Per-field validator functions return null on pass, error
 *      message on fail. Simple signature — the service composes
 *      them. Schema-level Mongoose validation still runs on save;
 *      this layer is the first gate + a better error message.
 *
 *   5. All entries are LEAF paths (dot-notation for nested). The
 *      service applies patches via `$set` so dot-paths work natively.
 */

'use strict';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateSaudiPhone(v) {
  if (v == null || v === '') return null; // optional — empty clears
  if (!isNonEmptyString(v)) return 'must be a string';
  const trimmed = v.trim();
  // Accept +966XXXXXXXXX, 00966XXXXXXXXX, 05XXXXXXXX, 5XXXXXXXX
  if (!/^(?:\+9665|009665|05|5)\d{8}$/.test(trimmed)) {
    return 'must be a valid Saudi mobile number';
  }
  return null;
}

function validateOptionalString({ max = 255, min = 0 } = {}) {
  return function (v) {
    if (v == null || v === '') return null;
    if (typeof v !== 'string') return 'must be a string';
    const len = v.trim().length;
    if (len < min) return `must be at least ${min} characters`;
    if (len > max) return `must be at most ${max} characters`;
    return null;
  };
}

function validateOptionalEmail(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return 'must be a string';
  // Minimal RFC-compliant-enough check. Schema layer runs a stricter one.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
    return 'must be a valid email address';
  }
  return null;
}

function validateOptionalPostalCode(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return 'must be a string';
  if (!/^\d{5}$/.test(v.trim())) return 'must be a 5-digit Saudi postal code';
  return null;
}

function validateRelation(v) {
  if (v == null || v === '') return null;
  const allowed = new Set(['spouse', 'parent', 'sibling', 'child', 'relative', 'other']);
  if (!isNonEmptyString(v)) return 'must be a string';
  if (!allowed.has(v.trim().toLowerCase())) {
    return `must be one of: ${[...allowed].join(', ')}`;
  }
  return null;
}

/**
 * FIELD → validator map. Adding a field to this object is the ONLY
 * way to make it self-editable; the service defers to
 * `Object.hasOwn(WHITELIST, path)` to decide.
 */
const WHITELIST = Object.freeze({
  // Contact channels the employee controls
  phone: validateSaudiPhone,
  phone2: validateSaudiPhone,
  personal_email: validateOptionalEmail,

  // Home address (PDPL RESTRICTED fields — self-correction allowed)
  address: validateOptionalString({ max: 500 }),
  city: validateOptionalString({ max: 100 }),
  postal_code: validateOptionalPostalCode,

  // Emergency contact — three leaf paths under the sub-object
  'emergency_contact.name': validateOptionalString({ max: 120 }),
  'emergency_contact.phone': validateSaudiPhone,
  'emergency_contact.relation': validateRelation,
});

function isEditable(path) {
  return Object.prototype.hasOwnProperty.call(WHITELIST, path);
}

/**
 * Validate a patch object (may include dot-paths or a nested
 * emergency_contact object). Returns:
 *
 *   { ok: true,  flat: { 'path': value, ... }, empty: false }
 *   { ok: true,  flat: {},                       empty: true  }   // no-op patch
 *   { ok: false, errors: { 'path': 'reason' } }
 *
 * Flattens nested input so callers can pass either
 *   { phone: '0500...', emergency_contact: { phone: '0599...' } }
 * or
 *   { phone: '0500...', 'emergency_contact.phone': '0599...' }
 */
function validatePatch(patch) {
  if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, errors: { _root: 'patch must be a plain object' } };
  }

  const flat = {};
  const errors = {};

  for (const [key, value] of Object.entries(patch)) {
    // Nested emergency_contact object → expand to dot-paths
    if (
      key === 'emergency_contact' &&
      value != null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      for (const [subKey, subVal] of Object.entries(value)) {
        const path = `emergency_contact.${subKey}`;
        if (!isEditable(path)) {
          errors[path] = 'field is not self-editable';
          continue;
        }
        const err = WHITELIST[path](subVal);
        if (err) errors[path] = err;
        else flat[path] = normalizeValue(subVal);
      }
      continue;
    }

    if (!isEditable(key)) {
      errors[key] = 'field is not self-editable';
      continue;
    }

    const err = WHITELIST[key](value);
    if (err) errors[key] = err;
    else flat[key] = normalizeValue(value);
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, flat, empty: Object.keys(flat).length === 0 };
}

// Trim strings on the way in. Empty string → null (lets an employee
// clear an optional field explicitly).
function normalizeValue(v) {
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  return v;
}

module.exports = {
  WHITELIST,
  isEditable,
  validatePatch,
  // Exposed for tests
  __validators: {
    validateSaudiPhone,
    validateOptionalEmail,
    validateOptionalPostalCode,
    validateRelation,
  },
};
