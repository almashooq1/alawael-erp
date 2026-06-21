/**
 * interventionAnalyticsService — diversity / mix analytics over rehab interventions.
 *
 * Powers KPI `rehab.interventions.diversity.shannon` → diversityIndex() → shannon.
 */

'use strict';

const mongoose = require('mongoose');

function getModel() {
  try {
    return (
      mongoose.models.RehabSession || require('../models/rehabilitation/RehabSession').RehabSession
    );
  } catch {
    return null;
  }
}

function sinceDate(windowDays = 90) {
  return new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
}

function shannonIndex(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return -counts.reduce((sum, c) => {
    if (c === 0) return sum;
    const p = c / total;
    return sum + p * Math.log2(p);
  }, 0);
}

async function diversityIndex(opts = {}) {
  const Model = getModel();
  if (!Model) return { shannon: 0, activityCount: 0, totalActivities: 0 };

  const q = { date: { $gte: sinceDate(opts.windowDays ?? 90) }, status: 'completed' };
  if (opts.branchId) q.branchId = opts.branchId;
  if (opts.beneficiaryId) q.beneficiary_id = opts.beneficiaryId;

  const sessions = await Model.find(q, 'activities_performed interventions').lean();
  const freq = new Map();
  let total = 0;

  for (const s of sessions) {
    const list = [
      ...(Array.isArray(s.activities_performed) ? s.activities_performed : []),
      ...(Array.isArray(s.interventions) ? s.interventions : []),
    ];
    for (const raw of list) {
      const key =
        typeof raw === 'string'
          ? raw.toLowerCase().trim()
          : String(raw?.name || raw)
              .toLowerCase()
              .trim();
      if (!key) continue;
      freq.set(key, (freq.get(key) || 0) + 1);
      total += 1;
    }
  }

  const shannon = total > 0 ? Math.round(shannonIndex([...freq.values()]) * 100) / 100 : 0;
  return {
    shannon,
    activityCount: freq.size,
    totalActivities: total,
  };
}

module.exports = { diversityIndex };
