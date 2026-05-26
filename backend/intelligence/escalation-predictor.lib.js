'use strict';

/**
 * escalation-predictor.lib.js — Wave 433 (Phase D2 — Behavioral Intelligence).
 *
 * Pure scoring library that converts a series of BehaviorIncident records
 * (the W29 ABC log) into an escalation-risk score in [0, 100] aligned
 * with the W286 risk orchestrator's 0..100 source scale.
 *
 * Pairs with:
 *   - models/BehaviorIncident.js — produces the input series
 *   - W286 risk/orchestrator.js  — consumes the score via the
 *     `behavioral_escalation` source slot (see sibling source plugin)
 *   - W431 SmartInboxRanker      — beneficiaries with escalation risk
 *                                   flow into the supervisor inbox
 *
 * Why a separate library (per the repeated W429/W431/W432 pattern):
 *   • Pure math = drift-guard friendly, no DB / mongoose / app boot
 *   • Re-usable across producers (risk orchestrator source, ad-hoc
 *     admin query, future "did this beneficiary escalate?" retro)
 *   • Explainable signals[] so the supervisor UI can render "why this
 *     was flagged" without a second service call
 *
 * Factors weighted (max 100):
 *   recent-window frequency           30  (count last 7 days)
 *   week-over-week trend acceleration 20  (recent / prior - 1)
 *   severity skew toward major        20  (% of recent that are 'major')
 *   recency (time since last)         10  (logarithmic decay, ≤24h max)
 *   ABC pattern repetition            10  (same antecedent ≥3× → trigger
 *                                          identified — clinical signal)
 *   self-injury / aggression presence 10  (high-acuity behavior types)
 *
 * Tier mapping aligned with W286 orchestrator registry thresholds:
 *   ≥75 → critical, 50-74 → high, 25-49 → moderate, <25 → low.
 *
 * Caveats:
 *   • Empty series → {score: 0, ok: true} (NOT null — absence of incidents
 *     is meaningful information, distinct from "no model could run").
 *   • All inputs lenient: each incident only needs observedAt + behaviorType.
 *     Severity / antecedent / consequence treated as optional.
 *   • Time windows are CONFIGURABLE via opts.recentDays (default 7) +
 *     opts.priorDays (default 14, comparison window = days 8..21).
 */

const RECENT_WINDOW_DAYS_DEFAULT = 7;
const PRIOR_WINDOW_DAYS_DEFAULT = 14;
const RECENCY_SATURATION_HOURS = 24;
const HIGH_ACUITY_TYPES = new Set(['self_injury', 'aggression']);

const TIER_THRESHOLDS = Object.freeze({
  critical: 75,
  high: 50,
  moderate: 25,
  low: 0,
});

const FACTOR_MAX = Object.freeze({
  frequency: 30,
  trend: 20,
  severitySkew: 20,
  recency: 10,
  abcRepetition: 10,
  highAcuity: 10,
});

/**
 * Map a numeric 0..100 score to a tier label aligned with the W286
 * risk orchestrator registry.
 *
 * @param {number} score
 * @returns {'critical'|'high'|'moderate'|'low'|null}
 */
function tierFromScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  if (score >= TIER_THRESHOLDS.critical) return 'critical';
  if (score >= TIER_THRESHOLDS.high) return 'high';
  if (score >= TIER_THRESHOLDS.moderate) return 'moderate';
  return 'low';
}

/**
 * Logarithmic recency factor — fresher incidents score higher.
 * 0h since last → 1.0, 24h+ → 0.0 (clamped).
 *
 * @param {number} hoursSinceLast
 * @returns {number} ∈ [0, 1]
 */
function _recencyFactor(hoursSinceLast) {
  if (!Number.isFinite(hoursSinceLast) || hoursSinceLast < 0) return 0;
  if (hoursSinceLast === 0) return 1;
  if (hoursSinceLast >= RECENCY_SATURATION_HOURS) return 0;
  // log decay: 1 at 0h, ~0 at 24h
  const v = 1 - Math.log(1 + hoursSinceLast) / Math.log(1 + RECENCY_SATURATION_HOURS);
  return Math.max(0, Math.min(1, v));
}

