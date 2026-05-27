'use strict';

/**
 * sources/behavioral-escalation.source.js — Wave 434
 * ═════════════════════════════════════════════════════════════════
 * 5th source for the W286 unified risk orchestrator. Bridges the W433
 * pure escalation-predictor lib to the orchestrator by:
 *
 *   1. Querying the W29 BehaviorIncident collection for the
 *      beneficiary's recent log (default last 21 days, covering
 *      both recentDays + priorDays windows the predictor needs).
 *   2. Calling escalation-predictor.lib.predict(...).
 *   3. Returning the {source, score, factors, raw} envelope every
 *      other source plugin uses (clinical / psych-flags / dropout /
 *      cdss — see sources/psych-flags.source.js for the reference).
 *
 * Auto-self-disables when:
 *   - BehaviorIncident model isn't registered (e.g. mock-DB test boot)
 *     → {available:false, reason:'SOURCE_UNAVAILABLE'}
 *   - The beneficiary has zero recent incidents
 *     → {available:true, score:0, reason:'NO_DATA'} (absence is meaningful)
 *
 * Factors mirror the predictor's signals[] — each becomes a single
 * factor entry the orchestrator surfaces in the per-beneficiary
 * RiskProfile UI.
 */

const mongoose = require('mongoose');
const predictor = require('../../escalation-predictor.lib');

const SOURCE_NAME = 'behavioral_escalation';

// Pull a wider window than the predictor needs so the prior comparison
// window has data. 21 days = 7 (recent default) + 14 (prior default).
const FETCH_WINDOW_DAYS = 21;

async function fetch(beneficiaryId /*, opts */) {
  let Model;
  try {
    Model = mongoose.model('BehaviorIncident');
  } catch (_e) {
    return {
      source: SOURCE_NAME,
      available: false,
      reason: 'SOURCE_UNAVAILABLE',
      score: null,
      factors: [],
    };
  }

  const since = new Date(Date.now() - FETCH_WINDOW_DAYS * 86400_000);
  const incidents = await Model.find({
    beneficiaryId,
    observedAt: { $gte: since },
  })
    .sort({ observedAt: -1 })
    .limit(500)
    .select('_id observedAt behaviorType severity antecedent')
    .lean();

  if (!incidents || incidents.length === 0) {
    return {
      source: SOURCE_NAME,
      available: true,
      reason: 'NO_DATA',
      score: 0,
      factors: [],
      raw: { fetchWindowDays: FETCH_WINDOW_DAYS, totalCount: 0 },
    };
  }

  const result = predictor.predict(incidents);

  // Map predictor signals → orchestrator factors envelope.
  const factors = result.signals.map(sig => ({
    code: `ESCALATION_${sig.name.toUpperCase()}`,
    label: sig.name,
    weight: sig.weight / 100, // signal.weight is 0..100 → normalise
    value: sig.weight,
    evidence: { detail: sig.evidence },
    source: SOURCE_NAME,
  }));

  return {
    source: SOURCE_NAME,
    available: true,
    score: result.score,
    computedAt: incidents[0].observedAt || null,
    factors,
    raw: {
      fetchWindowDays: FETCH_WINDOW_DAYS,
      totalCount: incidents.length,
      recentCount: result.recentCount,
      priorCount: result.priorCount,
      tier: result.tier,
      breakdown: result.breakdown,
    },
  };
}

module.exports = { SOURCE_NAME, fetch, FETCH_WINDOW_DAYS };
