'use strict';

/**
 * successionReadinessService.js — computed succession readiness (W1207).
 *
 * Integrates three existing data sources into a data-driven readiness score for an
 * employee against a TARGET role:
 *   - 9-box placement      (W1198 TalentReview — latest)
 *   - target-role competency coverage (W1201: the TARGET jobTitle's
 *     RoleCompetencyRequirement vs the employee's EmployeeCompetency, via skills-gap.lib)
 *   - tenure               (Employee.hire_date)
 *
 * Complements the existing (manual) succession-planning feature; this is the
 * data-driven SUGGESTION the manual assessment lacked. Lazy model lookup.
 */

const readinessLib = require('../../intelligence/succession-readiness.lib');
const skillsLib = require('../../intelligence/skills-gap.lib');

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

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;
function tenureYears(hireDate) {
  if (!hireDate) return 0;
  const t = new Date(hireDate).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (Date.now() - t) / MS_PER_YEAR);
}

/** Latest TalentReview bands for an employee, or null. */
async function latestBands(TalentReview, employeeId) {
  if (!TalentReview) return null;
  const tr = await TalentReview.findOne({ employeeId }).sort({ createdAt: -1 }).select('performanceBand potentialBand box').lean();
  return tr ? { performanceBand: tr.performanceBand, potentialBand: tr.potentialBand, box: tr.box } : null;
}

/** Target-role competency readiness % (0-100) for an employee, or null if no baseline. */
async function targetCompetencyReadiness(RCR, EC, employeeId, targetJobTitle) {
  if (!RCR || !EC || !targetJobTitle) return null;
  const reqs = await RCR.find({ jobTitle: targetJobTitle, active: true }).lean();
  if (!reqs.length) return null;
  const comps = await EC.find({ employeeId }).select('competencyKey currentLevel').lean();
  const current = {};
  for (const c of comps) current[c.competencyKey] = c.currentLevel;
  return skillsLib.employeeGaps(reqs, current).readinessPct;
}

/** Computed readiness for one employee against a target role. */
async function employeeReadiness({ employeeId, targetJobTitle = null } = {}) {
  const Employee = getModel('Employee', '../../models/HR/Employee');
  const TalentReview = getModel('TalentReview', '../../models/HR/TalentReview');
  const RCR = getModel('RoleCompetencyRequirement', '../../models/HR/RoleCompetencyRequirement');
  const EC = getModel('EmployeeCompetency', '../../models/HR/EmployeeCompetency');
  if (!Employee) {
    const e = new Error('Employee model unavailable');
    e.code = 'MODEL_UNAVAILABLE';
    throw e;
  }
  const emp = await Employee.findById(employeeId).select('job_title_en job_title_ar full_name name department hire_date branch_id').lean();
  if (!emp) return null;

  const bands = await latestBands(TalentReview, employeeId);
  const compReadiness = await targetCompetencyReadiness(RCR, EC, employeeId, targetJobTitle);
  const r = readinessLib.readiness({
    talentBands: bands,
    targetCompetencyReadinessPct: compReadiness,
    tenureYears: tenureYears(emp.hire_date),
  });
  return {
    employeeId,
    name: emp.full_name || emp.name || null,
    currentJobTitle: emp.job_title_en || emp.job_title_ar || null,
    targetJobTitle: targetJobTitle || null,
    tenureYears: Math.round(tenureYears(emp.hire_date) * 10) / 10,
    box: bands ? bands.box : null,
    ...r,
  };
}

/** Rank branch employees by readiness for a target role. */
async function candidatesForRole({ branchId, targetJobTitle, limit = 1000 } = {}) {
  const Employee = getModel('Employee', '../../models/HR/Employee');
  if (!Employee) {
    const e = new Error('Employee model unavailable');
    e.code = 'MODEL_UNAVAILABLE';
    throw e;
  }
  if (!targetJobTitle) {
    const e = new Error('targetJobTitle is required');
    e.code = 'VALIDATION';
    throw e;
  }
  const filter = { status: 'active', deleted_at: null };
  if (branchId) filter.branch_id = branchId; // branch isolation (caller-resolved)
  const emps = await Employee.find(filter).select('_id').limit(Math.min(Number(limit) || 1000, 2000)).lean();
  const results = [];
  for (const e of emps) {
    const r = await employeeReadiness({ employeeId: e._id, targetJobTitle });
    if (r) results.push(r);
  }
  return {
    targetJobTitle,
    assessed: results.length,
    candidates: readinessLib.rankCandidates(results).slice(0, 100),
  };
}

module.exports = { tenureYears, employeeReadiness, candidatesForRole };