/**
 * Frequency-contribution factor in [0, 1]. ≥5 incidents in the recent
 * window → 1.0. Linear scaling below.
 */
function _frequencyFactor(recentCount) {
  if (!Number.isFinite(recentCount) || recentCount <= 0) return 0;
  return Math.min(1, recentCount / 5);
}

/**
 * Week-over-week trend acceleration factor in [0, 1].
 * recent/prior - 1 normalized into [0, 1]:
 *   recent=prior         → 0     (no change)
 *   recent=2×prior       → 0.5
 *   recent=3×+prior      → 1.0   (saturates)
 * If prior=0 + recent>0, returns 1.0 (escalation from a quiet baseline).
 */
function _trendFactor(recentCount, priorCount) {
  if (recentCount <= 0) return 0;
  if (priorCount <= 0) return 1; // emergence from quiet baseline
  const ratio = recentCount / priorCount;
  if (ratio <= 1) return 0; // not increasing
  return Math.min(1, (ratio - 1) / 2); // ratio of 3 → 1.0
}

/**
 * Severity-skew factor: fraction of recent incidents flagged 'major'.
 * Direct mapping [0, 1].
 */
function _severitySkewFactor(recentIncidents) {
  if (!Array.isArray(recentIncidents) || recentIncidents.length === 0) return 0;
  const majorCount = recentIncidents.filter(i => i.severity === 'major').length;
  return Math.min(1, majorCount / recentIncidents.length);
}

/**
 * ABC repetition factor: if the same antecedent string appears ≥3 times
 * in recent incidents, return 1.0 (a predictable trigger is identified —
 * clinical action signal). Case + whitespace normalized.
 */
function _abcRepetitionFactor(recentIncidents) {
  if (!Array.isArray(recentIncidents) || recentIncidents.length < 3) return 0;
  const counts = new Map();
  for (const inc of recentIncidents) {
    const key = String(inc.antecedent || '')
      .trim()
      .toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = 0;
  for (const c of counts.values()) if (c > best) best = c;
  if (best >= 3) return 1;
  if (best >= 2) return 0.5;
  return 0;
}

/**
 * High-acuity presence: any recent incident with behaviorType in
 * HIGH_ACUITY_TYPES (self_injury, aggression) → 1.0. Major-severity
 * high-acuity → also 1.0 (caller already captured in severitySkew).
 */
function _highAcuityFactor(recentIncidents) {
  if (!Array.isArray(recentIncidents) || recentIncidents.length === 0) return 0;
  for (const inc of recentIncidents) {
    if (HIGH_ACUITY_TYPES.has(inc.behaviorType)) return 1;
  }
  return 0;
}

/**
 * Slice the incident series into recent (last N days) + prior (days
 * N+1..N+M before now).
 */
function _splitByWindow(incidents, now, recentDays, priorDays) {
  const nowMs = now.getTime();
  const recentCutoff = nowMs - recentDays * 86400_000;
  const priorCutoff = nowMs - (recentDays + priorDays) * 86400_000;
  const recent = [];
  const prior = [];
  for (const inc of incidents) {
    if (!inc || !inc.observedAt) continue;
    const t = new Date(inc.observedAt).getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= recentCutoff && t <= nowMs) recent.push(inc);
    else if (t >= priorCutoff && t < recentCutoff) prior.push(inc);
  }
  return { recent, prior };
}

/**
 * Score a BehaviorIncident series for escalation risk.
 *
 * @param {Array<Object>} incidents — { observedAt, behaviorType, severity?, antecedent?, … }
 * @param {Object} [opts]
 *   @param {Date}   [opts.now]            — reference time (default new Date())
 *   @param {number} [opts.recentDays=7]   — recent window length
 *   @param {number} [opts.priorDays=14]   — prior-comparison window length
 * @returns {{score, tier, signals, breakdown, ok, recentCount, priorCount}}
 */
