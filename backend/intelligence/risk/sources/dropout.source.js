'use strict';

/**
 * sources/dropout.source.js — Wave 286
 * Reads the LATEST AiPrediction(prediction_type='dropout_risk') for a
 * beneficiary (written by services/ai/progressPrediction.service).
 *
 * AiPrediction stores `value` in 0..1. We multiply by 100 to fit the
 * unified 0..100 axis.
 */

const mongoose = require('mongoose');

const SOURCE_NAME = 'dropout';

async function fetch(beneficiaryId /*, opts */) {
  let Model;
  try {
    Model = mongoose.model('AiPrediction');
  } catch (_e) {
    return {
      source: SOURCE_NAME,
      available: false,
      reason: 'SOURCE_UNAVAILABLE',
      score: null,
      factors: [],
    };
  }

  // Schema fields vary across waves (beneficiary_id vs beneficiaryId) —
  // tolerate both.
  const query = {
    $or: [{ beneficiaryId }, { beneficiary_id: beneficiaryId }],
    $and: [{ $or: [{ prediction_type: 'dropout_risk' }, { type: 'dropout_risk' }] }],
  };

  const latest = await Model.findOne(query).sort({ created_at: -1, createdAt: -1 }).lean();

  if (!latest) {
    return {
      source: SOURCE_NAME,
      available: true,
      reason: 'NO_DATA',
      score: null,
      factors: [],
    };
  }

  const value01 = typeof latest.value === 'number' ? latest.value : null;
  const score100 = value01 != null ? Math.round(value01 * 100) : null;

  const details = latest.details || latest.detail || {};
  const factors = [];
  if (details && typeof details === 'object') {
    for (const [code, value] of Object.entries(details.factors || details || {})) {
      if (typeof value === 'number') {
        factors.push({
          code: `DROPOUT_${String(code).toUpperCase()}`,
          label: code,
          weight: 1,
          value,
          evidence: null,
          source: SOURCE_NAME,
        });
      }
    }
  }

  return {
    source: SOURCE_NAME,
    available: true,
    score: score100,
    confidence: latest.confidence ?? null,
    computedAt: latest.created_at || latest.createdAt || null,
    factors,
    raw: {
      modelId: String(latest._id),
      modelVersion: latest.model_version || latest.modelVersion || null,
      value01,
    },
  };
}

module.exports = { SOURCE_NAME, fetch };
