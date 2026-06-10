/**
 * Episodes Routes — مسارات API للحلقات العلاجية (Episode of Care)
 *
 * الهدف السريري: إدارة الحلقة العلاجية الموحدة لكل مستفيد —
 * النقطة المحورية التي تربط التقييمات والخطط والجلسات والمقاييس.
 *
 * @module domains/episodes/routes/episodes.routes
 */

'use strict';

const express = require('express');
const router = express.Router();
// W1140 — cross-branch isolation (W269 doctrine): auto-enforce beneficiary
// ownership on every :beneficiaryId param + body-carried beneficiary ids.
const {
  branchScopedBeneficiaryParam,
  bodyScopedBeneficiaryGuard,
} = require('../../../middleware/assertBranchMatch');
router.param('beneficiaryId', branchScopedBeneficiaryParam);
router.use(bodyScopedBeneficiaryGuard);
const {
  validateCreateEpisode,
  validateUpdateEpisode,
  validateDischarge,
  validateAddTeamMember,
  validate,
} = require('../validators/episodes.validator');

// ─── Service (lazy-load to avoid circular deps at startup) ───────────────────

let episodesDomain;
try {
  episodesDomain = require('../index');
} catch (_e) {
  episodesDomain = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Guard: return 503 if the domain service is not initialised yet */
const requireDomain = (req, res, next) => {
  if (!episodesDomain?.service) {
    return res.status(503).json({ success: false, message: 'Episodes service unavailable' });
  }
  return next();
};

const svc = () => episodesDomain?.service;

// ═══════════════════════════════════════════════════════════════════════════════
// Collection routes
// ═══════════════════════════════════════════════════════════════════════════════

/** GET / — قائمة الحلقات مع pagination */
router.get(
  '/',
  requireDomain,
  asyncHandler(async (req, res) => {
    const result = await svc().list({
      filter: {
        isDeleted: { $ne: true },
        ...(req.query.branchId && { branchId: req.query.branchId }),
        ...(req.query.status && { status: req.query.status }),
      },
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
      sort: { startDate: -1 },
    });
    res.json({ success: true, ...result });
  })
);

/** GET /statistics — إحصائيات الحلقات */
router.get(
  '/statistics',
  requireDomain,
  asyncHandler(async (req, res) => {
    const stats = await svc().getStatistics(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data: stats });
  })
);

/** GET /phase/:phase — حلقات مرحلة معينة */
router.get(
  '/phase/:phase',
  requireDomain,
  asyncHandler(async (req, res) => {
    const data = await svc().getByPhase(req.params.phase, req.query.branchId || req.user?.branchId);
    res.json({ success: true, data, total: data.length });
  })
);

/** GET /therapist/:therapistId — حلقات أخصائي */
router.get(
  '/therapist/:therapistId',
  requireDomain,
  asyncHandler(async (req, res) => {
    const result = await svc().getByTherapist(req.params.therapistId, {
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    });
    res.json({ success: true, ...result });
  })
);

/** GET /beneficiary/:beneficiaryId — جميع حلقات مستفيد */
router.get(
  '/beneficiary/:beneficiaryId',
  requireDomain,
  asyncHandler(async (req, res) => {
    const result = await svc().getAllForBeneficiary(req.params.beneficiaryId, {
      page: parseInt(req.query.page, 10) || 1,
      limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    });
    res.json({ success: true, ...result });
  })
);

