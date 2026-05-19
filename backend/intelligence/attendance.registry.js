'use strict';

/**
 * attendance.registry.js — Wave 119.
 *
 * Domain-level constants for the Enterprise Attendance Platform.
 * Generalizes the existing Hikvision-tied ATTENDANCE_SOURCE enum
 * (Wave 99) to 10 sources spanning hardware biometric, mobile/GPS,
 * physical tokens, manual overrides, and auto-rules.
 *
 * Design choices:
 *   - Each source has a FIXED trust tier baseline. Per-event
 *     confidence can lower the effective tier (e.g. mobile-gps with
 *     accuracy=300m drops from T3 → T4-needs-review) but never
 *     raises it above its baseline.
 *   - Source names match the canonical event model in Wave 119
 *     design doc. Adding a new source requires a code change so
 *     the audit trail covers it.
 *   - Backward compatible with hikvision.registry's existing
 *     ATTENDANCE_SOURCE constants (face-terminal / fingerprint /
 *     camera-passive / card / manual are preserved).
 *
 * Public surface:
 *   SOURCE_KIND / SOURCE_KINDS
 *   TRUST_TIER / TRUST_TIERS
 *   SOURCE_TRUST_BASELINE (source → tier)
 *   SOURCE_LABELS_AR
 *   inferTrustTier(source, confidencePct, opts?)
 *   inferEffectiveConfidence({ source, baseConfidence, flags? })
 *   isFallbackSource(source)
 *   classifySourceForRole(role) → allowed sources
 *   REASON codes
 */

// ─── Source kinds ───────────────────────────────────────────────

const SOURCE_KIND = Object.freeze({
  // Wave 99 originals (preserved):
  FACE_TERMINAL: 'face-terminal',
  FINGERPRINT: 'fingerprint',
  CAMERA_PASSIVE: 'camera-passive',
  CARD: 'card', // legacy alias of NFC
  MANUAL: 'manual',
  // Wave 119 additions:
  NFC: 'nfc',
  MOBILE_GPS: 'mobile-gps',
  QR_SCAN: 'qr-scan',
  KIOSK: 'kiosk',
  API_IMPORT: 'api-import',
  SUPERVISOR_OVERRIDE: 'supervisor-override',
  AUTO_RULE: 'auto-rule',
});
const SOURCE_KINDS = Object.freeze(Object.values(SOURCE_KIND));

// Arabic labels for the UI.
const SOURCE_LABELS_AR = Object.freeze({
  [SOURCE_KIND.FACE_TERMINAL]: 'بصمة وجه (terminal)',
  [SOURCE_KIND.FINGERPRINT]: 'بصمة إصبع',
  [SOURCE_KIND.CAMERA_PASSIVE]: 'كاميرا ذكية',
  [SOURCE_KIND.CARD]: 'بطاقة (تقليدية)',
  [SOURCE_KIND.MANUAL]: 'إدخال يدوي',
  [SOURCE_KIND.NFC]: 'بطاقة NFC/RFID',
  [SOURCE_KIND.MOBILE_GPS]: 'تطبيق محمول (GPS)',
  [SOURCE_KIND.QR_SCAN]: 'مسح QR',
  [SOURCE_KIND.KIOSK]: 'kiosk',
  [SOURCE_KIND.API_IMPORT]: 'استيراد من نظام خارجي',
  [SOURCE_KIND.SUPERVISOR_OVERRIDE]: 'تعديل مشرف',
  [SOURCE_KIND.AUTO_RULE]: 'قاعدة آلية',
});

// ─── Trust tiers ────────────────────────────────────────────────
//
// String tiers (T1..T4) chosen over numeric for UI legibility and
// to avoid clash with the legacy numeric TRUST_TIER in
// hikvision.registry (which used 1/2/3). When emitting events into
// AttendanceSourceEvent (which still uses the numeric tiers as
// per Wave 99), use trustTierToNumeric() to bridge.

const TRUST_TIER = Object.freeze({
  T1: 'T1', // auto-accept ≥90% confidence (biometric hardware)
  T2: 'T2', // accept iff corroborated by another T2+ source
  T3: 'T3', // review queue unless paired with another source
  T4: 'T4', // manual approval workflow required
});
const TRUST_TIERS = Object.freeze(Object.values(TRUST_TIER));

