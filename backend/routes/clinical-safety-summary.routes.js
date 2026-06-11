'use strict';

/**
 * clinical-safety-summary.routes.js — Wave 1040.
 *
 * "ملخّص السلامة السريرية" — a READ-ONLY aggregation surface that unifies a
 * beneficiary's standing clinical-safety status across the five W1010-W1022
 * assessment modules + the seizure log, so a clinician sees every active
 * safety risk in ONE place at the point of care (instead of opening five
 * separate screens), and ops gets a branch-wide flagged-beneficiary feed.
 *
 * No own model — it fans out (read-only) over:
 *   • FallsRiskAssessment        (W1010) — latest finalized risk level
 *   • PressureInjuryRecord       (W1011) — open injuries + worst stage + HAPI
 *   • SleepAssessment            (W1020) — latest finalized severity + OSA
 *   • OrientationMobilityAssessment (W1021) — latest finalized independence
 *   • DrivingRehabAssessment     (W1022) — latest finalized recommendation
 *   • SeizureEvent               (W356)  — recent-event count
 *
 * Endpoints (mounted via dualMountAuth at /api/(v1/)?clinical-safety-summary):
 *   GET /by-beneficiary/:id  — consolidated safety summary + computed flags for one beneficiary
 *   GET /alerts              — branch-wide: every beneficiary with ≥1 active safety flag
 *   GET /stats               — branch-wide counts per flag type
 *
 * Branch-scoped on every query (W269/W445). Read-only: zero writes.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { authenticateToken, requireRole } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');

router.use(authenticateToken);
router.use(requireBranchAccess);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'clinical_supervisor',
  'physician',
  'nurse',
  'therapist',
  'teacher',
  'quality',
];

// Stages that count as a serious (stage-3+) pressure injury.
const SERIOUS_STAGES = ['stage_3', 'stage_4', 'unstageable', 'deep_tissue_injury'];
const OPEN_INJURY_STATUSES = ['active', 'monitoring', 'healing'];

function safeModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

function lazyBeneficiary() {
  return safeModel('Beneficiary');
}

/**
 * Build the per-beneficiary safety summary from already-fetched latest rows.
 * Pure — no DB access — so it's deterministic + unit-testable.
 */
function buildSummary(beneficiaryId, sources) {
  const { falls, injuries, sleep, om, driving, seizure30dCount } = sources;
  const flags = [];
  const now = Date.now();
  const overdue = d => d && d.nextReviewDue && new Date(d.nextReviewDue).getTime() < now;

  // Falls
  let fallsOut = null;
  if (falls) {
    const od = falls.status === 'finalized' && overdue(falls);
    fallsOut = {
      riskLevel: falls.riskLevel,
      riskScore: falls.riskScore,
      date: falls.date,
      overdue: !!od,
    };
    if (falls.riskLevel === 'high') flags.push('falls_high_risk');
    if (od) flags.push('falls_reassessment_overdue');
  }

  // Pressure injuries (multiple open rows)
  let injuryOut = null;
  if (Array.isArray(injuries) && injuries.length) {
    const open = injuries.filter(i => OPEN_INJURY_STATUSES.includes(i.status));
    const worst = open.find(i => SERIOUS_STAGES.includes(i.stage));
    const hapi = open.some(i => i.origin === 'facility_acquired');
    const od = open.some(i => overdue(i));
    injuryOut = {
      openCount: open.length,
      worstStage: worst ? worst.stage : open.length ? open[0].stage : null,
      facilityAcquired: hapi,
      overdue: od,
    };
    if (open.length) flags.push('open_pressure_injury');
    if (worst) flags.push('pressure_injury_stage3plus');
    if (hapi) flags.push('hospital_acquired_pressure_injury');
    if (od) flags.push('pressure_injury_reassessment_overdue');
  }

  // Sleep
  let sleepOut = null;
  if (sleep) {
    const od = sleep.status === 'finalized' && overdue(sleep);
    sleepOut = {
      problemSeverity: sleep.problemSeverity,
      suspectedOSA: !!sleep.suspectedOSA,
      overdue: !!od,
    };
    if (sleep.problemSeverity === 'severe') flags.push('severe_sleep_disturbance');
    if (sleep.suspectedOSA) flags.push('suspected_sleep_apnea');
    if (od) flags.push('sleep_reassessment_overdue');
  }

  // Orientation & Mobility
  let omOut = null;
  if (om) {
    const od = om.status === 'finalized' && overdue(om);
    omOut = {
      independenceLevel: om.independenceLevel,
      independenceScore: om.independenceScore,
      overdue: !!od,
    };
    if (om.independenceLevel === 'dependent') flags.push('mobility_dependent');
    if (od) flags.push('om_reassessment_overdue');
  }

  // Driving rehab
  let drivingOut = null;
  if (driving) {
    const od = driving.status === 'finalized' && overdue(driving);
    drivingOut = { recommendation: driving.recommendation, overdue: !!od };
    if (driving.recommendation === 'not_fit_currently') flags.push('not_fit_to_drive');
    if (od) flags.push('driving_reassessment_overdue');
  }

  // Seizures
  let seizureOut = null;
  if (typeof seizure30dCount === 'number' && seizure30dCount > 0) {
    seizureOut = { last30dCount: seizure30dCount };
    if (seizure30dCount >= 3) flags.push('frequent_seizures');
  }

  return {
    beneficiaryId: String(beneficiaryId),
    falls: fallsOut,
    pressureInjury: injuryOut,
    sleep: sleepOut,
    orientationMobility: omOut,
    drivingRehab: drivingOut,
    seizure: seizureOut,
    flags,
    flagCount: flags.length,
    hasActiveFlag: flags.length > 0,
  };
}

