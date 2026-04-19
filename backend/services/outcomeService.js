/**
 * outcomeService — pure math over ClinicalAssessment records.
 *
 * Computes clinical-outcome trajectory per beneficiary across time:
 *   • trajectory(records, tool?) — sorted series with deltas
 *   • trendDirection(series)     — improving / steady / declining / insufficient
 *   • compareToBaseline(series)  — {baseline, latest, delta, percentChange}
 *   • milestones(series)         — first-achieved events per interpretation level
 *   • summarizeByTool(records)   — per-tool rollup for dashboard
 *
 * No DB. Callers pass in hydrated records; we return pure JS objects.
 * Same architectural pattern as cpeService and sessionAttendanceService.
 *
 * "Outcome" here = canonical 0–100 normalized score from
 * ClinicalAssessment.score. Raw breakdowns are preserved but the
 * trajectory math uses the normalized score so CARS-2 and VB-MAPP
 * are comparable on one axis. If score is null (non-numeric tool),
 * the record is skipped.
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}
function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

const THRESHOLDS = {
  // Min assessments needed for a trend verdict. Below this → 'insufficient'.
  get minForTrend() {
    return envInt('OUTCOME_MIN_FOR_TREND', 3);
  },
  // Score delta (absolute) below which the trend is called 'steady' rather
  // than improving/declining. 0..100 scale, so 5 = half a standard
  // assessment-retest margin of error for most tools.
  get steadyBand() {
    return envFloat('OUTCOME_STEADY_BAND', 5);
  },
  // Minimum number of days an assessment must be apart from the previous
  // one to count as a new data point for trend math (noise filter).
  get minDaysBetween() {
    return envInt('OUTCOME_MIN_DAYS_BETWEEN', 14);
  },
};

/**
 * Build the trajectory series from raw records.
 *
 * @param {Array}  records  ClinicalAssessment-shaped rows
 * @param {string} [tool]   if set, filter to just that tool
 * @returns {Array} sorted-ascending-by-date array of:
 *   { date, tool, score, rawScore, interpretation, delta, daysSincePrev }
 */
function trajectory(records, tool = null) {
  const filtered = records
    .filter(r => r && r.score != null && r.assessmentDate)
    .filter(r => !tool || r.tool === tool)
    .sort((a, b) => new Date(a.assessmentDate) - new Date(b.assessmentDate));

  const series = [];
  for (let i = 0; i < filtered.length; i++) {
    const r = filtered[i];
    const prev = series[series.length - 1];
    const daysSincePrev = prev
      ? Math.round((new Date(r.assessmentDate) - new Date(prev.date)) / 86400000)
      : null;
    series.push({
      date: new Date(r.assessmentDate),
      tool: r.tool,
      score: Number(r.score),
      rawScore: r.rawScore != null ? Number(r.rawScore) : null,
      interpretation: r.interpretation || null,
      delta: prev ? Math.round((r.score - prev.score) * 10) / 10 : 0,
      daysSincePrev,
    });
  }
  return series;
}

/**
 * Verdict on the overall trend direction.
 *
 * @param {Array} series — from trajectory()
 * @returns {'improving' | 'steady' | 'declining' | 'insufficient'}
 */
function trendDirection(series) {
  if (!series || series.length < THRESHOLDS.minForTrend) return 'insufficient';
  const first = series[0].score;
  const last = series[series.length - 1].score;
  const diff = last - first;
  if (Math.abs(diff) < THRESHOLDS.steadyBand) return 'steady';
  return diff > 0 ? 'improving' : 'declining';
}

/**
 * Compare latest assessment vs first (baseline).
 *
 * @param {Array} series
 * @returns {{baseline, latest, delta, percentChange} | null}
 */
function compareToBaseline(series) {
  if (!series || series.length < 2) return null;
  const baseline = series[0];
  const latest = series[series.length - 1];
  const delta = Math.round((latest.score - baseline.score) * 10) / 10;
  const percentChange =
    baseline.score > 0 ? Math.round((delta / baseline.score) * 1000) / 10 : null;
  return {
    baseline: {
      date: baseline.date,
      score: baseline.score,
      interpretation: baseline.interpretation,
    },
    latest: { date: latest.date, score: latest.score, interpretation: latest.interpretation },
    delta,
    percentChange,
    daysBetween: Math.round((latest.date - baseline.date) / 86400000),
  };
}

/**
 * Extract first-achieved milestones per interpretation rung. Useful for
 * parent-facing reports: "first reached 'within_normal' on 2025-09-03".
 *
 * @param {Array} series
 * @returns {Array<{interpretation, firstAchievedAt, score}>}
 */
function milestones(series) {
  const seen = new Set();
  const out = [];
  for (const p of series) {
    if (!p.interpretation) continue;
    if (seen.has(p.interpretation)) continue;
    seen.add(p.interpretation);
    out.push({
      interpretation: p.interpretation,
      firstAchievedAt: p.date,
      score: p.score,
    });
  }
  return out;
}

/**
 * Per-tool rollup across all records — useful for a cross-beneficiary
 * or per-therapist dashboard.
 *
 * @param {Array} records
 * @returns {object} { [tool]: {count, avgScore, latestScore, trend} }
 */
function summarizeByTool(records) {
  const byTool = {};
  for (const r of records) {
    if (r.score == null) continue;
    const t = r.tool || 'unknown';
    (byTool[t] ||= []).push(r);
  }
  const summary = {};
  for (const [tool, items] of Object.entries(byTool)) {
    const series = trajectory(items);
    const scores = series.map(s => s.score);
    summary[tool] = {
      count: series.length,
      avgScore:
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null,
      latestScore: series.length > 0 ? series[series.length - 1].score : null,
      trend: trendDirection(series),
    };
  }
  return summary;
}

module.exports = {
  THRESHOLDS,
  trajectory,
  trendDirection,
  compareToBaseline,
  milestones,
  summarizeByTool,
};
