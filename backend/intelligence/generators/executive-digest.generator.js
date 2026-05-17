'use strict';

/**
 * executive-digest.generator.js — Wave 25.
 *
 * Weekly executive digest. Emits ONE high-severity insight on
 * Monday mornings comparing the prior week to the week before
 * across the 6 strategic KPIs.
 *
 * Dedup contract: (generatorId, weekNumber) — exactly one per week.
 *
 * Severity is based on the number of KPIs that worsened materially.
 */

const { defineGenerator, buildPayload, confidenceLevelFromScore } = require('./base');

const GENERATOR_ID = 'executive-digest.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d — overwritten next week

function pctChange(curr, prev) {
  if (typeof curr !== 'number' || typeof prev !== 'number' || prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

function weekNumberOf(date) {
  // ISO-ish week number, sufficient for dedup. Year + week.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * ctx shape:
 *   {
 *     now?: Date,
 *     comparisons: Array<{
 *       kpiId, labelAr, labelEn, unit?,
 *       current: number, previous: number,
 *       betterIsHigher?: boolean,   // default true
 *     }>,
 *   }
 *
 * Returns: at most ONE payload (the weekly digest itself).
 */
async function evaluate(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const comparisons = Array.isArray(ctx.comparisons) ? ctx.comparisons : [];
  if (comparisons.length < 2) return [];

  const enriched = comparisons
    .map(c => {
      const delta = pctChange(c.current, c.previous);
      if (delta === null) return null;
      const betterIsHigher = c.betterIsHigher !== false;
      const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
      // "Worsened" depends on betterIsHigher and direction.
      const worsened =
        (betterIsHigher && direction === 'down') || (!betterIsHigher && direction === 'up');
      return { ...c, delta, direction, worsened };
    })
    .filter(Boolean);

  if (enriched.length === 0) return [];

  // Severity: count KPIs that worsened by ≥ 10%.
  const materialWorsening = enriched.filter(c => c.worsened && Math.abs(c.delta) >= 0.1).length;
  let severity = 'low';
  if (materialWorsening >= 3) severity = 'critical';
  else if (materialWorsening >= 2) severity = 'high';
  else if (materialWorsening >= 1) severity = 'medium';

  const week = weekNumberOf(now);

  const bulletsAr = [
    `${materialWorsening} مؤشر استراتيجي تراجع جوهرياً (≥10%) عن الأسبوع السابق`,
    `${enriched.filter(c => !c.worsened && Math.abs(c.delta) >= 0.1).length} مؤشر تحسّن جوهرياً`,
  ];
  const bulletsEn = [
    `${materialWorsening} strategic KPI(s) materially worsened (≥10%) vs. last week`,
    `${enriched.filter(c => !c.worsened && Math.abs(c.delta) >= 0.1).length} KPI(s) materially improved`,
  ];

  const supportingFacts = enriched.slice(0, 6).map(c => ({
    labelAr: c.labelAr || c.kpiId,
    labelEn: c.labelEn || c.kpiId,
    value: Number(c.current.toFixed(2)),
    previousValue: Number(c.previous.toFixed(2)),
    delta: Number(c.delta.toFixed(3)),
    ...(c.unit ? { unit: c.unit } : {}),
  }));

  const payload = buildPayload(
    { id: GENERATOR_ID, kind: 'executive-digest', category: 'operational', scope: 'platform' },
    {
      rawInput: { week, kpiCount: enriched.length, materialWorsening },
      titleAr: `الملخص التنفيذي الأسبوعي — ${week}`,
      titleEn: `Weekly executive digest — ${week}`,
      summaryAr: `الأسبوع ${week}: ${materialWorsening} مؤشر تراجع جوهرياً، ${enriched.length - materialWorsening} ثبت أو تحسن.`,
      summaryEn: `Week ${week}: ${materialWorsening} KPI(s) worsened materially, ${enriched.length - materialWorsening} stable or improved.`,
      severity,
      confidence: {
        level: confidenceLevelFromScore(0.9),
        score: 0.9,
        factors: ['مقارنة رقمية مباشرة بين أسبوعين', 'مصادر KPI الموثوقة من registry'],
      },
      reasoning: { bulletsAr, bulletsEn, supportingFacts },
      branchId: null,
      deepLink: `/briefings/weekly/${week}`,
      suggestedActions: [
        {
          titleAr: 'افتح الملخص الكامل',
          titleEn: 'Open full digest',
          deepLink: `/briefings/weekly/${week}`,
          estimatedMin: 10,
          severity: 'should',
        },
        {
          titleAr: 'صدّر كملف للمجلس',
          titleEn: 'Export as board pack',
          deepLink: `/briefings/weekly/${week}?export=pdf`,
          estimatedMin: 2,
          severity: 'may',
        },
      ],
      relatedEntities: [],
      sourceDetail: `executive-digest.v1: week=${week} worsened=${materialWorsening}/${enriched.length}`,
      sourceType: 'rule',
      expiresAt: new Date(now.getTime() + TTL_MS),
    }
  );

  return [payload];
}

module.exports = defineGenerator({
  id: GENERATOR_ID,
  kind: 'executive-digest',
  category: 'operational',
  scope: 'platform',
  evaluate,
  _internal: { pctChange, weekNumberOf },
});
