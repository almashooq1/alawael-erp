'use strict';

/**
 * health-score.registry.js — Phase 13 Commit 9 (4.0.59).
 *
 * Weights, bands, and thresholds for the Executive Compliance
 * Health Score. Pure data + pure helpers.
 *
 * The health score is a weighted average (0–100) of 10 pillars.
 * Any pillar whose source service is missing at compute time
 * contributes `null` and is dropped from the weighted average;
 * remaining weights are renormalised so a partial set of pillars
 * still produces a score — with a `pillarsAvailable` count so the
 * dashboard can surface "based on 7 of 10 pillars".
 *
 * Grade bands follow the CBAHI / JCI colour convention:
 *   ≥ 90  green   (A)
 *   ≥ 80  green-  (B)
 *   ≥ 70  yellow  (C)
 *   ≥ 60  orange  (D)
 *   <  60 red     (F)
 */

// ── Pillar catalogue ───────────────────────────────────────────────

const PILLARS = Object.freeze([
  {
    id: 'controls',
    nameAr: 'الضوابط التنظيمية',
    nameEn: 'Regulatory Controls',
    weight: 25,
    source: 'controlLibrary',
    description: 'Pass-rate across the 58-control library',
  },
  {
    id: 'management_review',
    nameAr: 'مراجعات الإدارة',
    nameEn: 'Management Review',
    weight: 10,
    source: 'managementReview',
    description: 'Cadence & overdue reviews (ISO 9001 §9.3)',
  },
  {
    id: 'evidence',
    nameAr: 'خزينة الأدلة',
    nameEn: 'Evidence Vault',
    weight: 10,
    source: 'evidenceVault',
    description: 'Freshness of evidence (expiring vs valid)',
  },
  {
    id: 'calendar',
    nameAr: 'تقويم الامتثال',
    nameEn: 'Compliance Calendar',
    weight: 10,
    source: 'complianceCalendar',
    description: 'Overdue obligations rate',
  },
  {
    id: 'incidents',
    nameAr: 'الحوادث والسلامة',
    nameEn: 'Incidents & Safety',
    weight: 10,
    source: 'incidents',
    description: 'Serious incident rate & closure velocity',
  },
  {
    id: 'complaints',
    nameAr: 'الشكاوى',
    nameEn: 'Complaints',
    weight: 10,
    source: 'complaints',
    description: 'Complaint resolution within SLA',
  },
  {
    id: 'capa',
    nameAr: 'الإجراءات التصحيحية',
    nameEn: 'CAPA Performance',
    weight: 10,
    source: 'capa',
    description: 'CAPA closure rate within target SLA',
  },
  {
    id: 'satisfaction',
    nameAr: 'رضا المستفيدين',
    nameEn: 'Beneficiary Satisfaction',
    weight: 5,
    source: 'satisfaction',
    description: 'NPS / CSAT from surveys',
  },
  {
    id: 'training',
    nameAr: 'التدريب الإلزامي',
    nameEn: 'Mandatory Training',
    weight: 5,
    source: 'training',
    description: 'Staff training compliance',
  },
  {
    id: 'documents',
    nameAr: 'صلاحية الوثائق',
    nameEn: 'Document Validity',
    weight: 5,
    source: 'documents',
    description: 'Non-expired operating documents & licenses',
  },
]);

// Weights must sum to 100 — guarded by a test.

// ── Grade bands (descending) ───────────────────────────────────────

const GRADE_BANDS = Object.freeze([
  { grade: 'A', min: 90, color: 'green', label: 'Excellent' },
  { grade: 'B', min: 80, color: 'light_green', label: 'Good' },
  { grade: 'C', min: 70, color: 'yellow', label: 'Acceptable' },
  { grade: 'D', min: 60, color: 'orange', label: 'Needs improvement' },
  { grade: 'F', min: 0, color: 'red', label: 'Non-compliant' },
]);

// ── Default compute window ─────────────────────────────────────────

const DEFAULT_WINDOW_DAYS = 90;

// ── Scoring thresholds per pillar ──────────────────────────────────
// These map raw operational metrics to a 0–100 pillar score. Kept
// here (not in service code) so tuning is a one-line change and the
// tests lock them down.

