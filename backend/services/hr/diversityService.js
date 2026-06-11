'use strict';

/**
 * diversityService.js — workforce D&I analysis over the branch-scoped active
 * workforce (W1199). Aggregate-only output; persists a DiversitySnapshot for
 * trend tracking. The route resolves branchId from the caller's effective scope.
 */

const lib = require('../../intelligence/diversity.lib');

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

function totalSalaryOf(emp) {
  const base = Number(emp.basic_salary) || 0;
  const housing = Number(emp.housing_allowance) || 0;
  const transport = Number(emp.transport_allowance) || 0;
  const other = Array.isArray(emp.other_allowances)
    ? emp.other_allowances.reduce((s, a) => s + (Number(a && a.amount) || 0), 0)
    : 0;
  return base + housing + transport + other;
}

async function loadWorkforce({ branchId, department }) {
  const Employee = getModel('Employee', '../../models/HR/Employee');
  if (!Employee) {
    const err = new Error('Employee model unavailable');
    err.code = 'MODEL_UNAVAILABLE';
    throw err;
  }
  const filter = { status: 'active', deleted_at: null };
  if (branchId) filter.branch_id = branchId; // branch isolation (caller-resolved)
  if (department) filter.department = department;
  const rows = await Employee.find(filter)
    .select('gender nationality basic_salary housing_allowance transport_allowance other_allowances department')
    .lean();
  return rows.map(e => ({
    gender: e.gender,
    nationality: e.nationality,
    department: e.department || null,
    salary: totalSalaryOf(e),
  }));
}

async function analyze({ branchId, department = null, tiers } = {}) {
  const rows = await loadWorkforce({ branchId, department });
  const a = lib.analyzeDiversity(rows, { tiers: Number(tiers) || 3 });
  return {
    scope: { level: department ? 'department' : 'branch', department: department || null },
    branchId: branchId || null,
    ...a,
  };
}

async function snapshot({ branchId, department = null, tiers, computedBy = null, computedAt } = {}) {
  const Snap = getModel('DiversitySnapshot', '../../models/HR/DiversitySnapshot');
  if (!Snap) {
    const err = new Error('DiversitySnapshot model unavailable');
    err.code = 'MODEL_UNAVAILABLE';
    throw err;
  }
  const a = await analyze({ branchId, department, tiers });
  return Snap.create({
    branchId,
    scope: a.scope,
    computedAt: computedAt || new Date(),
    headcount: a.headcount,
    gender: { counts: a.gender.counts, pct: a.gender.pct },
    nationality: { counts: a.nationality.counts, pct: a.nationality.pct },
    saudizationRatePct: a.saudizationRatePct,
    diversityIndex: a.diversityIndex,
    seniorityCliff: {
      gender: a.seniorityLens.gender.topVsBottomDelta || {},
      nationality: a.seniorityLens.nationality.topVsBottomDelta || {},
      reportable: !!a.seniorityLens.gender.reportable,
    },
    computedBy,
  });
}

async function listSnapshots({ branchId, department = null, limit = 50 } = {}) {
  const Snap = getModel('DiversitySnapshot', '../../models/HR/DiversitySnapshot');
  if (!Snap) return [];
  const filter = {};
  if (branchId) filter.branchId = branchId;
  if (department) filter['scope.department'] = department;
  return Snap.find(filter)
    .sort({ computedAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200))
    .lean();
}

async function trends({ branchId, department = null, limit = 24 } = {}) {
  const snaps = await listSnapshots({ branchId, department, limit });
  return snaps
    .map(s => ({
      computedAt: s.computedAt,
      headcount: s.headcount,
      saudizationRatePct: s.saudizationRatePct,
      genderBlau: s.diversityIndex ? s.diversityIndex.genderBlau : null,
      nationalityBlau: s.diversityIndex ? s.diversityIndex.nationalityBlau : null,
    }))
    .reverse();
}

module.exports = { totalSalaryOf, loadWorkforce, analyze, snapshot, listSnapshots, trends };