async function latestFinalized(modelName, beneficiaryId, req) {
  const M = safeModel(modelName);
  if (!M) return null;
  return M.findOne({ ...branchFilter(req), beneficiaryId, status: 'finalized' })
    .sort({ date: -1, createdAt: -1 })
    .lean();
}

async function gatherSources(beneficiaryId, req) {
  const Injury = safeModel('PressureInjuryRecord');
  const Seizure = safeModel('SeizureEvent');
  const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [falls, injuries, sleep, om, driving, seizure30dCount] = await Promise.all([
    latestFinalized('FallsRiskAssessment', beneficiaryId, req),
    Injury
      ? Injury.find({ ...branchFilter(req), beneficiaryId, status: { $in: OPEN_INJURY_STATUSES } })
          .select('status stage origin nextReviewDue')
          .limit(50)
          .lean()
      : [],
    latestFinalized('SleepAssessment', beneficiaryId, req),
    latestFinalized('OrientationMobilityAssessment', beneficiaryId, req),
    latestFinalized('DrivingRehabAssessment', beneficiaryId, req),
    Seizure
      ? Seizure.countDocuments({
          ...branchFilter(req),
          beneficiaryId,
          startTime: { $gte: cutoff30d },
        })
      : 0,
  ]);
  return { falls, injuries, sleep, om, driving, seizure30dCount };
}

// ── GET /by-beneficiary/:id ───────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const sources = await gatherSources(req.params.id, req);
    const summary = buildSummary(req.params.id, sources);
    res.json({ success: true, data: summary });
  } catch (err) {
    return safeError(res, err, 'clinicalSafety.byBeneficiary');
  }
});

// ── GET /alerts — branch-wide flagged beneficiaries ───────────────────
router.get('/alerts', requireRole(READ_ROLES), async (req, res) => {
  try {
    const bf = branchFilter(req);
    const Falls = safeModel('FallsRiskAssessment');
    const Injury = safeModel('PressureInjuryRecord');
    const Sleep = safeModel('SleepAssessment');
    const OM = safeModel('OrientationMobilityAssessment');
    const Driving = safeModel('DrivingRehabAssessment');

    // Collect candidate beneficiaryIds from each module's flagged cohort.
    const ids = new Set();
    const add = rows => rows.forEach(r => r.beneficiaryId && ids.add(String(r.beneficiaryId)));

    const tasks = [];
    if (Falls)
      tasks.push(
        Falls.find({ ...bf, status: 'finalized', riskLevel: 'high' })
          .select('beneficiaryId')
          .limit(2000)
          .lean()
          .then(add)
      );
    if (Injury)
      tasks.push(
        Injury.find({ ...bf, status: { $in: OPEN_INJURY_STATUSES } })
          .select('beneficiaryId')
          .limit(2000)
          .lean()
          .then(add)
      );
    if (Sleep)
      tasks.push(
        Sleep.find({ ...bf, status: 'finalized', problemSeverity: 'severe' })
          .select('beneficiaryId')
          .limit(2000)
          .lean()
          .then(add)
      );
    if (OM)
      tasks.push(
        OM.find({ ...bf, status: 'finalized', independenceLevel: 'dependent' })
          .select('beneficiaryId')
          .limit(2000)
          .lean()
          .then(add)
      );
    if (Driving)
      tasks.push(
        Driving.find({ ...bf, status: 'finalized', recommendation: 'not_fit_currently' })
          .select('beneficiaryId')
          .limit(2000)
          .lean()
          .then(add)
      );
    // Overdue reassessments (any module) are also alert-worthy.
    const now = new Date();
    for (const M of [Falls, Sleep, OM, Driving, Injury]) {
      if (M)
        tasks.push(
          M.find({
            ...bf,
            status: M === Injury ? { $in: OPEN_INJURY_STATUSES } : 'finalized',
            nextReviewDue: { $ne: null, $lt: now },
          })
            .select('beneficiaryId')
            .limit(2000)
            .lean()
            .then(add)
        );
    }
    await Promise.all(tasks);

    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const idList = [...ids].filter(id => mongoose.isValidObjectId(id)).slice(0, limit);
    const summaries = await Promise.all(
      idList.map(async id => buildSummary(id, await gatherSources(id, req)))
    );
    const flagged = summaries
      .filter(s => s.hasActiveFlag)
      .sort((a, b) => b.flagCount - a.flagCount);

    // Hydrate beneficiary names.
    const Beneficiary = lazyBeneficiary();
    let nameMap = new Map();
    if (Beneficiary && flagged.length) {
      const benefs = await Beneficiary.find({ _id: { $in: flagged.map(s => s.beneficiaryId) } })
        .select('firstName_ar lastName_ar beneficiaryNumber')
        .lean();
      nameMap = new Map(benefs.map(b => [String(b._id), b]));
    }
    const items = flagged.map(s => ({ ...s, beneficiary: nameMap.get(s.beneficiaryId) || null }));
    res.json({ success: true, items, count: items.length });
  } catch (err) {
    return safeError(res, err, 'clinicalSafety.alerts');
  }
});

