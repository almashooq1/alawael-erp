'use strict';

/**
 * Measures Library Routes — مسارات مكتبة المقاييس الموحدة
 * ══════════════════════════════════════════════════════════════════
 * GET  /api/v1/measures-library/dashboard      — إحصائيات المكتبة
 * GET  /api/v1/measures-library                — قائمة المقاييس (search/filter)
 * POST /api/v1/measures-library                — إضافة مقياس جديد
 * GET  /api/v1/measures-library/suggest        — اقتراح مقاييس
 * GET  /api/v1/measures-library/:id            — تفاصيل مقياس + إحصائيات الاستخدام
 * PUT  /api/v1/measures-library/:id            — تحديث مقياس
 * GET  /api/v1/measures-library/:id/scoring    — دليل التسجيل
 * ══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const measuresLibrarySvc = require('../services/measuresLibrary.service');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');

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
    const data = await measuresLibrarySvc.getDashboard();
    res.json({ success: true, data });
  })
);

// Suggest (before /:id)
router.get(
  '/suggest',
  auth,
  wrap(async (req, res) => {
    const { beneficiaryId, disabilityType, ageMonths, category } = req.query;
    const data = await measuresLibrarySvc.suggest({
      beneficiaryId,
      disabilityType,
      ageMonths: parseInt(ageMonths, 10) || 0,
      category,
    });
    res.json({ success: true, data });
  })
);

// List
router.get(
  '/',
  auth,
  wrap(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      type,
      targetPopulation,
      isActive,
      sort,
    } = req.query;
    const data = await measuresLibrarySvc.list({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      search,
      category,
      type,
      targetPopulation,
      isActive,
      sort,
    });
    res.json({ success: true, ...data });
  })
);

// Create
router.post(
  '/',
  auth,
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const data = await measuresLibrarySvc.create(stripUpdateMeta(req.body), actorId);
    logger.info('[MeasuresLibrary] New measure created: %s by %s', data.code, actorId);
    res.status(201).json({ success: true, data });
  })
);

// Scoring guide (before /:id to avoid collision)
router.get(
  '/:id/scoring',
  auth,
  wrap(async (req, res) => {
    const data = await measuresLibrarySvc.getScoringGuide(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, data });
  })
);

// Single measure
router.get(
  '/:id',
  auth,
  wrap(async (req, res) => {
    const data = await measuresLibrarySvc.getOne(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, data });
  })
);

// Update
router.put(
  '/:id',
  auth,
  wrap(async (req, res) => {
    const actorId = req.user?._id || req.user?.id;
    const data = await measuresLibrarySvc.update(req.params.id, req.body, actorId);
    if (!data) return res.status(404).json({ success: false, message: 'المقياس غير موجود' });
    res.json({ success: true, data });
  })
);

module.exports = router;
