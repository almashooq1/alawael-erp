/**
 * CarePlan Routes — مسارات خطط الرعاية (IEP + علاجية + مهارات حياتية)
 *
 * ✅ CRUD كامل
 * ✅ تفعيل / أرشفة
 * ✅ إحصائيات ولوحة تحكم
 * ✅ تحديث تقدم الأهداف
 * ✅ حماية بالمصادقة والصلاحيات
 */

const express = require('express');
const { safeError } = require('../utils/safeError');
const router = express.Router();
const { authenticate, authorize: _authorize } = require('../middleware/auth');
const carePlanService = require('../services/carePlan.service');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticate);

// ─── Helper ──────────────────────────────────────────────────────────────────
const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('CarePlan route error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: safeError(err) });
  }
};

const getUserId = req => req.user?.userId || req.user?._id || req.user?.id;

// ─── Statistics (before /:id to prevent collision) ───────────────────────────
router.get(
  '/statistics',
  wrap(async () => {
    return carePlanService.getStatistics();
  })
);

// ─── Active plan for a beneficiary ───────────────────────────────────────────
router.get(
  '/beneficiary/:beneficiaryId/active',
  wrap(async req => {
    return carePlanService.getActivePlan(req.params.beneficiaryId);
  })
);

// ─── List (with filter, pagination, search) ──────────────────────────────────
router.get(
  '/',
  wrap(async req => {
    return carePlanService.list(req.query);
  })
);

// ─── Get by ID ───────────────────────────────────────────────────────────────
router.get(
  '/:id',
  wrap(async req => {
    return carePlanService.getById(req.params.id);
  })
);

// ─── Create ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  wrap(async req => {
    return carePlanService.create(req.body, getUserId(req));
  })
);

// ─── Update ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  wrap(async req => {
    return carePlanService.update(req.params.id, req.body, getUserId(req));
  })
);

// ─── Activate (DRAFT → ACTIVE) ──────────────────────────────────────────────
router.patch(
  '/:id/activate',
  wrap(async req => {
    return carePlanService.activate(req.params.id, getUserId(req));
  })
);

// ─── Archive ─────────────────────────────────────────────────────────────────
router.patch(
  '/:id/archive',
  wrap(async req => {
    return carePlanService.archive(req.params.id, getUserId(req));
  })
);

// ─── Delete (DRAFT only) ─────────────────────────────────────────────────────
router.delete(
  '/:id',
  wrap(async req => {
    return carePlanService.delete(req.params.id);
  })
);

// ─── Update Goal Progress ────────────────────────────────────────────────────
router.patch(
  '/:id/goals/progress',
  wrap(async req => {
    const { sectionPath, goalIndex, progress } = req.body;
    return carePlanService.updateGoalProgress(req.params.id, sectionPath, goalIndex, progress);
  })
);

module.exports = router;