const THRESHOLDS = Object.freeze({
  // Controls pillar — raw input is pass-rate 0..1 across all active controls
  controls: {
    passRateToScore(rate) {
      if (rate == null || Number.isNaN(rate)) return null;
      // Linear 0..1 → 0..100 but with a 15-point penalty for any
      // critical-control fail (applied by the aggregator, not here).
      return Math.max(0, Math.min(100, Math.round(rate * 100)));
    },
  },
  // Management review — raw input is closedReviews in rolling 12 months.
  managementReview: {
    // 0 → 0, 1 → 60 (below CBAHI min of 2), 2 → 100, 3+ → 100
    byClosedCount(n) {
      if (n == null) return null;
      if (n <= 0) return 0;
      if (n === 1) return 60;
      return 100;
    },
  },
  // Evidence pillar — raw inputs are { valid, expiring, expired }.
  evidence: {
    scoreFrom({ valid, expiring, expired }) {
      const total = (valid || 0) + (expiring || 0) + (expired || 0);
      if (!total) return null;
      // valid counts full; expiring half; expired zero.
      const weighted = (valid || 0) + 0.5 * (expiring || 0);
      return Math.round((weighted / total) * 100);
    },
  },
  // Calendar pillar — overdue rate on non-terminal events.
  calendar: {
    scoreFromOverdueRate(rate) {
      if (rate == null) return null;
      // 0 overdue → 100; 30% overdue → 0; linear between.
      return Math.max(0, Math.min(100, Math.round((1 - rate / 0.3) * 100)));
    },
  },
  // Incidents — severity-weighted rate + closure performance.
  incidents: {
    scoreFrom({ seriousRate, closureRate }) {
      // seriousRate: open critical+catastrophic per 1k beneficiary-days.
      // Target ≤ 0.2 → 100. ≥ 1.0 → 0. Linear.
      const rateScore =
        seriousRate == null
          ? null
          : Math.max(0, Math.min(100, Math.round(100 - (seriousRate / 0.8) * 100)));
      // closureRate: fraction of incidents closed within SLA.
      const closeScore =
        closureRate == null ? null : Math.round(Math.max(0, Math.min(1, closureRate)) * 100);
      if (rateScore == null && closeScore == null) return null;
      if (rateScore == null) return closeScore;
      if (closeScore == null) return rateScore;
      // Equal-weight average of the two sub-metrics.
      return Math.round((rateScore + closeScore) / 2);
    },
  },
  // Complaints — resolution SLA adherence.
  complaints: {
    scoreFromSlaRate(rate) {
      if (rate == null) return null;
      return Math.round(Math.max(0, Math.min(1, rate)) * 100);
    },
  },
  // CAPA closure within target.
  capa: {
    scoreFromSlaRate(rate) {
      if (rate == null) return null;
      return Math.round(Math.max(0, Math.min(1, rate)) * 100);
    },
  },
  // Satisfaction — NPS, scale -100..100 → 0..100.
  satisfaction: {
    scoreFromNps(nps) {
      if (nps == null) return null;
      return Math.round(Math.max(0, Math.min(100, (nps + 100) / 2)));
    },
  },
  // Training — completion rate 0..1.
  training: {
    scoreFromCompletion(rate) {
      if (rate == null) return null;
      return Math.round(Math.max(0, Math.min(1, rate)) * 100);
    },
  },
  // Documents — fraction of tracked documents currently valid.
  documents: {
    scoreFromValidRate(rate) {
      if (rate == null) return null;
      return Math.round(Math.max(0, Math.min(1, rate)) * 100);
    },
  },
});

// ── Penalties ──────────────────────────────────────────────────────
// Applied to the controls pillar after the raw pass-rate conversion.
// One critical-control failure is a 15-point hit; the pillar floor
// is 0, so accumulated penalties can't make it negative.

const CRITICAL_CONTROL_FAIL_PENALTY = 15;

// ── Helpers ────────────────────────────────────────────────────────

function gradeFor(score) {
  if (score == null) return null;
  for (const band of GRADE_BANDS) {
    if (score >= band.min) return band;
  }
  return GRADE_BANDS[GRADE_BANDS.length - 1];
}

/**
 * Combine pillar scores + weights into a total score. Drops null
 * pillars and renormalises remaining weights so the total is
 * comparable across partial sets.
 *
 * Returns { score, pillarsAvailable, weightsUsed }.
 */
function weightedTotal(pillarScores) {
  let sum = 0;
  let weightSum = 0;
  let available = 0;
  for (const p of PILLARS) {
    const score = pillarScores[p.id];
    if (score == null || Number.isNaN(score)) continue;
    sum += score * p.weight;
    weightSum += p.weight;
    available++;
  }
  if (weightSum === 0) return { score: null, pillarsAvailable: 0, weightsUsed: 0 };
  return {
    score: Math.round(sum / weightSum),
    pillarsAvailable: available,
    weightsUsed: weightSum,
  };
}

module.exports = {
  PILLARS,
  GRADE_BANDS,
  DEFAULT_WINDOW_DAYS,
  THRESHOLDS,
  CRITICAL_CONTROL_FAIL_PENALTY,
  gradeFor,
  weightedTotal,
};
