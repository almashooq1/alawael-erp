'use strict';

/**
 * trend-deviation.generator.js — Wave 19 (Intelligence Layer).
 *
 * Detects meaningful shifts in a metric's *trend* — distinct from the
 * anomaly generator's single-point Z-score breach. Two flavours:
 *
 *   1. Trend reversal — slope changes sign (was improving, now
 *      worsening — or vice versa) over the comparison window.
 *   2. Trend acceleration — slope magnitude changes by ≥
 *      `accelThreshold` (default 50%) between two equal-length
 *      sub-windows.
 *
 * Why this matters separately from anomaly:
 *   - A single point spike fires anomaly.v1 within hours.
 *   - A slow shift (e.g. attendance dropping 1.5% per week for 4
 *     weeks) never breaches a Z-threshold but tells a story.
 *
 * Slope is computed via simple linear regression (least-squares).
 * That's enough for monotonic detection; not robust to outliers, but
 * the anomaly generator handles those separately.
 *
 * Severity scales with the *magnitude* of the deviation relative to
 * the mean — a 30% slope flip on a 90% baseline reads "high"; the
 * same flip on a 5% baseline reads "low" (noise).
 */

const { defineGenerator, buildPayload, confidenceLevelFromScore } = require('./base');

const GENERATOR_ID = 'trend-deviation.v1';

const DEFAULT_REVERSAL_MIN_SLOPE_RATIO = 0.05; // |Δslope| ÷ |mean| ≥ 5%
const DEFAULT_ACCEL_THRESHOLD = 0.5; // 50% acceleration
const DEFAULT_MIN_POINTS = 8; // need ≥ 8 points to split halves
const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000; // 48h

// ─── Linear regression slope ────────────────────────────────────

