'use strict';

/**
 * reason-codes.registry.js — Wave 89 governance rule G2 from the Wave-87
 * Canonical Domain Unification Architect analysis.
 *
 * Single source of truth for REASON codes that services return when
 * refusing an action. Today the same conceptual reason ships under at
 * least 4 spellings:
 *
 *   SELF_APPROVAL_FORBIDDEN (care-plan)
 *   self_approval_forbidden (hr-change-request)
 *   SELF_ATTESTATION         (access-review)
 *   SOD_SELF_APPROVAL        (finance/expense)
 *
 * A reviewer reading "did this denial fire?" can't tell which of those
 * is canonical. This registry fixes the canonical spelling, lists the
 * known aliases (so legacy callers stay valid during migration), and
 * provides the Arabic label used by every UI surface that renders the
 * reason to a human.
 *
 * Public API:
 *   REASON_CODES                — frozen object of canonical UPPER_SNAKE codes
 *   REASON_LABELS_AR            — Arabic-language one-liner per code
 *   ALIAS_TO_CANONICAL          — map of historical alias → canonical
 *   isCanonicalReason(code)     — boolean
 *   normaliseReason(code)       — returns canonical for alias input, or the
 *                                 same code if already canonical, or null
 *                                 if unknown
 *   registerReason({ code, labelAr, aliases? })  — additive only (for tests
 *                                                  and future extensions);
 *                                                  throws on conflict
 *
 * The CI lint rule (future Wave) will fail any service that returns a
 * REASON code not in this registry (or its aliases).
 */

const REASON_CODES = Object.freeze({
  // Separation-of-duties / authorisation
  SELF_APPROVAL_FORBIDDEN: 'SELF_APPROVAL_FORBIDDEN',
  ACTOR_BUNDLE_CONFLICT: 'ACTOR_BUNDLE_CONFLICT',
  ACTOR_REQUIRED: 'ACTOR_REQUIRED',
  ACTOR_ROLE_NOT_ALLOWED: 'ACTOR_ROLE_NOT_ALLOWED',
  SUBJECT_REQUIRED: 'SUBJECT_REQUIRED',

  // MFA / step-up (Wave 36/37/86)
  MFA_TIER_REQUIRED: 'MFA_TIER_REQUIRED',
  MFA_FRESHNESS_REQUIRED: 'MFA_FRESHNESS_REQUIRED',
  USER_TEMP_LOCKED: 'USER_TEMP_LOCKED',
  CHALLENGE_RATE_LIMITED: 'CHALLENGE_RATE_LIMITED',
  VERIFY_TOO_SOON: 'VERIFY_TOO_SOON',

  // Workflow / state machine
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  TRANSITION_NOT_REVERSIBLE: 'TRANSITION_NOT_REVERSIBLE',
  REVERSAL_WINDOW_EXPIRED: 'REVERSAL_WINDOW_EXPIRED',

  // Validation / input
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  JUSTIFICATION_REQUIRED: 'JUSTIFICATION_REQUIRED',
  COSIGNERS_REQUIRED: 'COSIGNERS_REQUIRED',
  MODEL_VALIDATION_FAILED: 'MODEL_VALIDATION_FAILED',
  CANONICAL_VALIDATION_FAILED: 'CANONICAL_VALIDATION_FAILED',

  // Lookup / resource
  NOT_FOUND: 'NOT_FOUND',

  // Hash chain / integrity
  HASH_MISMATCH: 'HASH_MISMATCH',
  PREV_HASH_MISMATCH: 'PREV_HASH_MISMATCH',

  // Wave 286 — Unified Risk Orchestrator
  RISK_SCORE_COMPUTED: 'RISK_SCORE_COMPUTED',
  RISK_NO_SOURCES_AVAILABLE: 'RISK_NO_SOURCES_AVAILABLE',
  RISK_SCORING_FAILED: 'RISK_SCORING_FAILED',
});

