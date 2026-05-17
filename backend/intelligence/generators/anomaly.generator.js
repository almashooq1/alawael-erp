'use strict';

/**
 * anomaly.generator.js — Wave 19 (Intelligence Layer).
 *
 * Detects statistical anomalies in a time-series KPI stream. Uses a
 * rolling Z-score against the recent window (default last 30 points,
 * but the caller may inject any window length). When the latest point
 * is more than `zThreshold` standard deviations from the rolling mean,
 * an Insight fires.
 *
 * Why Z-score and not EWMA / Isolation Forest:
 *   - Z-score is explainable in one sentence — "this value is 3.4σ
 *     above the 30-day mean of X." That maps directly to G1+G2.
 *   - Western Electric rule #1 (one point > 3σ) is a CBAHI-recognised
 *     statistical anomaly signal — auditable.
 *   - Phase 18 ships a separate EWMA / Isolation-Forest layer
 *     (`backend/dashboards/anomaly.service.js`); this layer's job is
 *     the explainable-Insight emission, not the detection algorithm.
 *
 * One Insight per (metricId, branchId) that breaches threshold.
 * Severity scales with how many σ out the breach is.
 *
 * Confidence reflects:
 *   - Window size (more points → higher confidence)
 *   - Stdev quality (very low stdev → suspect signal)
 *   - Recency of data (gaps reduce confidence)
 */

const { defineGenerator, buildPayload, confidenceLevelFromScore } = require('./base');

const GENERATOR_ID = 'anomaly.v1';

// Default detection thresholds (override via ctx.opts).
const DEFAULT_Z_THRESHOLD = 2.5;
const DEFAULT_MIN_WINDOW = 7;
const DEFAULT_MAX_WINDOW = 30;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ─── Stats ──────────────────────────────────────────────────────

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values, mu) {
  if (values.length < 2) return 0;
  const sq = values.reduce((acc, v) => acc + (v - mu) ** 2, 0);
  return Math.sqrt(sq / (values.length - 1));
}

function zScore(value, mu, sigma) {
  if (sigma === 0 || !Number.isFinite(sigma)) return 0;
  return (value - mu) / sigma;
}

// ─── Severity / confidence derivation ──────────────────────────

function severityFromZ(absZ) {
  if (absZ >= 5.0) return 'critical';
  if (absZ >= 4.0) return 'high';
  if (absZ >= 3.0) return 'medium';
  return 'low';
}

function confidenceFromWindow(windowSize, sigma, mu) {
  let score = 0.5;
  const factors = [];

  // More points = more reliable baseline.
  if (windowSize >= 20) {
    score += 0.25;
    factors.push(`نافذة مراقبة كافية (${windowSize} نقطة)`);
  } else if (windowSize >= 10) {
    score += 0.15;
    factors.push(`نافذة مراقبة متوسطة (${windowSize} نقطة)`);
  } else {
    factors.push(`نافذة مراقبة محدودة (${windowSize} نقطة)`);
  }

  // Tight stdev = suspect (might be a measurement issue, not real
  // signal). Very wide stdev relative to mean = noisy series.
  if (sigma === 0) {
    score -= 0.2;
    factors.push('انحراف معياري صفر — قد يكون قياس ثابت');
  } else if (mu !== 0 && Math.abs(sigma / mu) < 0.02) {
    score -= 0.1;
    factors.push('سلسلة شبه ثابتة — احتمال إشارة كاذبة');
  } else {
    score += 0.1;
    factors.push('تباين طبيعي في السلسلة');
  }

  score = Math.max(0.4, Math.min(0.95, score));
  return { score, factors };
}

// ─── Direction labels (Arabic-first) ────────────────────────────

function directionLabel(zSign) {
  return zSign > 0
    ? { ar: 'ارتفاع غير اعتيادي', en: 'unusual spike' }
    : { ar: 'انخفاض غير اعتيادي', en: 'unusual dip' };
}

// ─── Main evaluate() ────────────────────────────────────────────

/**
 * ctx shape:
 *   {
 *     series: Array<{
 *       metricId: string,            // e.g. 'attendance.daily-rate'
 *       metricLabelAr: string,
 *       metricLabelEn: string,
 *       branchId?: ObjectId | null,
 *       branchLabel?: string,
 *       unit?: string,               // e.g. 'percent', 'count', 'SAR'
 *       points: Array<{ at: Date, value: number }>,  // chronological
 *       deepLink?: string,           // override the default
 *       suggestedActions?: Array,
 *       category?: 'clinical'|'financial'|...  // override default
 *     }>,
 *     now?: Date,
 *     opts?: { zThreshold, minWindow, maxWindow, ttlMs }
 *   }
 */
