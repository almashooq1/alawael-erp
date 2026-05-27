'use strict';

/**
 * Beneficiary Core Routes — مسارات نواة المستفيد الموحدة
 * ══════════════════════════════════════════════════════════════════
 * GET  /api/v1/beneficiary-core/dashboard         — لوحة تحكم المستفيدين
 * GET  /api/v1/beneficiary-core                   — قائمة المستفيدين
 * POST /api/v1/beneficiary-core                   — تسجيل مستفيد جديد
 * GET  /api/v1/beneficiary-core/:id/360           — الملف الشامل 360°
 * PUT  /api/v1/beneficiary-core/:id               — تحديث الملف
 * GET  /api/v1/beneficiary-core/:id/timeline      — السجل الزمني
 * GET  /api/v1/beneficiary-core/:id/stats         — إحصاءات المستفيد
 * GET  /api/v1/beneficiary-core/:id/episodes      — حلقات الرعاية
 * GET  /api/v1/beneficiary-core/:id/sessions      — الجلسات العلاجية
 * GET  /api/v1/beneficiary-core/:id/assessments   — التقييمات السريرية
 * GET  /api/v1/beneficiary-core/:id/documents     — الوثائق المرتبطة
 * GET  /api/v1/beneficiary-core/:id/care-plan     — خطة الرعاية النشطة
 * GET  /api/v1/beneficiary-core/:id/progress      — بيانات التقدم
 * GET  /api/v1/beneficiary-core/:id/alerts        — التنبيهات والمخاطر
 * GET  /api/v1/beneficiary-core/:id/risk-profile  — درجة الخطورة الموحدة (W286)
 * ═══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const coreSvc = require('../services/beneficiaryCore.service');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { validateBody } = require('../intelligence/canonical');
const { getBeneficiaryRiskProfile } = require('../intelligence/risk');
const { stripUpdateMeta } = require('../utils/sanitize');

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Auth middleware (optional — graceful if absent) ───────────────
let auth;
try {
  const authMod = require('../middleware/auth');
  auth = authMod.requireAuth || authMod.authenticateToken || authMod;
  if (typeof auth !== 'function') auth = (_req, _res, next) => next();
} catch {
  auth = (_req, _res, next) => next();
}

// ═══════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc.getDashboard(req.query);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════
// Collection: list + create
// ═══════════════════════════════════════════════════════════════════

router.get(
  '/',
  auth,
  wrap(async (req, res) => {
    const { page = 1, limit = 20, search = '', status, disabilityType, branchId, sort } = req.query;
    const data = await coreSvc.list({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      search,
      status,
      disabilityType,
      branchId,
      sort,
    });
    res.json({ success: true, ...data });
  })
);

router.post(
  '/',
  auth,
  // Wave 285 — Canonical contract validator in PREVIEW mode.
  // Logs canonical-shape violations without rejecting in-flight clients.
  // Once telemetry shows clean traffic + Beneficiary Mongoose schema reaches
  // parity, remove `preview: true` here AND add 'Beneficiary' to
  // ENFORCED_ENTITIES in __tests__/canonical-drift.test.js to flip strict.
  validateBody('Beneficiary', { preview: true, logger }),
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const beneficiary = await coreSvc.create(stripUpdateMeta(req.body), actorId);
    logger.info('[BeneficiaryCore] New beneficiary created by %s', actorId);
    res.status(201).json({ success: true, data: beneficiary });
  })
);

// ═══════════════════════════════════════════════════════════════════
// Single: 360 profile + sub-resources
// ═══════════════════════════════════════════════════════════════════

router.get(
  '/:id/360',
  auth,
  wrap(async (req, res) => {
    const profile = await coreSvc.get360Profile(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    res.json({ success: true, data: profile });
  })
);

router.put(
  '/:id',
  auth,
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const updated = await coreSvc.updateProfile(req.params.id, req.body, actorId);
    if (!updated) return res.status(404).json({ success: false, message: 'المستفيد غير موجود' });
    res.json({ success: true, data: updated });
  })
);

router.get(
  '/:id/timeline',
  auth,
  wrap(async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const data = await coreSvc.getTimeline(req.params.id, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 200),
    });
    res.json({ success: true, ...data });
  })
);

router.get(
  '/:id/stats',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc.getStats(req.params.id);
    res.json({ success: true, data });
  })
);

router.get(
  '/:id/episodes',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc._getEpisodes(req.params.id);
    res.json({ success: true, data, total: data.length });
  })
);

router.get(
  '/:id/sessions',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc._getRecentSessions(req.params.id);
    res.json({ success: true, data, total: data.length });
  })
);

router.get(
  '/:id/assessments',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc._getRecentAssessments(req.params.id);
    res.json({ success: true, data, total: data.length });
  })
);

router.get(
  '/:id/documents',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc._getDocuments(req.params.id);
    res.json({ success: true, data, total: data.length });
  })
);

router.get(
  '/:id/care-plan',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc._getActiveCarePlan(req.params.id);
    res.json({ success: true, data });
  })
);

router.get(
  '/:id/progress',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc._getProgressData(req.params.id);
    res.json({ success: true, data });
  })
);

router.get(
  '/:id/alerts',
  auth,
  wrap(async (req, res) => {
    const data = await coreSvc._getAlerts(req.params.id);
    res.json({ success: true, data, total: data.length });
  })
);

// ════════════════════════════════════════════════════════════════════
// Wave 286 — Unified Risk Profile (read-only orchestrator)
// Aggregates: ClinicalRiskScore + PsychRiskFlag + AiPrediction(dropout_risk)
// + CdssRiskAssessment → weighted composite + explainable factors[].
// ════════════════════════════════════════════════════════════════════
router.get(
  '/:id/risk-profile',
  auth,
  wrap(async (req, res) => {
    const { episodeId } = req.query;
    const profile = await getBeneficiaryRiskProfile(req.params.id, {
      episodeId: episodeId || undefined,
      logger,
    });
    res.json({ success: true, data: profile });
  })
);

module.exports = router;
