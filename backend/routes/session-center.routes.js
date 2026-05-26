'use strict';

/**
 * Session Center Routes — مسارات مركز الجلسات العلاجية
 * ══════════════════════════════════════════════════════════════════
 * GET  /api/v1/session-center/dashboard                — KPIs + توزيعات
 * GET  /api/v1/session-center/calendar                 — فتحات التقويم
 * GET  /api/v1/session-center/therapist-load           — حمل المعالجين
 * GET  /api/v1/session-center/attendance               — تقرير الحضور
 * GET  /api/v1/session-center/episode/:episodeId       — جلسات حلقة علاجية
 * GET  /api/v1/session-center/beneficiary/:beneficiaryId — تاريخ جلسات مستفيد
 * GET  /api/v1/session-center/goals/:episodeId         — تقدم الأهداف
 * GET  /api/v1/session-center/soap/:sessionId          — SOAP جلسة
 * ══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const { branchScopedBeneficiaryParam } = require('../middleware/assertBranchMatch');
const router = express.Router();
// W440: auto-enforce branch ownership on every :beneficiaryId param.
router.param('beneficiaryId', branchScopedBeneficiaryParam);
const sessionCenterSvc = require('../services/sessionCenter.service');
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

// Dashboard — KPIs + trends + distributions
router.get(
  '/dashboard',
  auth,
  wrap(async (req, res) => {
    const data = await sessionCenterSvc.getDashboard({ from: req.query.from, to: req.query.to });
    res.json({ success: true, data });
  })
);

// Calendar slots
router.get(
  '/calendar',
  auth,
  wrap(async (req, res) => {
    const { year, month, therapistId, beneficiaryId } = req.query;
    const data = await sessionCenterSvc.getCalendarSlots({
      year,
      month,
      therapistId,
      beneficiaryId,
    });
    res.json({ success: true, data });
  })
);

// Therapist load
router.get(
  '/therapist-load',
  auth,
  wrap(async (req, res) => {
    const { from, to, therapistId } = req.query;
    const data = await sessionCenterSvc.getTherapistLoad({ from, to, therapistId });
    res.json({ success: true, data });
  })
);

// Attendance report
router.get(
  '/attendance',
  auth,
  wrap(async (req, res) => {
    const { from, to, beneficiaryId, therapistId } = req.query;
    const data = await sessionCenterSvc.getAttendanceReport({
      from,
      to,
      beneficiaryId,
      therapistId,
    });
    res.json({ success: true, data });
  })
);

// Episode sessions + progress meta
router.get(
  '/episode/:episodeId',
  auth,
  wrap(async (req, res) => {
    const data = await sessionCenterSvc.getEpisodeSessions(req.params.episodeId);
    res.json({ success: true, data });
  })
);

// Beneficiary session timeline
router.get(
  '/beneficiary/:beneficiaryId',
  auth,
  wrap(async (req, res) => {
    const { from, to, limit } = req.query;
    const data = await sessionCenterSvc.getBeneficiarySessions(req.params.beneficiaryId, {
      from,
      to,
      limit: parseInt(limit, 10) || 50,
    });
    res.json({ success: true, data });
  })
);

// Goals progress for an episode
router.get(
  '/goals/:episodeId',
  auth,
  wrap(async (req, res) => {
    const data = await sessionCenterSvc.getGoalsProgress(req.params.episodeId);
    res.json({ success: true, data });
  })
);

// SOAP summary for a single session
router.get(
  '/soap/:sessionId',
  auth,
  wrap(async (req, res) => {
    const data = await sessionCenterSvc.getSOAPSummary(req.params.sessionId);
    if (!data) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });
    res.json({ success: true, data });
  })
);

module.exports = router;
