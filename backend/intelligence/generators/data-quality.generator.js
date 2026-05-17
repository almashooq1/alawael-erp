'use strict';

/**
 * data-quality.generator.js — Wave 22 (Intelligence Layer).
 *
 * Emits an Insight for every dataset whose quality dropped below the
 * `warn` or `critical` threshold on any dimension. Severity matches
 * the WORST breached dimension.
 *
 * Dedup contract: (generatorId, datasetId, worstDimension, severityBucket).
 * Same dataset failing on the same dimension with the same severity
 * does not re-fire — the previous insight is still active.
 *
 * Why a generator (vs. inline emit in the service):
 *   • Reuses the orchestrator tick (no separate scheduler).
 *   • Goes through `insightsService.upsertInsight()` → enforces the
 *     5 G-guarantees, dedup, and auto-promote-to-Alert on critical.
 *   • Same feedback surfaces (confirm/dismiss/note) operators already
 *     learned for care-gap / anomaly / trend-deviation.
 */

const { defineGenerator, buildPayload, confidenceLevelFromScore } = require('./base');
const DefaultDQService = require('../data-quality.service');
const DefaultDQRegistry = require('../data-quality.registry');

const GENERATOR_ID = 'data-quality.v1';
const TTL_MS = 6 * 60 * 60 * 1000; // 6h — quality issues should re-fire after that

const DIMENSION_LABELS = Object.freeze({
  freshness: {
    ar: 'حداثة البيانات',
    en: 'Freshness',
    actionAr: 'افحص خط الإدخال',
    actionEn: 'Inspect ingest pipeline',
  },
  timeliness: {
    ar: 'الالتزام بـ SLA',
    en: 'Timeliness',
    actionAr: 'افتح لوحة SLA',
    actionEn: 'Open SLA dashboard',
  },
  completeness: {
    ar: 'اكتمال البيانات',
    en: 'Completeness',
    actionAr: 'جدول backfill',
    actionEn: 'Schedule backfill',
  },
  validity: {
    ar: 'صلاحية البيانات',
    en: 'Validity',
    actionAr: 'راجع مخالفات القواعد',
    actionEn: 'Review rule violations',
  },
  consistency: {
    ar: 'اتساق المصادر',
    en: 'Consistency',
    actionAr: 'اعد توفيق المصادر',
    actionEn: 'Reconcile sources',
  },
  uniqueness: {
    ar: 'تكرار السجلات',
    en: 'Uniqueness',
    actionAr: 'شغل dedup',
    actionEn: 'Run dedup job',
  },
  source: {
    ar: 'موثوقية المصدر',
    en: 'Source trust',
    actionAr: 'تحقق من المصدر',
    actionEn: 'Re-validate source',
  },
  aiConfidence: {
    ar: 'ثقة النموذج',
    en: 'AI confidence',
    actionAr: 'أعد تشغيل النموذج',
    actionEn: 'Re-run model',
  },
});

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Pick the worst breach from the breaches[] array.
 * Returns { dimension, severity, score } or null if no breaches.
 */
function pickWorstBreach(breaches) {
  if (!Array.isArray(breaches) || breaches.length === 0) return null;
  let worst = breaches[0];
  for (let i = 1; i < breaches.length; i++) {
    const r1 = SEVERITY_RANK[breaches[i].severity] || 0;
    const r2 = SEVERITY_RANK[worst.severity] || 0;
    if (r1 > r2 || (r1 === r2 && breaches[i].score < worst.score)) {
      worst = breaches[i];
    }
  }
  return worst;
}

/**
 * Map a breach severity to the Insight schema's severity enum
 * (which uses `low/medium/high/critical`). Categories influence
 * escalation — finance & compliance & clinical bump from medium
 * to high to enforce the governing rule "no sensitive KPI without
 * quality status".
 */
function elevateForCategory(severity, category) {
  const STICKY_CATEGORIES = new Set(['clinical', 'financial', 'compliance']);
  if (severity === 'medium' && STICKY_CATEGORIES.has(category)) return 'high';
  return severity;
}

/**
 * Pretty-print a dimension's value, with a localized unit fragment.
 */
function dimValueLabel(dim, value) {
  if (typeof value !== 'number') return 'N/A';
  return value.toFixed(2);
}

// ─── Main evaluate() ────────────────────────────────────────────

/**
 * ctx shape:
 *   {
 *     snapshots: Array<{
 *       datasetId, branchId?, lastRefreshAt, arrivalLatencyMs,
 *       sampleSize, presentCount, ruleViolations,
 *       crossSourceDelta, duplicates, sources, aiConfidenceScore
 *     }>,
 *     now?: Date,
 *     dqService?: createDataQualityService(...)  // injectable
 *   }
 */