const REASON_LABELS_AR = Object.freeze({
  SELF_APPROVAL_FORBIDDEN: 'لا يمكن للمستخدم الموافقة على طلبه أو إجرائه الخاص',
  ACTOR_BUNDLE_CONFLICT: 'تعارض في حزمة الأدوار يمنع هذا الإجراء',
  ACTOR_REQUIRED: 'الجهة الفاعلة مطلوبة',
  ACTOR_ROLE_NOT_ALLOWED: 'دور الجهة الفاعلة لا يسمح بهذا الإجراء',
  SUBJECT_REQUIRED: 'الكيان المستهدف مطلوب',

  MFA_TIER_REQUIRED: 'يلزم تأكيد MFA من المستوى المطلوب',
  MFA_FRESHNESS_REQUIRED: 'انتهت نضارة MFA — يلزم تأكيد جديد',
  USER_TEMP_LOCKED: 'الحساب مقفل مؤقتاً بسبب محاولات فاشلة',
  CHALLENGE_RATE_LIMITED: 'تجاوز الحد المسموح لطلبات MFA',
  VERIFY_TOO_SOON: 'محاولة تحقق مبكرة — يلزم انتظار',

  INVALID_TRANSITION: 'الانتقال غير مسموح من الحالة الحالية',
  TRANSITION_NOT_REVERSIBLE: 'هذا الانتقال لا يمكن عكسه',
  REVERSAL_WINDOW_EXPIRED: 'انتهت نافذة العكس',

  VALIDATION_FAILED: 'فشل التحقق من المدخلات',
  JUSTIFICATION_REQUIRED: 'يلزم تبرير للقرار',
  COSIGNERS_REQUIRED: 'يلزم موقّعون مشاركون',
  MODEL_VALIDATION_FAILED: 'فشل تحقق النموذج',
  CANONICAL_VALIDATION_FAILED: 'فشل مطابقة العقد القانوني للنموذج الموحد',

  NOT_FOUND: 'العنصر المطلوب غير موجود',

  HASH_MISMATCH: 'تعارض في تجزئة السلسلة — احتمال عبث',
  PREV_HASH_MISMATCH: 'تعارض في الربط بالعنصر السابق في السلسلة',

  RISK_SCORE_COMPUTED: 'تم حساب درجة الخطورة من المصادر المتاحة',
  RISK_NO_SOURCES_AVAILABLE: 'لا يوجد مصدر بيانات متاح لحساب درجة الخطورة',
  RISK_SCORING_FAILED: 'فشل أحد مصادر حساب درجة الخطورة',
});

// Legacy aliases we've observed in the codebase. The lib normalises any
// of these to the canonical UPPER_SNAKE code so receivers don't need to
// know the historical spelling.
const ALIAS_TO_CANONICAL = Object.freeze({
  // self-approval family
  self_approval_forbidden: REASON_CODES.SELF_APPROVAL_FORBIDDEN,
  selfApprovalForbidden: REASON_CODES.SELF_APPROVAL_FORBIDDEN,
  SELF_ATTESTATION: REASON_CODES.SELF_APPROVAL_FORBIDDEN,
  SOD_SELF_APPROVAL: REASON_CODES.SELF_APPROVAL_FORBIDDEN,

  // bundle conflicts
  actor_bundle_conflict: REASON_CODES.ACTOR_BUNDLE_CONFLICT,
  ACTOR_BUNDLE_CONFLICTS: REASON_CODES.ACTOR_BUNDLE_CONFLICT,
});

const CANONICAL_SET = new Set(Object.values(REASON_CODES));

function isCanonicalReason(code) {
  return typeof code === 'string' && CANONICAL_SET.has(code);
}

function normaliseReason(code) {
  if (typeof code !== 'string') return null;
  if (CANONICAL_SET.has(code)) return code;
  if (Object.prototype.hasOwnProperty.call(ALIAS_TO_CANONICAL, code)) {
    return ALIAS_TO_CANONICAL[code];
  }
  return null;
}

// Additive-only extension hook for tests / future modules. Throws if the
// code already exists with a different label, or if an alias collides
// with an existing canonical code.
function registerReason({ code, labelAr, aliases = [] }) {
  if (!code || typeof code !== 'string') {
    throw new Error('registerReason: code (UPPER_SNAKE string) is required');
  }
  if (CANONICAL_SET.has(code) && REASON_LABELS_AR[code] !== labelAr) {
    throw new Error(`registerReason: ${code} already exists with a different labelAr`);
  }
  CANONICAL_SET.add(code);
  // Frozen objects can't be mutated, so this is intentionally limited to
  // adding NEW codes via in-memory map only (we keep the public objects
  // frozen so consumers can rely on them).
  for (const alias of aliases) {
    if (CANONICAL_SET.has(alias)) {
      throw new Error(`registerReason: alias "${alias}" collides with a canonical code`);
    }
  }
}

module.exports = {
  REASON_CODES,
  REASON_LABELS_AR,
  ALIAS_TO_CANONICAL,
  isCanonicalReason,
  normaliseReason,
  registerReason,
};
