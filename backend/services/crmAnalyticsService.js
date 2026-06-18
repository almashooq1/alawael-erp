/**
 * crmAnalyticsService — lightweight CRM analytics surface for KPI resolution.
 */

'use strict';

function bucket(score) {
  if (!Number.isFinite(Number(score))) return null;
  const s = Number(score);
  if (s <= 6) return 'detractor';
  if (s <= 8) return 'passive';
  return 'promoter';
}

function buildSatisfactionSummary(records = []) {
  const valid = records.filter(r => r && Number.isFinite(Number(r.score)));
  const counts = { detractor: 0, passive: 0, promoter: 0 };
  for (const r of valid) {
    const b = bucket(r.score);
    if (b) counts[b] += 1;
  }
  const total = valid.length;
  const detractorPct = total > 0 ? (counts.detractor / total) * 100 : 0;
  const promoterPct = total > 0 ? (counts.promoter / total) * 100 : 0;
  return {
    nps: {
      score: total > 0 ? Math.round((promoterPct - detractorPct) * 10) / 10 : null,
      sample: total,
      detractors: counts.detractor,
      passives: counts.passive,
      promoters: counts.promoter,
    },
    csat: {
      score:
        total > 0
          ? Math.round((valid.reduce((sum, r) => sum + Number(r.score), 0) / total) * 10) / 10
          : null,
      sample: total,
    },
  };
}

module.exports = {
  buildSatisfactionSummary,
};