function predict(incidents = [], opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const recentDays = opts.recentDays || RECENT_WINDOW_DAYS_DEFAULT;
  const priorDays = opts.priorDays || PRIOR_WINDOW_DAYS_DEFAULT;

  if (!Array.isArray(incidents)) {
    return {
      ok: false,
      reason: 'INVALID_INPUT',
      score: 0,
      tier: 'low',
      signals: [],
      breakdown: {},
    };
  }

  const { recent, prior } = _splitByWindow(incidents, now, recentDays, priorDays);
  const recentCount = recent.length;
  const priorCount = prior.length;

  // Time since the most recent incident (in hours).
  let hoursSinceLast = Infinity;
  if (recent.length > 0 || incidents.length > 0) {
    const all = recent.length > 0 ? recent : incidents;
    let mostRecent = 0;
    for (const inc of all) {
      const t = new Date(inc.observedAt).getTime();
      if (Number.isFinite(t) && t > mostRecent) mostRecent = t;
    }
    if (mostRecent > 0) {
      hoursSinceLast = Math.max(0, (now.getTime() - mostRecent) / (1000 * 60 * 60));
    }
  }

  const freq = _frequencyFactor(recentCount);
  const trend = _trendFactor(recentCount, priorCount);
  const severitySkew = _severitySkewFactor(recent);
  const recency = _recencyFactor(hoursSinceLast);
  const abcRep = _abcRepetitionFactor(recent);
  const highAcuity = _highAcuityFactor(recent);

  const score = Math.round(
    freq * FACTOR_MAX.frequency +
      trend * FACTOR_MAX.trend +
      severitySkew * FACTOR_MAX.severitySkew +
      recency * FACTOR_MAX.recency +
      abcRep * FACTOR_MAX.abcRepetition +
      highAcuity * FACTOR_MAX.highAcuity
  );
  const clamped = Math.max(0, Math.min(100, score));

  const signals = [];
  if (freq > 0) {
    signals.push({
      name: 'frequency',
      weight: FACTOR_MAX.frequency,
      evidence: `recentCount=${recentCount} in last ${recentDays}d → factor=${freq.toFixed(2)}`,
    });
  }
  if (trend > 0) {
    signals.push({
      name: 'weekOverWeekTrend',
      weight: FACTOR_MAX.trend,
      evidence: `recent=${recentCount} vs prior=${priorCount} → factor=${trend.toFixed(2)}`,
    });
  }
  if (severitySkew > 0) {
    signals.push({
      name: 'severitySkew',
      weight: FACTOR_MAX.severitySkew,
      evidence: `% major in recent window → factor=${severitySkew.toFixed(2)}`,
    });
  }
  if (recency > 0) {
    signals.push({
      name: 'recency',
      weight: FACTOR_MAX.recency,
      evidence: `hoursSinceLast=${hoursSinceLast === Infinity ? '∞' : hoursSinceLast.toFixed(1)} → factor=${recency.toFixed(2)} (log decay @${RECENCY_SATURATION_HOURS}h)`,
    });
  }
  if (abcRep > 0) {
    signals.push({
      name: 'abcRepetition',
      weight: FACTOR_MAX.abcRepetition,
      evidence: `repeated antecedent identified → factor=${abcRep.toFixed(2)} (clinical action signal)`,
    });
  }
  if (highAcuity > 0) {
    signals.push({
      name: 'highAcuityType',
      weight: FACTOR_MAX.highAcuity,
      evidence: 'recent self_injury or aggression event',
    });
  }

  return {
    ok: true,
    score: clamped,
    tier: tierFromScore(clamped),
    signals,
    breakdown: { freq, trend, severitySkew, recency, abcRep, highAcuity },
    recentCount,
    priorCount,
  };
}

module.exports = {
  predict,
  tierFromScore,
  TIER_THRESHOLDS,
  FACTOR_MAX,
  HIGH_ACUITY_TYPES,
  RECENCY_SATURATION_HOURS,
  RECENT_WINDOW_DAYS_DEFAULT,
  PRIOR_WINDOW_DAYS_DEFAULT,
  // Internal helpers exported for targeted unit tests
  _recencyFactor,
  _frequencyFactor,
  _trendFactor,
  _severitySkewFactor,
  _abcRepetitionFactor,
  _highAcuityFactor,
  _splitByWindow,
};
