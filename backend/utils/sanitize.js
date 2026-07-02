/**
 * Input Sanitization Utilities
 * أدوات تنقية المدخلات
 */

/**
 * Escape special regex characters in user input to prevent ReDoS attacks.
 * Use this before passing user input to MongoDB $regex queries.
 *
 * @param {string} str - User input string
 * @returns {string} Escaped string safe for use in regex
 */
const escapeRegex = str => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Strip prototype-pollution keys (__proto__, constructor, prototype) from an object.
 * Returns a shallow copy without dangerous keys.
 *
 * @param {object} obj - Input object (usually req.body)
 * @returns {object} Cleaned object
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const stripDangerousKeys = obj => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (!DANGEROUS_KEYS.has(key)) {
      clean[key] = obj[key];
    }
  }
  return clean;
};

/**
 * Strip fields that must never be set by user input in update operations.
 * Prevents mass-assignment attacks (e.g. setting role, isAdmin, createdBy).
 *
 * @param {object} obj - Input object (usually req.body)
 * @returns {object} Cleaned object without meta/privileged fields
 */
const UPDATE_BLACKLIST = new Set([
  '_id',
  '__v',
  'id',
  'createdBy',
  'createdAt',
  'updatedAt',
  'role',
  'roles',
  'isAdmin',
  'isSuperAdmin',
  'permissions',
  'password',
  'passwordHash',
  '__proto__',
  'constructor',
  'prototype',
]);

const stripUpdateMeta = obj => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (!UPDATE_BLACKLIST.has(key)) {
      clean[key] = obj[key];
    }
  }
  return clean;
};

/**
 * Recursively strip MongoDB query operators ($-prefixed keys) and dotted keys from a
 * user-supplied filter object. Use before passing a filter that originated from
 * untrusted input into a Mongoose query — e.g. a `JSON.parse`'d query-string param,
 * which bypasses the global express-mongo-sanitize (that only sees the raw string).
 * Prevents operator injection ($ne / $gt / $where / $regex / etc.) and dotted-path
 * injection. Returns a deep-cleaned copy; primitives pass through unchanged.
 *
 * @param {*} value - user-supplied filter (object / array / primitive)
 * @returns {*} cleaned value with no operator/dotted/dangerous keys
 */
const sanitizeMongoFilter = value => {
  if (Array.isArray(value)) return value.map(sanitizeMongoFilter);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || DANGEROUS_KEYS.has(key)) continue;
      clean[key] = sanitizeMongoFilter(value[key]);
    }
    return clean;
  }
  return value;
};

/**
 * Financial-state fields on accounting documents that must NEVER be set via a generic
 * update body — payment/lifecycle state and computed money totals. These belong to
 * dedicated transition endpoints (mark-paid / cancel / payment) and server-side
 * recomputation, not a raw `findByIdAndUpdate({ ...req.body })`. (W1458)
 */
const FINANCE_PROTECTED_FIELDS = new Set([
  'status',
  'paidAmount',
  'remainingAmount',
  'totalAmount',
  'subtotal',
  'vatAmount',
  'balance',
]);

/**
 * Shallow-strip the financial-state fields above from a user-supplied update body, so
 * a generic invoice/account PUT cannot mark an invoice paid or overwrite a balance.
 * @param {object} obj - request body
 * @returns {object} cleaned copy
 */
const stripProtectedFinanceFields = obj => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (!FINANCE_PROTECTED_FIELDS.has(key)) clean[key] = obj[key];
  }
  return clean;
};

/**
 * Approval / signature / verification ATTRIBUTION fields — the "who did it and when" of a
 * governance action (approved / signed / verified / reviewed / finalized / rejected). These are
 * ALWAYS set server-side by the dedicated transition endpoint (POST /:id/approve etc.), never by
 * a client-supplied create or update body. Spreading `...req.body` into `Model.create()` without
 * stripping them lets a caller forge a record that is already "approved by X" / "signed by Y" —
 * approval-workflow and clinical-signature forgery. Actor+time only (NOT `status` or the signature
 * payload, which are context-dependent per model). W1614. Complements stripProtectedFinanceFields.
 */
const APPROVAL_ATTRIBUTION_FIELDS = new Set([
  'approvedBy', 'approvedAt', 'approvedDate', 'approvalDate',
  'rejectedBy', 'rejectedAt', 'rejectionDate',
  'signedBy', 'signedAt', 'signedDate', 'signatureDate',
  'verifiedBy', 'verifiedAt', 'verifiedDate', 'verificationDate',
  'reviewedBy', 'reviewedAt', 'reviewedDate',
  'finalizedBy', 'finalizedAt',
  'endorsedBy', 'endorsedAt',
  'witnessedBy', 'witnessedAt',
  'closedBy', 'closedAt',
  'lockedBy', 'lockedAt',
]);

/**
 * Shallow-strip approval/signature/verification attribution fields from a user-supplied write
 * body. Use at `Model.create({ ...stripApprovalAttribution(req.body), ... })` on any model whose
 * approval/signature state is owned by a dedicated transition endpoint. Returns a cleaned copy;
 * non-object input passes through unchanged. W1614.
 * @param {object} obj - request body
 * @returns {object} cleaned copy with attribution fields removed
 */
const stripApprovalAttribution = obj => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (!APPROVAL_ATTRIBUTION_FIELDS.has(key)) clean[key] = obj[key];
  }
  return clean;
};

module.exports = {
  escapeRegex,
  stripDangerousKeys,
  stripUpdateMeta,
  sanitizeMongoFilter,
  stripProtectedFinanceFields,
  stripApprovalAttribution,
  APPROVAL_ATTRIBUTION_FIELDS,
  DANGEROUS_KEYS,
  UPDATE_BLACKLIST,
  FINANCE_PROTECTED_FIELDS,
};
