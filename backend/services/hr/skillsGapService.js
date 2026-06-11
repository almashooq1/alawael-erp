'use strict';

/**
 * skillsGapService.js — competency gap analysis (W1201).
 *
 * Joins each employee's assessed EmployeeCompetency levels against their job
 * title's RoleCompetencyRequirement baseline to compute gaps, rolls them up per
 * org, and matches the top gaps to trainings (TrainingPlan.skillsCovered). The
 * route resolves branchId from the caller's effective scope; employee-keyed reads
 * are additionally gated by enforceEmployeeBranch.
 *
 * Lazy model lookup so tests can inject fakes + load order can't break.
 */

const lib = require('../../intelligence/skills-gap.lib');

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

function jobTitleOf(emp) {
  return emp.job_title_en || emp.job_title_ar || null;
}

async function upsertAssessment({ employeeId, competencyKey, competencyNameAr, currentLevel, assessedBy = null, notes } = {}) {
  const EC = getModel('EmployeeCompetency', '../../models/HR/EmployeeCompetency');
  if (!EC) throwUnavailable('EmployeeCompetency');
  if (!employeeId || !competencyKey) throwValidation('employeeId and competencyKey are required');
  const existing = await EC.findOne({ employeeId, competencyKey });
  const doc = existing || new EC({ employeeId, competencyKey });
  doc.competencyKey = competencyKey;
  if (competencyNameAr !== undefined) doc.competencyNameAr = competencyNameAr;
  doc.currentLevel = currentLevel;
  doc.assessedAt = new Date();
  if (assessedBy) doc.assessedBy = assessedBy;
  if (notes !== undefined) doc.notes = notes;
  await doc.save();
  return doc;
}

async function upsertRequirement({ jobTitle, competencyKey, competencyNameAr, requiredLevel, criticality, createdBy = null } = {}) {
  const RCR = getModel('RoleCompetencyRequirement', '../../models/HR/RoleCompetencyRequirement');
  if (!RCR) throwUnavailable('RoleCompetencyRequirement');
  if (!jobTitle || !competencyKey) throwValidation('jobTitle and competencyKey are required');
  const existing = await RCR.findOne({ jobTitle, competencyKey });
  const doc = existing || new RCR({ jobTitle, competencyKey });
  if (competencyNameAr !== undefined) doc.competencyNameAr = competencyNameAr;
  doc.requiredLevel = requiredLevel;
  if (criticality) doc.criticality = criticality;
  if (createdBy) doc.createdBy = createdBy;
  await doc.save();
  return doc;
}

/** Gap analysis for one employee against their role's requirements. */
async function employeeGaps({ employeeId } = {}) {
  const Employee = getModel('Employee', '../../models/HR/Employee');
  const RCR = getModel('RoleCompetencyRequirement', '../../models/HR/RoleCompetencyRequirement');
  const EC = getModel('EmployeeCompetency', '../../models/HR/EmployeeCompetency');
  if (!Employee || !RCR || !EC) throwUnavailable('competency models');
  const emp = await Employee.findById(employeeId).select('job_title_en job_title_ar full_name name department branch_id').lean();
  if (!emp) return null;
  const jobTitle = jobTitleOf(emp);
  const requirements = jobTitle ? await RCR.find({ jobTitle, active: true }).lean() : [];
  const competencies = await EC.find({ employeeId }).select('competencyKey currentLevel').lean();
  const current = {};
  for (const c of competencies) current[c.competencyKey] = c.currentLevel;
  const analysis = lib.employeeGaps(requirements, current);
  return {
    employeeId,
    employeeName: emp.full_name || emp.name || null,
    jobTitle,
    department: emp.department || null,
    hasRoleBaseline: requirements.length > 0,
    ...analysis,
  };
}

/** Org-wide rollup of gaps for a branch (+ optional jobTitle). */
async function orgGaps({ branchId, jobTitle = null, limit = 2000 } = {}) {
  const Employee = getModel('Employee', '../../models/HR/Employee');
  const RCR = getModel('RoleCompetencyRequirement', '../../models/HR/RoleCompetencyRequirement');
  const EC = getModel('EmployeeCompetency', '../../models/HR/EmployeeCompetency');
  if (!Employee || !RCR || !EC) throwUnavailable('competency models');

  const empFilter = { status: 'active', deleted_at: null };
  if (branchId) empFilter.branch_id = branchId; // branch isolation (caller-resolved)
  const employees = await Employee.find(empFilter)
    .select('job_title_en job_title_ar')
    .limit(Math.min(Number(limit) || 2000, 5000))
    .lean();
  const scoped = jobTitle ? employees.filter(e => jobTitleOf(e) === jobTitle) : employees;
  if (!scoped.length) return { employeesAssessed: 0, priorities: [] };

  // requirements grouped by jobTitle
  const reqs = await RCR.find({ active: true }).lean();
  const reqByTitle = new Map();
  for (const r of reqs) {
    if (!reqByTitle.has(r.jobTitle)) reqByTitle.set(r.jobTitle, []);
    reqByTitle.get(r.jobTitle).push(r);
  }
  // competencies grouped by employee
  const ids = scoped.map(e => e._id);
  const comps = await EC.find({ employeeId: { $in: ids } }).select('employeeId competencyKey currentLevel').lean();
  const compByEmp = new Map();
  for (const c of comps) {
    const k = String(c.employeeId);
    if (!compByEmp.has(k)) compByEmp.set(k, {});
    compByEmp.get(k)[c.competencyKey] = c.currentLevel;
  }
  const perEmployee = scoped
    .map(e => {
      const requirements = reqByTitle.get(jobTitleOf(e)) || [];
      if (!requirements.length) return null;
      return lib.employeeGaps(requirements, compByEmp.get(String(e._id)) || {}).competencies;
    })
    .filter(Boolean);

  return lib.orgGapRollup(perEmployee);
}

/** Top org gaps → trainings that cover them. */
async function trainingNeeds({ branchId, jobTitle = null } = {}) {
  const TrainingPlan = getModel('TrainingPlan', '../../models/HR/TrainingPlan');
  const org = await orgGaps({ branchId, jobTitle });
  const top = org.priorities.slice(0, 15);
  const gapKeyToName = {};
  for (const p of top) gapKeyToName[p.competencyKey] = p.competencyNameAr;
  let trainings = [];
  if (TrainingPlan) {
    trainings = await TrainingPlan.find({ skillsCovered: { $in: Object.keys(gapKeyToName) } })
      .select('title skillsCovered')
      .limit(200)
      .lean();
  }
  return { priorities: top, recommendedTrainings: lib.matchTrainings(gapKeyToName, trainings) };
}

function throwUnavailable(what) {
  const e = new Error(`${what} unavailable`);
  e.code = 'MODEL_UNAVAILABLE';
  throw e;
}
function throwValidation(msg) {
  const e = new Error(msg);
  e.code = 'VALIDATION';
  throw e;
}

module.exports = {
  jobTitleOf,
  upsertAssessment,
  upsertRequirement,
  employeeGaps,
  orgGaps,
  trainingNeeds,
};