// Baseline tier per source. The PER-EVENT confidence can lower this
// (see inferTrustTier) but cannot raise it. Mapped from the design
// matrix in §2 of the Wave 119 design doc.
const SOURCE_TRUST_BASELINE = Object.freeze({
  [SOURCE_KIND.FACE_TERMINAL]: TRUST_TIER.T1,
  [SOURCE_KIND.FINGERPRINT]: TRUST_TIER.T1,
  [SOURCE_KIND.CAMERA_PASSIVE]: TRUST_TIER.T2,
  [SOURCE_KIND.NFC]: TRUST_TIER.T2,
  [SOURCE_KIND.CARD]: TRUST_TIER.T2, // legacy alias
  [SOURCE_KIND.API_IMPORT]: TRUST_TIER.T2,
  [SOURCE_KIND.AUTO_RULE]: TRUST_TIER.T2,
  [SOURCE_KIND.MOBILE_GPS]: TRUST_TIER.T3,
  [SOURCE_KIND.QR_SCAN]: TRUST_TIER.T3,
  [SOURCE_KIND.KIOSK]: TRUST_TIER.T3,
  [SOURCE_KIND.MANUAL]: TRUST_TIER.T4,
  [SOURCE_KIND.SUPERVISOR_OVERRIDE]: TRUST_TIER.T4,
});

// Map T1..T4 to the legacy numeric tier the AttendanceSourceEvent
// schema expects (Wave 99). T4 maps to tier 3 because the legacy
// schema doesn't model "manual approval required" separately.
const TRUST_TIER_NUMERIC = Object.freeze({
  [TRUST_TIER.T1]: 1,
  [TRUST_TIER.T2]: 2,
  [TRUST_TIER.T3]: 3,
  [TRUST_TIER.T4]: 3,
});

function trustTierToNumeric(tier) {
  return TRUST_TIER_NUMERIC[tier] || 3;
}

// ─── Confidence thresholds per tier ────────────────────────────

// Sources may produce a raw confidence (face %, GPS accuracy, etc.)
// that can DEMOTE the tier when below the source's expected floor.
// Per-source confidence floors are operator-tunable (Wave 110
// per-branch config), but registry-level defaults live here.
const CONFIDENCE_FLOORS = Object.freeze({
  [SOURCE_KIND.FACE_TERMINAL]: 85, // below 85% → T2
  [SOURCE_KIND.FINGERPRINT]: 80, // below 80% → T2
  [SOURCE_KIND.CAMERA_PASSIVE]: 75,
  [SOURCE_KIND.NFC]: 100, // hardware match — binary
  [SOURCE_KIND.CARD]: 100,
  [SOURCE_KIND.MOBILE_GPS]: 60, // GPS accuracy + geofence
  [SOURCE_KIND.QR_SCAN]: 100, // binary cryptographic
  [SOURCE_KIND.KIOSK]: 70,
  [SOURCE_KIND.API_IMPORT]: 100, // HMAC verified
  [SOURCE_KIND.AUTO_RULE]: 100,
  [SOURCE_KIND.MANUAL]: 100,
  [SOURCE_KIND.SUPERVISOR_OVERRIDE]: 100,
});

/**
 * inferTrustTier(source, confidencePct, opts?) → TRUST_TIER
 *
 * Returns the effective tier for this specific event. Cannot exceed
 * the source's baseline. Lowered by:
 *   - confidence below the source's floor (one-tier drop)
 *   - opts.driftFlag === 'time-drift' (one-tier drop)
 *   - opts.flags including 'low-confidence' (one-tier drop)
 *   - opts.flags including 'fallback-source' (no change, but noted)
 */
function inferTrustTier(source, confidencePct = 100, opts = {}) {
  const baseline = SOURCE_TRUST_BASELINE[source] || TRUST_TIER.T4;
  let demotions = 0;

  const floor = CONFIDENCE_FLOORS[source];
  if (typeof floor === 'number' && Number(confidencePct) < floor) {
    demotions += 1;
  }
  if (opts.driftFlag === 'time-drift') demotions += 1;
  if (Array.isArray(opts.flags) && opts.flags.includes('low-confidence')) {
    demotions += 1;
  }

  const order = [TRUST_TIER.T1, TRUST_TIER.T2, TRUST_TIER.T3, TRUST_TIER.T4];
  const baseIdx = order.indexOf(baseline);
  const finalIdx = Math.min(order.length - 1, baseIdx + demotions);
  return order[finalIdx];
}

/**
 * Effective confidence ∈ [0,100]. Pure helper used to normalize
 * raw source confidence + apply flag-based penalties before the
 * gate or the reconciler consume it.
 */