// ── GET /stats — branch-wide counts per flag type ─────────────────────
router.get('/stats', requireRole(READ_ROLES), async (req, res) => {
  try {
    const bf = branchFilter(req);
    const Falls = safeModel('FallsRiskAssessment');
    const Injury = safeModel('PressureInjuryRecord');
    const Sleep = safeModel('SleepAssessment');
    const OM = safeModel('OrientationMobilityAssessment');
    const Driving = safeModel('DrivingRehabAssessment');
    const now = new Date();

    const [fallsHigh, openInjury, hapiInjury, severeSleep, osaSleep, depMobility, notFitDriving] =
      await Promise.all([
        Falls ? Falls.countDocuments({ ...bf, status: 'finalized', riskLevel: 'high' }) : 0,
        Injury ? Injury.countDocuments({ ...bf, status: { $in: OPEN_INJURY_STATUSES } }) : 0,
        Injury
          ? Injury.countDocuments({
              ...bf,
              status: { $in: OPEN_INJURY_STATUSES },
              origin: 'facility_acquired',
            })
          : 0,
        Sleep ? Sleep.countDocuments({ ...bf, status: 'finalized', problemSeverity: 'severe' }) : 0,
        Sleep ? Sleep.countDocuments({ ...bf, status: 'finalized', suspectedOSA: true }) : 0,
        OM ? OM.countDocuments({ ...bf, status: 'finalized', independenceLevel: 'dependent' }) : 0,
        Driving
          ? Driving.countDocuments({
              ...bf,
              status: 'finalized',
              recommendation: 'not_fit_currently',
            })
          : 0,
      ]);

    const overdueTasks = [];
    for (const M of [Falls, Sleep, OM, Driving]) {
      overdueTasks.push(
        M
          ? M.countDocuments({ ...bf, status: 'finalized', nextReviewDue: { $ne: null, $lt: now } })
          : 0
      );
    }
    overdueTasks.push(
      Injury
        ? Injury.countDocuments({
            ...bf,
            status: { $in: OPEN_INJURY_STATUSES },
            nextReviewDue: { $ne: null, $lt: now },
          })
        : 0
    );
    const overdueCounts = await Promise.all(overdueTasks);
    const reassessmentOverdue = overdueCounts.reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      flags: {
        falls_high_risk: fallsHigh,
        open_pressure_injury: openInjury,
        hospital_acquired_pressure_injury: hapiInjury,
        severe_sleep_disturbance: severeSleep,
        suspected_sleep_apnea: osaSleep,
        mobility_dependent: depMobility,
        not_fit_to_drive: notFitDriving,
        reassessment_overdue: reassessmentOverdue,
      },
    });
  } catch (err) {
    return safeError(res, err, 'clinicalSafety.stats');
  }
});

module.exports = router;
module.exports.buildSummary = buildSummary; // exported for unit tests
