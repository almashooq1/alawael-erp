'use strict';

/**
 * headcountPlanningService.js — data-driven workforce supply planning (W1203).
 *
 * Reads the LIVE current headcount from Employee (branch-scoped), runs the forecast
 * lib to size the hiring need to reach a target, and persists a HeadcountPlan. The
 * route resolves branchId from the caller's effective scope.
 */

const lib = require('../../intelligence/headcount-forecast.lib');

function getModel(name, file) {
  const mongoose = require('mongoose');
  try {
    return mongoose.model(name);
  } catch {
    try {
      require(file);
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

/** Live current active headcount for a branch (+ optional department) + per-dept breakdown. */
async function currentHeadcount({ branchId, department = null } = {}) {
  const Employee = getModel('Employee', '../../models/HR/Employee');
  if (!Employee) {
    const e = new Error('Employee model unavailable');
    e.code = 'MODEL_UNAVAILABLE';
    throw e;
  }
  const filter = { status: 'active', deleted_at: null };
  if (branchId) filter.branch_id = branchId; // branch isolation (caller-resolved)
  if (department) filter.department = department;
  const total = await Employee.countDocuments(filter);
  let byDepartment = [];
  if (!department) {
    byDepartment = await Employee.aggregate([
      { $match: filter },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).then(rows => rows.map(r => ({ department: r._id || '(غير محدّد)', count: r.count })));
  }
  return { branchId: branchId || null, department: department || null, total, byDepartment };
}

/** Build + persist a supply plan; current headcount is pulled LIVE (not caller-supplied). */
async function buildPlan({ branchId, department = null, planLabel, targetHeadcount, attritionRatePct, periods, createdBy = null } = {}) {
  const HeadcountPlan = getModel('HeadcountPlan', '../../models/HR/HeadcountPlan');
  if (!HeadcountPlan) {
    const e = new Error('HeadcountPlan model unavailable');
    e.code = 'MODEL_UNAVAILABLE';
    throw e;
  }
  if (!planLabel) {
    const e = new Error('planLabel is required');
    e.code = 'VALIDATION';
    throw e;
  }
  const { total: current } = await currentHeadcount({ branchId, department });
  const forecast = lib.forecastHeadcount({
    current,
    target: targetHeadcount,
    attritionRatePct,
    periods,
  });
  const doc = await HeadcountPlan.create({
    branchId,
    department,
    planLabel,
    currentHeadcount: current,
    targetHeadcount: forecast.target,
    attritionRatePct: forecast.attritionRatePct,
    periods: forecast.periods,
    forecast,
    createdBy,
  });
  return doc;
}

/** Live what-if forecast WITHOUT persisting (uses live current headcount). */
async function previewForecast({ branchId, department = null, targetHeadcount, attritionRatePct, periods } = {}) {
  const { total: current } = await currentHeadcount({ branchId, department });
  return { current, ...lib.forecastHeadcount({ current, target: targetHeadcount, attritionRatePct, periods }) };
}

async function listPlans({ branchId, department = null, limit = 50 } = {}) {
  const HeadcountPlan = getModel('HeadcountPlan', '../../models/HR/HeadcountPlan');
  if (!HeadcountPlan) return [];
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (department) filter.department = department;
  return HeadcountPlan.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 50, 200)).lean();
}

module.exports = { currentHeadcount, buildPlan, previewForecast, listPlans };
