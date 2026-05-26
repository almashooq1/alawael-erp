'use strict';

/**
 * icf-aggregate.lib.js — W457.
 *
 * Pure aggregation library for ICF outcomes across multiple beneficiaries.
 * Operates on already-fetched assessment data — no DB calls in the lib
 * itself (ADR-011 heuristic-first / pure-lib doctrine). The caller (a
 * service or scheduled report) fetches beneficiary ICF assessments and
 * passes the array in.
 *
 * Used by:
 *   • Branch-level ICF outcome reports (governance dashboards)
 *   • National-level submissions to the Disability Authority (W286)
 *   • Equity Engine (Phase G) — disaggregated reports
 *
 * Per Phase A of docs/blueprint/beneficiary-lifecycle-v3.md.
 *
 * Input shape (one entry per beneficiary-assessment pair):
 *   {
 *     beneficiaryId, branchId,
 *     assessmentDate: Date,
 *     icfCodes: [{ code, qualifier, capacityQualifier?, component }],
 *     demographics: { gender, ageBand, severityTier, disabilityType, nationality }
 *   }
 *
 * No PII is required by the lib — beneficiaryId is an opaque identifier
 * used only for unique-counting (de-duplication via Set).
 */

const VALID_COMPONENTS = [
  'bodyFunctions',
  'bodyStructures',
  'activitiesParticipation',
  'environmentalFactors',
];
const COMPONENT_PREFIX = {
  b: 'bodyFunctions',
  s: 'bodyStructures',
  d: 'activitiesParticipation',
  e: 'environmentalFactors',
};

/**
 * Aggregate ICF assessments into a branch-level summary.
 *
 * @param {Array} assessments
 * @returns {{ branchId, period, beneficiaryCount, assessmentCount,
 *            byComponent: {b,s,d,e}, topImpaired: Array, topImproved: Array,
 *            demographics: {} }}
 */
function aggregateByBranch(assessments, opts = {}) {
  if (!Array.isArray(assessments) || assessments.length === 0) {
    return {
      branchId: opts.branchId || null,
      period: opts.period || null,
      beneficiaryCount: 0,
      assessmentCount: 0,
      byComponent: emptyComponentBreakdown(),
      topImpaired: [],
      topImproved: [],
      demographics: emptyDemographics(),
    };
  }

  const beneficiaries = new Set();
  const codeStats = new Map(); // code → { count, qualifierSum, qualifierCount }
  const componentStats = emptyComponentBreakdown();
  const demographics = emptyDemographics();

  for (const a of assessments) {
    if (a.beneficiaryId) beneficiaries.add(String(a.beneficiaryId));

    if (Array.isArray(a.icfCodes)) {
      for (const entry of a.icfCodes) {
        if (!entry?.code) continue;
        const stats = codeStats.get(entry.code) || {
          count: 0,
          qualifierSum: 0,
          qualifierCount: 0,
          component: entry.component || COMPONENT_PREFIX[entry.code[0]] || 'unknown',
        };
        stats.count++;
        if (typeof entry.qualifier === 'number' && entry.qualifier >= 0 && entry.qualifier <= 4) {
          stats.qualifierSum += entry.qualifier;
          stats.qualifierCount++;
        }
        codeStats.set(entry.code, stats);

        // Component-level aggregation
        const comp = stats.component;
        if (componentStats[comp]) {
          componentStats[comp].count++;
          if (typeof entry.qualifier === 'number') {
            componentStats[comp].qualifierSum += entry.qualifier;
            componentStats[comp].qualifierCount++;
          }
        }
      }
    }

    // Demographics
    if (a.demographics) {
      bumpDemographic(demographics.byGender, a.demographics.gender);
      bumpDemographic(demographics.byAgeBand, a.demographics.ageBand);
      bumpDemographic(demographics.bySeverity, a.demographics.severityTier);
      bumpDemographic(demographics.byDisabilityType, a.demographics.disabilityType);
      bumpDemographic(demographics.byNationality, a.demographics.nationality);
    }
  }

  // Finalize component averages
  for (const comp of VALID_COMPONENTS) {
    const stats = componentStats[comp];
    stats.averageQualifier =
      stats.qualifierCount > 0
        ? Number((stats.qualifierSum / stats.qualifierCount).toFixed(2))
        : null;
    delete stats.qualifierSum;
    delete stats.qualifierCount;
  }

  // Top impaired codes (highest average qualifier)
  const codeList = Array.from(codeStats.entries()).map(([code, s]) => ({
    code,
    count: s.count,
    averageQualifier:
      s.qualifierCount > 0 ? Number((s.qualifierSum / s.qualifierCount).toFixed(2)) : null,
    component: s.component,
  }));
  const topImpaired = codeList
    .filter(c => c.averageQualifier != null)
    .sort((a, b) => b.averageQualifier - a.averageQualifier)
    .slice(0, 10);

  // topImproved would require before/after pairs — placeholder.
  // The caller can call aggregateImprovements(beforeAssessments, afterAssessments)
  // separately when both points are available.
  const topImproved = [];

  return {
    branchId: opts.branchId || null,
    period: opts.period || null,
    beneficiaryCount: beneficiaries.size,
    assessmentCount: assessments.length,
    byComponent: componentStats,
    topImpaired,
    topImproved,
    demographics,
  };
}

