'use strict';

/**
 * care/retention.registry.js — Phase 17 Commit 8 (4.0.90).
 *
 * Vocabulary + risk-factor catalog + intervention catalog for the
 * churn/retention layer. Builds on top of the Beneficiary-360
 * healthScore (C7) — retention risk is NOT healthScore; it's an
 * actionable view focused on "who's slipping away" that adds
 * retention-specific signals (no recent home visit, declining
 * IADL trend, participation drop, stale critical flags).
 *
 * No state machine here — RetentionAssessment is immutable
 * snapshot-style (each run creates a new document).
 */

// ── Risk bands ──────────────────────────────────────────────────────

const RISK_BANDS = Object.freeze([
  { code: 'low', minScore: 0, maxScore: 24, color: 'green' },
  { code: 'moderate', minScore: 25, maxScore: 49, color: 'yellow' },
  { code: 'high', minScore: 50, maxScore: 74, color: 'orange' },
  { code: 'imminent', minScore: 75, maxScore: 100, color: 'red' },
]);

const RISK_BAND_CODES = Object.freeze(RISK_BANDS.map(b => b.code));

// ── Risk factor catalog ─────────────────────────────────────────────
/**
 * Each factor has:
 *   code              — stable identifier for drift tests
 *   weight            — points added when factor triggers
 *   labelEn / labelAr
 *   description       — when it triggers
 */
const RISK_FACTORS = Object.freeze({
  no_recent_home_visit: {
    code: 'no_recent_home_visit',
    weight: 15,
    labelEn: 'No home visit in 60+ days (active case)',
    labelAr: 'لم تتم زيارة منزلية خلال 60 يومًا (حالة نشطة)',
  },
  iadl_declining: {
    code: 'iadl_declining',
    weight: 10,
    labelEn: 'IADL trend declining (last < prior)',
    labelAr: 'تراجع في مقياس IADL',
  },
  participation_dropped: {
    code: 'participation_dropped',
    weight: 10,
    labelEn: 'Participation dropped > 50% vs prior window',
    labelAr: 'تراجع المشاركة المجتمعية بأكثر من 50%',
  },
  stale_critical_flag: {
    code: 'stale_critical_flag',
    weight: 20,
    labelEn: 'Critical risk flag open for 7+ days',
    labelAr: 'تنبيه مخاطر حرج مفتوح لأكثر من 7 أيام',
  },
  safety_plan_overdue: {
    code: 'safety_plan_overdue',
    weight: 10,
    labelEn: 'Safety plan review overdue',
    labelAr: 'مراجعة خطة السلامة متأخرة',
  },
  welfare_stuck_info_requested: {
    code: 'welfare_stuck_info_requested',
    weight: 15,
    labelEn: 'Welfare application stuck in info_requested > 14 days',
    labelAr: 'طلب خدمات متوقف بانتظار معلومات لأكثر من 14 يومًا',
  },
  welfare_all_rejected_recent: {
    code: 'welfare_all_rejected_recent',
    weight: 10,
    labelEn: 'All welfare applications in last 6 months were rejected',
    labelAr: 'رفض جميع الطلبات في آخر 6 أشهر',
  },
  isolation_no_linkages: {
    code: 'isolation_no_linkages',
    weight: 10,
    labelEn: 'No active community linkages',
    labelAr: 'لا توجد روابط مجتمعية نشطة',
  },
  upcoming_home_visit: {
    code: 'upcoming_home_visit',
    weight: -10, // mitigating — reduces risk
    labelEn: 'Upcoming scheduled home visit',
    labelAr: 'زيارة منزلية قادمة',
  },
  active_mdt: {
    code: 'active_mdt',
    weight: -10, // mitigating
    labelEn: 'Active MDT in coordination',
    labelAr: 'اجتماع فريق متعدد التخصصات نشط',
  },
});

const RISK_FACTOR_CODES = Object.freeze(Object.keys(RISK_FACTORS));

// ── Intervention catalog ───────────────────────────────────────────
/**
 * Each band has a default auto-intervention recipe. The retention
 * service consults this when auto-triggering interventions.
 */
