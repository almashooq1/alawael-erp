/**
 * branches.routes.js — admin CRUD for the branch network.
 *
 * Authenticated; write operations require admin/manager role. Branch
 * isolation middleware (requireBranchAccess) limits non-HQ roles to
 * their own branch on reads.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');

const Branch = require('../models/Branch');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticate);
router.use(requireBranchAccess);

const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager'];

// ── GET / — list with filters + pagination ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, type, region, q, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (region) filter['location.region'] = region;
    if (q && typeof q === 'string' && q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ code: rx }, { name_ar: rx }, { name_en: rx }, { short_name: rx }];
    }

    // Branch-scope restriction: non-HQ roles see only their branch + HQ.
    if (req.user && !['admin', 'superadmin', 'super_admin'].includes(req.user.role)) {
      if (req.user.branchId) filter.$or = [{ _id: req.user.branchId }, { is_hq: true }];
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      Branch.find(filter)
        .sort({ is_hq: -1, type: 1, code: 1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Branch.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
    });
  } catch (err) {
    return safeError(res, err, 'branches.list');
  }
});

// ── GET /stats — aggregate counters for the dashboard ──────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const [total, byStatus, byType, byRegion] = await Promise.all([
      Branch.countDocuments({}),
      Branch.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Branch.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Branch.aggregate([
        { $group: { _id: '$location.region', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    res.json({
      success: true,
      total,
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      byType: Object.fromEntries(byType.map(r => [r._id, r.count])),
      byRegion: byRegion.map(r => ({ region: r._id, count: r.count })),
    });
  } catch (err) {
    return safeError(res, err, 'branches.stats');
  }
});

// ── GET /:id — single branch ───────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await Branch.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    res.json({ success: true, data: doc });
  } catch (err) {
    return safeError(res, err, 'branches.getOne');
  }
});

// ── POST / — create ────────────────────────────────────────────────────────
router.post(
  '/',
  authorize(WRITE_ROLES),
  validate([
    body('code').trim().notEmpty().withMessage('رمز الفرع مطلوب').isLength({ max: 20 }),
    body('name_ar').trim().notEmpty().withMessage('الاسم بالعربية مطلوب'),
    body('name_en').trim().notEmpty().withMessage('الاسم بالإنجليزية مطلوب'),
  ]),
  async (req, res) => {
    try {
      const doc = await Branch.create(req.body);
      logger.info('[branches] created', {
        id: doc._id.toString(),
        code: doc.code,
        by: req.user?.id,
      });
      res.status(201).json({ success: true, data: doc, message: 'تم إنشاء الفرع' });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ success: false, message: 'رمز الفرع مستخدم مسبقاً' });
      }
      if (err?.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
      }
      return safeError(res, err, 'branches.create');
    }
  }
);

// ── PATCH /:id — update ────────────────────────────────────────────────────
router.patch('/:id', authorize(WRITE_ROLES), async (req, res) => {
  try {
    const body = { ...req.body };
    delete body._id;
    delete body.code; // code is immutable after creation
    const doc = await Branch.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    logger.info('[branches] updated', { id: req.params.id, by: req.user?.id });
    res.json({ success: true, data: doc, message: 'تم تحديث الفرع' });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return safeError(res, err, 'branches.update');
  }
});

// Legacy PUT alias (existing consumers may use it).
router.put('/:id', authorize(WRITE_ROLES), (req, res, next) => {
  req.method = 'PATCH';
  router.handle(req, res, next);
});

// ── DELETE /:id — soft delete (set status=inactive) ───────────────────────
router.delete('/:id', authorize(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await Branch.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive' },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    logger.info('[branches] deactivated', { id: req.params.id, by: req.user?.id });
    res.json({ success: true, message: 'تم تعطيل الفرع (soft delete)', data: doc });
  } catch (err) {
    return safeError(res, err, 'branches.delete');
  }
});

module.exports = router;
