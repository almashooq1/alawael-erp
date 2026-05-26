'use strict';

/**
 * smart-inbox-ranker.lib.js — Wave 431 (Phase E1 — Personalization & Adaptive UX).
 *
 * Pure ranking library that converts a heterogenous list of "inbox items"
 * (MeasureAlerts, AiRecommendationBundles, RiskSnapshots, CapaItems,
 * Tasks, …) into a numeric urgency score in [0, 1] so callers can sort
 * DESC by urgency and present the top-N "Next Best Action" surface.
 *
 * Pairs with:
 *   - W92 reviewer-queue.lib.js  — routing/grouping; this is the SORT
 *   - W337/W339/W429 MeasureAlerts — produce severity field
 *   - W334 AiRecommendationBundle — produces confidence field
 *   - W286 RiskSnapshot           — produces tier field
 *
 * Design principles:
 *   1. PURE — no I/O, no DB. The lib takes a normalized item shape and
 *      returns a number. Persistence + fetching stay in the caller.
 *   2. DOMAIN-AGNOSTIC — caller normalizes their domain shape into the
 *      InboxItem interface (severity / age / beneficiaryRiskTier /
 *      alertType / slaBreached). The lib never grows special-case
 *      knowledge of any one model.
 *   3. EXPLAINABLE — returns not just a score but the factor breakdown
 *      (signals[]), mirroring the W337/W339/W429 adapter pattern. UI
 *      can render "why this item is at the top" without a separate
 *      service call.
 *   4. ROLE-AWARE WITHOUT ROLE-LEAKAGE — role-bonus weights live in the
 *      ctx parameter (caller decides), the lib applies them. A role
 *      that doesn't care about a given alertType simply doesn't boost
 *      it.
 *
 * Weighting model (each factor contributes 0..1, then weighted-summed):
 *   severity            40%  low=0.0, medium=0.4, high=0.7, critical=1.0
 *   age (logarithmic)   25%  0h=0.0 → 168h(1w)=1.0, beyond saturates
 *   beneficiary risk    20%  low=0.0, moderate=0.3, high=0.6, critical=1.0
 *   source urgency      10%  per alertType lookup, default 0.4
 *   sla-breached boost   5%  +full credit when slaBreached=true
 *
 *   Role bonus: multiplies the resulting score by ctx.roleWeight (clamped
 *   to [0.5, 2.0]). E.g. nurses get 1.5× for medical.* topics, supervisors
 *   1.5× for quality.*. Default = 1.0 (no role bias).
 */

const SEVERITY_WEIGHTS = Object.freeze({
  low: 0.0,
  medium: 0.4,
  high: 0.7,
  critical: 1.0,
});

const RISK_TIER_WEIGHTS = Object.freeze({
  low: 0.0,
  moderate: 0.3,
  high: 0.6,
  critical: 1.0,
});

// Per-alertType urgency baseline. Anything not listed defaults to 0.4
// (manual-entry tier). New alertTypes can register here without touching
// scoreItem(). The W337/W339/W429 producers are listed explicitly.
const ALERT_TYPE_URGENCY = Object.freeze({
  REGRESSION_DETECTED: 1.0, // W339: clinical safety signal
  FORECAST_OFF_TRACK: 0.8, // W429: predictive — earlier intervention window
  MCID_NOT_MET: 0.7, // active deterioration of expected benefit
  PLATEAU_DETECTED: 0.5, // W337: needs review, not urgent
  CAPA_OVERDUE: 0.85, // W349: governance breach
  COMPLAINT_NEW: 0.7, // crm
  SAFEGUARDING_CONCERN: 1.0, // W357: child-protection
  INCIDENT_OPEN: 0.9, // quality.incident.*
});

// Factor weights — sum should ≈ 1.0 (sla-breached is added as a flat bonus
// before clamping back to [0, 1]).
const FACTOR_WEIGHTS = Object.freeze({
  severity: 0.4,
  age: 0.25,
  riskTier: 0.2,
  sourceUrgency: 0.1,
  slaBreached: 0.05,
});