const INTERVENTION_TYPES = Object.freeze([
  'raise_psych_flag', // auto-raise a neglect_risk flag
  'flag_case_high_risk', // socialCase.flagHighRisk
  'schedule_mdt', // psych.scheduleMdt
  'request_home_visit', // notify caseworker via event
  'notify_retention_manager', // alert
  'track_only', // no action, just log
]);

const BAND_INTERVENTION_MATRIX = Object.freeze({
  low: ['track_only'],
  moderate: ['notify_retention_manager'],
  high: ['request_home_visit', 'notify_retention_manager'],
  imminent: ['raise_psych_flag', 'flag_case_high_risk', 'schedule_mdt', 'notify_retention_manager'],
});

// ── Trend direction ─────────────────────────────────────────────────

const TREND_DIRECTIONS = Object.freeze(['improving', 'stable', 'worsening', 'unknown']);

// ── Thresholds ──────────────────────────────────────────────────────

const THRESHOLDS = Object.freeze({
  STALE_CRITICAL_FLAG_DAYS: 7,
  WELFARE_INFO_REQUESTED_DAYS: 14,
  HOME_VISIT_WINDOW_DAYS: 60,
  WELFARE_RECENT_WINDOW_DAYS: 180,
  PARTICIPATION_DROP_RATIO: 0.5,
  TREND_IMPROVING_DELTA: 5, // score delta to count as improving
});

// ── Helpers ─────────────────────────────────────────────────────────

function bandForScore(score) {
  const band = RISK_BANDS.find(b => score >= b.minScore && score <= b.maxScore);
  return band ? band.code : 'low';
}

function trendFor(prev, curr) {
  if (prev == null) return 'unknown';
  const delta = curr - prev;
  if (delta <= -THRESHOLDS.TREND_IMPROVING_DELTA) return 'improving'; // score dropped = risk dropped
  if (delta >= THRESHOLDS.TREND_IMPROVING_DELTA) return 'worsening';
  return 'stable';
}

function interventionsForBand(band) {
  return [...(BAND_INTERVENTION_MATRIX[band] || [])];
}

function getFactor(code) {
  return RISK_FACTORS[code] || null;
}

// ── Validate ────────────────────────────────────────────────────────

function validate() {
  // Bands cover 0..100 contiguously
  let cursor = 0;
  for (const b of RISK_BANDS) {
    if (b.minScore !== cursor) {
      throw new Error(
        `retention registry: band '${b.code}' starts at ${b.minScore}, expected ${cursor}`
      );
    }
    cursor = b.maxScore + 1;
  }
  if (cursor - 1 !== 100) {
    throw new Error(`retention registry: bands don't reach 100 (stopped at ${cursor - 1})`);
  }
  // Each factor has required fields
  for (const [code, f] of Object.entries(RISK_FACTORS)) {
    if (!f.code || f.code !== code) {
      throw new Error(`retention registry: factor '${code}' missing or mismatched code`);
    }
    if (typeof f.weight !== 'number') {
      throw new Error(`retention registry: factor '${code}' missing numeric weight`);
    }
    if (!f.labelEn || !f.labelAr) {
      throw new Error(`retention registry: factor '${code}' missing labels`);
    }
  }
  // Band intervention matrix covers every band
  for (const b of RISK_BAND_CODES) {
    if (!BAND_INTERVENTION_MATRIX[b]) {
      throw new Error(`retention registry: band '${b}' missing intervention recipe`);
    }
    for (const t of BAND_INTERVENTION_MATRIX[b]) {
      if (!INTERVENTION_TYPES.includes(t)) {
        throw new Error(`retention registry: unknown intervention '${t}' for band '${b}'`);
      }
    }
  }
  return true;
}

module.exports = {
  RISK_BANDS,
  RISK_BAND_CODES,
  RISK_FACTORS,
  RISK_FACTOR_CODES,
  INTERVENTION_TYPES,
  BAND_INTERVENTION_MATRIX,
  TREND_DIRECTIONS,
  THRESHOLDS,
  bandForScore,
  trendFor,
  interventionsForBand,
  getFactor,
  validate,
};
