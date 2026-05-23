'use strict';

/**
 * sources/psych-flags.source.js — Wave 286
 * Reads ACTIVE PsychRiskFlag documents for a beneficiary and derives
 * a 0..100 score from the worst severity + count.
 *
 * Severity → base score:
 *   critical=85, high=65, moderate=45, low=25, info=10
 * Score = max(severityBase) + min(15, 5 * (activeCount - 1))
 * (capped at 100)
 */

const mongoose = require('mongoose');

const SOURCE_NAME = 'psych_flags';

const SEVERITY_BASE = Object.freeze({
  critical: 85,
  high: 65,
  moderate: 45,
  low: 25,
  info: 10,
});

const TERMINAL_STATUSES = new Set(['resolved', 'archived', 'cancelled']);

async function fetch(beneficiaryId /*, opts */) {
  let Model;
  try {
    Model = mongoose.model('PsychRiskFlag');
  } catch (_e) {
    return {
      source: SOURCE_NAME,
      available: false,
      reason: 'SOURCE_UNAVAILABLE',
      score: null,
      factors: [],
    };
  }

  const flags = await Model.find({ beneficiaryId }).sort({ raisedAt: -1 }).limit(50).lean();

  const active = (flags || []).filter(f => !TERMINAL_STATUSES.has(f.status));

  if (active.length === 0) {
    return {
      source: SOURCE_NAME,
      available: true,
      reason: 'NO_DATA',
      score: 0,
      factors: [],
      raw: { activeCount: 0, totalCount: flags.length },
    };
  }

  let maxBase = 0;
  const factors = [];
  for (const f of active) {
    const base = SEVERITY_BASE[f.severity] ?? 25;
    if (base > maxBase) maxBase = base;
    factors.push({
      code: `PSYCH_${String(f.flagType || 'GENERIC').toUpperCase()}`,
      label: f.flagType || 'generic',
      weight: base / 100,
      value: base,
      evidence: { flagNumber: f.flagNumber, severity: f.severity, status: f.status },
      source: SOURCE_NAME,
    });
  }

  const countBonus = Math.min(15, 5 * (active.length - 1));
  const score = Math.min(100, maxBase + countBonus);

  return {
    source: SOURCE_NAME,
    available: true,
    score,
    computedAt: active[0].raisedAt || null,
    factors,
    raw: { activeCount: active.length, totalCount: flags.length, maxBase, countBonus },
  };
}

module.exports = { SOURCE_NAME, fetch, SEVERITY_BASE };
