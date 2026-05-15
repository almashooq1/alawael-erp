'use strict';

/**
 * coq.registry.js — World-Class QMS Phase 29 Commit 12.
 *
 * Cost of Quality — ASQ PAF (Prevention / Appraisal / Failure) model:
 *
 *   • Prevention costs — incurred to PREVENT defects (training, QA
 *     system, FMEA workshops, supplier audits).
 *   • Appraisal costs — incurred to FIND defects (inspections,
 *     calibration, internal audits).
 *   • Internal failure — defects found BEFORE the service reaches
 *     the beneficiary (rework, scrap, re-inspection).
 *   • External failure — defects found AFTER (complaints, refunds,
 *     warranty, recalls, regulatory penalties).
 *
 * Industry benchmark: world-class CoQ is 2-4% of revenue, with
 * prevention + appraisal > internal + external (the "shift left").
 */

const COQ_CATEGORIES = Object.freeze([
  {
    code: 'prevention',
    nameAr: 'الوقاية',
    nameEn: 'Prevention',
    subcategories: [
      'qa_planning',
      'training',
      'fmea_workshop',
      'supplier_audit',
      'process_design',
      'preventive_maintenance',
      'qms_administration',
    ],
  },
  {
    code: 'appraisal',
    nameAr: 'التقييم',
    nameEn: 'Appraisal',
    subcategories: [
      'incoming_inspection',
      'in_process_inspection',
      'final_inspection',
      'calibration',
      'internal_audit',
      'external_audit_fees',
      'test_equipment',
    ],
  },
  {
    code: 'internal_failure',
    nameAr: 'فشل داخلي',
    nameEn: 'Internal failure',
    subcategories: ['rework', 'scrap', 'reinspection', 'downtime', 'investigation_time'],
  },
  {
    code: 'external_failure',
    nameAr: 'فشل خارجي',
    nameEn: 'External failure',
    subcategories: [
      'complaint_handling',
      'refund',
      'rework_after_delivery',
      'recall',
      'warranty',
      'regulatory_penalty',
      'reputational_damage',
    ],
  },
]);

const HEALTH_THRESHOLDS = Object.freeze({
  worldClass: 0.04, // CoQ ≤ 4% of revenue
  acceptable: 0.1, // 4-10%
  poor: 0.2, // 10-20%
  // > 20% → critical
});

function classifyCoqRatio(coqOverRevenue) {
  if (coqOverRevenue == null || Number.isNaN(coqOverRevenue)) return 'unknown';
  if (coqOverRevenue <= HEALTH_THRESHOLDS.worldClass) return 'world_class';
  if (coqOverRevenue <= HEALTH_THRESHOLDS.acceptable) return 'acceptable';
  if (coqOverRevenue <= HEALTH_THRESHOLDS.poor) return 'poor';
  return 'critical';
}

function summarise(entries, revenue = null) {
  const totals = {
    prevention: 0,
    appraisal: 0,
    internal_failure: 0,
    external_failure: 0,
  };
  for (const e of entries) {
    if (totals[e.category] == null) continue;
    totals[e.category] += Number(e.amount || 0);
  }
  const total =
    totals.prevention + totals.appraisal + totals.internal_failure + totals.external_failure;
  const ratio = revenue && revenue > 0 ? total / revenue : null;
  const preventionAndAppraisal = totals.prevention + totals.appraisal;
  const failure = totals.internal_failure + totals.external_failure;
  return {
    totals,
    total,
    revenue,
    ratio,
    grade: classifyCoqRatio(ratio),
    paafShare: total > 0 ? preventionAndAppraisal / total : null,
    shiftLeft: preventionAndAppraisal > failure,
  };
}

module.exports = {
  COQ_CATEGORIES,
  HEALTH_THRESHOLDS,
  classifyCoqRatio,
  summarise,
};
