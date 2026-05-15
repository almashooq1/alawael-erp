'use strict';

/**
 * benchmark.registry.js — World-Class QMS Phase 29 Commit 17.
 *
 * Industry benchmarks for healthcare-quality metrics. Numbers come
 * from published sources (CMS QPP, JCAHO, NHS, IHI, ICN, MOH KSA,
 * GHA accreditation surveys, etc.). Values shipped here are
 * conservative defaults — every tenant can override via the settings
 * layer once their own historical median is known.
 *
 * Each benchmark carries:
 *   • metricCode     — stable join key matching the platform's KPIs
 *   • direction      — 'lower_is_better' or 'higher_is_better'
 *   • industryMedian — typical performing facility
 *   • topQuartile    — 75th-percentile aspiration
 *   • worldClass     — top 5% performance threshold
 *   • unit           — for human display (%, days, /1000, …)
 *   • source         — citation hint
 */

const BENCHMARKS = Object.freeze([
  {
    metricCode: 'hand_hygiene_compliance',
    nameAr: 'الالتزام بنظافة الأيدي',
    nameEn: 'Hand-hygiene compliance',
    direction: 'higher_is_better',
    industryMedian: 70, // %
    topQuartile: 85,
    worldClass: 95,
    unit: '%',
    source: 'WHO 5 Moments / JCI IPSG.5',
  },
  {
    metricCode: 'falls_per_1000_patient_days',
    nameAr: 'معدل السقوط لكل 1000 يوم رعاية',
    nameEn: 'Falls per 1,000 patient-days',
    direction: 'lower_is_better',
    industryMedian: 3.5,
    topQuartile: 2.5,
    worldClass: 1.5,
    unit: '/1000',
    source: 'NDNQI 2022',
  },
  {
    metricCode: 'patient_satisfaction_nps',
    nameAr: 'NPS لرضا المستفيدين',
    nameEn: 'Patient satisfaction NPS',
    direction: 'higher_is_better',
    industryMedian: 30,
    topQuartile: 50,
    worldClass: 70,
    unit: 'NPS',
    source: 'Press Ganey 2023',
  },
  {
    metricCode: 'medication_error_rate',
    nameAr: 'معدل أخطاء الأدوية',
    nameEn: 'Medication error rate',
    direction: 'lower_is_better',
    industryMedian: 5, // per 1000 doses
    topQuartile: 2,
    worldClass: 0.5,
    unit: '/1000 doses',
    source: 'JCAHO sentinel-event database',
  },
  {
    metricCode: 'capa_on_time_closure',
    nameAr: 'إغلاق CAPA في الوقت المحدد',
    nameEn: 'CAPA on-time closure rate',
    direction: 'higher_is_better',
    industryMedian: 70,
    topQuartile: 85,
    worldClass: 95,
    unit: '%',
    source: 'ISO 9001:2015 internal benchmark',
  },
  {
    metricCode: 'incident_response_hours',
    nameAr: 'زمن الاستجابة للحوادث',
    nameEn: 'Incident response time',
    direction: 'lower_is_better',
    industryMedian: 24,
    topQuartile: 12,
    worldClass: 4,
    unit: 'hours',
    source: 'CBAHI QM.8 / IHI',
  },
  {
    metricCode: 'employee_training_compliance',
    nameAr: 'الالتزام بالتدريب الإلزامي',
    nameEn: 'Mandatory training compliance',
    direction: 'higher_is_better',
    industryMedian: 80,
    topQuartile: 92,
    worldClass: 98,
    unit: '%',
    source: 'JCI SQE.8',
  },
  {
    metricCode: 'cost_of_quality_ratio',
    nameAr: 'تكلفة الجودة كنسبة من الإيرادات',
    nameEn: 'CoQ as % of revenue',
    direction: 'lower_is_better',
    industryMedian: 10, // %
    topQuartile: 6,
    worldClass: 3,
    unit: '%',
    source: 'ASQ PAF model',
  },
  {
    metricCode: 'audit_finding_recurrence',
    nameAr: 'تكرار نتائج التدقيق',
    nameEn: 'Audit finding recurrence rate',
    direction: 'lower_is_better',
    industryMedian: 20,
    topQuartile: 10,
    worldClass: 3,
    unit: '%',
    source: 'ISO 19011 / JCI QPS',
  },
  {
    metricCode: 'calibration_on_time',
    nameAr: 'المعايرة في الوقت المحدد',
    nameEn: 'Equipment calibration on-time',
    direction: 'higher_is_better',
    industryMedian: 85,
    topQuartile: 95,
    worldClass: 99,
    unit: '%',
    source: 'ISO/IEC 17025',
  },
  {
    metricCode: 'supplier_otd',
    nameAr: 'تسليم الموردين في الوقت',
    nameEn: 'Supplier on-time delivery',
    direction: 'higher_is_better',
    industryMedian: 90,
    topQuartile: 96,
    worldClass: 99,
    unit: '%',
    source: 'AIAG SQ',
  },
]);

const BAND_LABELS = Object.freeze({
  world_class: { nameAr: 'مستوى عالمي', nameEn: 'World-class' },
  top_quartile: { nameAr: 'الربع الأعلى', nameEn: 'Top quartile' },
  industry_median: { nameAr: 'متوسط القطاع', nameEn: 'Industry median' },
  below_median: { nameAr: 'دون متوسط القطاع', nameEn: 'Below median' },
});

/**
 * Classify an observed value against the benchmark for its metric.
 * Returns { band, percentile_estimate, gap }.
 */
function classify(metricCode, observed) {
  const b = BENCHMARKS.find(x => x.metricCode === metricCode);
  if (!b) return null;
  if (observed == null || Number.isNaN(Number(observed))) {
    return { band: 'unknown', benchmark: b };
  }
  const v = Number(observed);
  let band;
  let percentile;
  if (b.direction === 'higher_is_better') {
    if (v >= b.worldClass) {
      band = 'world_class';
      percentile = 95;
    } else if (v >= b.topQuartile) {
      band = 'top_quartile';
      percentile = 75;
    } else if (v >= b.industryMedian) {
      band = 'industry_median';
      percentile = 50;
    } else {
      band = 'below_median';
      percentile = Math.max(5, Math.round((v / b.industryMedian) * 50));
    }
  } else {
    if (v <= b.worldClass) {
      band = 'world_class';
      percentile = 95;
    } else if (v <= b.topQuartile) {
      band = 'top_quartile';
      percentile = 75;
    } else if (v <= b.industryMedian) {
      band = 'industry_median';
      percentile = 50;
    } else {
      band = 'below_median';
      percentile = Math.max(5, Math.round((b.industryMedian / v) * 50));
    }
  }
  const gapToWorldClass = b.direction === 'higher_is_better' ? b.worldClass - v : v - b.worldClass;
  return { band, percentile, benchmark: b, observed: v, gapToWorldClass };
}

module.exports = {
  BENCHMARKS,
  BAND_LABELS,
  classify,
};