// Logarithmic age curve constants. We want 0h → 0.0, 168h (1 week) → 1.0,
// asymptotic above. Using log(1+ageHours)/log(1+168) gives 0 at 0,
// ~1 at 168, and 1.15 at 360 (which we clamp).
const AGE_SATURATION_HOURS = 168;

/**
 * Normalize age in hours into [0, 1].
 *
 * @param {number} ageHours
 * @returns {number} ∈ [0, 1]
 */
function _ageFactor(ageHours) {
  if (!Number.isFinite(ageHours) || ageHours <= 0) return 0;
  const v = Math.log(1 + ageHours) / Math.log(1 + AGE_SATURATION_HOURS);
  return Math.max(0, Math.min(1, v));
}

/**
 * Compute the urgency score for one inbox item.
 *
 * Item shape (all fields optional except severity):
 *   {
 *     severity: 'low' | 'medium' | 'high' | 'critical'
 *     createdAt: Date | string | number   // for age computation
 *     beneficiaryRiskTier: 'low' | 'moderate' | 'high' | 'critical'
 *     alertType: string                   // ALERT_TYPE_URGENCY lookup key
 *     slaBreached: boolean
 *   }
 *
 * @param {Object} item
 * @param {Object} [ctx]
 * @param {Date}   [ctx.now=new Date()]   reference time for age calc
 * @param {number} [ctx.roleWeight=1.0]   role-specific multiplier (clamped)
 * @returns {{score: number, signals: Array<{name, weight, evidence}>, breakdown: object}}
 */
function scoreItem(item = {}, ctx = {}) {
  const now = ctx.now ? new Date(ctx.now) : new Date();
  const roleWeight = Math.max(0.5, Math.min(2.0, Number(ctx.roleWeight) || 1.0));

  // 1. Severity
  const sevKey = String(item.severity || '').toLowerCase();
  const severity = SEVERITY_WEIGHTS[sevKey] ?? 0;

  // 2. Age (logarithmic)
  let ageHours = 0;
  if (item.createdAt) {
    const created = new Date(item.createdAt).getTime();
    if (Number.isFinite(created)) {
      ageHours = Math.max(0, (now.getTime() - created) / (1000 * 60 * 60));
    }
  }
  const age = _ageFactor(ageHours);

  // 3. Beneficiary risk tier
  const tierKey = String(item.beneficiaryRiskTier || '').toLowerCase();
  const riskTier = RISK_TIER_WEIGHTS[tierKey] ?? 0;

  // 4. Source urgency (per-alertType baseline). Default 0.4 ONLY when an
  // alertType is provided — an item with no alertType contributes nothing
  // here (vs being penalized with a phantom "manual baseline").
  const sourceUrgency = item.alertType ? (ALERT_TYPE_URGENCY[item.alertType] ?? 0.4) : 0;

  // 5. SLA breach bonus
  const slaBreached = item.slaBreached ? 1.0 : 0.0;

  const baseScore =
    severity * FACTOR_WEIGHTS.severity +
    age * FACTOR_WEIGHTS.age +
    riskTier * FACTOR_WEIGHTS.riskTier +
    sourceUrgency * FACTOR_WEIGHTS.sourceUrgency +
    slaBreached * FACTOR_WEIGHTS.slaBreached;

  // Apply role bias, then clamp to [0, 1].
  const score = Math.max(0, Math.min(1, baseScore * roleWeight));

  // Explainability — order matches scoring order so UI rendering is stable.
  const signals = [];
  if (severity > 0) {
    signals.push({
      name: 'severity',
      weight: FACTOR_WEIGHTS.severity,
      evidence: `severity=${sevKey} → ${severity.toFixed(2)}`,
    });
  }
  if (age > 0) {
    signals.push({
      name: 'age',
      weight: FACTOR_WEIGHTS.age,
      evidence: `ageHours=${ageHours.toFixed(1)} → ${age.toFixed(2)} (log saturation @${AGE_SATURATION_HOURS}h)`,
    });
  }
  if (riskTier > 0) {
    signals.push({
      name: 'beneficiaryRiskTier',
      weight: FACTOR_WEIGHTS.riskTier,
      evidence: `tier=${tierKey} → ${riskTier.toFixed(2)}`,
    });
  }
  if (item.alertType) {
    signals.push({
      name: 'sourceUrgency',
      weight: FACTOR_WEIGHTS.sourceUrgency,
      evidence: `alertType=${item.alertType} → ${sourceUrgency.toFixed(2)}`,
    });
  }
  if (slaBreached) {
    signals.push({
      name: 'slaBreached',
      weight: FACTOR_WEIGHTS.slaBreached,
      evidence: 'SLA deadline passed — auto-boost',
    });
  }
  if (roleWeight !== 1.0) {
    signals.push({
      name: 'roleWeight',
      weight: 0,
      evidence: `role multiplier=${roleWeight.toFixed(2)}× (caller-supplied)`,
    });
  }

  return {
    score,
    signals,
    breakdown: {
      severity,
      age,
      riskTier,
      sourceUrgency,
      slaBreached,
      roleWeight,
    },
  };
}

