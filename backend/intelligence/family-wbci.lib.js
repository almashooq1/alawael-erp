'use strict';

/**
 * family-wbci.lib.js — W467.
 *
 * Family Wellbeing Composite Index (WBCI) per Phase C of
 * docs/blueprint/beneficiary-lifecycle-v3.md §6 Innovation 4.
 *
 * Composite formula (weighted mean; weights re-calibratable):
 *   WBCI = 0.35 × caregiverBurdenInverse
 *        + 0.25 × siblingAdjustment
 *        + 0.20 × financialStressInverse
 *        + 0.10 × extendedFamilyEngagement
 *        + 0.10 × familyCommunicationHealth
 *
 *   Output: 0-100, higher = healthier family unit.
 *
 * Component sources:
 *   • caregiverBurdenInverse  — derived from W384 CaregiverSupportProgram
 *                                Zarit-22 burden score (inverse-scaled)
 *   • siblingAdjustment        — W468 SiblingAdjustmentRecord
 *   • financialStressInverse   — W469 FinancialNavigationPlan
 *   • extendedFamilyEngagement — observed visits + decision involvement
 *   • familyCommunicationHealth — FCP-R or proxy score
 *
 * Predictive use: WBCI < threshold for 2 consecutive months triggers
 * the W471 auto-action engine (respite + counselling + peer mentor +
 * financial review).
 *
 * Pure functions only. No DB.
 */

const COMPONENTS = Object.freeze({
  caregiverBurdenInverse: {
    weight: 0.35,
    label: { ar: 'عبء مقدّم الرعاية (عكسي)', en: 'Caregiver burden (inverse)' },
  },
  siblingAdjustment: { weight: 0.25, label: { ar: 'تكيّف الأشقاء', en: 'Sibling adjustment' } },
  financialStressInverse: {
    weight: 0.2,
    label: { ar: 'الضغط المالي (عكسي)', en: 'Financial stress (inverse)' },
  },
  extendedFamilyEngagement: {
    weight: 0.1,
    label: { ar: 'تفاعل العائلة الممتدة', en: 'Extended family engagement' },
  },
  familyCommunicationHealth: {
    weight: 0.1,
    label: { ar: 'صحة التواصل الأسري', en: 'Family communication health' },
  },
});

const TRIGGER_THRESHOLD = 50; // WBCI < 50 → consider intervention
const URGENT_THRESHOLD = 35; // WBCI < 35 → urgent escalation

/**
 * Translate a raw Zarit-22 burden score (0-88) into a 0-100 inverse
 * wellbeing score. Higher Zarit = worse burden = lower wellbeing.
 *
 * Zarit-22 interpretation bands (validated):
 *   0-20    little to no burden    → wellbeing 80-100
 *   21-40   mild to moderate       → wellbeing 55-79
 *   41-60   moderate to severe     → wellbeing 25-54
 *   61-88   severe                  → wellbeing 0-24
 */
function inverseBurden(zaritScore) {
  if (typeof zaritScore !== 'number' || !Number.isFinite(zaritScore)) return null;
  const clamped = Math.max(0, Math.min(88, zaritScore));
  return Math.round((1 - clamped / 88) * 100);
}

/**
 * Translate a financial stress score (1-5 Likert: 5 = highest stress)
 * into a 0-100 inverse wellbeing score.
 */
function inverseFinancialStress(stressLikert) {
  if (typeof stressLikert !== 'number' || !Number.isFinite(stressLikert)) return null;
  const clamped = Math.max(1, Math.min(5, stressLikert));
  // 1 → 100, 5 → 0
  return Math.round(((5 - clamped) / 4) * 100);
}

/**
 * Validate component input values (all 0-100 except null = missing).
 */
