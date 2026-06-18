/**
 * carePlanDischargeService — discharge outcome rollup: goals achieved at closure.
 *
 * Powers KPI `rehab.discharge.goals_met.pct` → summarize() → goalsMetPct.
 */

'use strict';

const mongoose = require('mongoose');

function getModels() {
  try {
    return {
      ProgramEnrollment:
        mongoose.models.ProgramEnrollment || require('../models/rehabilitation/ProgramEnrollment'),
      TherapeuticGoal:
        mongoose.models.TherapeuticGoal ||
        require('../domains/goals/models/TherapeuticGoal').TherapeuticGoal,
    };
  } catch {
    return {};
  }
}

function sinceDate(windowDays = 90) {
  return new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
}

async function summarize(opts = {}) {
  const { ProgramEnrollment, TherapeuticGoal } = getModels();
  if (!ProgramEnrollment || !TherapeuticGoal) {
    return { goalsMetPct: null, achieved: 0, total: 0, discharges: 0 };
  }

  const q = {
    status: { $in: ['completed', 'discharged'] },
    actual_end_date: { $gte: sinceDate(opts.windowDays ?? 90) },
  };
  if (opts.branchId) q.branchId = opts.branchId;
  if (opts.beneficiaryId) q.beneficiary_id = opts.beneficiaryId;

  const enrollments = await ProgramEnrollment.find(q, 'beneficiary_id').lean();
  if (!enrollments.length) {
    return { goalsMetPct: null, achieved: 0, total: 0, discharges: enrollments.length };
  }

  const beneficiaryIds = enrollments.map(e => e.beneficiary_id);
  const [achieved, total] = await Promise.all([
    TherapeuticGoal.countDocuments({
      beneficiaryId: { $in: beneficiaryIds },
      status: 'achieved',
    }),
    TherapeuticGoal.countDocuments({
      beneficiaryId: { $in: beneficiaryIds },
      status: { $nin: ['draft', 'discontinued'] },
    }),
  ]);

  return {
    goalsMetPct: total > 0 ? Math.round((achieved / total) * 1000) / 10 : null,
    achieved,
    total,
    discharges: enrollments.length,
  };
}

module.exports = { summarize };
