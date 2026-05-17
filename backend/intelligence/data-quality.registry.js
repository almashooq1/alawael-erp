'use strict';

/**
 * data-quality.registry.js — Wave 22.
 *
 * Per-dataset configuration for the 8 quality dimensions.
 * Single source of truth for: thresholds, dimension weights,
 * which sources feed each dataset, and whether the value is
 * masked from executives when quality is critical.
 *
 * Drift test (`__tests__/data-quality-coverage.test.js`) fails CI if
 * a KPI in drilldown.registry.js lacks a matching entry here.
 *
 * See `docs/blueprint/30-data-trust-quality.md` for the design contract.
 */

const DIMENSIONS = Object.freeze([
  'freshness',
  'timeliness',
  'completeness',
  'validity',
  'consistency',
  'uniqueness',
  'source',
  'aiConfidence',
]);

const LEVELS = Object.freeze(['excellent', 'good', 'fair', 'poor', 'critical']);

const CATEGORY_CRITICALITY = Object.freeze({
  clinical: 'high',
  financial: 'high',
  compliance: 'high',
  hr: 'medium',
  quality: 'high',
  operational: 'medium',
});

// ─── Source catalog ─────────────────────────────────────────────
// Trust scores per source category (the "where did this come from"
// dimension). The MINIMUM source score in a dataset = the dataset's
// source-dimension score.

const SOURCE_CATEGORIES = Object.freeze({
  prod_api: { trustScore: 1.0, descriptionAr: 'API إنتاج', descriptionEn: 'Production API' },
  prod_db: {
    trustScore: 1.0,
    descriptionAr: 'قاعدة البيانات الإنتاجية',
    descriptionEn: 'Production DB',
  },
  ingest_pipeline: {
    trustScore: 0.95,
    descriptionAr: 'خط الإدخال (DLQ replay)',
    descriptionEn: 'Ingest pipeline',
  },
  etl_batch: { trustScore: 0.9, descriptionAr: 'ETL ليلي', descriptionEn: 'Nightly ETL' },
  derived: { trustScore: 0.85, descriptionAr: 'محسوب', descriptionEn: 'Derived/computed' },
  manual_import: {
    trustScore: 0.7,
    descriptionAr: 'استيراد يدوي (CSV)',
    descriptionEn: 'Manual CSV import',
  },
  legacy_system: {
    trustScore: 0.6,
    descriptionAr: 'نظام قديم',
    descriptionEn: 'Legacy system',
  },
  simulated: {
    trustScore: 0.3,
    descriptionAr: 'بيانات تجريبية',
    descriptionEn: 'Simulated/test data',
  },
});

// ─── Default per-category thresholds ───────────────────────────
// Severity escalation: when this score drops below `warn`, fire
// medium severity; below `critical`, fire critical severity. The
// per-dataset registry can override.

