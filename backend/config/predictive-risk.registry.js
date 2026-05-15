'use strict';

/**
 * predictive-risk.registry.js — World-Class QMS Phase 29 Commit 13.
 *
 * Combines lagging indicators (incidents, complaints, SCARs, NCs)
 * with leading indicators (overdue audits, calibrations, training)
 * into a per-branch predictive risk score (0-100, higher = riskier).
 *
 * The weights reflect: an incident is worse than a complaint; an
 * overdue calibration on a critical asset is worse than an overdue
 * one on a low-risk asset; a backlog of open CAPAs signals a brittle
 * QMS.
 */

const SIGNAL_WEIGHTS = Object.freeze({
  recent_incidents_30d: 6,
  recent_critical_incidents_30d: 12,
  recent_complaints_30d: 3,
  open_capa: 1.5,
  overdue_capa: 5,
  open_critical_scar: 8,
  overdue_audit: 6,
  overdue_calibration: 4,
  active_high_risk: 2,
  lapsed_clauses: 3, // standards-traceability clauses with status=lapsed
});

const SCORE_BANDS = Object.freeze([
  { code: 'low', max: 25, nameAr: 'منخفض', nameEn: 'Low' },
  { code: 'moderate', max: 50, nameAr: 'متوسط', nameEn: 'Moderate' },
  { code: 'high', max: 75, nameAr: 'عالٍ', nameEn: 'High' },
  { code: 'critical', max: 999, nameAr: 'حرج', nameEn: 'Critical' },
]);

function band(score) {
  for (const b of SCORE_BANDS) if (score <= b.max) return b.code;
  return 'critical';
}

/**
 * Combine raw signal counts into a 0-100 risk score.
 *
 * Logistic-ish dampening so a few extreme values don't blow the score
 * past 100. After the linear sum we apply `100 * (1 - exp(-sum/40))`
 * which smoothly approaches 100 without ever exceeding it.
 */
function scoreFromSignals(signals) {
  let sum = 0;
  for (const [k, weight] of Object.entries(SIGNAL_WEIGHTS)) {
    const count = Number(signals[k] || 0);
    sum += weight * count;
  }
  const score = 100 * (1 - Math.exp(-sum / 40));
  return Math.round(score * 100) / 100;
}

module.exports = {
  SIGNAL_WEIGHTS,
  SCORE_BANDS,
  band,
  scoreFromSignals,
};
