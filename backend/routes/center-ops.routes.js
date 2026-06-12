'use strict';

/**
 * center-ops.routes.js — W1269 (مركز عمليات المركز).
 *
 * One branch-scoped operational pulse for the branch manager, aggregating
 * the surfaces this cycle built/secured into a single READ-ONLY call —
 * plus the actionable SMART loop closer:
 *
 *   GET /overview
 *     beneficiaries  — active count + clinical-phase distribution
 *     plans          — active / draft / overdue-review counts
 *     sessionsWeek   — scheduled + completed ClinicalSessions (7d)
 *     behaviorWeek   — incidents (7d) + aggression count (fed by W1251)
 *     cbahi          — attestation status distribution
 *
 *   GET /missing-plans  ← the gap detector
 *     ACTIVE beneficiaries holding an OPEN episode but NO active/draft
 *     UnifiedCarePlan — each row is one click away from the W1264 smart
 *     composer. Detection → suggestion → creation, loop closed.
 *
 * Every tile is fail-soft (Promise.allSettled; a broken model nulls its
 * tile, never the response). READ-ONLY by design; W269 branch isolation.
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
  'branch_manager',
  'clinical_supervisor',
  'quality',
];

function tryModel(name) {
  try {
    return mongoose.model(name);
  } catch (_e) {
    return null;
  }
}

const DAY_MS = 24 * 3600 * 1000;

// ── GET /overview — the operational pulse ────────────────────────────
router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const bFilter = branchFilter(req);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

    const Beneficiary = tryModel('Beneficiary');
    const Episode = tryModel('EpisodeOfCare');
    const Plan = tryModel('UnifiedCarePlan');
    const ClinicalSession = tryModel('ClinicalSession');
    const BehaviorIncident = tryModel('BehaviorIncident');
    const Cbahi = tryModel('CbahiAttestation');

    const settled = await Promise.allSettled([
      // 0: active beneficiaries
      Beneficiary
        ? Beneficiary.countDocuments({ ...bFilter, status: 'active' })
        : Promise.reject(new Error('model')),
      // 1: open episodes by clinical phase
      Episode
        ? Episode.aggregate([
            {
              $match: {
                ...bFilter,
                status: { $in: ['planned', 'active', 'on_hold', 'suspended'] },
              },
            },
            { $group: { _id: '$currentPhase', count: { $sum: 1 } } },
          ])
        : Promise.reject(new Error('model')),
      // 2: plans by status (live set)
      Plan
        ? Plan.aggregate([
            { $match: { ...bFilter, isDeleted: { $ne: true } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
        : Promise.reject(new Error('model')),
      // 3: plans overdue for review
      Plan
        ? Plan.countDocuments({
            ...bFilter,
            isDeleted: { $ne: true },
            status: { $in: ['active', 'under_review'] },
            nextReviewDate: { $ne: null, $lt: now },
          })
        : Promise.reject(new Error('model')),
      // 4: sessions in the last 7 days
      ClinicalSession
        ? ClinicalSession.aggregate([
            { $match: { ...bFilter, scheduledDate: { $gte: weekAgo } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
        : Promise.reject(new Error('model')),
      // 5: behavior incidents in the last 7 days (W1251 feeds this)
      BehaviorIncident
        ? BehaviorIncident.aggregate([
            { $match: { observedAt: { $gte: weekAgo } } },
            { $group: { _id: '$behaviorType', count: { $sum: 1 } } },
          ])
        : Promise.reject(new Error('model')),
      // 6: CBAHI attestation distribution
      Cbahi
        ? Cbahi.aggregate([
            { $match: { ...bFilter } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ])
        : Promise.reject(new Error('model')),
    ]);

    const val = i => (settled[i].status === 'fulfilled' ? settled[i].value : null);
    const toMap = rows =>
      Array.isArray(rows)
        ? rows.reduce((acc, r) => ((acc[r._id || 'unknown'] = r.count), acc), {})
        : null;

    const behavior = toMap(val(5));
    return res.json({
      success: true,
      data: {
        beneficiaries: { active: val(0), byClinicalPhase: toMap(val(1)) },
        plans: { byStatus: toMap(val(2)), overdueReview: val(3) },
        sessionsWeek: toMap(val(4)),
        behaviorWeek: behavior ? { byType: behavior, aggression: behavior.aggression || 0 } : null,
        cbahi: toMap(val(6)),
        generatedAt: now.toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: safeError(err) });
  }
});

// ── GET /missing-plans — the smart-loop gap detector ─────────────────
router.get('/missing-plans', requireRole(READ_ROLES), async (req, res) => {
  try {
    const bFilter = branchFilter(req);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 100);

    const Episode = tryModel('EpisodeOfCare');
    const Plan = tryModel('UnifiedCarePlan');
    const Beneficiary = tryModel('Beneficiary');
    if (!Episode || !Plan || !Beneficiary) {
      return res.status(503).json({ success: false, message: 'required models unavailable' });
    }

    // Beneficiaries with an OPEN episode…
    const openEpisodes = await Episode.find({
      ...bFilter,
      status: { $in: ['planned', 'active', 'on_hold', 'suspended'] },
    })
      .select('beneficiaryId')
      .limit(1000)
      .lean();
    const withEpisode = [...new Set(openEpisodes.map(e => String(e.beneficiaryId)))];

    // …minus those already holding a live/draft plan
    const planned = await Plan.find({
      beneficiaryId: { $in: withEpisode },
      isDeleted: { $ne: true },
      status: { $in: ['draft', 'pending_approval', 'active', 'under_review'] },
    })
      .select('beneficiaryId')
      .lean();
    const plannedSet = new Set(planned.map(p => String(p.beneficiaryId)));
    const gapIds = withEpisode.filter(id => !plannedSet.has(id)).slice(0, limit);

    const rows = await Beneficiary.find({ _id: { $in: gapIds } })
      .select('firstName lastName fullName nameAr category disability.type')
      .lean();

    return res.json({
      success: true,
      data: {
        count: gapIds.length,
        totalWithOpenEpisode: withEpisode.length,
        items: rows.map(b => ({
          beneficiaryId: String(b._id),
          nameAr:
            b.nameAr || b.fullName || [b.firstName, b.lastName].filter(Boolean).join(' ') || '—',
          disabilityType: (b.disability && b.disability.type) || b.category || null,
          // The smart loop: detection → one click → the W1264 composer
          composeHint: `/care-plan-suggest?beneficiaryId=${String(b._id)}`,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