function inferEffectiveConfidence({ source, baseConfidence = 100, flags = [] } = {}) {
  let c = Math.max(0, Math.min(100, Number(baseConfidence) || 0));
  const arr = Array.isArray(flags) ? flags : [];
  if (arr.includes('time-drift')) c = Math.max(0, c - 20);
  if (arr.includes('low-confidence')) c = Math.max(0, c - 15);
  if (arr.includes('fallback-source')) c = Math.max(0, c - 10);
  if (arr.includes('geofence-edge')) c = Math.max(0, c - 10);
  if (arr.includes('manual-override')) c = 100; // override sets explicit certainty
  void source;
  return Math.round(c);
}

// ─── Role-aware source restrictions ────────────────────────────

const ROLE_ALLOWED_SOURCES = Object.freeze({
  therapist: [SOURCE_KIND.FACE_TERMINAL, SOURCE_KIND.KIOSK, SOURCE_KIND.SUPERVISOR_OVERRIDE],
  driver: [SOURCE_KIND.NFC, SOURCE_KIND.MOBILE_GPS, SOURCE_KIND.SUPERVISOR_OVERRIDE],
  reception: [SOURCE_KIND.FACE_TERMINAL, SOURCE_KIND.FINGERPRINT, SOURCE_KIND.SUPERVISOR_OVERRIDE],
  branch_manager: SOURCE_KINDS, // anything
  hr_admin: SOURCE_KINDS,
  hr_director: SOURCE_KINDS,
  field_employee: [
    SOURCE_KIND.MOBILE_GPS,
    SOURCE_KIND.NFC,
    SOURCE_KIND.QR_SCAN,
    SOURCE_KIND.SUPERVISOR_OVERRIDE,
  ],
  executive_leadership: [
    SOURCE_KIND.MOBILE_GPS,
    SOURCE_KIND.API_IMPORT,
    SOURCE_KIND.SUPERVISOR_OVERRIDE,
  ],
});

function classifySourceForRole(role) {
  return ROLE_ALLOWED_SOURCES[role] || SOURCE_KINDS;
}

function isSourceAllowedForRole(source, role) {
  const allowed = classifySourceForRole(role);
  return Array.isArray(allowed) ? allowed.includes(source) : true;
}

// ─── Fallback / corroboration semantics ────────────────────────

// Sources that are accepted as a FALLBACK when the primary is down.
// e.g. face-terminal offline → kiosk + qr accepted as substitutes.
const FALLBACK_SOURCES = Object.freeze([
  SOURCE_KIND.MOBILE_GPS,
  SOURCE_KIND.QR_SCAN,
  SOURCE_KIND.KIOSK,
  SOURCE_KIND.SUPERVISOR_OVERRIDE,
]);

function isFallbackSource(source) {
  return FALLBACK_SOURCES.includes(source);
}

// Sources that can ONLY confirm an existing event (never originate one
// on their own). Used by the reconciler so a camera-passive event
// alone doesn't create an attendance record — it must accompany a
// stronger source.
const CONFIRM_ONLY_SOURCES = Object.freeze([SOURCE_KIND.CAMERA_PASSIVE]);

function isConfirmOnlySource(source) {
  return CONFIRM_ONLY_SOURCES.includes(source);
}

// ─── Event flags catalogue ─────────────────────────────────────

const EVENT_FLAGS = Object.freeze([
  'time-drift', // server clock vs device > MAX_DRIFT
  'low-confidence', // confidence < source floor
  'geofence-edge', // mobile GPS at the boundary
  'duplicate-suspected', // same source within suppression window
  'tailgate', // AI camera saw 2 people, 1 ID
  'spoof-suspected', // anti-spoof signal
  'manual-override', // supervisor created or edited
  'fallback-source', // primary down, fallback used
  'after-hours', // outside shift expected window
  'cross-branch-impossible', // event implies physically impossible travel
  'device-wrong-branch', // device belongs to a different branch
]);

// ─── REASON codes ──────────────────────────────────────────────