function validateComponents(components) {
  const errors = [];
  if (!components || typeof components !== 'object') {
    return { valid: false, errors: ['NOT_OBJECT'] };
  }
  for (const key of Object.keys(COMPONENTS)) {
    const v = components[key];
    if (v == null) continue; // missing is allowed; we mark composite as partial
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      errors.push(`INVALID_TYPE:${key}`);
    } else if (v < 0 || v > 100) {
      errors.push(`OUT_OF_RANGE:${key}:${v}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Compute composite WBCI from per-component scores.
 *
 * @param {Object} components  — { caregiverBurdenInverse, siblingAdjustment,
 *                                  financialStressInverse,
 *                                  extendedFamilyEngagement,
 *                                  familyCommunicationHealth }
 * @returns {{ wbci, breakdown, presentComponents, missingComponents,
 *             coverage, band, triggers }}
 */
function computeWBCI(components) {
  const { valid, errors } = validateComponents(components);
  if (!valid) {
    return { wbci: null, errors, breakdown: {}, presentComponents: 0, missingComponents: 5 };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  const breakdown = {};
  const presentList = [];
  const missingList = [];

  for (const [key, meta] of Object.entries(COMPONENTS)) {
    const v = components[key];
    if (v == null) {
      missingList.push(key);
      breakdown[key] = { score: null, weight: meta.weight, contributed: 0 };
      continue;
    }
    weightedSum += v * meta.weight;
    totalWeight += meta.weight;
    presentList.push(key);
    breakdown[key] = {
      score: v,
      weight: meta.weight,
      contributed: Number((v * meta.weight).toFixed(2)),
    };
  }

  if (totalWeight === 0) {
    return {
      wbci: null,
      errors: ['NO_COMPONENTS'],
      breakdown,
      presentComponents: 0,
      missingComponents: 5,
      coverage: 0,
    };
  }

  // Scale composite back to 0-100 based on present-weight only
  const wbci = Math.round(weightedSum / totalWeight);

  return {
    wbci,
    breakdown,
    presentComponents: presentList.length,
    missingComponents: missingList.length,
    coverage: Math.round((presentList.length / 5) * 100),
    band: _bandFor(wbci),
    triggers: _triggersFor(wbci, breakdown),
  };
}

function _bandFor(wbci) {
  if (wbci == null) return 'insufficient_data';
  if (wbci >= 80) return 'thriving';
  if (wbci >= 65) return 'stable';
  if (wbci >= TRIGGER_THRESHOLD) return 'monitor';
  if (wbci >= URGENT_THRESHOLD) return 'at_risk';
  return 'crisis';
}

function _triggersFor(wbci, breakdown) {
  const t = [];
  if (wbci == null) return t;

  if (wbci < URGENT_THRESHOLD) {
    t.push({
      action: 'family_counsellor_urgent',
      priority: 'critical',
      reason: `WBCI ${wbci} < ${URGENT_THRESHOLD}`,
    });
  } else if (wbci < TRIGGER_THRESHOLD) {
    t.push({
      action: 'family_counsellor_consult',
      priority: 'high',
      reason: `WBCI ${wbci} < ${TRIGGER_THRESHOLD}`,
    });
  }

  if (
    breakdown.caregiverBurdenInverse?.score != null &&
    breakdown.caregiverBurdenInverse.score < 40
  ) {
    t.push({
      action: 'respite_booking_offered',
      priority: 'high',
      reason: 'Caregiver burden high (Zarit-22)',
    });
  }
  if (
    breakdown.financialStressInverse?.score != null &&
    breakdown.financialStressInverse.score < 40
  ) {
    t.push({
      action: 'financial_navigation_review',
      priority: 'medium',
      reason: 'Financial stress high',
    });
  }
  if (breakdown.siblingAdjustment?.score != null && breakdown.siblingAdjustment.score < 40) {
    t.push({
      action: 'sibling_support_referral',
      priority: 'medium',
      reason: 'Sibling adjustment low',
    });
  }
  return t;
}

/**
 * Detect a sustained decline from a series of WBCI snapshots.
 * Returns true if last 2 consecutive snapshots have wbci < threshold.
 */
function detectSustainedDecline(snapshots, threshold = TRIGGER_THRESHOLD) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) return false;
  const recent = snapshots
    .slice()
    .sort((a, b) => new Date(b.snapshotDate) - new Date(a.snapshotDate))
    .slice(0, 2);
  return recent.every(s => typeof s.wbci === 'number' && s.wbci < threshold);
}

/**
 * Bilingual interpretation for family-facing surfaces.
 */
function interpretWBCI(wbci) {
  const band = _bandFor(wbci);
  const map = {
    thriving: { ar: 'الأسرة في حالة ممتازة', en: 'Family is thriving' },
    stable: { ar: 'الأسرة مستقرة', en: 'Family is stable' },
    monitor: { ar: 'نلاحظ علامات تستدعي الانتباه', en: 'Some warning signs to monitor' },
    at_risk: {
      ar: 'الأسرة في وضع خطر — يُنصح بالاستشارة',
      en: 'Family is at-risk — consultation recommended',
    },
    crisis: { ar: 'وضع أزمة — تواصلوا معنا فوراً', en: 'Crisis state — contact us immediately' },
    insufficient_data: { ar: 'بيانات غير كافية', en: 'Insufficient data' },
  };
  return { band, wbci, ...(map[band] || map.insufficient_data) };
}

module.exports = Object.freeze({
  computeWBCI,
  validateComponents,
  inverseBurden,
  inverseFinancialStress,
  detectSustainedDecline,
  interpretWBCI,
  // Constants
  COMPONENTS,
  TRIGGER_THRESHOLD,
  URGENT_THRESHOLD,
});