const DEFAULT_THRESHOLDS_BY_CATEGORY = Object.freeze({
  clinical: {
    freshness: { warn: 0.7, critical: 0.4 },
    timeliness: { warn: 0.7, critical: 0.4 },
    completeness: { warn: 0.85, critical: 0.6 },
    validity: { warn: 0.9, critical: 0.7 },
    consistency: { warn: 0.85, critical: 0.6 },
    uniqueness: { warn: 0.9, critical: 0.7 },
    source: { warn: 0.8, critical: 0.6 },
    aiConfidence: { warn: 0.6, critical: 0.4 },
  },
  financial: {
    freshness: { warn: 0.7, critical: 0.4 },
    timeliness: { warn: 0.8, critical: 0.5 },
    completeness: { warn: 0.9, critical: 0.7 },
    validity: { warn: 0.9, critical: 0.7 },
    consistency: { warn: 0.95, critical: 0.8 }, // finance demands consistency
    uniqueness: { warn: 0.95, critical: 0.8 },
    source: { warn: 0.8, critical: 0.6 },
    aiConfidence: { warn: 0.6, critical: 0.4 },
  },
  hr: {
    freshness: { warn: 0.6, critical: 0.3 },
    timeliness: { warn: 0.6, critical: 0.3 },
    completeness: { warn: 0.8, critical: 0.5 },
    validity: { warn: 0.85, critical: 0.6 },
    consistency: { warn: 0.8, critical: 0.5 },
    uniqueness: { warn: 0.85, critical: 0.6 },
    source: { warn: 0.7, critical: 0.5 },
    aiConfidence: { warn: 0.5, critical: 0.3 },
  },
  operational: {
    freshness: { warn: 0.5, critical: 0.3 },
    timeliness: { warn: 0.5, critical: 0.3 },
    completeness: { warn: 0.7, critical: 0.4 },
    validity: { warn: 0.7, critical: 0.4 },
    consistency: { warn: 0.7, critical: 0.4 },
    uniqueness: { warn: 0.7, critical: 0.4 },
    source: { warn: 0.6, critical: 0.4 },
    aiConfidence: { warn: 0.4, critical: 0.2 },
  },
  quality: {
    freshness: { warn: 0.7, critical: 0.4 },
    timeliness: { warn: 0.7, critical: 0.4 },
    completeness: { warn: 0.85, critical: 0.6 },
    validity: { warn: 0.9, critical: 0.7 },
    consistency: { warn: 0.85, critical: 0.6 },
    uniqueness: { warn: 0.9, critical: 0.7 },
    source: { warn: 0.8, critical: 0.6 },
    aiConfidence: { warn: 0.6, critical: 0.4 },
  },
  compliance: {
    freshness: { warn: 0.8, critical: 0.5 },
    timeliness: { warn: 0.8, critical: 0.5 },
    completeness: { warn: 0.95, critical: 0.8 },
    validity: { warn: 0.95, critical: 0.8 },
    consistency: { warn: 0.95, critical: 0.8 },
    uniqueness: { warn: 0.95, critical: 0.8 },
    source: { warn: 0.9, critical: 0.7 },
    aiConfidence: { warn: 0.7, critical: 0.5 },
  },
});

// ─── Default dimension weights per category ────────────────────
// Composite = Σ(dimensionScore × weight) / Σ(weights of applicable dims)

const DEFAULT_WEIGHTS_BY_CATEGORY = Object.freeze({
  clinical: {
    freshness: 1,
    timeliness: 1,
    completeness: 2,
    validity: 3,
    consistency: 2,
    uniqueness: 1,
    source: 1,
    aiConfidence: 1,
  },
  financial: {
    freshness: 1,
    timeliness: 2,
    completeness: 2,
    validity: 2,
    consistency: 3,
    uniqueness: 2,
    source: 1,
    aiConfidence: 1,
  },
  hr: {
    freshness: 1,
    timeliness: 1,
    completeness: 2,
    validity: 2,
    consistency: 1,
    uniqueness: 1,
    source: 1,
    aiConfidence: 1,
  },
  operational: {
    freshness: 2,
    timeliness: 2,
    completeness: 1,
    validity: 1,
    consistency: 1,
    uniqueness: 1,
    source: 1,
    aiConfidence: 1,
  },
  quality: {
    freshness: 1,
    timeliness: 1,
    completeness: 2,
    validity: 2,
    consistency: 2,
    uniqueness: 1,
    source: 1,
    aiConfidence: 1,
  },
  compliance: {
    freshness: 2,
    timeliness: 2,
    completeness: 3,
    validity: 3,
    consistency: 3,
    uniqueness: 1,
    source: 2,
    aiConfidence: 1,
  },
});

// ─── Per-dataset registry (12 priority KPIs) ───────────────────