async function evaluate(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const opts = ctx.opts || {};
  const zThreshold = opts.zThreshold || DEFAULT_Z_THRESHOLD;
  const minWindow = opts.minWindow || DEFAULT_MIN_WINDOW;
  const maxWindow = opts.maxWindow || DEFAULT_MAX_WINDOW;
  const ttlMs = opts.ttlMs || DEFAULT_TTL_MS;
  const series = Array.isArray(ctx.series) ? ctx.series : [];
  const payloads = [];

  for (const s of series) {
    try {
      if (!s || !s.metricId || !Array.isArray(s.points) || s.points.length < minWindow + 1) {
        continue;
      }

      const sorted = [...s.points].sort((a, b) => new Date(a.at) - new Date(b.at));
      const latest = sorted[sorted.length - 1];
      const window = sorted.slice(-Math.min(maxWindow, sorted.length) - 1, -1);
      const values = window.map(p => Number(p.value)).filter(v => Number.isFinite(v));

      if (values.length < minWindow) continue;
      if (!Number.isFinite(latest.value)) continue;

      const mu = mean(values);
      const sigma = stdev(values, mu);
      const z = zScore(latest.value, mu, sigma);
      const absZ = Math.abs(z);

      if (absZ < zThreshold) continue;

      const severity = severityFromZ(absZ);
      const { score: confScore, factors: confFactors } = confidenceFromWindow(
        values.length,
        sigma,
        mu
      );
      const dir = directionLabel(z);

      const branchSuffixAr = s.branchLabel ? ` في فرع ${s.branchLabel}` : '';
      const branchSuffixEn = s.branchLabel ? ` at ${s.branchLabel}` : '';
      // Insight schema's supportingFacts.unit enum is fixed
      // (percent, days, hours, count, sar, ratio, score, null). Map
      // common aliases; drop anything else so validation doesn't fail.
      const ALLOWED_UNITS = ['percent', 'days', 'hours', 'count', 'sar', 'ratio', 'score'];
      const rawUnit = s.unit || '';
      const normalizedUnit = ALLOWED_UNITS.includes(rawUnit.toLowerCase())
        ? rawUnit.toLowerCase()
        : null;
      const unit = normalizedUnit || '';

      const supportingFacts = [
        {
          labelAr: 'القيمة الحالية',
          labelEn: 'Current value',
          value: Number(latest.value.toFixed(2)),
          ...(normalizedUnit ? { unit: normalizedUnit } : {}),
        },
        {
          labelAr: `المتوسط (${values.length} نقطة)`,
          labelEn: `Mean (${values.length} pts)`,
          value: Number(mu.toFixed(2)),
          ...(normalizedUnit ? { unit: normalizedUnit } : {}),
        },
        {
          // Z-score has no enum-allowed unit (σ is the conceptual
          // unit but the schema enum is fixed). Omit unit; the label
          // makes it unambiguous.
          labelAr: 'انحراف Z-score',
          labelEn: 'Z-score deviation',
          value: Number(z.toFixed(2)),
        },
      ];

      const bulletsAr = [
        `${dir.ar} لمؤشر "${s.metricLabelAr}"${branchSuffixAr}`,
        `القيمة ${latest.value.toFixed(2)} مقابل متوسط ${mu.toFixed(2)} (${z >= 0 ? '+' : ''}${z.toFixed(2)}σ)`,
      ];
      const bulletsEn = [
        `${dir.en} on "${s.metricLabelEn}"${branchSuffixEn}`,
        `Current ${latest.value.toFixed(2)} vs. mean ${mu.toFixed(2)} (${z >= 0 ? '+' : ''}${z.toFixed(2)}σ)`,
      ];

      const payload = buildPayload(
        {
          id: GENERATOR_ID,
          kind: 'anomaly',
          category: s.category || 'operational',
          scope: s.branchId ? 'branch' : 'platform',
        },
        {
          rawInput: {
            metricId: s.metricId,
            branchId: s.branchId ? String(s.branchId) : null,
            // Round Z to 1 decimal so the same anomaly (within 0.05σ)
            // doesn't re-fire each tick.
            zBucket: Number((Math.round(z * 10) / 10).toFixed(1)),
            // Round latest timestamp to the hour — the goal is dedup
            // within a tick window, not capturing every refresh.
            atHour: new Date(latest.at).toISOString().slice(0, 13),
          },
          titleAr: `${dir.ar}: ${s.metricLabelAr}${branchSuffixAr}`,
          titleEn: `${dir.en}: ${s.metricLabelEn}${branchSuffixEn}`,
          summaryAr: `الـ${s.metricLabelAr} ${dir.ar.includes('ارتفاع') ? 'ارتفع' : 'انخفض'} إلى ${latest.value.toFixed(2)}${unit ? ' ' + unit : ''} مقابل متوسط ${mu.toFixed(2)} على آخر ${values.length} نقاط.`,
          summaryEn: `${s.metricLabelEn} ${dir.en.includes('spike') ? 'rose' : 'dropped'} to ${latest.value.toFixed(2)}${unit ? ' ' + unit : ''} versus a mean of ${mu.toFixed(2)} over the last ${values.length} points.`,
          severity,
          confidence: {
            level: confidenceLevelFromScore(confScore),
            score: confScore,
            factors: confFactors,
          },
          reasoning: { bulletsAr, bulletsEn, supportingFacts },
          branchId: s.branchId || null,
          deepLink:
            s.deepLink ||
            (s.branchId ? `/dashboards/branch/${s.branchId}` : '/dashboards/executive'),
          suggestedActions:
            Array.isArray(s.suggestedActions) && s.suggestedActions.length
              ? s.suggestedActions
              : [
                  {
                    titleAr: 'افتح لوحة المؤشر للتفاصيل',
                    titleEn: 'Open metric dashboard',
                    deepLink: s.deepLink || `/dashboards/branch/${s.branchId || ''}`,
                    estimatedMin: 5,
                    severity: 'should',
                  },
                ],
          relatedEntities: s.branchId ? [{ type: 'Branch', id: String(s.branchId) }] : [],
          sourceDetail: `anomaly.v1: ${s.metricId} z=${z.toFixed(2)}σ`,
          sourceType: 'statistical',
          expiresAt: new Date(now.getTime() + ttlMs),
        }
      );

      payloads.push(payload);
    } catch {
      // A bad series shouldn't break the tick — silently skip.
    }
  }

  return payloads;
}

module.exports = defineGenerator({
  id: GENERATOR_ID,
  kind: 'anomaly',
  category: 'operational',
  scope: 'branch',
  evaluate,
  _internal: {
    mean,
    stdev,
    zScore,
    severityFromZ,
    confidenceFromWindow,
    directionLabel,
  },
});