const REASON = Object.freeze({
  SOURCE_NOT_SUPPORTED: 'ATTENDANCE_SOURCE_NOT_SUPPORTED',
  SOURCE_NOT_ALLOWED_FOR_ROLE: 'ATTENDANCE_SOURCE_NOT_ALLOWED_FOR_ROLE',
  CONFIRM_ONLY_WITHOUT_PRIMARY: 'ATTENDANCE_CONFIRM_ONLY_WITHOUT_PRIMARY',
  EMPLOYEE_REQUIRED: 'ATTENDANCE_EMPLOYEE_REQUIRED',
  BRANCH_REQUIRED: 'ATTENDANCE_BRANCH_REQUIRED',
  EVENT_TIME_REQUIRED: 'ATTENDANCE_EVENT_TIME_REQUIRED',
  EVENT_TIME_FUTURE: 'ATTENDANCE_EVENT_TIME_FUTURE',
  CONFIDENCE_OUT_OF_RANGE: 'ATTENDANCE_CONFIDENCE_OUT_OF_RANGE',
  DUPLICATE_WITHIN_WINDOW: 'ATTENDANCE_DUPLICATE_WITHIN_WINDOW',
  AUDIT_CHAIN_REQUIRED: 'ATTENDANCE_AUDIT_CHAIN_REQUIRED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SAVE_FAILED: 'SAVE_FAILED',
});

// ─── Defaults ──────────────────────────────────────────────────

const DEFAULTS = Object.freeze({
  DUPLICATE_SUPPRESSION_WINDOW_MS: 60_000, // 1 min same-source dup
  CORROBORATION_WINDOW_MS: 30_000, // 30s cross-source corroboration
  IMPOSSIBLE_TRAVEL_WINDOW_MS: 5 * 60_000,
  MAX_FUTURE_DRIFT_MS: 60_000, // events > 1 min in future = reject
  MAX_PAST_DRIFT_MS: 7 * 24 * 60 * 60_000, // > 7d past = reject (use import)
  MAX_TIME_DRIFT_MS: 5 * 60_000, // 5 min drift → tag time-drift
});

// ─── Wave 123 — Exception kinds ────────────────────────────────

const EXCEPTION_KIND = Object.freeze({
  MISSING_CHECKOUT: 'missing-checkout',
  MISSING_CHECKIN: 'missing-checkin',
  LATE_ARRIVAL_PATTERN: 'late-arrival-pattern',
  ABSENCE_WITHOUT_LEAVE: 'absence-without-leave',
  IMPOSSIBLE_TRAVEL: 'impossible-travel',
  TAILGATE_FLAG: 'tailgate-flag',
  DEVICE_SPOOF_SUSPECTED: 'device-spoof-suspected',
  POST_LOCK_CORRECTION: 'post-lock-correction',
  GEOFENCE_OUTSIDE: 'geofence-outside',
  CARELESS_CLOCKING: 'careless-clocking',
  BRANCH_LATENESS: 'branch-lateness',
});
const EXCEPTION_KINDS = Object.freeze(Object.values(EXCEPTION_KIND));

const EXCEPTION_SEVERITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});
const EXCEPTION_SEVERITIES = Object.freeze(Object.values(EXCEPTION_SEVERITY));

const EXCEPTION_OWNER = Object.freeze({
  BRANCH_MANAGER: 'branch_manager',
  HR_ADMIN: 'hr_admin',
  HR_DIRECTOR: 'hr_director',
  SECURITY: 'security',
  DPO: 'dpo',
});

