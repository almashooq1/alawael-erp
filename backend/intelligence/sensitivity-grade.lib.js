'use strict';

/**
 * sensitivity-grade.lib.js — Wave 90 canonical unification (closes U3
 * + governance rule G7 from the Wave-87 analysis).
 *
 * Single source of truth that says: "given a (entityType, action) pair
 * at sensitivity level X, here is everything else that follows" —
 * MFA tier, freshness window, ledger anchor requirement, Nafath
 * requirement, audit retention years, and PDPL banner type.
 *
 * Before this lib, four parallel measures had to be kept in sync:
 *
 *   • beneficiary-lifecycle.registry: per-transition `severity` (low/
 *     medium/high/critical) + `mfaTier` (2|3) + `requiresNafath`,
 *     with the derived HIGH_SENSITIVITY_TRANSITIONS Set used
 *     implicitly for ledger anchor + 10y retention (in comments only).
 *   • beneficiary-lifecycle.service: MFA_FRESHNESS_MIN = {2:15, 3:5}.
 *   • access-review.registry: HIGH_RISK_ROLES + numeric riskScore.
 *   • web-admin TRANSITION_TO_MFA_TIER + PLAN_TRANSITION_TO_MFA_TIER:
 *     frontend duplicate of the backend tier mapping.
 *
 * If any one drifts (e.g., a transition is marked `critical` but
 * `requiresLedgerAnchor` stays false in code), the security posture
 * silently rots. This lib makes the LEVEL the single dial; everything
 * else is derived deterministically. Domain registries can still
 * override per-action via the `overrides` argument when a specific
 * exception is justified.
 *
 * Public API:
 *
 *   SENSITIVITY_LEVELS               — frozen { LOW, MEDIUM, HIGH, CRITICAL }
 *   SENSITIVITY_GRADES               — frozen base table (level → policies)
 *   sensitivityGrade(level, overrides?) → frozen grade object
 *   isValidLevel(level)              → boolean
 *   gradeForSeverity(severity, overrides?) → grade (severity is the
 *                                       lowercase 'low'|'medium'|'high'|
 *                                       'critical' used in lifecycle
 *                                       registry; normalises to uppercase
 *                                       level)
 *   gradeForLifecycleTransition(transition) → grade
 *     Convenience adapter: reads { severity, mfaTier, requiresNafath }
 *     off a beneficiary-lifecycle.registry transition object and
 *     constructs the grade with those values as overrides.
 *
 * Grade shape (every field is canonical — no nulls except pdplBanner):
 *
 *   {
 *     level:                'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
 *     mfaTier:              1 | 2 | 3,
 *     mfaFreshnessMs:       number,            // 0 = no freshness req
 *     requiresLedgerAnchor: boolean,
 *     requiresNafath:       boolean,
 *     auditRetentionYears:  number,
 *     pdplBanner:           'Art13' | 'Art20' | null,
 *   }
 *
 * Default LEVEL → grade mapping (the security baseline; override only
 * with explicit justification in a domain registry):
 *
 *   LOW      mfa=1, fresh=0, ledger=false, nafath=false, retention=1y, banner=null
 *   MEDIUM   mfa=1, fresh=0, ledger=false, nafath=false, retention=3y, banner=null
 *   HIGH     mfa=2, fresh=15min, ledger=true, nafath=false, retention=7y, banner=Art13
 *   CRITICAL mfa=3, fresh=5min,  ledger=true, nafath=true,  retention=10y, banner=Art13
 *
 * These defaults are derived from:
 *   • PDPL Art.13 (10y retention for sensitive personal data + banner)
 *   • CBAHI clinical record retention (7y for adult, 10y for minor)
 *   • Wave 86 MFA freshness windows (5min tier3, 15min tier2)
 *   • Wave 17 AnchorLedger eligibility (HIGH-sensitivity events only)
 */

const SENSITIVITY_LEVELS = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

const _LEVELS_SET = new Set(Object.values(SENSITIVITY_LEVELS));