function linearSlope(points) {
  // points: Array<{ at: Date, value: number }>
  if (points.length < 2) return 0;
  const n = points.length;
  // Use indices as x — equal spacing is good enough for monotonic
  // detection. Caller pre-sorts.
  const xs = points.map((_, i) => i);
  const ys = points.map(p => Number(p.value)).filter(Number.isFinite);
  if (ys.length < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < ys.length; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return 0;
  return num / den;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Severity / confidence ─────────────────────────────────────

function severityFromMagnitude(deviationRatio) {
  const abs = Math.abs(deviationRatio);
  if (abs >= 0.6) return 'critical';
  if (abs >= 0.3) return 'high';
  if (abs >= 0.15) return 'medium';
  return 'low';
}

function confidenceFromSplit(firstHalfLen, secondHalfLen) {
  let score = 0.5;
  const factors = [];

  const total = firstHalfLen + secondHalfLen;
  if (total >= 24) {
    score += 0.3;
    factors.push(`سلسلة طويلة (${total} نقطة) — اتجاه موثوق`);
  } else if (total >= 12) {
    score += 0.2;
    factors.push(`سلسلة متوسطة (${total} نقطة)`);
  } else {
    factors.push(`سلسلة قصيرة (${total} نقطة) — ثقة محدودة`);
  }

  if (Math.abs(firstHalfLen - secondHalfLen) > 2) {
    score -= 0.1;
    factors.push('عدم تماثل بين نصفي السلسلة');
  } else {
    factors.push('تقسيم متماثل (يدعم المقارنة)');
  }

  score = Math.max(0.4, Math.min(0.95, score));
  return { score, factors };
}

// ─── Direction labels ──────────────────────────────────────────

function reversalLabel(slope1, slope2, betterIsHigher) {
  // betterIsHigher: true if higher metric = good (e.g. attendance %)
  // betterIsHigher: false if lower = good (e.g. complaints count)
  const wasGood = betterIsHigher ? slope1 > 0 : slope1 < 0;
  const isBad = betterIsHigher ? slope2 < 0 : slope2 > 0;

  if (wasGood && isBad) {
    return {
      ar: 'انعكاس اتجاه نحو الأسوأ',
      en: 'reversal — trend worsening',
      kind: 'worsening',
    };
  }
  const wasBad = betterIsHigher ? slope1 < 0 : slope1 > 0;
  const isGood = betterIsHigher ? slope2 > 0 : slope2 < 0;
  if (wasBad && isGood) {
    return {
      ar: 'انعكاس اتجاه نحو التحسّن',
      en: 'reversal — trend improving',
      kind: 'improving',
    };
  }
  return null;
}

function accelLabel(absRatio, slope2, betterIsHigher) {
  const direction =
    slope2 > 0
      ? betterIsHigher
        ? 'تسارع إيجابي'
        : 'تسارع سلبي'
      : betterIsHigher
        ? 'تسارع سلبي'
        : 'تسارع إيجابي';
  return {
    ar: direction,
    en: slope2 > 0 ? 'accelerating upward' : 'accelerating downward',
    ratio: absRatio,
  };
}

// ─── Main evaluate() ──────────────────────────────────────────

/**
 * ctx shape:
 *   {
 *     series: Array<{
 *       metricId: string,
 *       metricLabelAr: string,
 *       metricLabelEn: string,
 *       branchId?: ObjectId | null,
 *       branchLabel?: string,
 *       unit?: string,
 *       points: Array<{ at: Date, value: number }>,
 *       betterIsHigher?: boolean,     // default true
 *       category?: 'clinical'|'financial'|...,
 *       deepLink?: string,
 *     }>,
 *     now?: Date,
 *     opts?: { reversalMinSlopeRatio, accelThreshold, minPoints, ttlMs }
 *   }
 */
async function evaluate(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const opts = ctx.opts || {};
  const reversalMin = opts.reversalMinSlopeRatio || DEFAULT_REVERSAL_MIN_SLOPE_RATIO;
  const accelThreshold = opts.accelThreshold || DEFAULT_ACCEL_THRESHOLD;
  const minPoints = opts.minPoints || DEFAULT_MIN_POINTS;
  const ttlMs = opts.ttlMs || DEFAULT_TTL_MS;
  const series = Array.isArray(ctx.series) ? ctx.series : [];
  const payloads = [];

  for (const s of series) {
    try {
      if (!s || !s.metricId || !Array.isArray(s.points) || s.points.length < minPoints) continue;

      const sorted = [...s.points].sort((a, b) => new Date(a.at) - new Date(b.at));
      const half = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, half);
      const secondHalf = sorted.slice(half);
      if (firstHalf.length < 2 || secondHalf.length < 2) continue;

      const slope1 = linearSlope(firstHalf);
      const slope2 = linearSlope(secondHalf);
      const muOverall = mean(sorted.map(p => Number(p.value)).filter(Number.isFinite));
      const betterIsHigher = s.betterIsHigher !== false;

      // Two detection paths — pick whichever fires (reversal takes
      // priority if both — semantically stronger signal).
      const reversal = reversalLabel(slope1, slope2, betterIsHigher);
      const slopeDiffRatio = Math.abs(muOverall) > 0 ? (slope2 - slope1) / Math.abs(muOverall) : 0;

      let kind = null;
      let dirLabel = null;
      let deviationRatio = 0;

      if (reversal && Math.abs(slopeDiffRatio) >= reversalMin) {
        kind = 'reversal';
        dirLabel = reversal;
        deviationRatio = slopeDiffRatio;
      } else if (
        // Acceleration: same direction but magnitude shift
        Math.sign(slope1) === Math.sign(slope2) &&
        slope1 !== 0 &&
        Math.abs((slope2 - slope1) / slope1) >= accelThreshold
      ) {
        kind = 'acceleration';
        dirLabel = accelLabel(Math.abs((slope2 - slope1) / slope1), slope2, betterIsHigher);
        deviationRatio = (slope2 - slope1) / Math.abs(muOverall || 1);
      } else {
        continue;
      }

      const severity = severityFromMagnitude(deviationRatio);
      const { score: confScore, factors: confFactors } = confidenceFromSplit(
        firstHalf.length,
        secondHalf.length
      );

      const branchSuffixAr = s.branchLabel ? ` (${s.branchLabel})` : '';
      const branchSuffixEn = s.branchLabel ? ` (${s.branchLabel})` : '';

      const supportingFacts = [
        {
          labelAr: 'الميل في النصف الأول',
          labelEn: 'First-half slope',
          value: Number(slope1.toFixed(3)),
        },
        {
          labelAr: 'الميل في النصف الثاني',
          labelEn: 'Second-half slope',
          value: Number(slope2.toFixed(3)),
        },
        {
          labelAr: 'متوسط السلسلة',
          labelEn: 'Series mean',
          value: Number(muOverall.toFixed(2)),
          ...(s.unit ? { unit: s.unit } : {}),
        },
      ];

      const bulletsAr = [
        `${dirLabel.ar} في "${s.metricLabelAr}"${branchSuffixAr}`,
        `الميل تحوّل من ${slope1.toFixed(3)} إلى ${slope2.toFixed(3)} على ${sorted.length} نقطة`,
      ];
      const bulletsEn = [
        `${dirLabel.en} on "${s.metricLabelEn}"${branchSuffixEn}`,
        `Slope shifted from ${slope1.toFixed(3)} to ${slope2.toFixed(3)} over ${sorted.length} points`,
      ];

      const payload = buildPayload(
        {
          id: GENERATOR_ID,
          kind: 'trend-deviation',
          category: s.category || 'operational',
          scope: s.branchId ? 'branch' : 'platform',
        },
        {
          rawInput: {
            metricId: s.metricId,
            branchId: s.branchId ? String(s.branchId) : null,
            kind,
            // Bucket the deviation ratio to 1 decimal so close
            // re-firings dedup.
            ratioBucket: Number(deviationRatio.toFixed(1)),
            windowStart: new Date(sorted[0].at).toISOString().slice(0, 10),
            windowEnd: new Date(sorted[sorted.length - 1].at).toISOString().slice(0, 10),
          },
          titleAr: `${dirLabel.ar}: ${s.metricLabelAr}${branchSuffixAr}`,
          titleEn: `${dirLabel.en}: ${s.metricLabelEn}${branchSuffixEn}`,
          summaryAr: `${dirLabel.ar} في "${s.metricLabelAr}". الميل تحوّل من ${slope1.toFixed(3)} إلى ${slope2.toFixed(3)} عبر ${sorted.length} نقطة.`,
          summaryEn: `${dirLabel.en} in "${s.metricLabelEn}". Slope shifted from ${slope1.toFixed(3)} to ${slope2.toFixed(3)} across ${sorted.length} points.`,
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
          suggestedActions: [
            {
              titleAr: 'افتح اتجاه المؤشر للفحص اليدوي',
              titleEn: 'Open metric trend for manual review',
              deepLink: s.deepLink || `/dashboards/branch/${s.branchId || ''}`,
              estimatedMin: 10,
              severity: 'should',
            },
          ],
          relatedEntities: s.branchId ? [{ type: 'Branch', id: String(s.branchId) }] : [],
          sourceDetail: `trend-deviation.v1: ${kind} (Δslope=${(slope2 - slope1).toFixed(3)})`,
          sourceType: 'statistical',
          expiresAt: new Date(now.getTime() + ttlMs),
        }
      );

      payloads.push(payload);
    } catch {
      // skip broken series
    }
  }

  return payloads;
}

module.exports = defineGenerator({
  id: GENERATOR_ID,
  kind: 'trend-deviation',
  category: 'operational',
  scope: 'branch',
  evaluate,
  _internal: {
    linearSlope,
    severityFromMagnitude,
    confidenceFromSplit,
    reversalLabel,
    accelLabel,
  },
});
