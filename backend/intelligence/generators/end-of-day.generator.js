'use strict';

/**
 * end-of-day.generator.js — Wave 25.
 *
 * Emits a single Insight per role × branch summarizing the day:
 *   • What was achieved (resolved alerts, confirmed insights, completed sessions)
 *   • What was deferred (snoozed alerts, open follow-ups)
 *   • What still needs sign-off
 *
 * Fires once daily at 16:30 KSA via the orchestrator. Dedup contract
 * uses date+role+branch so the same role/branch gets exactly one EOD
 * per day.
 */

const { defineGenerator, buildPayload, confidenceLevelFromScore } = require('./base');

const GENERATOR_ID = 'end-of-day.v1';
const TTL_MS = 18 * 60 * 60 * 1000; // 18h — covers overnight and into next morning

/**
 * ctx shape:
 *   {
 *     now?: Date,
 *     summaries: Array<{
 *       roleGroup, branchId?,
 *       resolvedCount, snoozedCount, openFollowUpCount,
 *       pendingApprovalCount,
 *       achievementsAr|En?, deferredAr|En?,
 *     }>,
 *   }
 */
async function evaluate(ctx = {}) {
  const now = ctx.now instanceof Date ? ctx.now : new Date();
  const summaries = Array.isArray(ctx.summaries) ? ctx.summaries : [];
  const payloads = [];

  for (const s of summaries) {
    try {
      if (!s || !s.roleGroup) continue;
      const total =
        (s.resolvedCount || 0) +
        (s.snoozedCount || 0) +
        (s.openFollowUpCount || 0) +
        (s.pendingApprovalCount || 0);
      if (total === 0) continue; // quiet day → no EOD

      const dateLabel = now.toISOString().slice(0, 10);
      // Severity scales with what's still open at end-of-day.
      const openWork = (s.openFollowUpCount || 0) + (s.pendingApprovalCount || 0);
      let severity = 'low';
      if (openWork >= 10) severity = 'high';
      else if (openWork >= 5) severity = 'medium';

      const bulletsAr = [
        `أُغلق ${s.resolvedCount || 0} تنبيه وتُؤجِّل ${s.snoozedCount || 0}`,
        `يتبقى ${s.openFollowUpCount || 0} متابعة و${s.pendingApprovalCount || 0} اعتماد قبل المغادرة`,
      ];
      const bulletsEn = [
        `${s.resolvedCount || 0} alerts resolved · ${s.snoozedCount || 0} snoozed`,
        `${s.openFollowUpCount || 0} follow-ups + ${s.pendingApprovalCount || 0} approvals still open`,
      ];
      if (s.achievementsAr) bulletsAr.push(`أبرز الإنجازات: ${s.achievementsAr}`);
      if (s.achievementsEn) bulletsEn.push(`Highlights: ${s.achievementsEn}`);

      const supportingFacts = [
        {
          labelAr: 'تنبيهات مُغلقة',
          labelEn: 'Resolved alerts',
          value: s.resolvedCount || 0,
          unit: 'count',
        },
        {
          labelAr: 'تنبيهات مؤجّلة',
          labelEn: 'Snoozed alerts',
          value: s.snoozedCount || 0,
          unit: 'count',
        },
        {
          labelAr: 'متابعات مفتوحة',
          labelEn: 'Open follow-ups',
          value: s.openFollowUpCount || 0,
          unit: 'count',
        },
        {
          labelAr: 'بانتظار الاعتماد',
          labelEn: 'Pending approvals',
          value: s.pendingApprovalCount || 0,
          unit: 'count',
        },
      ];

      const confScore = 0.9; // deterministic aggregation
      const confFactors = [
        'تجميع رقمي مباشر (deterministic)',
        `مصادر متعددة (تنبيهات + متابعات + اعتمادات)`,
      ];

      const payload = buildPayload(
        {
          id: GENERATOR_ID,
          kind: 'executive-digest',
          category: 'operational',
          scope: s.branchId ? 'branch' : 'platform',
        },
        {
          rawInput: {
            roleGroup: s.roleGroup,
            branchId: s.branchId ? String(s.branchId) : null,
            // Bucket by calendar date so each role+branch fires exactly once per day.
            dateKey: dateLabel,
          },
          titleAr: `ملخص نهاية اليوم — ${dateLabel}`,
          titleEn: `End-of-day wrap-up — ${dateLabel}`,
          summaryAr: `إنجازات اليوم ومتبقّياته: ${s.resolvedCount || 0} مُغلق، ${s.openFollowUpCount || 0} متابعة، ${s.pendingApprovalCount || 0} بانتظار الاعتماد.`,
          summaryEn: `Today's progress + pending: ${s.resolvedCount || 0} resolved, ${s.openFollowUpCount || 0} follow-ups, ${s.pendingApprovalCount || 0} pending approvals.`,
          severity,
          confidence: {
            level: confidenceLevelFromScore(confScore),
            score: confScore,
            factors: confFactors,
          },
          reasoning: { bulletsAr, bulletsEn, supportingFacts },
          branchId: s.branchId || null,
          deepLink: `/briefings/eod/${dateLabel}`,
          suggestedActions: [
            {
              titleAr: 'افتح ملخص اليوم',
              titleEn: 'Open EOD summary',
              deepLink: `/briefings/eod/${dateLabel}`,
              estimatedMin: 5,
              severity: openWork > 0 ? 'should' : 'may',
            },
            {
              titleAr: 'استعرض المتابعات المعلّقة',
              titleEn: 'Review open follow-ups',
              deepLink: '/me/follow-ups',
              estimatedMin: 10,
              severity: openWork > 0 ? 'must' : 'may',
            },
          ],
          relatedEntities: s.branchId ? [{ type: 'Branch', id: String(s.branchId) }] : [],
          sourceDetail: `end-of-day.v1: role=${s.roleGroup} branch=${s.branchId || '*'} openWork=${openWork}`,
          sourceType: 'rule',
          expiresAt: new Date(now.getTime() + TTL_MS),
        }
      );

      payloads.push(payload);
    } catch {
      // skip bad row — never crash the tick
    }
  }

  return payloads;
}

module.exports = defineGenerator({
  id: GENERATOR_ID,
  kind: 'executive-digest',
  category: 'operational',
  scope: 'branch',
  evaluate,
});
