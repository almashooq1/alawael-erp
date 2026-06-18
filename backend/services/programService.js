/**
 * programService — rehabilitation program capacity and enrollment analytics.
 *
 * Powers KPI `rehab.program.capacity.utilization.pct` → utilizationSummary() → utilizationPct.
 */

'use strict';

const mongoose = require('mongoose');

function getModels() {
  try {
    return {
      Program: mongoose.models.Program || require('../models/rehabilitation/Program'),
      ProgramEnrollment:
        mongoose.models.ProgramEnrollment || require('../models/rehabilitation/ProgramEnrollment'),
    };
  } catch {
    return {};
  }
}

async function utilizationSummary(opts = {}) {
  const { Program, ProgramEnrollment } = getModels();
  if (!Program || !ProgramEnrollment) {
    return { utilizationPct: null, totalCapacity: 0, totalEnrolled: 0, programCount: 0 };
  }

  const q = { status: 'active' };
  if (opts.branchId) q.branchId = opts.branchId;

  const programs = await Program.find(q, '_id max_participants name_en').lean();
  if (!programs.length) {
    return { utilizationPct: null, totalCapacity: 0, totalEnrolled: 0, programCount: 0 };
  }

  const ids = programs.map(p => p._id);
  const enrollQ = {
    program_id: { $in: ids },
    status: { $in: ['active', 'paused'] },
  };

  const counts = await ProgramEnrollment.aggregate([
    { $match: enrollQ },
    { $group: { _id: '$program_id', enrolled: { $sum: 1 } } },
  ]);

  const map = new Map(counts.map(c => [String(c._id), c.enrolled]));
  let totalCapacity = 0;
  let totalEnrolled = 0;

  for (const p of programs) {
    const cap = Number(p.max_participants) || 0;
    if (cap <= 0) continue;
    totalCapacity += cap;
    totalEnrolled += map.get(String(p._id)) || 0;
  }

  return {
    utilizationPct:
      totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 1000) / 10 : null,
    totalCapacity,
    totalEnrolled,
    programCount: programs.length,
  };
}

/**
 * Mean wait time (days) from enrollment request to plan start date.
 */
async function waitTimePlanStartMean(opts = {}) {
  const { ProgramEnrollment, RehabPlan } = getModels();
  if (!ProgramEnrollment || !RehabPlan) {
    return { meanDays: null, count: 0 };
  }

  const q = { status: { $in: ['active', 'completed'] } };
  if (opts.branchId) q.branchId = opts.branchId;

  const enrollments = await ProgramEnrollment.find(q, 'enrollment_date plan_id').lean();
  const planIds = enrollments.map(e => e.plan_id).filter(Boolean);
  const plans = await RehabPlan.find({ _id: { $in: planIds } }, 'start_date').lean();
  const planStartById = new Map(plans.map(p => [String(p._id), p.start_date]));

  const waits = [];
  for (const e of enrollments) {
    const enrolled = e.enrollment_date;
    const start = planStartById.get(String(e.plan_id));
    if (enrolled && start) {
      const days = Math.round((new Date(start) - new Date(enrolled)) / 86400000);
      if (Number.isFinite(days)) waits.push(days);
    }
  }

  return {
    meanDays: waits.length
      ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10
      : null,
    count: waits.length,
  };
}

module.exports = { utilizationSummary, waitTimePlanStartMean };