const SENSITIVITY_GRADES = Object.freeze({
  LOW: Object.freeze({
    level: SENSITIVITY_LEVELS.LOW,
    mfaTier: 1,
    mfaFreshnessMs: 0,
    requiresLedgerAnchor: false,
    requiresNafath: false,
    auditRetentionYears: 1,
    pdplBanner: null,
  }),
  MEDIUM: Object.freeze({
    level: SENSITIVITY_LEVELS.MEDIUM,
    mfaTier: 1,
    mfaFreshnessMs: 0,
    requiresLedgerAnchor: false,
    requiresNafath: false,
    auditRetentionYears: 3,
    pdplBanner: null,
  }),
  HIGH: Object.freeze({
    level: SENSITIVITY_LEVELS.HIGH,
    mfaTier: 2,
    mfaFreshnessMs: 15 * 60 * 1000,
    requiresLedgerAnchor: true,
    requiresNafath: false,
    auditRetentionYears: 7,
    pdplBanner: 'Art13',
  }),
  CRITICAL: Object.freeze({
    level: SENSITIVITY_LEVELS.CRITICAL,
    mfaTier: 3,
    mfaFreshnessMs: 5 * 60 * 1000,
    requiresLedgerAnchor: true,
    requiresNafath: true,
    auditRetentionYears: 10,
    pdplBanner: 'Art13',
  }),
});

const VALID_PDPL_BANNERS = new Set(['Art13', 'Art20', null]);

function isValidLevel(level) {
  return typeof level === 'string' && _LEVELS_SET.has(level);
}

function _normaliseSeverity(severity) {
  if (!severity || typeof severity !== 'string') return null;
  const upper = severity.toUpperCase();
  return _LEVELS_SET.has(upper) ? upper : null;
}

function sensitivityGrade(level, overrides = {}) {
  if (!isValidLevel(level)) {
    throw new Error(
      `sensitivityGrade: invalid level "${level}" — must be one of ${[..._LEVELS_SET].join(', ')}`
    );
  }
  const base = SENSITIVITY_GRADES[level];
  if (!overrides || typeof overrides !== 'object' || Object.keys(overrides).length === 0) {
    return base; // already frozen
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) {
      // Allow pdplBanner = null explicitly; ignore other nullish overrides.
      if (key === 'pdplBanner' && value === null) merged.pdplBanner = null;
      continue;
    }
    // Validate override types so a typo in a registry can't silently
    // create an invalid grade (e.g., mfaTier='3' as a string).
    if (key === 'mfaTier') {
      if (![1, 2, 3].includes(value)) {
        throw new Error(`sensitivityGrade: override mfaTier must be 1|2|3, got ${value}`);
      }
    } else if (key === 'mfaFreshnessMs' || key === 'auditRetentionYears') {
      if (typeof value !== 'number' || value < 0) {
        throw new Error(`sensitivityGrade: override ${key} must be a non-negative number`);
      }
    } else if (key === 'requiresLedgerAnchor' || key === 'requiresNafath') {
      if (typeof value !== 'boolean') {
        throw new Error(`sensitivityGrade: override ${key} must be a boolean`);
      }
    } else if (key === 'pdplBanner') {
      if (!VALID_PDPL_BANNERS.has(value)) {
        throw new Error(
          `sensitivityGrade: override pdplBanner must be Art13|Art20|null, got ${value}`
        );
      }
    } else if (key === 'level') {
      // Disallow level override — that's the dimension itself.
      throw new Error('sensitivityGrade: cannot override level via overrides');
    }
    merged[key] = value;
  }
  return Object.freeze(merged);
}

function gradeForSeverity(severity, overrides = {}) {
  const level = _normaliseSeverity(severity);
  if (!level) {
    throw new Error(
      `gradeForSeverity: invalid severity "${severity}" — expected low/medium/high/critical`
    );
  }
  return sensitivityGrade(level, overrides);
}

function gradeForLifecycleTransition(transition) {
  if (!transition || typeof transition !== 'object') {
    throw new Error('gradeForLifecycleTransition: transition object required');
  }
  const { severity, mfaTier, requiresNafath } = transition;
  const overrides = {};
  if (mfaTier !== undefined && mfaTier !== null) overrides.mfaTier = mfaTier;
  if (requiresNafath !== undefined && requiresNafath !== null) {
    overrides.requiresNafath = !!requiresNafath;
  }
  return gradeForSeverity(severity, overrides);
}

module.exports = {
  SENSITIVITY_LEVELS,
  SENSITIVITY_GRADES,
  sensitivityGrade,
  gradeForSeverity,
  gradeForLifecycleTransition,
  isValidLevel,
};