/**
 * Rank an array of inbox items by descending urgency.
 * Stable sort: items with the exact same score keep their original order.
 *
 * @param {Array<Object>} items
 * @param {Object} [ctx] — shared scoring context (now / roleWeight / etc.)
 * @returns {Array<{item, score, signals}>}
 */
function rankItems(items, ctx = {}) {
  if (!Array.isArray(items)) return [];
  const scored = items.map((item, idx) => {
    const r = scoreItem(item, ctx);
    return { item, score: r.score, signals: r.signals, _idx: idx };
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a._idx - b._idx; // stable
  });
  return scored.map(({ item, score, signals }) => ({ item, score, signals }));
}

/**
 * Convenience — return the top N highest-urgency items.
 *
 * @param {Array<Object>} items
 * @param {number} n
 * @param {Object} [ctx]
 * @returns {Array<{item, score, signals}>}
 */
function topN(items, n, ctx = {}) {
  if (!Number.isFinite(n) || n <= 0) return [];
  return rankItems(items, ctx).slice(0, n);
}

/**
 * Compute per-role weight bias for a given alertType. Used by callers
 * to derive ctx.roleWeight without hard-coding logic.
 *
 * Returns 1.0 (neutral) when no bias applies. Clamped to [0.5, 2.0].
 *
 * Roles that mirror the W427 ACL registry:
 *   nurse / nursing_supervisor / head_nurse / doctor — clinical safety
 *   supervisor / manager — quality oversight
 *   dpo — PDPL/audit signals
 */
function roleBiasFor(role, alertType) {
  if (!role || !alertType) return 1.0;
  const clinical = new Set(['nurse', 'nursing_supervisor', 'head_nurse', 'doctor']);
  const quality = new Set(['supervisor', 'manager']);
  const dpo = new Set(['dpo']);

  const isClinicalSafety = [
    'REGRESSION_DETECTED',
    'SAFEGUARDING_CONCERN',
    'INCIDENT_OPEN',
    'MCID_NOT_MET',
  ].includes(alertType);
  const isQuality = ['CAPA_OVERDUE', 'PLATEAU_DETECTED', 'FORECAST_OFF_TRACK'].includes(alertType);
  const isPdpl = ['DPIA_PENDING', 'COMPLIANCE_EVIDENCE_MISSING'].includes(alertType);

  if (clinical.has(role) && isClinicalSafety) return 1.5;
  if (quality.has(role) && isQuality) return 1.5;
  if (dpo.has(role) && isPdpl) return 1.5;
  return 1.0;
}

module.exports = {
  scoreItem,
  rankItems,
  topN,
  roleBiasFor,
  SEVERITY_WEIGHTS,
  RISK_TIER_WEIGHTS,
  ALERT_TYPE_URGENCY,
  FACTOR_WEIGHTS,
  AGE_SATURATION_HOURS,
  _ageFactor,
};
