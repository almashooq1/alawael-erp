/**
 * Beneficiary Equity Engine — محرك الإنصاف والتكافؤ
 *
 * W0-LifecycleAlign: detects disparity in outcomes, service intensity, and
 * lifecycle transitions across demographic dimensions (category, gender,
 * age group, branch). Returns actionable disparity alerts and ranked
 * under-performing segments.
 *
 * Pure + testable: dependencies injected.
 */

'use strict';

const DIMENSIONS = Object.freeze(['category', 'gender', 'branchId', 'ageGroup']);

function ageGroup(dob) {
  if (!dob) return 'unknown';
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  if (age < 6) return '0-5';
  if (age < 12) return '6-11';
  if (age < 18) return '12-17';
  return '18+';
}

function bucketBy(beneficiaries, dimension) {
  const buckets = {};
  for (const b of beneficiaries) {
    let key;
    if (dimension === 'ageGroup') {
      key = ageGroup(b.dateOfBirth);
    } else {
      key = b[dimension] || 'unknown';
    }
    if (!buckets[key]) {
      buckets[key] = {
        dimension,
        segment: key,
        count: 0,
        totalProgress: 0,
        totalSessions: 0,
        discharged: 0,
        archived: 0,
        riskFlags: 0,
      };
    }
    const bucket = buckets[key];
    bucket.count += 1;
    bucket.totalProgress += b.progress || 0;
    bucket.totalSessions += b.sessions || 0;
    if (b.status === 'discharged' || b.status === 'graduated') bucket.discharged += 1;
    if (b.status === 'archived' || b.status === 'inactive') bucket.archived += 1;
    bucket.riskFlags += Array.isArray(b.riskFlags) ? b.riskFlags.length : 0;
  }
  return Object.values(buckets);
}

function computeDisparity(buckets) {
  if (buckets.length < 2) return [];

  const avgProgress = buckets.map(b => (b.count ? b.totalProgress / b.count : 0));
  const maxProgress = Math.max(...avgProgress);

  const avgSessions = buckets.map(b => (b.count ? b.totalSessions / b.count : 0));
  const maxSessions = Math.max(...avgSessions);

  const dischargeRates = buckets.map(b => (b.count ? b.discharged / b.count : 0));
  const maxDischarge = Math.max(...dischargeRates);

  const riskRates = buckets.map(b => (b.count ? b.riskFlags / b.count : 0));
  const maxRisk = Math.max(...riskRates);

  return buckets.map((b, i) => {
    const progressGap = maxProgress > 0 ? maxProgress - avgProgress[i] : 0;
    const sessionGap = maxSessions > 0 ? maxSessions - avgSessions[i] : 0;
    const dischargeGap = maxDischarge > 0 ? maxDischarge - dischargeRates[i] : 0;
    const riskGap = maxRisk > 0 ? riskRates[i] - maxRisk : 0;

    // Composite disparity score 0-100.
    const disparity = clamp(
      progressGap * 0.5 + sessionGap * 0.2 + dischargeGap * 30 + Math.abs(riskGap) * 10,
      0,
      100
    );

    return {
      ...b,
      avgProgress: Number(avgProgress[i].toFixed(1)),
      avgSessions: Number(avgSessions[i].toFixed(1)),
      dischargeRate: Number((dischargeRates[i] * 100).toFixed(1)),
      riskFlagRate: Number((riskRates[i] * 100).toFixed(1)),
      disparityScore: Number(disparity.toFixed(1)),
    };
  });
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Analyze a cohort of beneficiaries for equity disparities.
 *
 * @param {object} opts
 *   - beneficiaries  Array<Beneficiary> or lean docs
 *   - dimensions     Array<string> subset of DIMENSIONS
 * @returns {Array<{ dimension, segment, disparityScore, ... }>}
 */
function analyzeEquity({ beneficiaries = [], dimensions = [...DIMENSIONS] } = {}) {
  if (!Array.isArray(beneficiaries) || beneficiaries.length === 0) return [];

  const allResults = [];
  for (const dimension of dimensions) {
    const buckets = bucketBy(beneficiaries, dimension);
    const analyzed = computeDisparity(buckets);
    allResults.push(...analyzed);
  }

  return allResults.sort((a, b) => b.disparityScore - a.disparityScore);
}

/**
 * Convenience helper that queries the Beneficiary model and runs equity analysis.
 *
 * @param {object} opts
 *   - beneficiaryModel  Mongoose model
 *   - branchId          optional filter
 *   - dimensions        Array<string>
 */
async function runEquityAnalysis({
  beneficiaryModel,
  branchId = null,
  dimensions = [...DIMENSIONS],
} = {}) {
  if (!beneficiaryModel) throw new Error('beneficiaryModel is required');

  const query = branchId ? { branchId } : {};
  const beneficiaries = await beneficiaryModel
    .find(query)
    .select('status progress sessions category gender dateOfBirth branchId riskFlags')
    .lean();

  return analyzeEquity({ beneficiaries, dimensions });
}

module.exports = {
  DIMENSIONS,
  analyzeEquity,
  runEquityAnalysis,
};
