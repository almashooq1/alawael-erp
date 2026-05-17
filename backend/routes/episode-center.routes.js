'use strict';

/**
 * Episode Center Routes — مسارات مركز الحلقة العلاجية الموحدة
 * ══════════════════════════════════════════════════════════════════
 * GET  /api/v1/episode-center/dashboard          — لوحة تحكم الحلقات
 * GET  /api/v1/episode-center                    — قائمة الحلقات
 * POST /api/v1/episode-center                    — إنشاء حلقة جديدة
 * GET  /api/v1/episode-center/:id                — الحلقة الكاملة
 * POST /api/v1/episode-center/:id/advance-phase  — تقدم للمرحلة التالية
 * PATCH /api/v1/episode-center/:id/status        — تحديث الحالة
 * POST /api/v1/episode-center/:id/team-member    — إضافة عضو للفريق
 * GET  /api/v1/episode-center/beneficiary/:bid   — حلقات مستفيد معين
 * ══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const episodeCenterSvc = require('../services/episodeCenter.service');
const logger = require('../utils/logger');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

let auth;
try {
  const authMod = require('../middleware/auth');
  auth = authMod.requireAuth || authMod.authenticateToken || authMod;
  if (typeof auth !== 'function') auth = (_req, _res, next) => next();
} catch {
  auth = (_req, _res, next) => next();
}

// Dashboard
router.get(
  '/dashboard',
  auth,
  wrap(async (req, res) => {
    const data = await episodeCenterSvc.getDashboard(req.query);
    res.json({ success: true, data });
  })
);

// List & Create
router.get(
  '/',
  auth,
  wrap(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      priority,
      phase,
      beneficiaryId,
      branchId,
      sort,
    } = req.query;
    const data = await episodeCenterSvc.list({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      status,
      type,
      priority,
      phase,
      beneficiaryId,
      branchId,
      sort,
    });
    res.json({ success: true, ...data });
  })
);

router.post(
  '/',
  auth,
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const episode = await episodeCenterSvc.create(req.body, actorId);
    logger.info('[EpisodeCenter] New episode created by %s', actorId);
    res.status(201).json({ success: true, data: episode });
  })
);

// Beneficiary episodes (before /:id to avoid collision)
router.get(
  '/beneficiary/:bid',
  auth,
  wrap(async (req, res) => {
    const data = await episodeCenterSvc.list({ beneficiaryId: req.params.bid, limit: 50 });
    res.json({ success: true, ...data });
  })
);

// Single episode
router.get(
  '/:id',
  auth,
  wrap(async (req, res) => {
    const data = await episodeCenterSvc.getFullEpisode(req.params.id);
    if (!data)
      return res.status(404).json({ success: false, message: 'الحلقة العلاجية غير موجودة' });
    res.json({ success: true, data });
  })
);

// Advance phase
router.post(
  '/:id/advance-phase',
  auth,
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const { notes } = req.body;
    const data = await episodeCenterSvc.advancePhase(req.params.id, notes, actorId);
    res.json({ success: true, data });
  })
);

// Update status
router.patch(
  '/:id/status',
  auth,
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status مطلوب' });
    const data = await episodeCenterSvc.updateStatus(req.params.id, status, reason, actorId);
    res.json({ success: true, data });
  })
);

// Add team member
router.post(
  '/:id/team-member',
  auth,
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const data = await episodeCenterSvc.addTeamMember(req.params.id, req.body, actorId);
    res.json({ success: true, data });
  })
);

module.exports = router;
