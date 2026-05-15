'use strict';

/**
 * supplier-quality.registry.js — World-Class QMS Phase 29 Commit 8.
 *
 * ISO 9001:2015 §8.4 — Control of externally provided processes,
 * products and services. Defines SCAR (Supplier Corrective Action
 * Request) lifecycle plus the per-dimension scorecard formula.
 */

const SCAR_STATUSES = Object.freeze([
  'open', // SCAR raised; awaiting supplier ACK
  'acknowledged', // supplier confirmed receipt
  'in_progress', // supplier investigating + drafting CAPA
  'response_received', // supplier returned root-cause + countermeasure
  'verifying', // internal team checking effectiveness
  'verified', // closure approved
  'rejected', // supplier response rejected; SCAR remains open
  'closed', // archived
  'cancelled',
]);

const TERMINAL_STATUSES = Object.freeze(['verified', 'closed', 'cancelled']);

const ALLOWED_TRANSITIONS = Object.freeze({
  open: ['acknowledged', 'cancelled'],
  acknowledged: ['in_progress', 'cancelled'],
  in_progress: ['response_received', 'cancelled'],
  response_received: ['verifying', 'rejected', 'cancelled'],
  verifying: ['verified', 'rejected'],
  rejected: ['in_progress', 'cancelled'],
  verified: ['closed'],
  closed: [],
  cancelled: [],
});

const SCAR_SEVERITY = Object.freeze([
  { code: 'minor', score: 1, nameAr: 'بسيط', nameEn: 'Minor', responseDays: 30 },
  { code: 'major', score: 2, nameAr: 'كبير', nameEn: 'Major', responseDays: 14 },
  { code: 'critical', score: 3, nameAr: 'حرج', nameEn: 'Critical', responseDays: 7 },
]);

// Scorecard dimensions — each weighted to total 1.0. Defaults can be
// overridden per-tenant at the settings layer.
const SCORECARD_WEIGHTS = Object.freeze({
  onTimeDelivery: 0.3, // % POs delivered by promised date
  qualityAcceptance: 0.3, // 1 - (rejected lots / total lots)
  scarPerformance: 0.2, // 1 - (open critical SCARs penalty)
  responsiveness: 0.1, // 1 - (mean SCAR response delay / SLA)
  commercial: 0.1, // ad-hoc commercial / contractual score
});

const GRADE_BANDS = Object.freeze([
  { code: 'preferred', min: 0.9, nameAr: 'مورد مفضّل', nameEn: 'Preferred' },
  { code: 'approved', min: 0.75, nameAr: 'معتمد', nameEn: 'Approved' },
  { code: 'conditional', min: 0.6, nameAr: 'مشروط', nameEn: 'Conditional' },
  { code: 'probation', min: 0.4, nameAr: 'تحت المراقبة', nameEn: 'On probation' },
  { code: 'disqualified', min: 0, nameAr: 'محظور', nameEn: 'Disqualified' },
]);

function grade(score) {
  for (const b of GRADE_BANDS) if (score >= b.min) return b.code;
  return 'disqualified';
}

/**
 * Combine the five dimensions (each 0-1) into a weighted scorecard.
 * Any dimension that is `null` is excluded and remaining weights are
 * renormalised so a missing data point doesn't unfairly penalise the
 * supplier.
 */
function computeScorecard(dims) {
  let totalWeight = 0;
  let sum = 0;
  for (const key of Object.keys(SCORECARD_WEIGHTS)) {
    const v = dims[key];
    if (v == null || Number.isNaN(v)) continue;
    const clamped = Math.max(0, Math.min(1, Number(v)));
    sum += clamped * SCORECARD_WEIGHTS[key];
    totalWeight += SCORECARD_WEIGHTS[key];
  }
  const score = totalWeight > 0 ? sum / totalWeight : 0;
  return {
    score,
    grade: grade(score),
    weightedComponents: dims,
    appliedWeight: totalWeight,
  };
}

module.exports = {
  SCAR_STATUSES,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  SCAR_SEVERITY,
  SCORECARD_WEIGHTS,
  GRADE_BANDS,
  grade,
  computeScorecard,
};
