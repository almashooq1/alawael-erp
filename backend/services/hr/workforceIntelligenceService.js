'use strict';

/**
 * workforceIntelligenceService.js — branch-level capstone that fans out across the
 * three workforce-intelligence surfaces (W1200):
 *   - pay equity   (W1193) — equity score + demographic pay gaps
 *   - talent 9-box (W1198) — hiPo / risk distribution
 *   - diversity    (W1199) — representation, indices, Saudization, glass-ceiling
 *
 * Promise.allSettled so one failing sub-analysis degrades that section to null
 * rather than breaking the whole summary (the W381 aggregator pattern). Pure
 * orchestration — no new model, no DB of its own; each sub-service already applies
 * branch isolation via the branchId the route resolved.
 */

const payEquity = require('./payEquityService');
const talent = require('./talentGridService');
const diversity = require('./diversityService');

function settled(p) {
  return p.then(
    value => ({ ok: true, value }),
    error => ({ ok: false, error: error && error.message })
  );
}

/** Roll the three analyses into one branch summary + headline flags. */
async function summary({ branchId, department = null, reviewCycle = null } = {}) {
  const [pe, tg, di] = await Promise.all([
    settled(payEquity.analyze({ branchId, department })),
    settled(talent.gridSummary({ branchId, reviewCycle })),
    settled(diversity.analyze({ branchId, department })),
  ]);

  const flags = [];

  // pay-equity section
  let payEquitySection = null;
  if (pe.ok && pe.value) {
    const v = pe.value;
    payEquitySection = {
      headcount: v.headcount,
      equityScore: v.equityScore,
      genderMedianGapPct: v.genderGap && v.genderGap.reportable ? v.genderGap.medianGapPct : null,
      nationalityMedianGapPct: v.nationalityGap && v.nationalityGap.reportable ? v.nationalityGap.medianGapPct : null,
      flaggedCount: v.cohortOutliers ? v.cohortOutliers.count : 0,
    };
    if (typeof v.equityScore === 'number' && v.equityScore < 70) flags.push('pay_equity_score_low');
    if (v.genderGap && v.genderGap.reportable && v.genderGap.medianGapPct > 15) flags.push('gender_pay_gap_high');
  }

  // talent section
  let talentSection = null;
  if (tg.ok && tg.value) {
    const v = tg.value;
    talentSection = {
      reviewed: v.total,
      hiPo: v.hiPo,
      risk: v.risk,
      distribution: v.counts,
    };
    if (v.total > 0 && v.risk && v.risk.ratePct >= 25) flags.push('talent_risk_concentration');
  }

  // diversity section
  let diversitySection = null;
  if (di.ok && di.value) {
    const v = di.value;
    const cliff = v.seniorityLens && v.seniorityLens.gender;
    const femaleTopDelta = cliff && cliff.topVsBottomDelta ? cliff.topVsBottomDelta.female : null;
    diversitySection = {
      headcount: v.headcount,
      saudizationRatePct: v.saudizationRatePct,
      genderBlau: v.diversityIndex ? v.diversityIndex.genderBlau : null,
      nationalityBlau: v.diversityIndex ? v.diversityIndex.nationalityBlau : null,
      femaleTopTierDelta: femaleTopDelta,
    };
    if (typeof femaleTopDelta === 'number' && femaleTopDelta <= -20) flags.push('glass_ceiling_gender');
  }

  return {
    branchId: branchId || null,
    scope: { level: department ? 'department' : 'branch', department: department || null },
    sections: {
      payEquity: payEquitySection,
      talent: talentSection,
      diversity: diversitySection,
    },
    errors: {
      payEquity: pe.ok ? null : pe.error,
      talent: tg.ok ? null : tg.error,
      diversity: di.ok ? null : di.error,
    },
    flags,
    flagCount: flags.length,
  };
}

module.exports = { summary };
