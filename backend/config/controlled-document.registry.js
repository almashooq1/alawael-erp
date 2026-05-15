'use strict';

/**
 * controlled-document.registry.js — World-Class QMS Phase 29 Commit 7.
 *
 * Controlled documents (SOPs, policies, work instructions, forms,
 * training material) with built-in 21 CFR Part 11-compliant electronic
 * signatures.
 *
 * What "Part 11 compliant" means here:
 *
 *   • §11.10(a) — Validation: documented release lifecycle + tamper-
 *     evident audit trail (hash chain on every signature).
 *
 *   • §11.10(b) — Records reviewable: copies for inspection retained
 *     for the legally-required retention period.
 *
 *   • §11.10(c) — Protection: every signature carries the *intent*
 *     (`meaning`) of signing and is cryptographically bound to the
 *     document version it was applied against.
 *
 *   • §11.10(d) — Limit system access: enforced by the platform's auth
 *     layer (Phase 7 IAM). Not encoded here.
 *
 *   • §11.10(e) — Audit trails: each signature record is appended to
 *     `auditTrail[]` with no edit/delete primitive — the only way to
 *     remove a signature is a follow-up "revocation" entry.
 *
 *   • §11.10(g)/(h) — Authority + device checks: enforced upstream
 *     in routes (re-auth + role check).
 *
 *   • §11.50 — Signature manifestations: every signature carries
 *     printed name, datetime, and meaning of signing.
 *
 *   • §11.70 — Linking: signatures are bound to a specific
 *     `versionNumber` of the document.
 *
 *   • §11.200 — Non-biometric e-signatures shall use ≥2 identification
 *     components (username + password). Recent re-auth is required at
 *     the route layer; this registry just records the fact.
 *
 *   • §11.300 — Identification controls (uniqueness of user ID) —
 *     handled by IAM.
 */

const DOCUMENT_TYPES = Object.freeze([
  { code: 'policy', nameAr: 'سياسة', nameEn: 'Policy' },
  { code: 'sop', nameAr: 'إجراء تشغيلي قياسي', nameEn: 'Standard operating procedure' },
  { code: 'procedure', nameAr: 'إجراء', nameEn: 'Procedure' },
  { code: 'work_instruction', nameAr: 'تعليمات عمل', nameEn: 'Work instruction' },
  { code: 'form', nameAr: 'نموذج', nameEn: 'Form' },
  { code: 'training', nameAr: 'مادة تدريبية', nameEn: 'Training material' },
  { code: 'specification', nameAr: 'مواصفات', nameEn: 'Specification' },
  { code: 'manual', nameAr: 'دليل', nameEn: 'Manual' },
]);

const DOCUMENT_STATUSES = Object.freeze([
  'draft',
  'in_review',
  'approved',
  'effective',
  'superseded',
  'retired',
  'cancelled',
]);

const TERMINAL_STATUSES = Object.freeze(['superseded', 'retired', 'cancelled']);

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: ['in_review', 'cancelled'],
  in_review: ['approved', 'draft', 'cancelled'],
  approved: ['effective', 'cancelled'],
  effective: ['superseded', 'retired'],
  superseded: ['retired'],
  retired: [],
  cancelled: [],
});

// Meaning of signature per 21 CFR §11.50(a)(3).
const SIGNATURE_MEANINGS = Object.freeze([
  {
    code: 'authored',
    nameAr: 'تم التأليف',
    nameEn: 'Authored',
    requiredRoles: ['admin', 'quality_manager', 'department_head'],
  },
  {
    code: 'reviewed',
    nameAr: 'تمت المراجعة',
    nameEn: 'Reviewed',
    requiredRoles: ['quality_manager', 'department_head'],
  },
  {
    code: 'approved',
    nameAr: 'تمت الموافقة',
    nameEn: 'Approved',
    requiredRoles: ['ceo', 'admin', 'quality_manager'],
  },
  { code: 'witnessed', nameAr: 'تم التشهيد', nameEn: 'Witnessed', requiredRoles: ['*'] },
  {
    code: 'acknowledged',
    nameAr: 'تم الإقرار',
    nameEn: 'Acknowledged (read)',
    requiredRoles: ['*'],
  },
]);

// Min hops needed before a doc can move into `effective`.
const REQUIRED_SIGNATURES_FOR_EFFECTIVE = Object.freeze(['authored', 'reviewed', 'approved']);

const READ_ACKNOWLEDGEMENT_SLA_DAYS = 30; // staff must ack within 30 days of effective date

module.exports = {
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  SIGNATURE_MEANINGS,
  REQUIRED_SIGNATURES_FOR_EFFECTIVE,
  READ_ACKNOWLEDGEMENT_SLA_DAYS,
};
