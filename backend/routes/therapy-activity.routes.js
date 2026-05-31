'use strict';

/**
 * therapy-activity.routes.js — Wave 697.
 *
 * Unified, read-only cross-module THERAPY-ACTIVITY rollup for a beneficiary
 * (and a branch summary). Fans out across the W680–W693 session/clinical
 * models and distils each into a small outcome card, so a clinician sees
 * the whole therapy picture in one call instead of six.
 *
 * NO new model — pure aggregation. Lazy `mongoose.model` lookups so a model
 * that isn't registered just contributes an empty card (graceful). Every
 * query is branch-scoped (W269/W445); never reads the always-undefined
 * per-request branch field.
 *
 * Mounted via dualMountAuth at /api/(v1/)?therapy-activity.
 *
 * Endpoints (2):
 *   GET /by-beneficiary/:id   — per-beneficiary cross-module activity + breaches
 *   GET /summary              — branch-level counts + breach totals
 *
 * The pure `summarizeActivity(raw)` helper is exported for unit testing.
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
  'therapist',
  'physician',
  'psychologist',
  'quality',
];

function lazyModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

const TERMINAL_PO = ['completed', 'cancelled'];

/**
 * Pure summariser — turns raw per-modality document arrays into outcome
 * cards + a breach roll-up. No DB, no Date mutation beyond Date.now compare.
 * @param {object} raw - { dtt, arts, adjunct, sensory, vfss, pando } arrays
 * @param {number} [now] - epoch ms (injected for deterministic tests)
 */
function summarizeActivity(raw, now = Date.now()) {
  const dtt = Array.isArray(raw.dtt) ? raw.dtt : [];
  const arts = Array.isArray(raw.arts) ? raw.arts : [];
  const adjunct = Array.isArray(raw.adjunct) ? raw.adjunct : [];
  const sensory = Array.isArray(raw.sensory) ? raw.sensory : [];
  const vfss = Array.isArray(raw.vfss) ? raw.vfss : [];
  const pando = Array.isArray(raw.pando) ? raw.pando : [];

  // DTT: latest independent-correct rate (sessions already sorted desc).
  const dttCompleted = dtt.filter(d => d.status === 'completed');
  const latestDttRate =
    dttCompleted.length && typeof dttCompleted[0].independentCorrectRate === 'number'
      ? dttCompleted[0].independentCorrectRate
      : null;

  // Arts: mood-improved share among completed.
  const artsCompleted = arts.filter(a => a.status === 'completed');
  const artsMoodImproved = artsCompleted.filter(a => a.moodImproved === true).length;

  // Adjunct: incidents.
  const adjunctIncidents = adjunct.filter(a => a.incidentDuringSession === true).length;

  // Sensory: active program + regulated session count + review overdue.
  const sensoryActive = sensory.filter(s => s.status === 'active').length;
  const sensoryReviewOverdue = sensory.filter(
    s => s.status === 'active' && s.reviewDate && new Date(s.reviewDate).getTime() < now
  ).length;

  // VFSS: any study indicating aspiration.
  const vfssAspiration = vfss.filter(
    v =>
      v.aspirationDetected === true ||
      (typeof v.penetrationAspirationScale === 'number' && v.penetrationAspirationScale >= 6)
  ).length;
  const vfssSilent = vfss.filter(v => v.silentAspiration === true).length;

  // P&O: active orders + overdue follow-ups.
  const pandoActive = pando.filter(p => !TERMINAL_PO.includes(p.stage)).length;
  const pandoOverdue = pando.filter(
    p =>
      !TERMINAL_PO.includes(p.stage) &&
      p.followUpDueDate &&
      new Date(p.followUpDueDate).getTime() < now
  ).length;

  const breaches = adjunctIncidents + sensoryReviewOverdue + vfssAspiration + pandoOverdue;

  return {
    dtt: {
      total: dtt.length,
      completed: dttCompleted.length,
      latestIndependentCorrectRate: latestDttRate,
    },
    arts: { total: arts.length, completed: artsCompleted.length, moodImproved: artsMoodImproved },
    adjunct: { total: adjunct.length, incidents: adjunctIncidents },
    sensory: { total: sensory.length, active: sensoryActive, reviewOverdue: sensoryReviewOverdue },
    vfss: { total: vfss.length, aspiration: vfssAspiration, silentAspiration: vfssSilent },
    pando: { total: pando.length, active: pandoActive, overdueFollowUps: pandoOverdue },
    breaches,
  };
}

