/**
 * assessmentCadenceService — on-time completion of periodic reassessment tasks.
 *
 * Powers KPI `rehab.assessments.cadence.ontime.pct` → summarize() → onTimePct.
 */

'use strict';

const mongoose = require('mongoose');

function getModel() {
  try {
    return (
      mongoose.models.MeasureReassessmentTask ||
      require('../domains/goals/models/MeasureReassessmentTask')
    );
  } catch {
    return null;
  }
}

function sinceDate(windowDays = 90) {
  return new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
}

async function summarize(opts = {}) {
  const Model = getModel();
  if (!Model) return { onTimePct: null, total: 0, onTime: 0 };

  const query = { dueAt: { $gte: sinceDate(opts.windowDays ?? 90) } };
  if (opts.branchId) query.branchId = opts.branchId;
  if (opts.beneficiaryId) query.beneficiaryId = opts.beneficiaryId;

  const tasks = await Model.find(query).lean();
  const now = new Date();
  let onTime = 0;

  for (const t of tasks) {
    const dueAt = new Date(t.dueAt);
    if (t.status === 'completed' && t.completedAt) {
      if (new Date(t.completedAt) <= dueAt) onTime += 1;
    } else if (['pending', 'acknowledged'].includes(t.status) && dueAt >= now) {
      onTime += 1;
    }
  }

  return {
    onTimePct: tasks.length > 0 ? Math.round((onTime / tasks.length) * 1000) / 10 : null,
    total: tasks.length,
    onTime,
  };
}

/**
 * Alias/variant for reassessment on-time rate used by KPI registry.
 */
async function reassessmentOnTime(opts = {}) {
  return summarize(opts);
}

module.exports = { summarize, reassessmentOnTime };
