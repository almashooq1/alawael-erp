/**
 * homeCarryoverService — family engagement via home-practice logging.
 *
 * Powers KPI `rehab.family.engagement.pct` → summarize() → engagedPct.
 * Also re-exports the red-flag observation helper for backward compatibility.
 */

'use strict';

const mongoose = require('mongoose');

function getModel() {
  try {
    return (
      mongoose.models.HomeCarryoverEntry ||
      require('../models/HomeCarryoverEntry').HomeCarryoverEntry
    );
  } catch {
    return null;
  }
}

function sinceDate(windowDays = 30) {
  return new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
}

async function summarize(opts = {}) {
  const Model = getModel();
  if (!Model) return { engagedPct: null, activeCount: 0, totalCount: 0 };

  const since = sinceDate(opts.windowDays ?? 30);
  const [activeIds, allIds] = await Promise.all([
    Model.distinct('beneficiaryId', { loggedAt: { $gte: since } }),
    Model.distinct('beneficiaryId'),
  ]);

  return {
    engagedPct:
      allIds.length > 0 ? Math.round((activeIds.length / allIds.length) * 1000) / 10 : null,
    activeCount: activeIds.length,
    totalCount: allIds.length,
  };
}

module.exports = { summarize };
