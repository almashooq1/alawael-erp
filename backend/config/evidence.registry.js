'use strict';

/**
 * evidence.registry.js — Phase 13 Commit 2 (4.0.56).
 *
 * Canonical catalogue for the compliance evidence vault. Pure data,
 * no I/O, safe to require from any layer.
 *
 * Design: an EvidenceItem is the atomic unit the inspector/auditor
 * asks for. It points back at whatever produced it (a document, a
 * training completion, a signed policy, a metric snapshot, etc.)
 * and carries the integrity + retention metadata needed to prove
 * it hasn't been tampered with and is still in force.
 *
 * The registry holds:
 *   • evidence types (what kind of artifact)
 *   • lifecycle statuses
 *   • source modules (polymorphic backlink namespace)
 *   • retention policies per type (PDPL + CBAHI minimums)
 *   • storage classes (maps to S3 class / local / external)
 *   • default expiry windows
 *   • validateIntegrity() — hash format + freshness check
 */

// ── Evidence types ─────────────────────────────────────────────────

const EVIDENCE_TYPES = Object.freeze([
  'document', // a file: policy, contract, certificate, report
  'log', // a computed log snapshot (audit trail extract)
  'screenshot', // visual proof of a config / dashboard state
  'attestation', // signed statement by a person
  'metric', // a captured numeric reading with source+timestamp
  'audit_finding', // closed audit finding + its supporting artifacts
  'training_record', // training completion evidence
  'credential', // license / certification issued to staff
  'signature', // detached e-signature over another item
  'test_result', // control-test or compliance-check result
]);

// ── Status lifecycle ───────────────────────────────────────────────

const EVIDENCE_STATUSES = Object.freeze([
  'draft', // being prepared, not yet registered as evidence
  'valid', // active, within validity window, not superseded
  'expiring', // within expiry-warning window (computed)
  'expired', // past validUntil
  'superseded', // replaced by another EvidenceItem
  'revoked', // invalidated before expiry for cause
]);

const TERMINAL_STATUSES = Object.freeze(['superseded', 'revoked']);

// ── Source modules (polymorphic backlink namespace) ────────────────

const SOURCE_MODULES = Object.freeze([
  'governance', // policy, procedure, management review
  'clinical', // session, care-plan, assessment
  'hr', // employee, credential, performance
  'training', // course completion, attendance
  'finance', // invoice, contract, payment
  'procurement', // vendor, PO, evaluation
  'maintenance', // PM record, equipment calibration
  'transport', // vehicle inspection, driver license
  'documents', // document expiry, license renewal
  'quality', // audit finding, CAPA, NCR, incident
  'compliance', // control test, checklist submission
  'security', // access review, incident response
  'external', // regulator submission, inspection report
]);

// ── Hash algorithms (for integrity) ────────────────────────────────

const HASH_ALGORITHMS = Object.freeze(['sha256', 'sha512']);
const DEFAULT_HASH_ALGORITHM = 'sha256';

// ── Storage classes ────────────────────────────────────────────────

const STORAGE_CLASSES = Object.freeze([
  'inline', // metadata only, no file body (hash of an external artifact)
  'local', // stored in the app's local file store
  's3_standard', // warm cloud object store
  's3_glacier', // cold archive for long retention
  'external_ref', // pointer to an external system (regulator portal, SharePoint)
]);

// ── Retention policies ─────────────────────────────────────────────
// Minimum retention windows (in years) informed by:
//   • CBAHI / JCI: 7 years for clinical & incident evidence
//   • PDPL: 5 years for personal-data-containing logs, 2 years for
//           access logs that don't contain regulated personal data
//   • Saudi Labor Law: 5 years for employment records post-departure
//   • SOCPA / ZATCA: 10 years for accounting-related evidence
//   • ISO 9001: at least one full audit cycle (3 years)