// kind → {severity, owner} — owner is the role that should triage.
const EXCEPTION_METADATA = Object.freeze({
  [EXCEPTION_KIND.MISSING_CHECKOUT]: {
    severity: EXCEPTION_SEVERITY.LOW,
    owner: EXCEPTION_OWNER.BRANCH_MANAGER,
    labelAr: 'لم يسجِّل خروجاً',
  },
  [EXCEPTION_KIND.MISSING_CHECKIN]: {
    severity: EXCEPTION_SEVERITY.HIGH,
    owner: EXCEPTION_OWNER.HR_ADMIN,
    labelAr: 'لم يسجِّل دخولاً',
  },
  [EXCEPTION_KIND.LATE_ARRIVAL_PATTERN]: {
    severity: EXCEPTION_SEVERITY.MEDIUM,
    owner: EXCEPTION_OWNER.HR_ADMIN,
    labelAr: 'نمط تأخّر متكرّر',
  },
  [EXCEPTION_KIND.ABSENCE_WITHOUT_LEAVE]: {
    severity: EXCEPTION_SEVERITY.HIGH,
    owner: EXCEPTION_OWNER.HR_DIRECTOR,
    labelAr: 'غياب بدون إذن',
  },
  [EXCEPTION_KIND.IMPOSSIBLE_TRAVEL]: {
    severity: EXCEPTION_SEVERITY.CRITICAL,
    owner: EXCEPTION_OWNER.SECURITY,
    labelAr: 'سفر مستحيل بين فرعين',
  },
  [EXCEPTION_KIND.TAILGATE_FLAG]: {
    severity: EXCEPTION_SEVERITY.CRITICAL,
    owner: EXCEPTION_OWNER.SECURITY,
    labelAr: 'شخصان بطاقة واحدة (tailgate)',
  },
  [EXCEPTION_KIND.DEVICE_SPOOF_SUSPECTED]: {
    severity: EXCEPTION_SEVERITY.CRITICAL,
    owner: EXCEPTION_OWNER.SECURITY,
    labelAr: 'اشتباه انتحال جهاز',
  },
  [EXCEPTION_KIND.POST_LOCK_CORRECTION]: {
    severity: EXCEPTION_SEVERITY.CRITICAL,
    owner: EXCEPTION_OWNER.DPO,
    labelAr: 'تعديل بعد قفل الراتب',
  },
  [EXCEPTION_KIND.GEOFENCE_OUTSIDE]: {
    severity: EXCEPTION_SEVERITY.HIGH,
    owner: EXCEPTION_OWNER.BRANCH_MANAGER,
    labelAr: 'تسجيل خارج النطاق الجغرافي',
  },
  [EXCEPTION_KIND.CARELESS_CLOCKING]: {
    severity: EXCEPTION_SEVERITY.MEDIUM,
    owner: EXCEPTION_OWNER.HR_ADMIN,
    labelAr: 'إهمال في تسجيل الحضور',
  },
  [EXCEPTION_KIND.BRANCH_LATENESS]: {
    severity: EXCEPTION_SEVERITY.HIGH,
    owner: EXCEPTION_OWNER.HR_DIRECTOR,
    labelAr: 'نسبة تأخّر مرتفعة على مستوى الفرع',
  },
});

const EXCEPTION_STATUS = Object.freeze({
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
  ESCALATED: 'escalated',
});
const EXCEPTION_STATUSES = Object.freeze(Object.values(EXCEPTION_STATUS));

const PATTERN_THRESHOLDS = Object.freeze({
  LATE_PATTERN_MIN_EVENTS: 3, // ≥3 late events
  LATE_PATTERN_WINDOW_DAYS: 7,
  CARELESS_PATTERN_MIN_EVENTS: 3, // ≥3 missing-checkouts
  CARELESS_PATTERN_WINDOW_DAYS: 30,
  BRANCH_LATENESS_PCT: 0.2, // ≥20% of employees late on a day
});

function exceptionMeta(kind) {
  return (
    EXCEPTION_METADATA[kind] || {
      severity: EXCEPTION_SEVERITY.MEDIUM,
      owner: EXCEPTION_OWNER.BRANCH_MANAGER,
      labelAr: kind,
    }
  );
}

// Deterministic dedup id for an exception. Same (kind, employee,
// shiftDate) yields the same id so re-runs don't multiply.
function exceptionDedupKey({ kind, employeeId, branchId = null, shiftDate = null, extra = '' }) {
  const parts = [
    String(kind || ''),
    String(employeeId || ''),
    String(branchId || ''),
    shiftDate ? new Date(shiftDate).toISOString().slice(0, 10) : '',
    String(extra || ''),
  ];
  return parts.join('|');
}

module.exports = {
  SOURCE_KIND,
  SOURCE_KINDS,
  SOURCE_LABELS_AR,
  TRUST_TIER,
  TRUST_TIERS,
  SOURCE_TRUST_BASELINE,
  CONFIDENCE_FLOORS,
  ROLE_ALLOWED_SOURCES,
  FALLBACK_SOURCES,
  CONFIRM_ONLY_SOURCES,
  EVENT_FLAGS,
  REASON,
  DEFAULTS,
  // Wave 123 — exceptions
  EXCEPTION_KIND,
  EXCEPTION_KINDS,
  EXCEPTION_SEVERITY,
  EXCEPTION_SEVERITIES,
  EXCEPTION_OWNER,
  EXCEPTION_METADATA,
  EXCEPTION_STATUS,
  EXCEPTION_STATUSES,
  PATTERN_THRESHOLDS,
  exceptionMeta,
  exceptionDedupKey,
  // helpers
  inferTrustTier,
  inferEffectiveConfidence,
  classifySourceForRole,
  isSourceAllowedForRole,
  isFallbackSource,
  isConfirmOnlySource,
  trustTierToNumeric,
};