const REGISTRY = {
  'kpi.beneficiary.active_count': {
    category: 'clinical',
    expectedCadenceMin: 15,
    slaMs: 30_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.95,
    crossSourceTolerance: 0.02,
    sources: [
      { id: 'beneficiary_collection', category: 'prod_db' },
      { id: 'attendance_collection', category: 'prod_db' },
    ],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.beneficiary.admissions_monthly': {
    category: 'clinical',
    expectedCadenceMin: 60,
    slaMs: 60_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.95,
    crossSourceTolerance: 0.03,
    sources: [{ id: 'beneficiary_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.beneficiary.discharges_monthly': {
    category: 'clinical',
    expectedCadenceMin: 60,
    slaMs: 60_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.95,
    crossSourceTolerance: 0.03,
    sources: [{ id: 'beneficiary_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.attendance.daily_rate': {
    category: 'operational',
    expectedCadenceMin: 5,
    slaMs: 15_000,
    duplicateThreshold: 0.02,
    completenessThreshold: 0.9,
    crossSourceTolerance: 0.05,
    sources: [
      { id: 'zkteco_fingerprint', category: 'prod_api' },
      { id: 'attendance_manual', category: 'manual_import' },
    ],
    maskOnCritical: false, // operators need raw numbers even when bad
    isAIDerived: false,
  },

  'kpi.goals.stalled_count': {
    category: 'clinical',
    expectedCadenceMin: 30,
    slaMs: 30_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.9,
    crossSourceTolerance: 0.02,
    sources: [{ id: 'smart_goals_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.care_plans.review_overdue': {
    category: 'clinical',
    expectedCadenceMin: 60,
    slaMs: 60_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.95,
    crossSourceTolerance: 0.02,
    sources: [{ id: 'care_plans_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.therapy_sessions.completion': {
    category: 'clinical',
    expectedCadenceMin: 15,
    slaMs: 30_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.9,
    crossSourceTolerance: 0.03,
    sources: [{ id: 'sessions_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.therapist.utilization': {
    category: 'hr',
    expectedCadenceMin: 60,
    slaMs: 30_000,
    duplicateThreshold: 0.02,
    completenessThreshold: 0.85,
    crossSourceTolerance: 0.05,
    sources: [
      { id: 'sessions_collection', category: 'prod_db' },
      { id: 'employee_collection', category: 'prod_db' },
    ],
    maskOnCritical: false, // HR operational
    isAIDerived: false,
  },

  'kpi.invoices.overdue_count': {
    category: 'financial',
    expectedCadenceMin: 60,
    slaMs: 60_000,
    duplicateThreshold: 0.005, // finance won't tolerate dup invoices
    completenessThreshold: 0.98,
    crossSourceTolerance: 0.01, // very tight
    sources: [
      { id: 'invoices_collection', category: 'prod_db' },
      { id: 'zatca_status', category: 'prod_api' },
    ],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.complaints.open_count': {
    category: 'quality',
    expectedCadenceMin: 30,
    slaMs: 30_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.9,
    crossSourceTolerance: 0.02,
    sources: [{ id: 'complaints_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.incidents.critical_open': {
    category: 'quality',
    expectedCadenceMin: 15,
    slaMs: 15_000,
    duplicateThreshold: 0.005,
    completenessThreshold: 0.95,
    crossSourceTolerance: 0.01,
    sources: [{ id: 'incidents_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },

  'kpi.documents.expiring_30d': {
    category: 'compliance',
    expectedCadenceMin: 240, // 4h — documents don't refresh fast
    slaMs: 120_000,
    duplicateThreshold: 0.01,
    completenessThreshold: 0.98,
    crossSourceTolerance: 0.0, // compliance: zero tolerance
    sources: [{ id: 'documents_collection', category: 'prod_db' }],
    maskOnCritical: true,
    isAIDerived: false,
  },
};

Object.freeze(REGISTRY);

// ─── API ────────────────────────────────────────────────────────

function getDatasetConfig(datasetId) {
  return REGISTRY[datasetId] || null;
}

function listRegisteredDatasets() {
  return Object.keys(REGISTRY);
}

function getThresholdsFor(datasetId) {
  const ds = getDatasetConfig(datasetId);
  if (!ds) return null;
  const base =
    DEFAULT_THRESHOLDS_BY_CATEGORY[ds.category] || DEFAULT_THRESHOLDS_BY_CATEGORY.operational;
  return ds.thresholdsOverride ? { ...base, ...ds.thresholdsOverride } : base;
}

function getWeightsFor(datasetId) {
  const ds = getDatasetConfig(datasetId);
  if (!ds) return null;
  const base = DEFAULT_WEIGHTS_BY_CATEGORY[ds.category] || DEFAULT_WEIGHTS_BY_CATEGORY.operational;
  return ds.weightsOverride ? { ...base, ...ds.weightsOverride } : base;
}

function getSourceTrustScore(category) {
  return SOURCE_CATEGORIES[category]?.trustScore ?? 0.5;
}

function getRegistry() {
  return REGISTRY;
}

module.exports = {
  REGISTRY,
  DIMENSIONS,
  LEVELS,
  SOURCE_CATEGORIES,
  CATEGORY_CRITICALITY,
  DEFAULT_THRESHOLDS_BY_CATEGORY,
  DEFAULT_WEIGHTS_BY_CATEGORY,
  getDatasetConfig,
  listRegisteredDatasets,
  getThresholdsFor,
  getWeightsFor,
  getSourceTrustScore,
  getRegistry,
};