// ── GET /by-beneficiary/:id ────────────────────────────────────────────
router.get('/by-beneficiary/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    }
    const scope = { ...branchFilter(req), beneficiaryId: req.params.id };
    const limit = 50;

    async function fetch(name, sortField) {
      const Model = lazyModel(name);
      if (!Model) return [];
      try {
        return await Model.find(scope)
          .sort({ [sortField]: -1 })
          .limit(limit)
          .lean();
      } catch {
        return [];
      }
    }

    const [dtt, arts, adjunct, sensory, vfss, pando] = await Promise.all([
      fetch('DttSession', 'sessionDate'),
      fetch('CreativeArtsTherapySession', 'sessionDate'),
      fetch('AdjunctTherapySession', 'sessionDate'),
      fetch('SensoryDietProgram', 'startDate'),
      fetch('InstrumentalSwallowStudy', 'orderedDate'),
      fetch('ProstheticOrthoticOrder', 'prescribedDate'),
    ]);

    // DttSession.independentCorrectRate is a virtual absent from .lean();
    // compute it here so the summariser sees it.
    for (const d of dtt) {
      let total = 0;
      let ind = 0;
      for (const t of d.targets || []) {
        for (const tr of t.trials || []) {
          total++;
          if (tr.response === 'correct' && tr.promptLevel === 'independent') ind++;
        }
      }
      d.independentCorrectRate = total ? Math.round((ind / total) * 100) : null;
    }
    for (const a of arts) {
      if (a.moodBefore && a.moodAfter) {
        const RANK = { distressed: 0, anxious: 1, sad: 2, neutral: 3, content: 4, happy: 5 };
        a.moodImproved = (RANK[a.moodAfter] ?? 0) > (RANK[a.moodBefore] ?? 0);
      }
    }

    const summary = summarizeActivity({ dtt, arts, adjunct, sensory, vfss, pando });
    res.json({ success: true, beneficiaryId: req.params.id, summary });
  } catch (err) {
    return safeError(res, err, 'therapyActivity.byBeneficiary');
  }
});

// ── GET /summary — branch-level counts + breach totals ─────────────────
router.get('/summary', requireRole(READ_ROLES), async (req, res) => {
  try {
    const scope = { ...branchFilter(req) };
    if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      scope.branchId = req.query.branchId;
    }
    const now = Date.now();

    async function count(name, filter) {
      const Model = lazyModel(name);
      if (!Model) return 0;
      try {
        return await Model.countDocuments({ ...scope, ...filter });
      } catch {
        return 0;
      }
    }

    const [
      dttTotal,
      artsTotal,
      adjunctTotal,
      adjunctIncidents,
      sensoryActive,
      vfssAspiration,
      pandoActive,
      pandoOverdue,
    ] = await Promise.all([
      count('DttSession', {}),
      count('CreativeArtsTherapySession', {}),
      count('AdjunctTherapySession', {}),
      count('AdjunctTherapySession', { incidentDuringSession: true }),
      count('SensoryDietProgram', { status: 'active' }),
      count('InstrumentalSwallowStudy', { aspirationDetected: true }),
      count('ProstheticOrthoticOrder', { stage: { $nin: TERMINAL_PO } }),
      count('ProstheticOrthoticOrder', {
        stage: { $nin: TERMINAL_PO },
        followUpDueDate: { $ne: null, $lt: new Date(now) },
      }),
    ]);

    res.json({
      success: true,
      counts: {
        dtt: dttTotal,
        arts: artsTotal,
        adjunct: adjunctTotal,
        sensoryActive,
        pandoActive,
      },
      breaches: {
        adjunctIncidents,
        vfssAspiration,
        pandoOverdueFollowUps: pandoOverdue,
        total: adjunctIncidents + vfssAspiration + pandoOverdue,
      },
    });
  } catch (err) {
    return safeError(res, err, 'therapyActivity.summary');
  }
});

module.exports = router;
module.exports.summarizeActivity = summarizeActivity;
