'use strict';

/**
 * Document Center Routes — مسارات مركز إدارة الوثائق الموحد
 * ══════════════════════════════════════════════════════════════════
 * Base: /api/v1/document-center  (also /api/document-center)
 *
 * ENDPOINTS
 * ─────────────────────────────────────────────────────────────────
 * GET    /dashboard                  لوحة التحكم الذكية
 * GET    /metadata                   التصنيفات / الأنواع / إلخ
 *
 * GET    /library                    مكتبة المستندات (فلترة + تصفح)
 * GET    /library/:id                تفاصيل مستند
 * PUT    /library/:id                تحديث بيانات وصفية
 * DELETE /library/:id                حذف ناعم
 * POST   /library/:id/archive        أرشفة
 * POST   /library/:id/restore        استرجاع
 * POST   /library/bulk               عمليات جماعية
 *
 * GET    /search                     بحث ذكي
 * GET    /expiry-radar               مستندات منتهية / منتهية قريباً
 *
 * GET    /workflow/queue             طابور سير العمل
 * POST   /workflow/:id/action        تنفيذ إجراء سير عمل
 *
 * GET    /ai/insights                تحليلات الذكاء الاصطناعي
 * POST   /ai/:id/classify            تصنيف مستند
 * POST   /ai/:id/duplicates          فحص تكرار
 *
 * GET    /reports/analytics          تقارير التحليلات
 *
 * POST   /beneficiary/:id/link       ربط مستند بمستفيد
 * GET    /beneficiary/:benefId/docs  مستندات مستفيد
 *
 * POST   /favorite/:id               تبديل المفضلة
 * ══════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');

const svc = require('../services/documentCenter.service');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// ── Auth middleware ──────────────────────────────────────────────
let auth;
try {
  const m = require('../middleware/auth');
  auth =
    typeof m === 'function'
      ? m
      : m.authenticate || m.authenticateToken || m.auth || ((req, res, next) => next());
} catch {
  auth = (req, res, next) => next();
}

router.use(auth);

// ── Helper: handle validation errors ────────────────────────────
function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

// ── Helper: extract caller info ──────────────────────────────────
function caller(req) {
  return {
    userId: req.user?.id || req.user?._id || 'system',
    userName: req.user?.name || req.user?.fullName || req.user?.username || 'النظام',
  };
}

// ── Wrapper: async error handler ────────────────────────────────
function wrap(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      const status = err.status || err.statusCode || 500;
      logger.error(`[DocumentCenter] ${err.message}`);
      res.status(status).json({ success: false, message: safeError(err) });
    }
  };
}

// ══════════════════════════════════════════════════════════════════
// ── DASHBOARD & META ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const { userId } = caller(req);
    const data = await svc.getDashboard(userId);
    res.json({ success: true, data });
  })
);

router.get(
  '/metadata',
  wrap(async (_req, res) => {
    res.json({ success: true, data: svc.getMetadata() });
  })
);

// ══════════════════════════════════════════════════════════════════
// ── LIBRARY ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.get(
  '/library',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isString().trim(),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('search').optional().isString().trim().isLength({ max: 300 }),
    query('category').optional().isString().trim(),
    query('status').optional().isString().trim(),
    query('fileType').optional().isString().trim(),
    query('workflowStatus').optional().isString().trim(),
    query('folder').optional().isString().trim(),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { page, limit, sortBy, sortOrder, ...filters } = req.query;
    const result = await svc.listDocuments(
      { ...filters, userId: caller(req).userId },
      { page, limit, sortBy, sortOrder }
    );
    res.json({ success: true, ...result });
  })
);

router.get(
  '/library/:id',
  [param('id').isMongoId()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId } = caller(req);
    const doc = await svc.getDocument(req.params.id, userId);
    res.json({ success: true, document: doc });
  })
);

router.put(
  '/library/:id',
  [
    param('id').isMongoId(),
    body('title').optional().isString().trim().isLength({ min: 1, max: 300 }),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('category').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('expiryDate').optional().isISO8601(),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const doc = await svc.updateDocument(req.params.id, req.body, userId, userName);
    res.json({ success: true, document: doc });
  })
);

router.delete(
  '/library/:id',
  [param('id').isMongoId()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const result = await svc.softDelete(req.params.id, userId, userName);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/library/:id/archive',
  [param('id').isMongoId()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const result = await svc.archiveDocument(req.params.id, userId, userName);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/library/:id/restore',
  [param('id').isMongoId()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const result = await svc.restoreDocument(req.params.id, userId, userName);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/library/bulk',
  [
    body('ids').isArray({ min: 1, max: 200 }),
    body('operation').isIn(['archive', 'restore', 'delete', 'publish']),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const result = await svc.bulkOperation(req.body.ids, req.body.operation, userId, userName);
    res.json({ success: true, ...result });
  })
);

// ══════════════════════════════════════════════════════════════════
// ── SEARCH & EXPIRY ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.get(
  '/search',
  [
    query('q').isString().trim().isLength({ min: 1, max: 300 }),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { q, page, limit, ...filters } = req.query;
    const result = await svc.smartSearch(q, filters, { page, limit });
    res.json({ success: true, ...result });
  })
);

router.get(
  '/expiry-radar',
  [query('days').optional().isInt({ min: 1, max: 365 }).toInt()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const days = req.query.days || 60;
    const data = await svc.getExpiryRadar(days);
    res.json({ success: true, data, total: data.length });
  })
);

// ══════════════════════════════════════════════════════════════════
// ── WORKFLOW ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.get(
  '/workflow/queue',
  [
    query('status').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId } = caller(req);
    const result = await svc.getWorkflowQueue(userId, req.query);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/workflow/:id/action',
  [
    param('id').isMongoId(),
    body('action').isIn([
      'submit_review',
      'approve_review',
      'request_revision',
      'resubmit',
      'submit_approval',
      'approve',
      'reject',
      'publish',
      'cancel',
    ]),
    body('comment').optional().isString().trim().isLength({ max: 1000 }),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const result = await svc.processWorkflowAction(
      req.params.id,
      req.body.action,
      userId,
      userName,
      req.body.comment
    );
    res.json({ success: true, ...result });
  })
);

// ══════════════════════════════════════════════════════════════════
// ── AI ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.get(
  '/ai/insights',
  wrap(async (_req, res) => {
    const data = await svc.getAIInsights();
    res.json({ success: true, data });
  })
);

router.post(
  '/ai/:id/classify',
  [param('id').isMongoId()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const result = await svc.classifyDocument(req.params.id, userId, userName);
    res.json({ success: true, ...result });
  })
);

router.post(
  '/ai/:id/duplicates',
  [param('id').isMongoId()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const result = await svc.checkDuplicates(req.params.id);
    res.json({ success: true, ...result });
  })
);

// ══════════════════════════════════════════════════════════════════
// ── REPORTS ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.get(
  '/reports/analytics',
  [query('months').optional().isInt({ min: 1, max: 24 }).toInt()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const data = await svc.getAnalyticsReport({ months: req.query.months || 6 });
    res.json({ success: true, data });
  })
);

// ══════════════════════════════════════════════════════════════════
// ── BENEFICIARY LINKING ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.post(
  '/beneficiary/:id/link',
  [
    param('id').isMongoId(),
    body('beneficiaryId').isMongoId(),
    body('episodeId').optional().isMongoId(),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId, userName } = caller(req);
    const result = await svc.linkToBeneficiary(
      req.params.id,
      req.body.beneficiaryId,
      req.body.episodeId,
      userId,
      userName
    );
    res.json({ success: true, ...result });
  })
);

router.get(
  '/beneficiary/:benefId/docs',
  [
    param('benefId').isMongoId(),
    query('episodeId').optional().isMongoId(),
    query('category').optional().isString().trim(),
  ],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const docs = await svc.getBeneficiaryDocuments(req.params.benefId, req.query);
    res.json({ success: true, documents: docs, total: docs.length });
  })
);

// ══════════════════════════════════════════════════════════════════
// ── FAVORITES ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════

router.post(
  '/favorite/:id',
  [param('id').isMongoId()],
  wrap(async (req, res) => {
    if (!validate(req, res)) return;
    const { userId } = caller(req);
    const result = await svc.toggleFavorite(req.params.id, userId);
    res.json({ success: true, ...result });
  })
);

module.exports = router;