/**
 * Aggregate paired before/after assessments to surface improvements + declines.
 *
 * @param {Array<{ beneficiaryId, before: Assessment, after: Assessment }>} pairs
 * @returns {{ improvedCodes, declinedCodes, stableCodes, summary }}
 */
function aggregateImprovements(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return { improvedCodes: [], declinedCodes: [], stableCodes: [], summary: { paired: 0 } };
  }

  const deltaPerCode = new Map(); // code → { sumDelta, count, improvements, declines, stable }

  for (const pair of pairs) {
    const beforeMap = new Map((pair.before?.icfCodes || []).map(e => [e.code, e.qualifier]));
    const afterMap = new Map((pair.after?.icfCodes || []).map(e => [e.code, e.qualifier]));

    const allCodes = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    for (const code of allCodes) {
      const before = beforeMap.get(code);
      const after = afterMap.get(code);
      if (typeof before !== 'number' || typeof after !== 'number') continue;
      const delta = after - before;
      const stats = deltaPerCode.get(code) || {
        sumDelta: 0,
        count: 0,
        improvements: 0,
        declines: 0,
        stable: 0,
      };
      stats.sumDelta += delta;
      stats.count++;
      if (delta < 0) stats.improvements++;
      else if (delta > 0) stats.declines++;
      else stats.stable++;
      deltaPerCode.set(code, stats);
    }
  }

  const codeList = Array.from(deltaPerCode.entries()).map(([code, s]) => ({
    code,
    averageDelta: Number((s.sumDelta / s.count).toFixed(2)),
    paired: s.count,
    improvements: s.improvements,
    declines: s.declines,
    stable: s.stable,
  }));

  const improvedCodes = codeList
    .filter(c => c.averageDelta < 0)
    .sort((a, b) => a.averageDelta - b.averageDelta)
    .slice(0, 10);
  const declinedCodes = codeList
    .filter(c => c.averageDelta > 0)
    .sort((a, b) => b.averageDelta - a.averageDelta)
    .slice(0, 10);
  const stableCodes = codeList
    .filter(c => c.averageDelta === 0)
    .sort((a, b) => b.paired - a.paired)
    .slice(0, 10);

  return {
    improvedCodes,
    declinedCodes,
    stableCodes,
    summary: { paired: pairs.length, codesAnalyzed: codeList.length },
  };
}

/**
 * Disaggregate aggregation by a demographic dimension (gender, ageBand,
 * severityTier, disabilityType, nationality).
 *
 * Returns one aggregation per demographic bucket so the Equity Engine
 * (Phase G) can detect disparities.
 */
function disaggregateByDemographic(assessments, dimension) {
  if (!Array.isArray(assessments) || assessments.length === 0) {
    return {};
  }
  const buckets = new Map();
  for (const a of assessments) {
    const bucket = a.demographics?.[dimension] || 'unknown';
    const list = buckets.get(bucket) || [];
    list.push(a);
    buckets.set(bucket, list);
  }
  const result = {};
  for (const [bucket, list] of buckets) {
    result[bucket] = aggregateByBranch(list);
  }
  return result;
}

// ─── helpers ──────────────────────────────────────────────────────────

function emptyComponentBreakdown() {
  return {
    bodyFunctions: { count: 0, qualifierSum: 0, qualifierCount: 0, averageQualifier: null },
    bodyStructures: { count: 0, qualifierSum: 0, qualifierCount: 0, averageQualifier: null },
    activitiesParticipation: {
      count: 0,
      qualifierSum: 0,
      qualifierCount: 0,
      averageQualifier: null,
    },
    environmentalFactors: { count: 0, qualifierSum: 0, qualifierCount: 0, averageQualifier: null },
  };
}

function emptyDemographics() {
  return {
    byGender: {},
    byAgeBand: {},
    bySeverity: {},
    byDisabilityType: {},
    byNationality: {},
  };
}

function bumpDemographic(bucket, key) {
  if (!key) return;
  bucket[key] = (bucket[key] || 0) + 1;
}

module.exports = Object.freeze({
  aggregateByBranch,
  aggregateImprovements,
  disaggregateByDemographic,
  // Constants
  VALID_COMPONENTS,
  COMPONENT_PREFIX,
});
