'use strict';

/**
 * sources/cdss.source.js — Wave 286
 * Reads the LATEST CdssRiskAssessment for a beneficiary (fall risk,
 * pressure ulcer, malnutrition, deterioration). Maps the tool's own
 * riskLevel to 0..100.
 */

const mongoose = require('mongoose');

const SOURCE_NAME = 'cdss';

const LEVEL_TO_SCORE = Object.freeze({
  critical: 90,
  high: 70,
  severe: 70,
  moderate: 45,
  medium: 45,
  low: 20,
  minimal: 5,
  none: 0,
});

async function fetch(beneficiaryId /*, opts */) {
  let Model;
  try {
    Model = mongoose.model('CdssRiskAssessment');
  } catch (_e) {
    return {
      source: SOURCE_NAME,
      available: false,
      reason: 'SOURCE_UNAVAILABLE',
      score: null,
      factors: [],
    };
  }

  const latest = await Model.findOne({ beneficiaryId })
    .sort({ assessmentDate: -1, createdAt: -1 })
    .lean();

  if (!latest) {
    return {
      source: SOURCE_NAME,
      available: true,
      reason: 'NO_DATA',
      score: null,
      factors: [],
    };
  }

  const level = String(latest.riskLevel || latest.level || '').toLowerCase();
  const score =
    typeof latest.score === 'number' && Number.isFinite(latest.score)
      ? Math.max(0, Math.min(100, latest.score))
      : (LEVEL_TO_SCORE[level] ?? null);

  return {
    source: SOURCE_NAME,
    available: true,
    score,
    computedAt: latest.assessmentDate || latest.createdAt || null,
    factors: [
      {
        code: `CDSS_${String(latest.assessmentType || 'GENERIC').toUpperCase()}`,
        label: latest.toolUsed || latest.assessmentType || 'generic',
        weight: 1,
        value: score,
        evidence: {
          tool: latest.toolUsed || null,
          level: latest.riskLevel || null,
          nextAssessmentDate: latest.nextAssessmentDate || null,
        },
        source: SOURCE_NAME,
      },
    ],
    raw: { modelId: String(latest._id), assessmentType: latest.assessmentType || null },
  };
}

module.exports = { SOURCE_NAME, fetch, LEVEL_TO_SCORE };