/** GET /beneficiary/:beneficiaryId/active — الحلقة النشطة لمستفيد */
router.get(
  '/beneficiary/:beneficiaryId/active',
  requireDomain,
  asyncHandler(async (req, res) => {
    const episode = await svc().getActiveEpisode(req.params.beneficiaryId);
    res.json({ success: true, data: episode });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Single resource routes
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /:id — حلقة واحدة */
router.get(
  '/:id',
  requireDomain,
  asyncHandler(async (req, res) => {
    const episode = await svc().getById(req.params.id, {
      populate: [
        {
          path: 'beneficiaryId',
          select: 'firstName lastName fullNameArabic mrn disability status',
        },
        { path: 'leadTherapistId', select: 'firstName lastName' },
        { path: 'careTeam.userId', select: 'firstName lastName' },
      ],
    });
    res.json({ success: true, data: episode });
  })
);

/** POST / — إنشاء حلقة جديدة */
router.post(
  '/',
  requireDomain,
  validate(validateCreateEpisode),
  asyncHandler(async (req, res) => {
    const context = { userId: req.user?._id, branchId: req.user?.branchId };
    const episode = await svc().create(req.body, context);
    res.status(201).json({ success: true, data: episode });
  })
);

/** PUT /:id — تحديث بيانات الحلقة */
router.put(
  '/:id',
  requireDomain,
  validate(validateUpdateEpisode),
  asyncHandler(async (req, res) => {
    const context = { userId: req.user?._id };
    const updated = await svc().update(req.params.id, req.body, context);
    res.json({ success: true, data: updated });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Workflow transitions
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /:id/advance-phase — تقدم مرحلة العلاج */
router.post(
  '/:id/advance-phase',
  requireDomain,
  asyncHandler(async (req, res) => {
    const result = await svc().advancePhase(req.params.id, req.user?._id);
    res.json({ success: true, data: result });
  })
);

/** POST /:id/suspend — تعليق الحلقة */
router.post(
  '/:id/suspend',
  requireDomain,
  asyncHandler(async (req, res) => {
    const result = await svc().suspendEpisode(req.params.id, req.body.reason, req.user?._id);
    res.json({ success: true, data: result });
  })
);

/** POST /:id/resume — استئناف الحلقة */
router.post(
  '/:id/resume',
  requireDomain,
  asyncHandler(async (req, res) => {
    const result = await svc().resumeEpisode(req.params.id, req.user?._id);
    res.json({ success: true, data: result });
  })
);

/** POST /:id/discharge — إنهاء الحلقة وخروج المستفيد */
router.post(
  '/:id/discharge',
  requireDomain,
  validate(validateDischarge),
  asyncHandler(async (req, res) => {
    const result = await svc().dischargeEpisode(req.params.id, {
      ...req.body,
      dischargedBy: req.user?._id,
    });
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Care team management
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /:id/team — إضافة عضو للفريق العلاجي */
router.post(
  '/:id/team',
  requireDomain,
  validate(validateAddTeamMember),
  asyncHandler(async (req, res) => {
    const result = await svc().addTeamMember(req.params.id, req.body);
    res.json({ success: true, data: result });
  })
);

/** DELETE /:id/team/:userId — إزالة عضو من الفريق */
router.delete(
  '/:id/team/:userId',
  requireDomain,
  asyncHandler(async (req, res) => {
    const result = await svc().removeTeamMember(req.params.id, req.params.userId);
    res.json({ success: true, data: result });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Clinical Summary — ملخص سريري شامل للحلقة (Dashboard-ready)
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /:id/summary — ملخص الحلقة: تقييمات + جلسات + خطط + أهداف */
router.get(
  '/:id/summary',
  requireDomain,
  asyncHandler(async (req, res) => {
    const mongoose = require('mongoose');
    const episodeId = req.params.id;

    if (!mongoose.isValidObjectId(episodeId)) {
      return res.status(400).json({ success: false, message: 'معرّف الحلقة غير صالح' });
    }

    const TherapySession = require('../../../models/TherapySession');
    const ClinicalAssessment = require('../../../models/ClinicalAssessment');
    const CarePlan = mongoose.models.CarePlan || null;
    const Goal = mongoose.models.RehabGoal || mongoose.models.Goal || null;

    const [episode, sessionCount, assessmentCount, latestAssessment, recentSessions] =
      await Promise.all([
        svc().getById(episodeId),
        TherapySession.countDocuments({ episodeOfCare: episodeId }),
        ClinicalAssessment.countDocuments({ episodeOfCare: episodeId }),
        ClinicalAssessment.findOne({ episodeOfCare: episodeId })
          .sort({ assessmentDate: -1 })
          .select('tool category score interpretation assessmentDate')
          .lean(),
        TherapySession.find({ episodeOfCare: episodeId })
          .sort({ date: -1 })
          .limit(5)
          .select('title sessionType status date startTime endTime')
          .lean(),
      ]);

    const [activePlanCount, goalCount] = await Promise.all([
      CarePlan
        ? CarePlan.countDocuments({
            episodeOfCare: episodeId,
            status: { $nin: ['archived', 'completed'] },
          })
        : Promise.resolve(0),
      Goal ? Goal.countDocuments({ episodeOfCare: episodeId }) : Promise.resolve(0),
    ]);

    res.json({
      success: true,
      data: {
        episode,
        metrics: {
          sessionCount,
          assessmentCount,
          activePlanCount,
          goalCount,
        },
        latestAssessment,
        recentSessions,
      },
    });
  })
);

module.exports = router;
