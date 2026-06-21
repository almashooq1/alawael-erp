/**
 * carePlanService — care-plan coverage analytics (separate from red-flag observations).
 *
 * Powers KPI `rehab.discipline.coverage.pct` → disciplineCoverage() → coveragePct.
 */

'use strict';

const mongoose = require('mongoose');

function getModel() {
  try {
    return mongoose.models.CarePlan || require('../models/CarePlan');
  } catch {
    return null;
  }
}

async function disciplineCoverage(opts = {}) {
  const Model = getModel();
  if (!Model) return { coveragePct: null, total: 0, covered: 0 };

  const q = { status: 'ACTIVE' };
  if (opts.branchId) q.branchId = opts.branchId;

  const plans = await Model.find(q, 'therapeutic.domains').lean();
  let total = 0;
  let covered = 0;

  for (const plan of plans) {
    const domains = plan.therapeutic?.domains || {};
    const keys = Object.keys(domains);
    if (!keys.length) continue;
    total += 1;
    const hasGoals = keys.some(
      k => Array.isArray(domains[k]?.goals) && domains[k].goals.length > 0
    );
    if (hasGoals) covered += 1;
  }

  return {
    coveragePct: total > 0 ? Math.round((covered / total) * 1000) / 10 : null,
    total,
    covered,
  };
}

module.exports = { disciplineCoverage };
