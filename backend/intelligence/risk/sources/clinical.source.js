'use strict';

/**
 * sources/clinical.source.js — Wave 286
 * Reads the LATEST ClinicalRiskScore document for a beneficiary
 * (written by domains/ai-recommendations/services/RiskScoringService).
 * Does NOT recompute — pure read-only adapter.
 *
 * Returns the canonical RiskSourceResult shape:
 *   { source, available, score, factors[], computedAt, reason?, raw? }
 */

const mongoose = require('mongoose');

const SOURCE_NAME = 'clinical';

async function fetch(beneficiaryId, { episodeId } = {}) {
  let Model;
  try {
    Model = mongoose.model('ClinicalRiskScore');
  } catch (_e) {
    return {
      source: SOURCE_NAME,
      available: false,
      reason: 'SOURCE_UNAVAILABLE',
      score: null,
      factors: [],
    };
  }

  const query = { beneficiaryId, isDeleted: false };
  if (episodeId) query.episodeId = episodeId;

  const latest = await Model.findOne(query).sort({ calculatedAt: -1 }).lean();

  if (!latest) {
    return {
      source: SOURCE_NAME,
      available: true,
      reason: 'NO_DATA',
      score: null,
      factors: [],
    };
  }

  const factors = Array.isArray(latest.factors)
    ? latest.factors.map(f => ({
        code: f.code || f.factorCode || 'UNKNOWN',
        label: f.description || f.label || f.code || '',
        weight: typeof f.weight === 'number' ? f.weight : 1,
        value: typeof f.score === 'number' ? f.score : null,
        evidence: f.evidence || null,
        source: SOURCE_NAME,
      }))
    : [];

  return {
    source: SOURCE_NAME,
    available: true,
    score: typeof latest.totalScore === 'number' ? latest.totalScore : null,
    trend: latest.trend || null,
    computedAt: latest.calculatedAt || latest.updatedAt || null,
    factors,
    raw: {
      modelId: String(latest._id),
      previousScore: latest.previousScore ?? null,
      riskLevel: latest.riskLevel || null,
    },
  };
}

module.exports = { SOURCE_NAME, fetch };