async function evaluate(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const dqService =
    ctx.dqService ||
    DefaultDQService.createDataQualityService({
      registry: DefaultDQRegistry,
      now: () => now,
    });

  const snapshots = Array.isArray(ctx.snapshots) ? ctx.snapshots : [];
  const payloads = [];

  for (const snap of snapshots) {
    try {
      const quality = dqService.computeQuality(snap);
      if (!quality.ok) continue;
      if (!quality.breaches || quality.breaches.length === 0) continue;

      const worst = pickWorstBreach(quality.breaches);
      const severity = elevateForCategory(worst.severity, quality.category);

      const dimLabel = DIMENSION_LABELS[worst.dimension] || {
        ar: worst.dimension,
        en: worst.dimension,
        actionAr: 'افحص',
        actionEn: 'Inspect',
      };

      // Reasoning bullets — at least 2 (G1). First is the worst dim,
      // second summarises all breaches, others add per-dim context.
      const bulletsAr = [
        `${dimLabel.ar} أدنى من الحد المسموح (${dimValueLabel(worst.dimension, worst.score)})`,
        `${quality.breaches.length} بُعد(أبعاد) متأثرة في ${snap.datasetId}`,
      ];
      const bulletsEn = [
        `${dimLabel.en} below threshold (${dimValueLabel(worst.dimension, worst.score)})`,
        `${quality.breaches.length} dimension${quality.breaches.length === 1 ? '' : 's'} affected on ${snap.datasetId}`,
      ];

      // Supporting facts — one per breached dimension + composite
      const supportingFacts = [
        {
          labelAr: 'الدرجة الإجمالية',
          labelEn: 'Composite score',
          value: Number(quality.composite.toFixed(2)),
          unit: 'score',
        },
        ...quality.breaches.map(b => ({
          labelAr: DIMENSION_LABELS[b.dimension]?.ar || b.dimension,
          labelEn: DIMENSION_LABELS[b.dimension]?.en || b.dimension,
          value: Number(b.score.toFixed(2)),
          unit: 'score',
        })),
      ];

      // Confidence is HIGH for DQ insights — they're rule-based with
      // numeric thresholds, not statistical guesses. The factors
      // explain *why* we're confident: it's deterministic.
      const confScore = 0.9;
      const confFactors = [
        'إشارة قاعدة محددة (deterministic) لا تخمين',
        `كسرت ${quality.breaches.length} عتبة(عتبات) محددة سلفاً`,
      ];

      const payload = buildPayload(
        { id: GENERATOR_ID, kind: 'workflow-delay', category: 'quality', scope: 'platform' },
        {
          rawInput: {
            datasetId: snap.datasetId,
            worstDimension: worst.dimension,
            // Severity bucket only — score variations within the same
            // severity should dedup so we don't spam the same issue.
            severityBucket: severity,
            branchId: snap.branchId ? String(snap.branchId) : null,
          },
          titleAr: `جودة البيانات: ${dimLabel.ar} منخفضة على ${snap.datasetId}`,
          titleEn: `Data quality: ${dimLabel.en} low on ${snap.datasetId}`,
          summaryAr: `${dimLabel.ar} انخفضت إلى ${dimValueLabel(worst.dimension, worst.score)} (الحد ${worst.threshold.toFixed(2)}). ${quality.breaches.length} بُعد(أبعاد) متأثرة. الدرجة الإجمالية ${quality.composite.toFixed(2)} (${quality.level}).`,
          summaryEn: `${dimLabel.en} dropped to ${dimValueLabel(worst.dimension, worst.score)} (threshold ${worst.threshold.toFixed(2)}). ${quality.breaches.length} dimension${quality.breaches.length === 1 ? '' : 's'} affected. Composite ${quality.composite.toFixed(2)} (${quality.level}).`,
          severity,
          confidence: {
            level: confidenceLevelFromScore(confScore),
            score: confScore,
            factors: confFactors,
          },
          reasoning: { bulletsAr, bulletsEn, supportingFacts },
          branchId: snap.branchId || null,
          deepLink: `/admin/data-quality/${encodeURIComponent(snap.datasetId)}`,
          suggestedActions: quality.breaches.map(b => {
            const lbl = DIMENSION_LABELS[b.dimension] || {
              actionAr: 'افحص',
              actionEn: 'Inspect',
            };
            return {
              titleAr: lbl.actionAr,
              titleEn: lbl.actionEn,
              deepLink: `/admin/data-quality/${encodeURIComponent(snap.datasetId)}#${b.dimension}`,
              estimatedMin: b.severity === 'critical' ? 30 : 15,
              severity: b.severity === 'critical' ? 'must' : 'should',
            };
          }),
          relatedEntities: [{ type: 'Dataset', id: snap.datasetId }],
          sourceDetail: `data-quality.v1: ${worst.dimension}=${worst.score.toFixed(2)} on ${snap.datasetId}`,
          sourceType: 'rule',
          expiresAt: new Date(now.getTime() + TTL_MS),
        }
      );

      payloads.push(payload);
    } catch {
      // Skip the bad snapshot; orchestrator metrics will record the
      // generator-level error.
    }
  }

  return payloads;
}

module.exports = defineGenerator({
  id: GENERATOR_ID,
  kind: 'workflow-delay', // closest existing kind; DQ issues block work
  category: 'quality',
  scope: 'platform',
  evaluate,
  _internal: {
    pickWorstBreach,
    elevateForCategory,
    DIMENSION_LABELS,
  },
});