const RETENTION_POLICIES = Object.freeze({
  clinical_critical: { years: 10, reason: 'CBAHI/MOH clinical records' },
  clinical_default: { years: 7, reason: 'CBAHI minimum' },
  financial: { years: 10, reason: 'SOCPA/ZATCA' },
  hr_active: { years: 5, reason: 'Saudi Labor Law active employment' },
  hr_postdeparture: { years: 5, reason: 'Saudi Labor Law post-departure' },
  personal_data_log: { years: 5, reason: 'PDPL' },
  access_log: { years: 2, reason: 'PDPL non-sensitive' },
  quality_audit: { years: 5, reason: 'ISO 9001 + CBAHI' },
  general: { years: 3, reason: 'ISO 9001 minimum one cycle' },
});

const TYPE_TO_DEFAULT_POLICY = Object.freeze({
  document: 'general',
  log: 'access_log',
  screenshot: 'general',
  attestation: 'quality_audit',
  metric: 'quality_audit',
  audit_finding: 'quality_audit',
  training_record: 'hr_active',
  credential: 'hr_active',
  signature: 'quality_audit',
  test_result: 'quality_audit',
});

// ── Expiry warning window ──────────────────────────────────────────

const EXPIRY_WARNING_DAYS = 30; // item flips to `expiring` when ≤ 30 days remain

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Returns the retention policy key to apply to an evidence item
 * given its type and an optional explicit override.
 */
function resolveRetentionPolicy(type, override) {
  if (override && RETENTION_POLICIES[override]) return override;
  return TYPE_TO_DEFAULT_POLICY[type] || 'general';
}

/**
 * Computes the `destroyAfter` Date from a retention policy and the
 * item's `collectedAt` timestamp.
 */
function computeDestroyAfter(policyKey, collectedAt) {
  const pol = RETENTION_POLICIES[policyKey] || RETENTION_POLICIES.general;
  const base =
    collectedAt instanceof Date ? new Date(collectedAt) : new Date(collectedAt || Date.now());
  base.setUTCFullYear(base.getUTCFullYear() + pol.years);
  return base;
}

/**
 * Effective status: maps raw stored `status` to a computed status
 * that considers validity window. Does not mutate the document.
 *
 * Rules:
 *   • superseded / revoked / draft → unchanged
 *   • validUntil passed         → `expired`
 *   • validUntil within N days  → `expiring`
 *   • else                      → `valid`
 */
function effectiveStatus(item, now = new Date(), warningDays = EXPIRY_WARNING_DAYS) {
  if (!item) return 'draft';
  if (['draft', 'superseded', 'revoked'].includes(item.status)) return item.status;

  const validUntil = item.validUntil ? new Date(item.validUntil) : null;
  if (!validUntil) return 'valid';

  const msPerDay = 86400000;
  const diffDays = (validUntil.getTime() - now.getTime()) / msPerDay;
  if (diffDays < 0) return 'expired';
  if (diffDays <= warningDays) return 'expiring';
  return 'valid';
}

/**
 * Cheap structural integrity check on a hash field. Does NOT
 * recompute against a buffer (that's the service's job); this is
 * just a format guard so a caller can't stash "abc" as a sha256.
 */
function isValidHash(value, algorithm = DEFAULT_HASH_ALGORITHM) {
  if (typeof value !== 'string') return false;
  const expectedLength = algorithm === 'sha512' ? 128 : 64;
  if (value.length !== expectedLength) return false;
  return /^[a-f0-9]+$/i.test(value);
}

module.exports = {
  EVIDENCE_TYPES,
  EVIDENCE_STATUSES,
  TERMINAL_STATUSES,
  SOURCE_MODULES,
  HASH_ALGORITHMS,
  DEFAULT_HASH_ALGORITHM,
  STORAGE_CLASSES,
  RETENTION_POLICIES,
  TYPE_TO_DEFAULT_POLICY,
  EXPIRY_WARNING_DAYS,
  resolveRetentionPolicy,
  computeDestroyAfter,
  effectiveStatus,
  isValidHash,
};
