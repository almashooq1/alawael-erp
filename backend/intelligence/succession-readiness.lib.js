/**
 * succession-readiness.lib.js — pure data-driven succession readiness (W1207).
 *
 * The INTEGRATIVE layer: combines an employee's 9-box placement (W1198 talent),
 * their competency coverage of the TARGET role (W1201 skills-gap, against the
 * target's RoleCompetencyRequirement — not their current role), and their tenure
 * into a readiness score + level. Distinct from the existing succession feature,
 * which only stores a MANUALLY-entered readinessPercentage.
 *
 * All pure (no DB, no Date). Score 0-100, three weighted components:
 *   - talent      (40%): leans on POTENTIAL (can they grow into a bigger role?)
 *                        plus PERFORMANCE (do they deliver today?), from the 9-box bands
 *   - competency  (40%): % of the TARGET role's competency requirement they meet
 *   - tenure      (20%): enough experience to step up (ramps to full by ~3 years)
 */

'use strict';

const WEIGHTS = Object.freeze({ talent: 0.4, competency: 0.4, tenure: 0.2 });
const TENURE_FULL_YEARS = 3; // tenure at/above this contributes 100% of its component

function clamp01to100(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v > 100) return 100;
  return v;
}
function round(n, dp = 1) {
  const f = 10 ** dp;
  return Math.round((Number(n) || 0) * f) / f;
}

/** 9-box bands (1-3 each) → a 0-100 talent component (potential-weighted). */
function talentScore({ performanceBand, potentialBand } = {}) {
  const perf = Math.min(3, Math.max(1, Math.round(Number(performanceBand) || 1)));
  const pot = Math.min(3, Math.max(1, Math.round(Number(potentialBand) || 1)));
  // potential 0.6 / performance 0.4, normalised from band-1 (so band 1→0, band 3→100)
  const weighted = (pot - 1) * 0.6 + (perf - 1) * 0.4; // 0..2
  return round((weighted / 2) * 100);
}

/** tenure years → 0-100, ramps linearly to full by TENURE_FULL_YEARS. */
function tenureScore(tenureYears) {
  const y = Math.max(0, Number(tenureYears) || 0);
  return round(Math.min(1, y / TENURE_FULL_YEARS) * 100);
}

function levelOf(score) {
  if (score >= 80) return { key: 'ready_now', ar: 'جاهز الآن' };
  if (score >= 60) return { key: 'ready_1_2y', ar: 'جاهز خلال 1-2 سنة' };
  if (score >= 40) return { key: 'ready_3y_plus', ar: 'جاهز بعد 3+ سنوات' };
  return { key: 'not_ready', ar: 'غير جاهز' };
}

/**
 * @param {object} p
 * @param {object} [p.talentBands] { performanceBand, potentialBand } — null if no 9-box review
 * @param {number} [p.targetCompetencyReadinessPct] 0-100 — coverage of the TARGET role (null if no baseline)
 * @param {number} [p.tenureYears]
 */
function readiness({ talentBands, targetCompetencyReadinessPct, tenureYears } = {}) {
  const components = {
    talent: talentBands ? talentScore(talentBands) : null,
    competency: targetCompetencyReadinessPct == null ? null : clamp01to100(targetCompetencyReadinessPct),
    tenure: tenureScore(tenureYears),
  };
  // re-weight over only the components we actually have (a missing 9-box review or
  // role baseline shouldn't zero the score — it widens the others' weight).
  let wSum = 0;
  let acc = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    if (components[k] == null) continue;
    wSum += w;
    acc += components[k] * w;
  }
  const score = wSum ? round(acc / wSum) : 0;
  return {
    score,
    level: levelOf(score),
    components,
    coverage: {
      hasTalentReview: components.talent != null,
      hasRoleBaseline: components.competency != null,
    },
    weights: WEIGHTS,
  };
}

/** Rank candidates (each {employeeId, name, readiness}) by score desc. */
function rankCandidates(candidates) {
  return [...(candidates || [])].sort((a, b) => (b.readiness?.score || 0) - (a.readiness?.score || 0));
}

module.exports = {
  WEIGHTS,
  TENURE_FULL_YEARS,
  talentScore,
  tenureScore,
  levelOf,
  readiness,
  rankCandidates,
};
