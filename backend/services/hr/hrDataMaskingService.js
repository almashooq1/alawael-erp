/**
 * hrDataMaskingService.js — Phase 11 Commit 5 (4.0.22).
 *
 * PDPL-aligned masking layer for any HR record leaving the API
 * boundary. Wraps hr-data-classification.js with a single
 * responsibility: given a record + caller context, return a copy with
 * forbidden fields redacted.
 *
 * Design decisions:
 *
 *   1. NEVER mutates the input. Works on shallow clones and replaces
 *      forbidden leaves with the sentinel string (`[RESTRICTED]`).
 *      Mongoose docs are `toObject()`'d before masking to avoid
 *      hidden-getter leaks.
 *
 *   2. SELF-access bypass: when `context.selfEmployeeId` equals the
 *      record's `_id` (or `user_id` per caller convention), the caller
 *      sees RESTRICTED regardless of role. Implements PDPL Art. 18
 *      (right to access own data).
 *
 *   3. Unknown entity type → fall through to a safe default: only
 *      fields whose classification resolves via the default
 *      (`RESTRICTED` per config) pass through. This is fail-closed.
 *
 *   4. Array/object inputs handled. `maskCollection` maps over an
 *      array; nested objects (e.g. `emergency_contact`) are descended
 *      leaf-by-leaf using dot-notation paths.
 *
 *   5. `context.role` is the CANONICAL role string from ROLES (e.g.
 *      `hr_manager`). Unknown roles fall back to PUBLIC tier — no
 *      privilege escalation by typo.
 *
 *   6. Complementary to the audit log (future commit): masking is
 *      filtering the OUTGOING payload; audit logs record the event
 *      that the payload was served.
 */

'use strict';

const {
  CLASSIFICATIONS,
  CLASSIFICATION_RANK,
  ENTITY_FIELD_MAPS,
  REDACTED,
  classificationOf,
  maxClassificationForRole,
} = require('../../config/hr-data-classification');

function isPlainObject(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Recursively walk a record and, for each leaf field, decide whether
 * the caller is allowed to see it. Returns a NEW object; the input is
 * never mutated.
 */
function maskLeaves(record, { entityType, role, allowAll, pathPrefix = '' }) {
  const result = Array.isArray(record) ? [] : {};
  for (const [key, value] of Object.entries(record)) {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (isPlainObject(value)) {
      // Descend. The emergency_contact sub-object classifies its
      // leaves individually via dot-path; other nested objects fall
      // through to per-key defaults.
      const masked = maskLeaves(value, {
        entityType,
        role,
        allowAll,
        pathPrefix: path,
      });
      result[key] = masked;
      continue;
    }

    if (Array.isArray(value)) {
      // Arrays of primitives or objects. For objects inside, descend
      // per-item; for primitives, the array is classified under its
      // parent field's classification.
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        result[key] = value.map(item =>
          maskLeaves(item, { entityType, role, allowAll, pathPrefix: path })
        );
      } else {
        const classification = classificationOf(entityType, path);
        result[key] = canPass({ classification, role, allowAll }) ? value : REDACTED;
      }
      continue;
    }

    const classification = classificationOf(entityType, path);
    result[key] = canPass({ classification, role, allowAll }) ? value : REDACTED;
  }
  return result;
}

function canPass({ classification, role, allowAll }) {
  if (allowAll) return true;
  const max = maxClassificationForRole(role);
  return CLASSIFICATION_RANK[classification] <= CLASSIFICATION_RANK[max];
}

/**
 * Decide whether the current caller is viewing their OWN record.
 *
 * `selfEmployeeId` in context means "this is the employee_id that
 * belongs to the current user". We grant RESTRICTED access when the
 * record's `_id` or `employee_id` matches — both come up depending on
 * whether we're masking the Employee record itself or a record that
 * REFERENCES the employee (EmploymentContract.employee_id, Leave.employee_id).
 */
function isSelfAccess(record, entityType, context) {
  if (!context || !context.selfEmployeeId) return false;
  const target = String(context.selfEmployeeId);
  if (entityType === 'employee') {
    return record._id != null && String(record._id) === target;
  }
  // For other entities, self if they belong to this employee
  return record.employee_id != null && String(record.employee_id) === target;
}

/**
 * Coerce Mongoose docs to plain objects. Leaves plain objects
 * untouched.
 */
function toPlain(record) {
  if (record == null) return record;
  if (typeof record.toObject === 'function') return record.toObject();
  return record;
}

/**
 * Mask a single record.
 *
 *   entityType — one of 'employee', 'employment_contract', 'leave'
 *   context    — { role: ROLES.X, selfEmployeeId?: string|ObjectId }
 */
function maskRecord(record, entityType, context = {}) {
  if (record == null) return record;
  const plain = toPlain(record);
  if (!ENTITY_FIELD_MAPS[entityType]) {
    // Unknown entity — no classification map. Fail-closed: wrap in
    // the RESTRICTED default, which means only RESTRICTED-tier roles
    // see anything. We still return a SHAPE the client can render.
    return maskLeaves(plain, { entityType: '__unknown__', role: context.role });
  }

  const allowAll = isSelfAccess(plain, entityType, context);
  return maskLeaves(plain, { entityType, role: context.role, allowAll });
}

/**
 * Mask an array of records. Null/undefined input passes through.
 */
function maskCollection(records, entityType, context = {}) {
  if (records == null) return records;
  if (!Array.isArray(records)) {
    throw new TypeError('hrDataMaskingService.maskCollection: records must be an array');
  }
  return records.map(r => maskRecord(r, entityType, context));
}

/**
 * Quick utility — for a given context, return the set of fields the
 * caller MAY see. Useful for query-time projection pruning: don't
 * ship fields from Mongo that would just be masked on the way out.
 * Returns an array of field paths (dot-notation) in the entity map.
 */
function visibleFields(entityType, context = {}) {
  const map = ENTITY_FIELD_MAPS[entityType];
  if (!map) return [];
  const out = [];
  for (const [path, classification] of Object.entries(map)) {
    if (canPass({ classification, role: context.role })) out.push(path);
  }
  return out;
}

/**
 * For logging / auditing: enumerate fields on the given entity that
 * WOULD be redacted for this caller. Empty array means full visibility.
 */
function redactedFields(entityType, context = {}) {
  const map = ENTITY_FIELD_MAPS[entityType];
  if (!map) return [];
  const out = [];
  for (const [path, classification] of Object.entries(map)) {
    if (!canPass({ classification, role: context.role })) out.push(path);
  }
  return out;
}

module.exports = {
  maskRecord,
  maskCollection,
  visibleFields,
  redactedFields,
  // re-export for convenience
  CLASSIFICATIONS,
  REDACTED,
};
